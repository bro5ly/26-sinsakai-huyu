# 仕組み

何を満たすべきかは`docs/spec.md`。ここは「どう作ってあるか」と、その理由。

## 全体

```
ブラウザ(学生のスマホ・PC)   タブレット(受付)
        │                          │
        └──── Next.js (web :4545) ─┘
                   │ fetch(NEXT_PUBLIC_API_URL)
             Express API (api :5454)  /api/*
                   │ Prisma(@prisma/adapter-pg)
             PostgreSQL 16 (db :1919→5432)   ← Prisma Studio (:5555)
                   │
             SMTP(認証コードのメール。手元では mailpit が受け取り、:8025 で見る)
```

- 4つともDocker Composeで起動する。設定はリポジトリ直下の`.env`(全サービス共通)。画面からAPIへのURLは`front/.env`の`NEXT_PUBLIC_API_URL`
- CORSは`FRONTEND_URL`(既定`http://localhost:4545`)だけを許し、Cookieを通す(`credentials: true`)
- すべての応答に`helmet`のセキュリティのヘッダを付ける。JSONは100kbまで
- `POST /api/sessions`(ログイン)は、学籍番号ごとに続けて5回間違えたら15分止める(DBの回数)。加えて、接続元ごとに失敗を15分で100回まで(`express-rate-limit`、メモリで数える。成功したログインは数えない)。どちらも429 `RATE_LIMITED`。認証コードの申請は学籍番号ごとに1分に1回・1時間に5回、タブレットの本人確認は端末ごとに1分で失敗20回まで(`docs/auth.md` 4.6)

## バックエンドのレイヤ

`back/src/features/<機能>/`ごとに次の向きにだけ依存する。

| ファイル | 役目 |
|---|---|
| `*.routes.ts` | `create○○Routes(deps)`。受け取った部品でserviceを作り、URL・ミドルウェア・`route()`をつなぐ。1本ごとに「入力 → service → 返す」を書く(どのAPIも`shared/`の形で包まずに返す)。Cookieの読み書きもここ。`try/catch`は書かない(失敗はthrowするだけ) |
| `*.service.ts` | 決まりごと(期限・重複・状態)。断るときは`DomainError(code)`を投げる。HTTPのステータスと文言は持たない |
| `*.repository.ts` | Prismaでの読み書き。複数のテーブルにまたがる書き込みは`$transaction` |
| `*.schema.ts` | Zodのスキーマ |
| `*.types.ts` | 返す形の型(Prismaの`GetPayload`など) |

組み立ては`src/deps.ts`の`buildDeps()`(本物の部品を作るのはここだけ)と`src/app.ts`の`createApp(deps, config)`(helmet・CORS・JSON・Cookie・各ルーティング・404・エラー用のミドルウェア)。環境変数を読むのは`src/config.ts`の`loadConfig()`だけで、足りなければ起動のときに止まる。`server.ts`が`getConfig()`で読み、`createApp(buildDeps(config), config).listen(config.port)`する。テストは偽の部品と設定を渡す。

画面と共通の形は`shared/`(`@sinsakai/shared`): `error-codes.ts`(`code` → ステータス・文言の表。`docs/api.md`6章)、`problem.ts`(失敗の応答の形`problemSchema`)。

共通の部品は`src/lib/`: `route.ts`(`route()`。Zodで入力を検証してから型付きで渡し、`auth: true`ならログイン中の`user`を渡す)、`domain-error.ts`(`DomainError`)、`problem.ts`(エラーをRFC 9457の形に変える`toProblem`。Zodは400 `VALIDATION_ERROR`、壊れたJSONも400、Prismaの一意制約違反は409 `CONFLICT`(DBの列名は出さない)、P2025は404 `NOT_FOUND`、それ以外は500 `INTERNAL_ERROR`)、`session-token.ts`(推測できない番号とそのハッシュ)、`rate-limit.ts`、`mail.ts`(nodemailer)、`prisma.ts`。失敗を返すのは`middleware/error.middleware.ts`だけで、存在しないURLも同じ形の404にする。

`user/`だけは`UserRepository.ts`・`UserService.ts`という古い名前で、routeを持たず`auth`から使われる。

## API

すべて`/api`の下。

どのAPIも`docs/api.md`の新しい形(包まない。形は`shared/src/`の`auth.ts`・`me.ts`・`catalog.ts`・`tablet-devices.ts`・`tablet.ts`。2026-10-25〜29)。

| メソッドとパス | 認証 | 内容 | 返すもの |
|---|---|---|---|
| `POST /verification-codes` | なし | `{ studentId, purpose: "signup" }`。名簿を確かめ、認証コードをメールで送る | 202(本文なし。名簿にいてもいなくても同じ) |
| `POST /verification-tokens` | なし | `{ studentId, purpose, code }` | 201 `{ token, expiresAt }`(登録用トークン) |
| `POST /users` | なし | `{ token, password }`。名簿にいる人の利用者を作る | 201 `{ user }`(+Cookie`session`) |
| `POST /sessions` | なし | `{ studentId, password }`(ログイン) | 201 `{ user }`(+Cookie`session`) |
| `DELETE /sessions/current` | Cookie | Cookieを消し、DBのセッションも消す(ログアウト) | 204(本文なし) |
| `GET /categories` | Webのセッション | カテゴリとその中のジャンル(絞り込みの選択肢) | 200 `{ items: Category[] }` |
| `GET /item-types` | Webのセッション | 種類ごとの一覧(貸し出せる数と全数。全数に廃棄済みは入れない) | 200 `{ items: ItemTypeSummary[] }` |
| `GET /item-types/{id}` | Webのセッション | 種類の詳細と、物品1つ1つの状態(バーコードは出さない。廃棄済みは入れない) | 200 `ItemTypeDetail`、無ければ404 |
| `GET /me` | Webのセッション | 本人のプロフィール(名簿の名前・メール・学年・専攻・カードの番号)と貸し出しの決まり(借りている数・延滞の有無はサーバーで数える)、PINの状態(登録済みか・ロック中か) | 200 `Me` |
| `GET /me/rentals` | Webのセッション | 本人が借りている物(状態とジャンル付き、借りた日の新しい順) | 200 `{ items: Rental[] }` |
| `PUT /me/pin` | Webのセッション | `{ pin, password }`。パスワードを入れ直し、タブレット用のPIN(4桁。推測しやすいものは400)を登録・変更する。失敗の回数とロックも解く。失敗は接続元ごとに15分で100回まで | 204、パスワード違いは403 `WRONG_PASSWORD` |
| `POST /tablet-devices` | なし(本文で管理者を確かめる) | `{ studentId, password, name }`。置くタブレットの上で端末を登録する(Webのセッションは作らない) | 201 `TabletDevice`(+Cookie`device`) |
| `GET /admin/tablet-devices` | Webのセッション(管理者) | 取り消していない端末の一覧 | 200 `{ items: TabletDevice[] }` |
| `DELETE /admin/tablet-devices/{id}` | Webのセッション(管理者) | 端末を取り消す(行は消さない) | 204 |
| `GET /tablet/device` | 端末 | この端末が登録されているか | 200 `{ id, name }` |
| `POST /tablet/sessions` | 端末 | `{ cardNumber, pin }`。カードとPINで本人確認し、その端末でだけ使える3分のセッションを作る(判断表T。5回間違えるとロック) | 201 `{ token, expiresAt, user: { displayName }, rentals: { title, dueDate, state }[] }` |
| `DELETE /tablet/sessions/current` | 端末 + タブレットのセッション | 「終わる」・完了の10秒・無操作でセッションを消す | 204 |
| `POST /tablet/rentals` | 端末 + タブレットのセッション | `{ barcode }`。判断表C(物品の状態・止められている・停止期間・延滞・上限)で判断して貸し出す。借りた端末を記録する | 201 `Rental` |
| `POST /tablet/returns` | 端末だけ(カード・PIN不要) | `{ barcode }`。返却する(本人でなくてよい)。返した端末を記録する | 201 `Rental`(返却日時入り) |

登録・ログインの`user`は`SessionUser`(`id, name, studentId, userType, role`)。学年・専攻は`/me`で取る。カードの番号はどの応答にも入れない(2026-10-29にダッシュボードのバーコードをやめ、`Me.cardNumber`を外した。G0)。

## 認証とトークン

2026-10-28に、WebのログインをJWTからサーバーのセッションに変えた(`docs/backlog.md` 0.8 A8-3。理由は`docs/auth.md`の2章)。2026-10-29にタブレットの本人確認もカードとPINのセッションにし、JWTはどこにも使っていない。

| もの | 期限 | 作り方 | 置き場所 | 用途 |
|---|---|---|---|---|
| Webのセッション | 作ってから7日(延ばさない。A8-6) | `newToken()`(32バイトの乱数) | HttpOnly・`SameSite=Strict`のCookie`session`。DBの`session`には`hashToken()`(SHA-256)だけ | ログインが要るAPIすべて |
| 登録用トークン | 15分・1回だけ | `newToken()` | 画面のメモリ。DBの`verification_codes.token_hash`にハッシュ | `/users` |
| タブレットの端末の番号 | 400日(使うたびに付け直す。D3) | `newToken()` | HttpOnly・`SameSite=Strict`のCookie`device`。DBの`tablet_device`には`hashToken()`だけ | `/tablet/*`すべて |
| タブレットのセッション | 作ってから3分・無操作30秒(R-A9) | `newToken()` | 画面のメモリ →`Authorization: Bearer`。DBの`session`(種類`TABLET`、作った端末・最後に使った日時)には`hashToken()`だけ | `/tablet/rentals` |

- `createAuthMiddleware`がCookieの番号をハッシュにしてDBで探し、`checkSession`(期限・種類が`WEB`か・`is_active`)で確かめてから`req.user`に入れる。毎回DBを見るので、ログアウト・取り消し・無効にした人は次のリクエストから止まる。名簿はログインのときだけ見る(A8-10)
- 1人が何件でもセッションを持てる(端末ごと。Q9)。ログアウトはそのセッションだけを消す
- `/admin`の入口で、`createAuthMiddleware`の後に`requireAdmin`が管理者かを確かめる(管理者でなければ403 `FORBIDDEN`。D1)
- タブレットの貸し出し・返却は、`createTabletSessionMiddleware`が`Authorization: Bearer`の番号をDBで確かめる(`checkTabletSession`: 種類が`TABLET`・作った端末と同じ・無操作30秒・3分。時間切れは401 `SESSION_EXPIRED`)。通るたびに最後に使った日時を書き換える
- `/tablet`の入口で、`createDeviceMiddleware`が端末のCookieをDBで確かめる(無い・取り消し済みは401 `DEVICE_NOT_REGISTERED`)。最後に使った日時を書き換え、Cookieを付け直す(D3・D5)
- 書き換えのリクエスト(GET・HEAD・OPTIONS以外)は、`Origin`が`FRONTEND_URL`と同じでなければ403 `FORBIDDEN_ORIGIN`(`createOriginCheck`。A8-7・A8-11)
- タブレットのトークンはWebのAPIでは通らない(WebはCookieのセッションしか見ない)。Webのセッションもタブレットでは通らない

### 画面の起動時の流れ(`front/src/contexts/AuthContext.tsx`)

1. `status`は`"loading"`から始まる。開いたときに`GET /me`を1回呼ぶ(Cookieはブラウザが付ける)
2. 通れば`"authenticated"`と本人の`Me`。401などで通らなければ`"unauthenticated"`
3. ページは`"unauthenticated"`のときだけ`/auth`へ送る。`"loading"`の間は読み込み中を出す。借りている物はログインの状態に入れず、ダッシュボードが`/me/rentals`で取る

## データモデル

```
Category 1─* Genre 1─* ItemType 1─* Item 1─* Rental *─1 User 1─1 ExternalUser(学籍番号でつながる)
                  └──── ItemTypeGenre ───┘(多対多。今は未使用)  ├─* Session(Web・タブレット。端末ごと)
                                                               └─* Notification(未使用)
VerificationCode(学籍番号ごとに1件の認証コード)
TabletDevice *─1 User(登録した管理者)
```

| テーブル | 中身 |
|---|---|
| `external_user` | 学校の名簿の代わり。学籍番号・メール・シリアル番号(一意)・名前・学年・専攻・種別(学生/教職員/外部)。**名前などはここにだけ持つ** |
| `user` | 登録した利用者。名簿の写しは持たず、`student_id`で名簿をたどる。パスワード・権限(`role`: 一般/管理者)・貸し出しの決まり(`can_borrow`・`max_items`初期値5・`suspended_until`・`suspension_reason`)・`is_active`・タブレット用のPIN(`pin_hash`はbcryptのハッシュ、`pin_failed_attempts`、`pin_locked_at`はロックした日時で、Webで登録し直すまで解けない)・Webのログインの失敗(`login_failed_attempts`、`login_locked_until`は止める期限で、15分で解ける) |
| `verification_codes` | 登録の認証コード。主キーが学籍番号。コードはSHA-256のハッシュ(`code_hash`)だけを持ち、間違えた回数(`attempts`)が5回になったら行ごと消す。申請し直したら行を置き換える。コードが合ったら登録用トークンのハッシュと期限も入れ、登録したら行ごと消す |
| `tablet_device` | 貸し出しを受け付けるタブレットの端末。名前(管理者が付ける)・番号のハッシュ(一意)・登録した管理者・最後に使った日時・取り消した日時(行は消さない) |
| `session` | ログインのセッション。番号のハッシュ(一意)・利用者・種類(`WEB`・`TABLET`)・期限。タブレットのものは作った端末と最後に使った日時も持つ。利用者を消すと一緒に消える |
| `category` / `genre` | 分類(例: 機材 > ノートパソコン) |
| `item_type` | 物品の種類。書籍の項目(著者・出版社・ISBN)と機材の項目(メーカー・型番)を両方持つ。`rentalPeriodDays` |
| `item` | 物品1つ。`barcode`(必須・一意)・`location`・`status`(物そのものの状態) |
| `rental` | 貸し出しの記録。`rentedAt`・`dueDate`・`returnedAt`・借りた端末・返した端末。状態の列は持たない |
| `notification` | 通知の予定(Slack用)。未使用 |

**名簿は本番では学校のDBかAPIになる前提**(2026-10-23決定)。今の`external_user`表と、`user.student_id`の外部キー・JOINは仮の形で、名簿の窓口(`Roster`)に置き換える予定(`docs/backlog.md`の0.6)。新しく名簿を読むコードを書くときは、`externalUser`のJOINを増やさない。

2026-10-23に、名簿の写し・`rental_setting`・「貸出中」の二重管理をやめた(理由は`docs/spec.md`の要確認Q5と`docs/backlog.md`の0.5)。

### 状態

- `ItemStatus`は物そのものの状態だけ: `AVAILABLE`(使える) / `MAINTENANCE` / `LOST` / `DISPOSED`
- 貸し出しの状態は列に持たず、`returnedAt`と`dueDate`から決める(`features/rentals/rental.status.ts`): 返却済み = `returnedAt`あり、延滞 = 未返却で期限切れ、それ以外は貸出中
- 「返却されていない貸し出しは物1つにつき1件」を部分インデックス(`rental_active_item_key`、`WHERE returned_at IS NULL`)で守る。同時に借りられても2件目は一意制約違反(409)になる
- APIは以前と同じ形で返す: 物品の`status`は貸出中なら`RENTED`、貸し出しの`status`は`RENTING`/`RETURNED`/`OVERDUE`、(2026-10-23時点の)`/items/me`の`rentalSetting`は`user`の列から組み立てる

## フロントエンド

| ページ | 内容 | 主に使うもの |
|---|---|---|
| `/auth` | ログインと、3段階の新規登録 | `useAuthForm`、`components/auth/` |
| `/dashboard` | 自分の情報・バーコード・借りている物・カタログ(検索・ジャンル・カテゴリの絞り込みは画面でする) | `useAuth`、`useMyRentals`、`useCatalog`、`components/dashboard/` |
| `/items/[id]` | 種類の詳細(物品1つ1つの置き場所と状態) | `useItemType` |
| `/tablet` | 受付端末の画面。未登録の端末なら登録の画面(管理者の学籍番号・パスワード・端末の名前)。登録済みなら、カード → PIN → 操作の選択(名前と借りている物の名前・期限・延滞) → バーコード → 完了。無操作30秒・完了10秒・「終わる」で最初に戻る | `useTabletDevice`、`TabletDeviceRegistration`、`useTabletOperations`、`BarcodeScanner`(html5-qrcode)、`BarcodeInput` |
| `/admin/tablets` | 管理者だけ。タブレットの端末の一覧と取り消し | `useAdminTabletDevices` |
| `/barcodes` | 開発のときだけ。テスト用のバーコードとカード番号の印刷ページ(seedと同じ値を直書き。`page.dev.tsx`で、本番のビルドには入らない) | `react-barcode` |
