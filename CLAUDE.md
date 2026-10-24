# 生徒カード貸し出し管理システム

学校の生徒カードをタブレットにかざして本人確認し、機材や本のバーコードを読み取って貸し出し・返却を記録するWebシステム。学生向けのWebサイトでは、登録・借りている物の確認・機材カタログの閲覧ができる。チーム開発(小川・青木ほか)。

- **規模の前提**: 1校の中で使う想定の試作。本番環境はまだ無く、Docker Composeで手元で動かす
- **ICチップは想定**: 今の生徒カードには実際にはICチップが無い。将来付く想定で、今はカードの番号をバーコードか手入力で読む。APIはカードの番号を受け取るだけにして、読み方に依存させない
- **名簿は学校側にある前提**: `ExternalUser`テーブルが学校の名簿の仮の代わり(学籍番号・メール・カードのシリアル番号)。**本番では学校のDBかAPIを読む**ので、名簿の項目をこのシステムのDBに写さず、名簿を読むJOINを増やさない。登録できるのは名簿にいる人だけ

## 構成

| ディレクトリ | 中身 |
|---|---|
| `back/` | API(Express 5 + Prisma 7 + PostgreSQL 16、TypeScript、ESM)。`src/features/<機能>/`に route・controller・service・repository・schema・types |
| `back/prisma/` | `schema.prisma`・マイグレーション・`seed.ts`(テスト用の名簿・利用者・物品) |
| `back/src/generated/prisma/` | Prismaが生成したクライアント。**手で書き換えない**(`npm run db:generate`で作り直す) |
| `front/` | Next.js 16(App Router)+ React 19 + HeroUI + Tailwind 4。`/auth`・`/dashboard`・`/items`・`/items/[title]`・`/tablet`・`/barcodes` |
| `docs/` | 要件定義・仕組み(下の「ドキュメント」) |
| `photo/` | READMEの画面写真 |

## 全体で守ること

- **APIの成功レスポンスは`sendSuccess(res, data)`で`{ success: true, ...data }`に展開される**(`data`で包まれない。`docs/api.md`の形に移すときにやめる)。**失敗はRFC 9457の形**(`application/problem+json`の`{ type, title, status, code, detail, errors? }`)で、返すのは`middleware/error.middleware.ts`だけ。フロントの型(`front/src/types/`)とずれると画面が壊れる。過去に何度もここで不具合が出た(`REFACTORING_PROGRESS.md`)
- **バックエンドで返す項目を足すときは、repositoryの`select`・serviceの組み立て・types・フロントの型の4か所を揃える**(`serialNumber`は`select`の漏れで2回直した)
- **業務の決まりで断るときは、serviceで`throw new DomainError('CODE')`**。`code`は`lib/error-codes.ts`の表(`docs/api.md`6章)にあるものだけで、ステータスと文言はその表で決まる(serviceはHTTPのステータスも文言も書かない)。判断の関数(判断表)は`{ ok: false, reason }`を返し、serviceがそれを`DomainError`にして投げる。controllerに`try/catch`は書かない(Express 5がthrowをエラー用のミドルウェアに渡す)。Zod・Prisma・想定外のエラーも、`lib/problem.ts`の`toProblem`が変換する
- トークン: アクセストークン15分(`Authorization: Bearer`)、リフレッシュトークン7日(HttpOnly Cookie`refreshToken`、DBに利用者1人1件)、タブレット用トークン3分。秘密鍵の使い回しなど既知の問題は`docs/spec.md`の「現状とのずれ」
- `.env`はコミットしない。値をコードやログに書かない
- 利用者の画面の文言は日本語

## コマンド

ホストには`node_modules`が無い。**コマンドはDockerのコンテナの中で動かす**。

| 目的 | コマンド |
|---|---|
| 起動 | `docker compose up -d`(web 4545 / api 5454 / db 1919 / Prisma Studio 5555) |
| マイグレーション | `docker compose exec api npm run db:migrate`(スキーマを変えたら`--name <内容>`を付ける) |
| テストデータ | `docker compose exec api npm run db:seed`(**全テーブルを消してから入れ直す**) |
| テスト(API) | `docker compose exec api npm test`(Vitest。`npm run test:watch`で見張る)。テストは`src/`の中で元のファイルの隣に`*.test.ts` |
| 型チェック(API) | `docker compose exec api npx tsc --noEmit` |
| ビルド・リント(画面) | `docker compose exec web npm run build`、`docker compose exec web npm run lint` |

APIのコンテナはNode 24。依存を足した人がいたら`docker compose up -d --build -V api`で作り直す(`node_modules`はコンテナの中の名前の無いボリュームにあり、`-V`を付けないと古いまま残る)。変更したらテスト・型チェック・ビルドを通し、APIは`curl`で、画面はブラウザで確かめる。**`curl`で確かめる前に、`docker compose logs api`に変えたファイルの「change in … Restarting」が出たことを見る**(Macでは変更の通知が落ち、古いコードのまま動いていたことがある。今はpolling(`CHOKIDAR_USEPOLLING`)で見張っている)。テスト用のログインは学籍番号`20240001`・パスワード`password123`(管理者は`90240001`。学籍番号は数字だけ)、タブレットのカードは`IC-CARD-001`、物品のバーコードは`MAC-002`など(`MAC-001`はseedで貸出中)(`back/prisma/seed.ts`、`/barcodes`で印刷できる)。

## コーディング規約

- バックエンドはESM(`"module": "NodeNext"`)。**importの末尾に`.js`を付け**、`src/`配下は`@/`から書く(例: `import { DomainError } from "@/lib/domain-error.js"`)。型だけのimportは`import type`(`verbatimModuleSyntax`)
- `strict`に加えて`noUncheckedIndexedAccess`・`exactOptionalPropertyTypes`が有効。配列の要素や省略可能な項目は`undefined`を考えて書く
- 1つの機能の中は route → controller → service → repository の向きにだけ依存する。依存はrouteファイルで`new`して渡す(DIコンテナは使わない)
- 入力の検証は`*.schema.ts`のZodで、controllerの先頭で`parse`する
- フロントのAPI呼び出しは`front/src/services/`(`ApiService`を継承)に置く。`front/src/lib/api.ts`・`lib/auth-api.ts`は古い重複で、新しく使わない
- コメントは「なぜ」を書く。何をしているかはコードで表す
- 動作確認用の`console.log`(利用者の情報を出すもの)は残さない
- ブランチは`feature/<内容>`を切り、`main`へPRを出す
- コミットは内容ごとに分ける(DBの変更・不具合の修正・文書は別のコミット)。**文は日本語**で、1行目の頭に種類を付ける(2026-10-23から。それより前は`feature: <名前> <内容>`):
  | 種類 | 使うとき |
  |---|---|
  | `feat:` | 新しい動きを足す |
  | `fix:` | 不具合を直す |
  | `test:` | テストだけを足す・直す |
  | `refactor:` | 動きを変えずに整える |
  | `docs:` | 文書だけ |
  | `style:` | 書式だけ |
  | `chore:` | 道具・設定・依存の更新 |

  1行目は「何が変わったか」を50文字くらいまで(例: `fix: seedの学籍番号を数字にし、Webでログインできるようにする`)。1行あけて、本文に「なぜ」を書く。「修正」「いろいろ」のような、何が変わったか分からない書き方はしない

## 開発の進め方(TDD)

- 手順は`docs/backlog.md`の「進め方」。判断は副作用の無い関数に出し、テストはその関数に書く
- **実装を優先する(2026-10-23から)。テストもClaudeが書き、TDD(赤 → 緑 → 整える)で進める**。大体の機能ができたら、**最後のほうの機能だけ開発者が練習としてテストを書く**(どれにするかはそのとき決める。そこではClaudeは例の表・`it.todo`・穴埋めの形を用意し、書かれたテストを確かめる)
- 緑になるたびに1コミット。整理(`refactor:`)は動きを変える修正と別のコミットにする
- テストは、関数ごとの`describe`の中を`describe("正常系")`・`describe("異常系")`・`describe("境界値")`で分ける(当てはまるテストが無い区分は書かない)。テストの名前には仕様の番号を入れる(2026-10-24、開発者の希望)
- 作業のまとまりごとにブランチを切る(`fix/…`・`refactor/…`・`feat/…`・`docs/…`)。PRを出す・マージする前に開発者に声をかける

## 開発者との進め方(2026-10-24、開発者が「このやり方がよい」と確かめた)

**まとめて進めない。1つずつ、開発者と相談して決めてから進める。**「進めていいよ」は方針の了承で、確認なしに続けてよいという意味ではない。

1. **問題を1つだけ出す**: 今の形(コードの抜き出し)と、何が困るかを短く
2. **修正案と論点を表にする**: 論点ごとに番号(例: E1・R2・T3)・選択肢・おすすめと理由。開発者は「おすすめ通り」か番号で選ぶだけで済むようにする
3. **決まったら書き残す**: `docs/`(残タスク・要件・設計)に、決めた日付と番号付きで書く。それから次の問題へ
4. **作業の前に予定を見せる**: 触るファイル・変えること・理由。マイグレーションのSQLのように取り消しにくいものは、適用する前に中身を見せて止まる
5. **作業の後に結果を見せる**: テストの赤・緑、型チェック、`curl`の結果、確かめていないこと。ここで止まり、次に進むかを聞く
6. 途中で予定と違うことが起きたら(テストは緑なのにAPIが違う、など)、先に進まず報告する

## ドキュメント

必要になったときに読む(自動では読み込まれない)。

| ファイル | 内容 |
|---|---|
| `docs/spec.md` | 要件定義。何を満たすべきか、どこまで実装済みか、現状とのずれ、要確認 |
| `docs/backlog.md` | 残タスクと順番(リファクタと修正 → 在庫管理)。進め方(TDD) |
| `docs/auth.md` | 認証の作り直しの要件と方針(2026-10-23決定): タブレットの端末の登録、カードの番号 + PIN、セッションの期限、学籍番号とカードの番号の区別、総当たり対策、トークンの用途の分離 |
| `docs/api.md` | API設計(作り直しの案): URL・メソッド・ステータス・成功とエラーの形(RFC 9457)・資源の形・エラーの`code`の一覧・今のAPIとの対応 |
| `docs/architecture.md` | 仕組み: APIの一覧、認証とトークンの流れ、データモデル、レイヤの分け方 |
| `REFACTORING_PROGRESS.md` | 2026-02-12のフロントのリファクタリングと、`serialNumber`の不具合を追った記録 |
| `README.md` | 発表用の紹介(画面写真・利用者の流れ・今後の展望) |

観点ごとのスキル(TDD・テスト・Express・TypeScript・Prisma・DB・API・アーキテクチャ・セキュリティ・認証・CI/CD・Next.js・Docker・Git・コミット・要件定義など)は`.claude/skills/`にある。第三者のOSSなので、出典・ライセンス・取り込む前の確認・改変は`.claude/skills/ATTRIBUTIONS.md`。**スキルの内容とこのプロジェクトの決まり(このファイル・`.claude/rules/`・`docs/`)が食い違うときは、プロジェクトの決まりを優先する。** スキルを足す・更新するときは、ATTRIBUTIONS.mdの確認をやり直し、改変したらその節にライセンスと変えたことを書く。

領域ごとの細かいルールは`.claude/rules/`にあり、該当するファイルを触ったときに自動で読み込まれる: `backend.md`(`back/src/`)、`database.md`(`back/prisma/`)、`frontend.md`(`front/src/`)。
