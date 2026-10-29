# API設計

画面とサーバーの間の約束(URL・メソッド・ステータス・リクエストとレスポンスの形・エラー)を決める。ここで決めた形を、Zodのスキーマで`shared/`に書き(`docs/backlog.md`の0.7)、リクエストとレスポンスの型はそこから作る。

- 何を満たすべきかは`docs/spec.md`、認証の方針は`docs/auth.md`、今の仕組みは`docs/architecture.md`
- 2026-10-23に今のAPIを調べて書いた(2章)。**要確認API-Q1〜API-Q9は、2026-10-23に叩き台どおりに決定した**。カタログはログイン必須(`docs/spec.md`のQ11)

## 1. 目的

今のAPIは、URLが動作の名前(`signin`・`checkout`)になっていて、応答の包み方・ステータス・エラーの形がばらばらで、DBの列がそのまま外に出ている。画面はその形を手書きの型で推測して受けている(`docs/spec.md`の現状とのずれ17)。

成功の目安:
- どのAPIも、同じ決まり(3章)で読み書きできる
- 応答には画面が使うものだけが入り、DBの都合(内部のID・作成日時など)が出ない
- エラーはいつもJSONで、`code`で分岐できる
- リクエストとレスポンスの型が1か所(`shared/`)にあり、画面とサーバーで食い違わない

## 2. 今のAPIの問題(2026-10-23に確かめた)

| # | 問題 | 例 | 直したか |
|---|---|---|---|
| P1 | URLが動作の名前 | `/tablet/signin`・`/tablet/checkout`・`/tablet/return`・`/auth/verify-code`・`/auth/request-verification` | 済み(タブレットの3本は2026-10-29に`/tablet/sessions`・`/tablet/rentals`・`/tablet/returns`にした) |
| P2 | URLの書き方がばらばら | `refreshSession`(キャメル)と`request-verification`(ハイフン) | 一部(登録・ログインは2026-10-25) |
| P3 | 置き場所がずれている | 自分の情報が`/items/me`。`/tablet/*`は資源でなく端末でまとめている | 一部(本人は2026-10-25に`/api/me`へ) |
| P4 | 物品の種類のAPIが無い | カタログの詳細は、全件を取って画面でタイトルで絞り込んでいる | 済み(2026-10-28) |
| P5 | 作ったときも200 | 登録・貸し出し | 済み(2026-10-29。`sendSuccess`を消した) |
| P6 | ステータスの意味のずれ | ログインでパスワード違いは400、利用者がいないと404(どちらも401で、違いから登録済みかが分かる)。期限切れの認証コードは410で`VERIFICATION_NOT_STARTED` | 済み(2026-10-24) |
| P7 | 同じ`code`を別の意味に使う | `ITEM_NOT_AVAILABLE`が400と409の両方 | 済み(2026-10-24) |
| P8 | 不正な入力で500になる(不具合) | Cookie無しのリフレッシュ、壊れた登録用トークンでの登録 | 済み(2026-10-24) |
| P9 | 包み方がばらばら | `{ success: true, ...data }`で展開するので、`user`が外に出たり`data`に入ったりする。`success`はHTTPのステータスと同じことの二重 | 一部(タブレットの3本だけ残っている。0.8) |
| P10 | DBの列がそのまま出る | 物品に`itemTypeId`・`genreId`・`notes`・`createdAt`・`updatedAt` | 一部(本人・カタログは2026-10-25〜28) |
| P11 | 同じ名前で意味が違う | 物品の`status`は計算した値(RENTEDを含む)、貸し出しの応答の中の`item.status`はDBの値 | 一部(本人・カタログは`state`に。2026-10-25〜28) |
| P12 | 画面の文言が応答に入る | 「認証に成功しました」など | 一部(登録・ログインは2026-10-25) |
| P13 | JSONで返らないエラーがある | 存在しないURLの404、タブレットの認証の失敗(Express既定のHTML) | 済み(2026-10-24) |
| P14 | DBの中身がエラーに漏れる | 一意制約の違反で、制約の列名を`target`として返す | 済み(2026-10-24) |
| P15 | `code`の一覧が無い・綴りの誤り | `SUTUDENT_ID_NOT_FOUND` | 済み(2026-10-24) |
| P16 | 一覧が全件だけ | 物品の一覧に絞り込みもページ分けも無い | |

## 3. 全体の決まり

### 3.1 URL

- 置き場所は`/api`の下。**バージョンは付けない**(API-Q1)
- 資源は**名詞の複数形**、小文字とハイフン(`/item-types`)。動作はメソッドで表す
- ログイン中の本人は`/me`、タブレットの端末からだけ使うものは`/tablet/...`、管理者だけのものは`/admin/...`の下に置く
- IDはこのシステムのID(UUID)。学籍番号・カードの番号はURLに入れない(ログやブラウザの履歴に残るため)

### 3.2 メソッドとステータス

| 場面 | メソッド | ステータス |
|---|---|---|
| 取る | GET | 200 |
| 作る(登録・ログイン・貸し出し・返却) | POST | **201**(作ったものを返す) |
| 一部を変える | PATCH | 200(変えたものを返す) |
| 置き換える(PINなど) | PUT | 204 |
| 消す・終える(ログアウト) | DELETE | 204 |
| 受け付けたが結果を言わない(認証コードの送信。列挙の対策) | POST | **202** |
| 入力の形が違う | — | 400 `VALIDATION_ERROR` |
| ログインしていない・トークンが無効・IDかパスワードが違う | — | 401 |
| ログインはしているが権限が無い(管理者でない) | — | 403 |
| 無い | — | 404 |
| 今の状態ではできない(貸出中・延滞中・上限など) | — | 409 |
| 回数の制限 | — | 429(`Retry-After`を付ける) |
| サーバーの不具合 | — | 500(中身は言わない) |

### 3.3 成功のときの形

- **包まない**。資源そのものを返す(`success`は付けない。API-Q2)
- 一覧は`{ "items": [...] }`。ページ分けが要るものだけ`nextCursor`を足す(API-Q5)
- 項目名はキャメルケース。日付と時刻は**ISO 8601の文字列(UTC)**(`"2026-10-30T02:55:44.527Z"`)
- 画面に出す文言は入れない。画面は`code`や状態の値から、自分で文言を決める
- 返すのは画面が使う項目だけ。DBの都合の項目(`itemTypeId`・`createdAt`・`updatedAt`など)は返さない

### 3.4 エラーのときの形(RFC 9457 Problem Details。API-Q3)

いつも`Content-Type: application/problem+json`で返す。存在しないURL・認証の失敗・想定外の例外も同じ形にする。

```json
{
  "type": "about:blank",
  "title": "Conflict",
  "status": 409,
  "code": "ITEM_ALREADY_RENTED",
  "detail": "貸し出し中の物品です",
  "errors": [{ "path": "barcode", "message": "バーコードは必須です" }]
}
```

- `code`: 画面が分岐に使う値(大文字とアンダースコア)。一覧は6章。**ここが約束で、`detail`の文言は変わってよい**
- `detail`: 人が読む説明(日本語)。DBの列名・制約名・例外の中身は入れない
- `errors`: 入力の検証の失敗のときだけ(項目ごと)
- 500のときは`code: "INTERNAL_ERROR"`だけを返し、中身はサーバーのログにだけ出す(個人情報は出さない)

### 3.5 認証の渡し方(`docs/auth.md`)

| 誰が | 渡し方 |
|---|---|
| Web(学生・管理者) | セッションの番号をHttpOnly・`SameSite=Strict`のCookie`session`(7日)。本文にトークンは入れない。書き換えのリクエストは`Origin`が画面のURLであること(2026-10-28 A8-3・A8-7) |
| タブレットの端末 | 端末の登録の番号をHttpOnly Cookie(`/api/tablet/...`のすべてで確かめる) |
| タブレットで本人確認した人 | 本人確認のセッションの番号(サーバーに持つ乱数)を`Authorization: Bearer` |

## 4. APIの一覧(案)

### 4.1 登録・ログイン(Web)

**2026-10-25に移した**(2026-10-28にCookieのセッションにし、`accessToken`とリフレッシュ(`POST /api/sessions/refresh`)を無くした。A8-3。パスワードの再設定は0.8。認証コードの`purpose`は今は`"signup"`だけ。形は`shared/src/auth.ts`)。

| メソッドとURL | 認証 | リクエスト | 成功 | おもなエラー | ユースケース |
|---|---|---|---|---|---|
| `POST /api/verification-codes` | なし | `{ studentId, purpose: "signup" \| "password-reset" }` | **202**(本文なし。名簿にいてもいなくても同じ。申請し直したら前のコードは通らない) | 400・429(学籍番号ごとに1分に1回・1時間に5回。名簿にいない番号も同じ) | UC-1・UC-4 |
| `POST /api/verification-tokens` | なし | `{ studentId, purpose, code }` | 201 `{ token, expiresAt }` | 400・401 `INVALID_CODE`(5回目の間違いでコードを消す。R-8) | UC-1・UC-4 |
| `POST /api/users` | なし | `{ token, password }` | 201 `{ user: SessionUser }` + Cookie | 400・401 `INVALID_TOKEN`・409 `ALREADY_REGISTERED` | UC-1 |
| `POST /api/sessions` | なし | `{ studentId, password }` | 201 `{ user: SessionUser }` + Cookie | 400・401 `INVALID_CREDENTIALS`・429 | UC-2 |
| `DELETE /api/sessions/current` | Cookie | なし | 204(Cookieを消し、DBのセッションも消す) | — | UC-3 |
| `POST /api/password-resets` | なし | `{ token, password }` | 204(その人のWebのセッションを全部消す) | 400・401 `INVALID_TOKEN` | UC-4 |

### 4.2 本人(Web)

**`GET /api/me`・`GET /api/me/rentals`は2026-10-25に移した**(`Me`に0.8まで`cardNumber`、`Rental.itemType`に`genre`。形は`shared/src/me.ts`)。2026-10-28に`PUT /api/me/pin`を作った(0.8のc)。使い捨てのバーコードは0.8のg。

| メソッドとURL | 認証 | リクエスト | 成功 | ユースケース |
|---|---|---|---|---|
| `GET /api/me` | Web | — | 200 `Me` | UC-5 |
| `GET /api/me/rentals` | Web | `?state=active`(既定)`\|all`(`all`は履歴の画面を作るときに足す。2026-10-25 Me4) | 200 `{ items: Rental[] }` | UC-5・UC-11 |
| `PUT /api/me/pin` | Web | `{ pin, password }`(数字4桁。パスワードを入れ直す。P1。同じ数字・連続した数字は400。P2) | 204(ロックも解除)。パスワードが違えば403 `WRONG_PASSWORD`(P5)。失敗は接続元ごとに15分で100回まで(P6・F2) | UC-7 |
| `POST /api/me/tablet-codes` | Web | — | 201 `{ code, expiresAt }`(60秒の使い捨て。カードを忘れたとき) | UC-10 |

### 4.3 カタログ(Web。**ログイン必須**。`docs/spec.md`のQ11、2026-10-23決定)

**2026-10-28に移した**(絞り込みは今は画面で。全数と詳細に廃棄済みを入れない。詳細にバーコードを入れない。形は`shared/src/catalog.ts`)。

| メソッドとURL | 認証 | リクエスト | 成功 | ユースケース |
|---|---|---|---|---|
| `GET /api/categories` | Web | — | 200 `{ items: Category[] }`(ジャンル付き。絞り込みの選択肢) | UC-6 |
| `GET /api/item-types` | Web | `?categoryId=&genreId=&q=`(今は付けず、画面で絞り込む。種類が増えたら足す。2026-10-28 Ca3) | 200 `{ items: ItemTypeSummary[] }`(貸し出せる数・全数付き) | UC-6 |
| `GET /api/item-types/{id}` | Web | — | 200 `ItemTypeDetail`(物品1つ1つの状態付き) | UC-6 |

### 4.4 タブレット

**端末の登録と確かめは2026-10-29に作った**(0.8のd。形は`shared/src/tablet-devices.ts`)。登録は、置くタブレットの上で管理者がその場で学籍番号とパスワードを入れる。管理者のWebのセッションは作らないので、`/api/admin`(Webのセッションのある管理者だけ)の外に置く(D1・D2)。`/api/tablet/`の下は、どれも端末のCookie`device`が要る(無い・取り消し済みは401 `DEVICE_NOT_REGISTERED`。使うたびにCookieを付け直す。D3・D5)。

| メソッドとURL | 認証 | リクエスト | 成功 | おもなエラー | ユースケース |
|---|---|---|---|---|---|
| `POST /api/tablet-devices` | なし(本文で管理者を確かめる) | `{ studentId, password, name }` | 201 `TabletDevice` + Cookie`device`(400日) | 401 `INVALID_CREDENTIALS`・403 `FORBIDDEN`(管理者でない)・400・429 | UC-20 |
| `GET /api/tablet/device` | 端末 | — | 200 `{ id, name }`(画面が開いたときに確かめる) | 401 `DEVICE_NOT_REGISTERED` | UC-8・UC-20 |
| `POST /api/tablet/sessions` | 端末 | `{ cardNumber, pin }`(2026-10-29に作った。`{ tabletCode, pin }`は使い捨てのバーコード(g)で足す) | 201 `{ token, expiresAt, user: { displayName }, rentals: { title, dueDate, state }[] }`(作った端末でだけ使える3分のセッション。5回目の間違いでロックし、その応答から423。E5) | 401 `DEVICE_NOT_REGISTERED`・401 `INVALID_CARD_OR_PIN`・423 `PIN_LOCKED`・429(端末ごとに1分で失敗20回) | UC-8・UC-10 |
| `DELETE /api/tablet/sessions/current` | 端末 + 本人 | — | 204(切れていても204。2026-10-29に作った) | — | UC-8・UC-31 |
| `POST /api/tablet/rentals` | 端末 + 本人 | `{ barcode }` | 201 `Rental`(2026-10-29に作った。判断表Cで判断し、借りた端末を記録する。C4・C5はどちらも`BORROWING_SUSPENDED`。E8) | 404 `ITEM_NOT_FOUND`・409 `ITEM_ALREADY_RENTED`・409 `ITEM_UNAVAILABLE`・409 `BORROWING_SUSPENDED`・409 `HAS_OVERDUE`・409 `LIMIT_REACHED`・401 `SESSION_EXPIRED` | UC-8 |
| `POST /api/tablet/returns` | 端末だけ(カード・PIN不要) | `{ barcode }` | 201 `Rental`(返却日時入り。2026-10-29に作った。返した端末を記録する) | 404 `ACTIVE_RENTAL_NOT_FOUND` | UC-9 |

PINのロックは423(Locked)にするか、409にするか(API-Q6)。

### 4.5 管理者

`/api/admin`の入口で1回だけ、Webのセッションと管理者かを確かめる(ログインしていなければ401、管理者でなければ403 `FORBIDDEN`。2026-10-29 D1)。

| メソッドとURL | 認証 | リクエスト | 成功 | ユースケース |
|---|---|---|---|---|
| `GET /api/admin/tablet-devices` | Web(管理者) | — | 200 `{ items: TabletDevice[] }`(取り消していない端末だけ) | UC-20 |
| `DELETE /api/admin/tablet-devices/{id}` | Web(管理者) | — | 204(行は消さず、取り消した日時を入れる。取り消し済みでも204。無ければ404。D4) | UC-20 |
| 在庫管理(`/api/admin/item-types`・`/api/admin/items`・`/api/admin/rentals`・`/api/admin/users/{id}`) | Web(管理者) | `docs/inventory.md`で決める | | UC-21〜UC-24 |

### 4.6 そのほか

| メソッドとURL | 成功 |
|---|---|
| `GET /api/health` | 200 `{ status: "ok" }`(DBにつながるか。中身は言わない) |
| 存在しないURL | 404 `code: "NOT_FOUND"`(JSON) |

## 5. 資源の形(案)

`?`は省略あり、`| null`は値が無いことがある。

```ts
SessionUser  { id, name, studentId, userType: "STUDENT" | "FACULTY" | "EXTERNAL", role: "MEMBER" | "ADMIN" }
Me           SessionUser + { email, grade | null, major | null,
               borrowing: { canBorrow, maxItems, suspendedUntil | null, activeCount, hasOverdue },
               pin: { registered, locked } }   // PINそのもの・残りの回数は出さない(2026-10-28 P3)
Category     { id, name, genres: { id, name }[] }
ItemTypeSummary { id, title, genre: { id, name }, category: { id, name }, imageUrl | null,
                  rentalPeriodDays, availableCount, totalCount }   // totalCountに廃棄済みは入れない(2026-10-28 Ca4)
ItemTypeDetail  ItemTypeSummary + { description | null, author | null, publisher | null, isbn | null,
                  manufacturer | null, model | null,
                  items: { id, location | null, state: ItemState }[] }   // 廃棄済みは入れない(Ca4)
                  // バーコードは入れない。画面に出すと、実物を持たずに借りられてしまう(2026-10-28 Ca5-B)
ItemState    "AVAILABLE" | "RENTED" | "MAINTENANCE" | "LOST" | "DISPOSED"   // 計算した値。DBの値はそのまま出さない
Rental       { id, itemType: { id, title, genre: { id, name } }, item: { id }, rentedAt, dueDate, returnedAt | null,   // 物品のバーコードは入れない(2026-10-29 BC1)
               state: "RENTING" | "OVERDUE" | "RETURNED" }
TabletDevice { id, name, createdAt, lastUsedAt | null }
Problem      { type, title, status, code, detail, errors?: { path, message }[] }
```

今との違い:
- `serialNumber`(カードの番号)はどの応答にも入れない(`docs/auth.md`の3章)。ダッシュボードのバーコードは`POST /api/me/tablet-codes`の使い捨てに変える。**それまでは`Me.cardNumber`として返す**(2026-10-25 Me1。0.8で外す)
- `status`という名前は、HTTPのステータスと紛らわしいので、物品と貸し出しの状態は`state`にする(API-Q7)
- `rentalSetting`は`Me.borrowing`にし、借りている数と延滞の有無も入れる(画面で数えない)
- タブレットの`user`は表示用の名前だけ(R-A13)

## 6. エラーの`code`の一覧(案)

| code | status | 場面 |
|---|---|---|
| `VALIDATION_ERROR` | 400 | 入力の形が違う(`errors`付き) |
| `INVALID_CREDENTIALS` | 401 | 学籍番号かパスワードが違う(どちらかは言わない) |
| `INVALID_CODE` | 401 | 認証コードが違う・期限切れ・使えなくなった |
| `INVALID_TOKEN` | 401 | 登録用・再設定用のトークンが違う・期限切れ |
| `UNAUTHENTICATED` | 401 | Webのセッションが無い・期限切れ・無効な人、タブレットのセッションが無い・別の端末で作ったもの・無効な人 |
| `DEVICE_NOT_REGISTERED` | 401 | タブレットの端末が登録されていない・取り消された |
| `INVALID_CARD_OR_PIN` | 401 | カードかPINが違う・PIN未登録・無効な人(どれかは言わない) |
| `SESSION_EXPIRED` | 401 | タブレットの本人確認のセッションが切れた(無操作30秒・作ってから3分) |
| `PIN_LOCKED` | 423 | PINを5回間違えた(API-Q6) |
| `WRONG_PASSWORD` | 403 | PINの変更などで入れ直したパスワードが違う(ログイン中なので「学籍番号か」とは言わない。2026-10-28 P5) |
| `FORBIDDEN_ORIGIN` | 403 | 書き換えのリクエストの`Origin`が画面のURLでない・無い(CSRFの対策。2026-10-28 A8-11) |
| `FORBIDDEN` | 403 | 管理者でない |
| `NOT_FOUND` | 404 | 無い資源・存在しないURL |
| `ITEM_NOT_FOUND` | 404 | そのバーコードの物品が無い |
| `ACTIVE_RENTAL_NOT_FOUND` | 404 | その物品は貸し出されていない(返却のとき) |
| `ALREADY_REGISTERED` | 409 | 登録済み(登録用トークンを使うとき) |
| `ITEM_ALREADY_RENTED` | 409 | 貸出中(判断表C2) |
| `ITEM_UNAVAILABLE` | 409 | 修理中・紛失・廃棄(C3) |
| `BORROWING_SUSPENDED` | 409 | 貸し出しが止められている・停止期間中(C4・C5) |
| `HAS_OVERDUE` | 409 | 延滞中の物がある(C6) |
| `LIMIT_REACHED` | 409 | 借りられる数の上限(C7) |
| `CONFLICT` | 409 | ほかの操作と同時になり、ぶつかった(DBの一意制約違反。2026-10-24に追加。貸し出しのぶつかりは`ITEM_ALREADY_RENTED`にする) |
| `PAYLOAD_TOO_LARGE` | 413 | 送られたJSONが大きすぎる(100kbまで。2026-10-24 K8) |
| `RATE_LIMITED` | 429 | 回数の制限(`Retry-After`付き) |
| `INTERNAL_ERROR` | 500 | サーバーの不具合 |

## 7. 今のAPIとの対応

| 今 | 作り直し後 |
|---|---|
| `POST /api/auth/request-verification` | `POST /api/verification-codes`(`purpose: "signup"`) (2026-10-25 移した) |
| `POST /api/auth/verify-code` | `POST /api/verification-tokens` (2026-10-25 移した) |
| `POST /api/auth/signup` | `POST /api/users` (2026-10-25 移した) |
| `POST /api/auth/login` | `POST /api/sessions` (2026-10-25 移した) |
| `POST /api/auth/refreshSession` | `POST /api/sessions/refresh` (2026-10-25 移した) |
| `POST /api/auth/logout` | `DELETE /api/sessions/current` (2026-10-25 移した) |
| `GET /api/items` | `GET /api/item-types`(と`GET /api/categories`)(2026-10-28 移した) |
| `GET /api/items/me` | `GET /api/me`・`GET /api/me/rentals`(2026-10-25 移した) |
| `POST /api/tablet/signin` | `POST /api/tablet/sessions`(PIN付き。2026-10-29に移した) |
| `POST /api/tablet/checkout` | `POST /api/tablet/rentals`(2026-10-29に移した) |
| `POST /api/tablet/return` | `POST /api/tablet/returns`(2026-10-29に移した。カード不要) |
| (無し) | `PUT /api/me/pin`(2026-10-28に作った)・タブレットの端末(2026-10-29に作った)・パスワードの再設定・使い捨てのバーコード・在庫管理・`/api/health` |

**移り方**: 外部の利用者はいないので、古いURLは残さず、画面とサーバーを同じ変更で移す(API-Q8)。

## 8. 要確認

| # | 内容 | 決定(2026-10-23、叩き台どおり) |
|---|---|---|
| API-Q1 | URLにバージョン(`/api/v1`)を付けるか | 付けない(画面とサーバーを同時に配る1つのアプリで、外部の利用者がいないため)。外に公開するときに考える |
| API-Q2 | 成功の応答を`{ success, data }`のように包むか | 包まない(成否はHTTPのステータスで分かる。包むと型が1段深くなる) |
| API-Q3 | エラーの形をRFC 9457(Problem Details)にするか | する(決まった形があり、`code`を足すだけで済む) |
| API-Q4 | ログインのURL | `POST /api/sessions`(ログイン = セッションを作る)。`/api/auth/login`のように動作の名前を残す書き方もよく使われる |
| API-Q5 | 一覧のページ分け | 今は付けない(数十件)。在庫管理の一覧(`/api/admin/...`)で件数が増えたら`nextCursor`を足す |
| API-Q6 | PINのロックのステータス | 423(Locked)。分かりにくければ409 |
| API-Q7 | 物品と貸し出しの状態の項目名を`state`にするか | する(`status`はHTTPのステータスと紛らわしい) |
| API-Q8 | 古いURLを残すか | 残さない(画面とサーバーを同じ変更で移す) |
| API-Q9 | カードの番号の項目名 | `cardNumber`(`serialNumber`は何の番号か分かりにくい。DBの列名は変えなくてよい) |

## 9. 進め方

1. 決まった形を`shared/`にZodのスキーマで書く(`docs/backlog.md`の0.7)。リクエストとレスポンスの型はここから作る
2. 作り直しは、今あるAPIから1つずつ: 新しいURLで作り、画面を新しい型に移し、古いURLを消す。1つ終わるごとにテストと受け入れ基準を確かめる
3. 認証の作り直し(`docs/auth.md`、0.8)で足すAPIは、最初から新しい形で作る
