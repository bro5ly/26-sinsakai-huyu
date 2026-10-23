# 生徒カード貸し出し管理システム

学校の生徒カード(ICカード)をタブレットにかざして本人確認し、機材や本のバーコードを読み取って貸し出し・返却を記録するWebシステム。学生向けのWebサイトでは、登録・借りている物の確認・機材カタログの閲覧ができる。チーム開発(小川・青木ほか)。

- **規模の前提**: 1校の中で使う想定の試作。本番環境はまだ無く、Docker Composeで手元で動かす
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

- **APIの成功レスポンスは`sendSuccess(res, data)`で`{ success: true, ...data }`に展開される**(`data`で包まれない)。失敗は`{ message, code }`。フロントの型(`front/src/types/`)とずれると画面が壊れる。過去に何度もここで不具合が出た(`REFACTORING_PROGRESS.md`)
- **バックエンドで返す項目を足すときは、repositoryの`select`・serviceの組み立て・types・フロントの型の4か所を揃える**(`serialNumber`は`select`の漏れで2回直した)
- エラーはserviceで`throw new AppError(日本語メッセージ, HTTPステータス, 'UPPER_SNAKE_CODE')`、controllerは`try/catch`で`handleError(res, err)`に渡す。Zod・Prismaのエラーも`handleError`が変換する
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
| 型チェック(API) | `docker compose exec api npx tsc --noEmit` |
| ビルド・リント(画面) | `docker compose exec web npm run build`、`docker compose exec web npm run lint` |

自動テストはまだ無い。変更したら上の型チェックとビルドを通し、APIは`curl`で、画面はブラウザで確かめる。テスト用のログインは学籍番号`20240001`・パスワード`password123`(管理者は`90240001`。学籍番号は数字だけ)、タブレットのカードは`IC-CARD-001`、物品のバーコードは`MAC-002`など(`MAC-001`はseedで貸出中)(`back/prisma/seed.ts`、`/barcodes`で印刷できる)。

## コーディング規約

- バックエンドはESM(`"module": "NodeNext"`)。**importの末尾に`.js`を付け**、`src/`配下は`@/`から書く(例: `import { AppError } from "@/lib/error.js"`)。型だけのimportは`import type`(`verbatimModuleSyntax`)
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
- **テストは開発者が書く**(学ぶため)。Claudeはテストを書かず、仕様の例の表・`it.todo`の並び・穴埋めの形を用意し、書かれたテストを確かめる
- 緑になるたびに1コミット。整理(`refactor:`)は動きを変える修正と別のコミットにする

## ドキュメント

必要になったときに読む(自動では読み込まれない)。

| ファイル | 内容 |
|---|---|
| `docs/spec.md` | 要件定義。何を満たすべきか、どこまで実装済みか、現状とのずれ、要確認 |
| `docs/backlog.md` | 残タスクと順番(リファクタと修正 → 在庫管理)。進め方(TDD) |
| `docs/architecture.md` | 仕組み: APIの一覧、認証とトークンの流れ、データモデル、レイヤの分け方 |
| `REFACTORING_PROGRESS.md` | 2026-02-12のフロントのリファクタリングと、`serialNumber`の不具合を追った記録 |
| `README.md` | 発表用の紹介(画面写真・利用者の流れ・今後の展望) |

領域ごとの細かいルールは`.claude/rules/`にあり、該当するファイルを触ったときに自動で読み込まれる: `backend.md`(`back/src/`)、`database.md`(`back/prisma/`)、`frontend.md`(`front/src/`)。
