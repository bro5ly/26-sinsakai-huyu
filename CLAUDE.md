# 生徒カード貸し出し管理システム

学校の生徒カードをタブレットにかざして本人確認し、機材や本のバーコードを読み取って貸し出し・返却を記録するWebシステム。学生向けのWebサイトでは、登録・借りている物の確認・機材カタログの閲覧ができる。

- **成り立ち**: 2025年度の学校の課題(学校の困りごとをWebアプリで解決する)で、2人で作った(2026年2月)。全校生徒が持っているのに使われていない生徒カードと、紙で管理している本や物品の貸し出しに目をつけた、開発者の発案。**今は開発者が1人で作り直している**(学んだことでより良くするため。学校に実際に使ってもらうことも目指している)。判断は開発者だけで決めてよく、ほかの人の了承は要らない
- **READMEは採用担当の人が読む**。作り直しの意図と今の状態が伝わるように保つ

- **規模の前提**: 1校の中で使う想定の試作。本番環境はまだ無く、Docker Composeで手元で動かす
- **ICチップは想定**: 今の生徒カードには実際にはICチップが無い。将来付く想定で、今はカードの番号をバーコードか手入力で読む。APIはカードの番号を受け取るだけにして、読み方に依存させない
- **名簿は学校側にある前提**: `ExternalUser`テーブルが学校の名簿の仮の代わり(学籍番号・メール・カードのシリアル番号)。**本番では学校のDBかAPIを読む**ので、名簿の項目をこのシステムのDBに写さず、名簿を読むJOINを増やさない。登録できるのは名簿にいる人だけ

## 構成

| ディレクトリ | 中身 |
|---|---|
| `back/` | API(Express 5 + Prisma 7 + PostgreSQL 16、TypeScript、ESM)。`src/features/<機能>/`に routes・service・repository・schema・types。本物の部品は`src/deps.ts`の`buildDeps()`で作り、`src/app.ts`の`createApp(deps, config)`で組み立てる(環境変数は`src/config.ts`だけで読む) |
| `back/prisma/` | `schema.prisma`・マイグレーション・`seed.ts`(テスト用の名簿・利用者・物品) |
| `back/src/generated/prisma/` | Prismaが生成したクライアント。**手で書き換えない**(`npm run db:generate`で作り直す) |
| `front/` | Next.js 16(App Router)+ React 19 + HeroUI + Tailwind 4。`/auth`・`/dashboard`・`/items/[id]`(種類の詳細)・`/tablet`・`/admin/tablets`(管理者の端末の管理)・`/barcodes`(開発のときだけ。`page.dev.tsx`) |
| `shared/` | 画面とサーバーの共通の形(`@sinsakai/shared`)。今はエラーの`code`の表(`error-codes.ts`)、RFC 9457の形(`problem.ts`の`problemSchema`)、登録・ログインのリクエストと応答(`auth.ts`)、本人の`Me`と`Rental`とPINの登録(`me.ts`)、推測しやすいPINの判断(`pin.ts`)、カタログ(`catalog.ts`)、タブレットの端末(`tablet-devices.ts`)、タブレットの本人確認(`tablet.ts`)。`shared/`のテストは`back`のVitestで走る。ビルドせずTypeScriptのまま使う。直下の`package.json`がnpm workspaces(`back`・`front`・`shared`)で、ロックファイルは直下の1つ |
| `docs/` | 要件定義・仕組み(下の「ドキュメント」) |
| `photo/` | READMEの画面写真 |

## 全体で守ること

- **APIの成功レスポンスは、すべて`docs/api.md`の新しい形**(2026-10-29に、最後のタブレットの貸し出し・返却を移した)。包まずに`shared/`の形で返す(`res.status(201).json({ ... } satisfies Session)`)。`{ success: true, ...data }`(`sendSuccess`)は無くした。物品のバーコードは、利用者に返すどの応答にも入れない(実物を持たずに返却できてしまうため。BC1)。**失敗はRFC 9457の形**(`application/problem+json`の`{ type, title, status, code, detail, errors? }`)で、返すのは`middleware/error.middleware.ts`だけ。画面は`shared/`の同じ型で読むので、`shared/`を通さずに形を変えると画面が壊れる。過去に何度もここで不具合が出た(`REFACTORING_PROGRESS.md`)
- **バックエンドで返す項目を足すときは、repositoryの`select`・serviceの組み立て・types・フロントの型の4か所を揃える**(`serialNumber`は`select`の漏れで2回直した)
- **業務の決まりで断るときは、serviceで`throw new DomainError('CODE')`**。`code`は`shared/src/error-codes.ts`の表(`docs/api.md`6章)にあるものだけで、ステータスと文言はその表で決まる(serviceはHTTPのステータスも文言も書かない)。判断の関数(判断表)は`{ ok: false, reason }`を返し、serviceがそれを`DomainError`にして投げる。routeに`try/catch`は書かない(Express 5がthrowをエラー用のミドルウェアに渡す)。Zod・Prisma・想定外のエラーも、`lib/problem.ts`の`toProblem`が変換する
- 認証: Webはサーバーのセッション(番号をHttpOnly・`SameSite=Strict`のCookie`session`に入れ、DBの`session`にはSHA-256のハッシュだけ。7日で切れる。1人が何件でも持てる)。書き換えのリクエストは`Origin`が画面のURLでないと403 `FORBIDDEN_ORIGIN`。登録用トークン(15分)もDBのハッシュで1回だけ。タブレットのAPIは、登録された端末のCookie`device`(400日。DBにはハッシュだけ)が要る。管理者だけのAPIは`/api/admin`の下(入口で管理者かを確かめる)。タブレットの本人確認は、カードとPINで作るサーバーのセッション(同じ`session`の表で種類`TABLET`。番号は画面のメモリに持ち`Authorization: Bearer`で送る。作った端末でだけ、無操作30秒・3分まで)。JWTはどこにも使っていない。仕組みと理由は`docs/auth.md`の2章(2026-10-28 A8-3〜A8-11)
- `.env`はコミットしない。値をコードやログに書かない
- 利用者の画面の文言は日本語

## コマンド

ホストには`node_modules`が無い。**コマンドはDockerのコンテナの中で動かす**。

| 目的 | コマンド |
|---|---|
| 起動 | `docker compose up -d`(web 4545 / api 5454 / db 1919 / Prisma Studio 5555 / 開発用のメールの受け口 Mailpit 8025。認証コードはDBにハッシュでしか無いので、届いたメールをMailpitで見る) |
| マイグレーション | `docker compose exec api npm run db:migrate`(スキーマを変えたら`--name <内容>`を付ける) |
| テストデータ | `docker compose exec api npm run db:seed`(**全テーブルを消してから入れ直す**) |
| テスト(API) | `docker compose exec api npm test`(Vitest。`npm run test:watch`で見張る)。テストは`src/`の中で元のファイルの隣に`*.test.ts` |
| 型チェック(API) | `docker compose exec api npx tsc --noEmit` |
| ビルド・リント(画面) | `docker compose exec web npm run build`、`docker compose exec web npm run lint` |

APIと画面のコンテナはNode 24で、ビルドの起点とつなぐ場所はリポジトリ直下(workspacesのため)。依存を足すときは`docker compose exec api npm install <名前> -w back`(画面は`web`と`-w front`)で直下のロックファイルを書き換える。依存を足した人がいたら`docker compose up -d --build -V api`(画面なら`web`)で作り直す(`node_modules`はコンテナの中の名前の無いボリュームにあり、`-V`を付けないと古いまま残る)。変更したらテスト・型チェック・ビルドを通し、APIは`curl`で、画面はブラウザで確かめる。**`curl`で確かめる前に、`docker compose logs api`に変えたファイルの「change in … Restarting」が出たことを見る**(Macでは変更の通知が落ち、古いコードのまま動いていたことがある。今はpolling(`CHOKIDAR_USEPOLLING`)で見張っている)。`curl`で書き換えのリクエスト(POST・DELETE)を送るときは`-H "Origin: http://localhost:4545"`を付け、ログインの`Set-Cookie`は`-c`/`-b`で受け渡す。テスト用のログインは学籍番号`20240001`・パスワード`password123`(管理者は`90240001`。学籍番号は数字だけ)、**タブレットの画面は、最初に端末の登録が要る**(管理者`90240001`・`password123`で、名前を付けて登録する。`curl`ではタブレットのAPIにCookie`device`が要る)。**タブレットで借りるにはPINが要る**(先にWebでログインし、ダッシュボードの「PINを登録」から)。タブレットのカードは`IC-CARD-001`、物品のバーコードは`MAC-002`など(`MAC-001`はseedで貸出中)(`back/prisma/seed.ts`、開発のときは`/barcodes`で印刷できる)。返却はカード不要で、タブレットの最初の画面の「返す」から。

## コーディング規約

- バックエンドはESM(`"module": "NodeNext"`)。**importの末尾に`.js`を付け**、`src/`配下は`@/`から書く(例: `import { DomainError } from "@/lib/domain-error.js"`)。型だけのimportは`import type`(`verbatimModuleSyntax`)
- `strict`に加えて`noUncheckedIndexedAccess`・`exactOptionalPropertyTypes`が有効。配列の要素や省略可能な項目は`undefined`を考えて書く
- 1つの機能の中は routes → service → repository の向きにだけ依存する。本物の部品(Prisma・名簿の窓口・メール)を`new`するのは`buildDeps()`だけで、`create○○Routes(deps)`が受け取った部品でserviceを作る(DIコンテナは使わない。`docs/backlog.md` 0.7 R1・R2)
- 入力の検証は`*.schema.ts`のZodで、`lib/route.ts`の`route({ body: schema }, ...)`に渡す。`req.body`を直接読まない。ログインが要るrouteは`auth: true`を付けて`user`を受け取る(R3・R6)
- `shared/`の中のファイルどうしは、相対パス(`./x.js`)ではなく`@sinsakai/shared/x`で読み、ファイルを足したら`shared/package.json`の`exports`にも足す(Next.jsのTurbopackが`./x.js`を`x.ts`に読み替えず、画面のビルドが落ちるため。2026-10-24 P6-A)
- フロントのAPI呼び出しは`front/src/services/`(`ApiService`を継承)に置く。APIの形は`shared/`の型を使い、`front/src/types/`に手で書き直さない(古い重複の`lib/api.ts`・`lib/auth-api.ts`と手書きの型は2026-10-29に消した)
- コメントは「なぜ」を書く。何をしているかはコードで表す
- 動作確認用の`console.log`(利用者の情報を出すもの)は残さない
- ブランチは作業のまとまりごとに`fix/…`・`refactor/…`・`feat/…`・`docs/…`で切り、`main`へPRを出す(下の「開発の進め方」)。今は`develop`を使わず`main`を主軸にする(1人の開発で、本番の環境も無いため)。`develop`のブランチは消さずに残し、サーバーとCI/CDを作るときに、`develop`を開発用・`main`を本番用に分けるかを決める(2026-10-25、開発者の希望)
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
7. **聞いた質問に答えが無かったら、実装に入る前に聞き直す**。「おすすめどおりだろう」と決めつけない(2026-10-24、開発者の希望。H2・H3・H8を答えなしで進めてしまったため)。「基本的に叩き台どおり」と言われたときも、条件付きの叩き台(「〜なら B」など)や、開発者にしか分からないことは聞き直す。**ただし、返事から読み取れることは聞き直さない**(1つの返事が複数の質問の答えになっていることもある。しつこくしない)
8. **仕様書・決まり(`docs/`・`CLAUDE.md`・`.claude/rules/`・README)を更新するときは、古い記述と食い違いが残らないように、同じことを書いている所をすべて探して直す**(`grep`でファイルの名前・関数の名前・番号を探す。2026-10-24、開発者の希望)
9. **作業に入る前に、触る範囲の仕様と決まりを読み直す**: `docs/backlog.md`の関係する節(とくに「○○するときに」「触る機能から順に」のような、条件が付いた決め事)、`.claude/rules/`、`docs/`の関係する章。予定を見せるときに、当てはまる決め事を番号で挙げる(2026-10-28、開発者の希望。認証のAPIを移すときに0.7のT2(中の型をそろえる)を見落とし、Webのセッションで`Pick`の型を増やしてしまったため)
10. **確認なしで進めてよいと自分で判断したこと(文書・決まりの直しなど)も、後で「確認せずに直したもの」としてまとめて見せる**(2026-10-24、開発者の希望。CLAUDE.mdと`.claude/rules/`を確認なしで直したため。直したこと自体はよかった)

## ドキュメント

必要になったときに読む(自動では読み込まれない)。

| ファイル | 内容 |
|---|---|
| `docs/handoff.md` | **セッションの引き継ぎ**。今いる所、答えをもらっていない質問、環境の注意、最初に開発者と認識を確かめる文章。新しいセッションは最初に読む |
| `docs/spec.md` | 要件定義。何を満たすべきか、どこまで実装済みか、現状とのずれ、要確認 |
| `docs/backlog.md` | 残タスクと順番(リファクタと修正 → 在庫管理)。進め方(TDD) |
| `docs/auth.md` | 認証の作り直しの要件と方針(2026-10-23決定): タブレットの端末の登録、カードの番号 + PIN、セッションの期限、学籍番号とカードの番号の区別、総当たり対策、トークンの用途の分離 |
| `docs/api.md` | API設計(作り直しの案): URL・メソッド・ステータス・成功とエラーの形(RFC 9457)・資源の形・エラーの`code`の一覧・今のAPIとの対応 |
| `docs/architecture.md` | 仕組み: APIの一覧、認証とトークンの流れ、データモデル、レイヤの分け方 |
| `REFACTORING_PROGRESS.md` | 2026-02-12のフロントのリファクタリングと、`serialNumber`の不具合を追った記録 |
| `README.md` | 採用担当の人向けの紹介(今の状態、設計で考えたこと、AIと一緒に開発するための取り組み、分かっている課題、動かし方) |

観点ごとのスキル(TDD・テスト・Express・TypeScript・Prisma・DB・API・アーキテクチャ・セキュリティ・認証・CI/CD・Next.js・Docker・Git・コミット・要件定義など)は`.claude/skills/`にある。第三者のOSSなので、出典・ライセンス・取り込む前の確認・改変は`.claude/skills/ATTRIBUTIONS.md`。**スキルの内容とこのプロジェクトの決まり(このファイル・`.claude/rules/`・`docs/`)が食い違うときは、プロジェクトの決まりを優先する。** スキルを足す・更新するときは、ATTRIBUTIONS.mdの確認をやり直し、改変したらその節にライセンスと変えたことを書く。

領域ごとの細かいルールは`.claude/rules/`にあり、該当するファイルを触ったときに自動で読み込まれる: `backend.md`(`back/src/`)、`database.md`(`back/prisma/`)、`frontend.md`(`front/src/`)。
