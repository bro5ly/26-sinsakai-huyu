# 残タスク

上から順に進める。番号は`docs/spec.md`の要件(R-)・判断表(C)・現状とのずれ(ずれ)・要確認(Q)。

## 進め方

- **動きを変えない整理**(`refactor:`): 先に今の動きを確かめるテストを書いて緑にし、緑のまま形を変える
- **動きを変える修正**(`fix:`・`feat:`): 仕様の表に行を足してから、赤 → 緑 → 整える。緑になるたびに1コミット
- 判断は副作用(DB・時計・乱数・トークン・メール)の無い関数に出し、テストはその関数に対して書く。DBに触る部分は薄くする
- **実装を優先し、テストもClaudeが書く**(2026-10-23に変更。それまでは開発者が書く決まりだった)。大体の機能ができたら、最後のほうの機能だけ開発者が練習としてテストを書く
- **クラウドとMacの分担**(2026-10-24決定): Dockerの無いクラウドのセッションでは、テスト・型チェック・画面のビルドまでを確かめて、コミットとpushをする。PRを`main`に入れる前に、開発者のMacで`docker compose up -d --build -V api`・`npm test`・`curl`(ログイン・カード認証・貸し出し・返却)を確かめる。同じ確認を繰り返したくなったら、CI(下の0の項目)にする

## 0. テストの土台

- [x] `back/`にVitest 5.0.5を入れ、`docker compose exec api npm test`で動くようにする(Vitest 5はNode 22以上なので、APIのイメージをNode 20(サポート切れ)から24に上げた)
- [x] テストの置き場所を決める(`src/`の中で元のファイルの隣に`*.test.ts`)
- [x] CLAUDE.mdのコマンドの表に足す
- [x] `rental.status.test.ts`(S1〜S6・I1〜I4)を書いた。期限の比べ方を`<=`に変えるとS4が赤になることも確かめた
- [x] 画面(`front/`)のイメージもNode 20のまま。上げるかを決める(2026-10-24、`node:24-bookworm-slim`に上げた。0.7のP4)
- [ ] GitHub Actions(CI)で、pushとPRのたびにAPIのテストと型チェック・画面のビルドとリントを動かす(2026-10-24、開発者の希望で「いずれ」。Macでの同じ確認を繰り返したくなったらやる)
- [ ] APIのイメージ(`node:24-bookworm-slim`)にOpenSSLが無く、Prismaの道具(マイグレーション)が「OpenSSLの版が分からない」と警告する。今は動いているが、TLSで外部のDBにつなぐときに動かなくなるおそれがある。Dockerfileで`openssl`を入れる(2026-10-24、後回しに決定。ブランチ`fix/api-image-openssl`を`main`から切ってある)

## 0.5 データベースの見直し(貸し出しのリファクタの前に)

2026-10-23に決定。判断表の「貸出中」「延滞」の意味がDBの形で変わるので、先に直す。本番のデータは無いので、手元のDBはseedで作り直す。

- [x] `rental_setting`をやめ、`user`に`can_borrow`・`max_items`・`suspended_until`・`suspension_reason`を足す(Q5。スペルの誤りもここで直す)
- [x] `user`から名簿の写し(名前・学年・専攻・メール・シリアル番号・種別)を消し、`external_user`を学籍番号でたどる。権限は`user.role`(MEMBER/ADMIN)に分けた
- [x] 貸出中かどうかを`rental`だけで持つ: `item.status`から`RENTED`を外し、部分インデックス`rental_active_item_key`を付けた
- [x] `rental.status`を消した(返却済み = `returned_at`あり、延滞 = 期限切れで未返却。`rental.status.ts`)
- [x] `external_user.serial_number`を一意にする
- [x] `item.barcode`を必須にする
- [x] APIの返す形は変えない(フロントは変えていない)
- [x] 型チェック・ビルド・seed・通しの確認(2026-10-23、curlでA1〜A5・A7〜A9、同時の貸し出し、延滞の`OVERDUE`)
- [x] seedの学籍番号を数字にした(学籍番号の検証が数字だけなので、`S2024001`ではWebにログインできなかった)

確認中に見つけたこと(1で直す):
- ~~同時に借りられたときの2件目は409だが、文言が「既に登録されているデータです」~~ → 2026-10-24に`ITEM_ALREADY_RENTED`(「貸し出し中の物品です」)にした
- 貸し出し・返却の応答の`data.item.status`は、DBの値(`AVAILABLE`)のまま。画面は使っていない
- 画面はブラウザでまだ確かめていない(ページが200を返すことだけ確かめた)

## 0.6 名簿の窓口(Roster)

2026-10-23決定。本番の名簿は学校のDBかAPIを読む前提。カード認証は貸し出しの入口なので、貸し出しのリファクタの前に形を決める。

- [x] 名簿を読むインターフェース`Roster`を作る(`findByStudentId`・`findBySerialNumber`・`findManyByStudentIds`)。名簿の種別の型はPrismaに依存させない(`RosterUserType`)
- [x] 実装は今の`external_user`表を読む`PrismaRoster`だけ。学校の実装は名簿の形が分かってから足す
- [x] 名簿を使うservice(登録・ログイン・リフレッシュ・`/items/me`・カード認証)に`Roster`を外から渡す。テストでは偽の名簿(`FakeRoster`)を渡す。中身が素通しの`UserService`はなくした
- [x] `user.student_id`の外部キーとPrismaのリレーションを消す(ずれ12。2026-10-24決定 F1。マイグレーション`20261024000000_drop_roster_foreign_key`)。モックの名簿の表`external_user`は今のDBのまま置き、本番の名簿に替えるときに消す(F2)
- (名簿の窓口の組み立てを1か所にまとめることと`ROSTER_SOURCE`での切り替えは、0.7の組み立ての作り直し(R1)でやる。2026-10-24決定)
- (名簿に無い人・名簿が止まっているときの扱い(Q12・Q13)の判断表は、0.8の判断表Tと一緒に作る)

## 0.7 APIの形を`shared/`にまとめる(2026-10-23決定)

型を4か所(`back`の各`*.types.ts`、`front/src/types/`、`front/src/lib/api.ts`、`front/src/lib/auth-api.ts`)で別々に書いていて、中身がずれている(`docs/spec.md`の現状とのずれ17)。0.8でタブレットの応答の形が大きく変わるので、その前に1か所にする。

- 0.7の残りの順番(2026-10-24決定 S1-A): ①npm workspacesと`shared/`(両方のコンテナから`shared/`が見えるようにするDockerの作り直しも一緒に) → ②APIを1本ずつ新しいURLに移す(そのたびに、その機能の中の型T1〜T7もそろえる)。先に移すと、新しい形の型を`back`と`front`に別々に書いてから`shared/`へ移すことになり、同じ所を2回直すため
- [ ] npm workspacesにする(直下の`package.json`に`back`・`front`・`shared`)。ロックファイルを1つにまとめる
  - 決めたこと(2026-10-24 P1〜P5):
    - `shared/`はTypeScriptのまま使い、ビルドしない。サーバーの`tsx`もNext.jsもTypeScriptをそのまま読めるので、ビルドの手順と「ビルドし忘れ」を無くす(P1)
    - パッケージの名前は`@sinsakai/shared`(P2)
    - Dockerはビルドの起点をリポジトリ直下にし、コンテナにリポジトリ全体をつなぐ。各コンテナで要るものだけを入れる(`npm ci -w back`など)。ロックファイルが直下に1つなので、直下が見えないと入れられないため(P3)
    - 画面のイメージを`node:20-alpine`から`node:24-bookworm-slim`にそろえる。同じ版のnpmでロックファイルを作るため。Node 20はサポートが切れている(P4)
    - 最初のPRは仕組みだけにし、`shared/`にはエラーの`code`の一覧とRFC 9457の形だけを移す。`back`と`front`の両方がそれを使う。APIの形は次から移す(P5)
    - `shared/`の中のファイルどうしは`@sinsakai/shared/x`で読み、`shared/package.json`の`exports`にファイルごとの入口を書く。`./x.js`と書くと、Next.jsのTurbopackが`x.ts`に読み替えず画面のビルドが落ちたため。`.ts`を付けて読む案(B)は、back・front・sharedの3つのtsconfigを変えるので選ばなかった(P6-A)
- [ ] `shared/`を作り、`docs/api.md`で決めたAPIの入力と出力の形・エラーの形(RFC 9457)・`code`の一覧をZodのスキーマで書く(`z.infer`で型も作る)。今の`back/src/features/*/…schema.ts`の入力の検証もここに移す(エラーの形は2026-10-24、登録・ログインは2026-10-25に移した)
- [x] **エラーの扱いを作り直す(2026-10-24済み。0.7の最初にやる。workspacesと`shared/`より先に、サーバーの中だけで行う。`code`の一覧は依存の無いファイルに書き、`shared/`ができたら移す(2026-10-24、`shared/src/error-codes.ts`に移した)。2026-10-24決定 O1-A。新しいAPIは全部この形で作る。E1〜E4)**
  - 判断の関数(判断表C・T)は、Resultを返す(`{ ok: true }`か`{ ok: false, reason }`)。HTTPを知らない(E1)
  - serviceは、断るときに`throw new DomainError(code)`。持つのは`code`だけで、`code`は`docs/api.md`6章の一覧の型で縛る(一覧に無い値は型チェックで落ちる)
  - `code` → ステータスと画面の文言(`detail`)の対応表を、サーバーの1か所(`errors.ts`)に持つ(E2)
  - エラー用のミドルウェアを1つにする: `DomainError`は表を引いてRFC 9457で返す、入力の検証の失敗は400 `VALIDATION_ERROR`、想定外は500 `INTERNAL_ERROR`、存在しないURLも同じ形の404。controllerの`try/catch`と`handleError`はなくす(Express 5はthrowをミドルウェアに渡す)
  - 想定外の例外は、エラーの種類とスタックだけをログに出す。リクエストの中身(学籍番号・パスワードなど)は出さない(E3)
  - 今の`AppError`・`tabletMiddleware`の`next(err)`・`response-handler.ts`を置き換える
- [x] **組み立てとrouteの書き方を作り直す(2026-10-24済み、PR #9。エラーの扱いの直後。2026-10-24決定 R1〜R5)**
  - 組み立ては1か所: `src/deps.ts`の`buildDeps()`で本物の依存(Prisma・名簿の窓口・メール)を作り、`createApp(deps)`に渡す。`server.ts`は本物、テストは偽物を渡す(HTTPを通すテストをDB無しで書ける)。名簿の窓口の切り替え(`ROSTER_SOURCE`)もここだけ(R1)
  - controllerのクラスはなくし、`*.routes.ts`(`createAuthRoutes(deps)`など)に「入力 → service → 返す」を直接書く。判断はserviceと判断の関数に残す(R2)
  - 入力の検証は小さな関数(`route({ body: schema }, async ({ body, user }) => ...)`)で、検証してから型付きで渡す。`req.body as 型`の決めつけは使わない。スキーマは`shared/`から使う(R3)
  - `createApp`で、セキュリティのヘッダ(`helmet`)・JSONの大きさの上限・404のミドルウェア・エラー用のミドルウェアをかける。回数の制限(`express-rate-limit`)はログインなどのrouteにだけかける(数字は`docs/auth.md`4.6)(R4)
  - 進め方(2026-10-24決定 C1〜C7):
    - 順番は ①`buildDeps`・`createApp` → ②HTTPを通すテストで今の動きを守る → ③controllerを`*.routes.ts`と`route()`に置き換える → ④helmet・JSONの大きさの上限・回数の制限。①〜④の区切りごとに、前に予定・後に結果を見せて止まる(C1)
    - HTTPを通すテストは`supertest`で、偽の部品を渡した`createApp`を叩く。DBは使わない(C2)
    - 今回はURLと成功の応答の形を変えない。新しいURLに移すのは次の項目(C3)
    - `route()`は検証した`body`と`user`を渡し、応答は今どおり`res`で書く(C4)
    - 回数の制限は今はログインだけに、接続元ごと15分で20回(C5)
    - `supertest`・`helmet`・`express-rate-limit`は版を固定し、公開から2週間以上たった版にする。入れる前に版を開発者に見せる(C6)
    - `shared/`はまだ無いので、R3のスキーマは今の`*.schema.ts`を使い、`shared/`ができたら移す(C7)
    - テストは`vitest.config.ts`の`setupFiles: ["dotenv/config"]`で`.env`を自分で読む。Dockerの無い環境でも`npx vitest run`だけで動かすため(D1)
    - 名簿の切り替え`ROSTER_SOURCE`は、学校の名簿の実装ができるまで足さない。今は`buildDeps()`の1か所で`PrismaRoster`を作るだけ(D2)
    - ①は済み(2026-10-24)。あわせて、repositoryと名簿の窓口のPrismaを省略できないようにし(K1)、`lib/mail.ts`で`.env`を読み直すのをやめた(K2)。設定(`FRONTEND_URL`など)を1か所で読むかは④で決める(K3)
    - ②は済み(2026-10-24)。`src/app.test.ts`のH1〜H20(`supertest` 7.3.1)
    - ③の`route()`は`lib/route.ts`に置く。ログインが要るrouteは`route({ auth: true, body }, ...)`と書き、そのときだけ`user`(必ずある型)を渡す。無ければ`route()`が`UNAUTHENTICATED`で断るので、controllerの二重の確認(K4)は消える(R6)。コミットは「`route()`を足す」→ auth → items → rentals の4つに分ける(R7)
    - ③は済み(2026-10-24)。`lib/route.ts`(U1〜U5)と、3つの`*.routes.ts`。controllerは消した
    - `route()`の形は今のまま(ジェネリクスと条件付き型の1つの関数)にする。`route`と`authRoute`に分ける案・1つ目の引数を`bodySchema`にする案もあったが、型の守り(検証済みの`body`、必ずある`user`)は同じで、開発者が読み慣れる練習として今の形を選んだ(2026-10-24 W1)
    - ④は済み(2026-10-24)。`config.ts`(N1〜N8)、`helmet`(H21・H22)、ログインの回数の制限(H23〜H25)
    - ④のJSONの大きさの上限は、Expressの既定と同じ100kbをはっきり書く(L1)。回数の制限は接続元を`req.ip`で見分け、今は`trust proxy`を設定しない。本番の置き方が決まったら見直す(L2)。版は`helmet` 8.3.0・`express-rate-limit` 8.7.1(C6)
    - 環境変数は`src/config.ts`の`loadConfig(env)`でZodで1回だけ検証し、足りなければ起動のときに止める(K3を変更)。④の最初にやる(G1)。`server.ts`で読み、`buildDeps(config)`・`createApp(deps, config)`に引数で渡す。`lib/jwt.ts`は0.8で作り直すので、今は`config.ts`から読むだけ(G2)。必須にするのは今の既定値が無いものだけで、`PORT`・`FRONTEND_URL`は今の既定値を残す(G3)
- [ ] APIを`docs/api.md`の新しいURLと形に1本ずつ移す(画面も同じ変更で移し、古いURLは残さない)
  - 順番は 登録・ログイン(6本) → 本人(`/api/me`) → カタログ(`/api/item-types`・`/api/categories`)。タブレットの3本は今は移さず、0.8で作り直すときに新しい形で作る(0.8で端末の登録・PIN・サーバーのセッションに変わり、今移すと2回直すため)。PRはまとまりごとに1つ(2026-10-25 M1-A・M2-A)
  - 登録・ログインの6本(2026-10-25 A1〜A4): リクエストの項目名は`password`・`token`にする(A1)。認証コードの`purpose`は今は`"signup"`だけ受け付け、パスワードの再設定は0.8で足す(A2)。ログアウト(`DELETE /api/sessions/current`)ではDBのリフレッシュトークンも消す(A3。ずれ8・R-15)。6本のリクエストと応答は`shared/src/auth.ts`にZodで書き、backの検証とfrontの型の両方に使う。`back/src/features/auth/auth.schema.ts`は消す(A4。C7)
  - ログインでは、パスワードの長さを確かめず、空でないことだけを確かめる。長さ(8文字以上)は登録のときだけ。短く打ち間違えた人だけ「入力内容が正しくありません」になり、文言が分かれていたため(2026-10-25 B1-A)
  - 本人(2026-10-25 Me1〜Me4): `GET /api/items/me`を`GET /api/me`(プロフィールと貸し出しの決まり)と`GET /api/me/rentals`(借りている物)に分ける。カードの番号は、0.8で使い捨てのバーコード(`POST /api/me/tablet-codes`)ができるまで`Me.cardNumber`として返し、そのときに外す(Me1。今もダッシュボードのバーコードに使っているため)。画面の`AuthContext`は`Me`だけを持ち、借りている物はダッシュボードがその都度取る(Me2。貸し出すたびに変わるため)。`Rental.itemType`にジャンル`genre: { id, name }`を足す(Me3。ダッシュボードが出している)。返し終わった物の履歴(`?state=all`)は、履歴の画面を作るときに足す(Me4)
  - カタログ(2026-10-28 Ca1〜Ca4): `GET /api/items`を`GET /api/categories`・`GET /api/item-types`・`GET /api/item-types/{id}`にする(ログイン必須。Q11)。詳細の画面のURLは種類の名前ではなくID(`/items/[id]`)にする(Ca1)。どこからもリンクされていない物品の一覧の画面(`/items`)は消す。物品1つ1つの一覧は在庫管理(5)で作る(Ca2)。検索・ジャンル・カテゴリの絞り込みは今は画面でし、種類が増えたら`?categoryId=&genreId=&q=`を足す(Ca3)。全数と詳細の物品の一覧には廃棄済み(`DISPOSED`)を入れない。修理中・紛失は入れて状態で見せる(Ca4)
  - 詳細の物品の一覧に、バーコードは入れない。画面にバーコードがあると、実物を持たずにタブレットで読めてしまい、棚にある物が「貸出中」と記録されるおそれがあるため。バーコードは実物に貼った物だけから読む(2026-10-28 Ca5-B、開発者の指摘)
- [ ] **中の型をそろえる(各APIを移すときに、触る機能から順に。2026-10-24決定 T1〜T7)**
  - 中の型は機能ごとの`<機能>.types.ts`に置く(APIの型は`shared/`へ移るので、ここは中だけになる)(T1)
  - repositoryの約束はインターフェース(`UserStore`など)で、記録の型(`UserRecord`など)も名前で書く。repositoryは`implements`し、テストの偽物も同じインターフェースを満たす。`Pick<…>`や`NonNullable<Awaited<ReturnType<…>>>`の推論はやめる(T2)
  - Prismaの型を使ってよいのはrepositoryの中だけ。serviceが見るのは名前の付いた記録の型だけ(T3)
  - 引数が2つを超える、または同じ型が並ぶときはオブジェクトで渡す。名前はDBの列とそろえる(`expiredAt`ではなく`expiresAt`)(T4)
  - 日付は中では`Date`、APIの境目(`shared/`のスキーマ)でISOの文字列にする(T5)
  - ID・学籍番号・カードの番号に別の型を付けること(branded type)は今は入れない。取り違えはテストで見る(T6)
  - 使われていない型(`ItemWithDetail`・`RentalWithDetails`・`RentalBasic`・`SignupInput`・`loginInput`、画面の`TabletContext`など)はそのとき消す(T7)
- [ ] サーバーは、返す形がスキーマに合うことを型で確かめる(`satisfies`)
- [ ] 画面は手書きの型を消して`shared/`の型を使う。`lib/api.ts`・`lib/auth-api.ts`を消す。`as any`でずれを隠している所を直す
- [x] Dockerの作り直し: ビルドの起点をリポジトリ直下にし、webとapiの両方のコンテナから`shared/`が見えるようにする。`node_modules`のボリュームも合わせる(2026-10-24。各コンテナは`npm ci -w back -w shared`のように要るワークスペースだけを入れる。P3)
- [ ] 直下の`package.json`のscriptsに、よく使うコマンドの呼び名をまとめる(`npm test`・`npm run typecheck`・`npm run check`など。中で`docker compose exec ...`を呼ぶ)。CLAUDE.mdのコマンドの表も直す
- [ ] 型チェック・ビルド・テスト・受け入れ基準の通しで、動きが変わっていないことを確かめる(`refactor:`)

## 0.8 認証の作り直し(`docs/auth.md`。要確認A-Q1〜A-Q8は2026-10-23に叩き台どおり決定)

新しいAPIの形は`shared/`に書く(0.7)。

- [ ] 判断表T(タブレットで借りられるか)から例の表を作る
- [ ] タブレットの端末の登録(R-A1〜A3)
- [ ] タブレットの本人確認をサーバーのセッションにし、30秒・3分・完了で切る(R-A8〜A11)
- [ ] PINの登録とロック(R-A5〜A7)
- [ ] カード認証の応答から個人情報を外す(R-A12・A13)
- [ ] 無効な人を通さない(R-A14)
- [ ] 総当たりと列挙の対策(4.6)
  - 学籍番号ごとに失敗を数えて止める(DBの`failed_attempts`・`locked_until`)。今の接続元ごとの制限(0.7の④)は、同じWi-Fi(NAT)の全員で回数を分け合う。成功したログインは数えないようにした(2026-10-24 K9-B)が、1人が20回間違えると同じWi-Fiの全員が15分止まる。学籍番号ごとの制限を入れるときに、接続元ごとの回数を本番の置き方を見て決め直す(K9-C)
- [ ] JWTの鍵と用途の印を分ける(R-A16〜A18)。ログアウトでDBのトークンを消す(R-A19)のは2026-10-25に済み
- [ ] ダッシュボードの使い捨てのバーコード(R-28・R-29、A-Q6)
- [ ] パスワードの再設定(UC-4、R-33〜R-37)。認証コードの表に用途(登録・再設定)を足す

`2. 登録・ログイン`のうち、鍵の分離・ログアウト・回数の制限はここに含める。

## 1. 貸し出し・返却(タブレット)

- [ ] 判断表(C1〜C8)から例の表(正常系・異常系・境界値)を作る
- [ ] 貸し出せるかの判断を`rental.repository.ts`の`saveCheckout`から、副作用の無い関数(例: `canCheckout`)に出す。repositoryは読み書きだけにする
- [ ] 返却期限の計算に「今」を外から渡す
- [ ] C4〜C7: `RentalSetting`(貸し出し停止・停止期間・上限数)と延滞を見る(ずれ6、Q5・Q6)
- [ ] 同じ物品を同時に借りても1件になるようにする(状態が`AVAILABLE`のときだけ更新する)
- [x] `tabletMiddleware`のエラーをJSONで返す(2026-10-24。期限切れは`SESSION_EXPIRED`)。画面が401をすべてセッション切れとみなしていた件は、`shared/`の`code`で見分けるようにして直した(2026-10-24 V1-A。R-26)
- [ ] タブレット用トークンとWebのトークンを互いに使えないようにする(ずれ3)

## 2. 登録・ログイン

- [ ] `auth.service.ts`の副作用(時計・認証コードの乱数・トークン・bcrypt・メール)を外から渡す
- [ ] 認証コードを再申請できるようにする(ずれ1、R-5)
- [ ] 登録用トークンを専用の鍵か用途の印で分ける(ずれ2)
- [x] ログアウトでDBのリフレッシュトークンも消す(ずれ8、R-15。2026-10-25、登録・ログインを新しいURLに移すときに直した。A3)
- [ ] 認証コードの失敗回数の上限(R-8、Q1)、ログイン失敗の文言(R-16、Q2)

## 3. 掃除

- [ ] 利用者の情報を出す`console.log`を消す(ずれ5)
- [ ] 中身が素通しのserviceと空のファイル(`item.schema.ts`・`auth/strategies/`)を整理する
- (フロントの古いAPI呼び出し`lib/api.ts`・`lib/auth-api.ts`の整理は、0.7でやる)
- [x] 存在しないAPIを呼ぶ`getItemsByTitle`を消す(ずれ11。2026-10-28、カタログを新しいAPIに移すときに`item.service.ts`ごと消した)
- [ ] 画面のリントのエラーを直す(2026-10-24に7件見つけた。2026-10-28には5件。`npm run lint`が落ちる): `barcodes/page.tsx`・`dashboard/page.tsx`の`useEffect`の中の`setState`、`contexts/AuthContext.tsx`の`any`、`components/BarcodeScanner.tsx`の宣言より前に使っている変数(2件)。警告も6件ある。`items/page.tsx`と`dashboard/page.tsx`の`any`の分は、その所を作り直したときに消えた
- [ ] `app/page.tsx`(Next.jsの初期のまま)をどこかへの案内にする
- [ ] `/barcodes`(テスト用に全部の物品とカードのバーコードを印刷する画面)は、誰でも開ける。実物を持たずに借りられてしまうので、本番の前に管理者だけにするか消す(2026-10-28、Ca5の話から)

## 4. フロントの認証

- [ ] `AuthContext`に読み込み中の状態を持たせ、`dashboard`の2秒待ちをやめる
- [ ] アクセストークンのCookieの期限をサーバーと揃える(ずれ10)
- [ ] 画面の崩れを直す(2026-10-24、開発者がブラウザで見つけた。文字が重なっている所、ボタンのアイコンが正しく出ない所がある。どの画面のどこかは、直すときに開発者に聞く。workspacesとDockerの作り直し(0.7)の前からあったかは分からない)

## 5. 在庫管理(新機能)

- [ ] `docs/inventory.md`に要件を書く(UC-21〜UC-24: 物品の種類と物品の追加・編集、状態の変更、貸出中の物を紛失にしたときの貸し出しの記録の扱い、誰が何を借りているかの一覧、利用者の貸し出しを止める・上限を変える)
- [ ] 管理者の権限(`user.role = ADMIN`)の確かめ方を決める

## 6. Slackでの返却期限の通知(在庫管理のあと)

- [ ] 要件を書く(UC-11: 期限が近い・過ぎたときに、誰に・いつ・何を送るか。Slackのアカウントとのつなげ方)。テーブル`notification`は用意してある
