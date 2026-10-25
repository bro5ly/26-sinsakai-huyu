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
             SMTP(認証コードのメール)
```

- 4つともDocker Composeで起動する。設定はリポジトリ直下の`.env`(全サービス共通)。画面からAPIへのURLは`front/.env`の`NEXT_PUBLIC_API_URL`
- CORSは`FRONTEND_URL`(既定`http://localhost:4545`)だけを許し、Cookieを通す(`credentials: true`)
- すべての応答に`helmet`のセキュリティのヘッダを付ける。JSONは100kbまで
- `POST /api/sessions`(ログイン)は接続元ごとに失敗を15分で20回まで(`express-rate-limit`、メモリで数える。成功したログインは数えない)。超えたら429 `RATE_LIMITED`

## バックエンドのレイヤ

`back/src/features/<機能>/`ごとに次の向きにだけ依存する。

| ファイル | 役目 |
|---|---|
| `*.routes.ts` | `create○○Routes(deps)`。受け取った部品でserviceを作り、URL・ミドルウェア・`route()`をつなぐ。1本ごとに「入力 → service → 返す」を書く(新しい形のAPIは`shared/`の形で包まずに、まだのAPIは`sendSuccess`で)。Cookieの読み書きもここ。`try/catch`は書かない(失敗はthrowするだけ) |
| `*.service.ts` | 決まりごと(期限・重複・状態)。断るときは`DomainError(code)`を投げる。HTTPのステータスと文言は持たない |
| `*.repository.ts` | Prismaでの読み書き。複数のテーブルにまたがる書き込みは`$transaction` |
| `*.schema.ts` | Zodのスキーマ |
| `*.types.ts` | 返す形の型(Prismaの`GetPayload`など) |

組み立ては`src/deps.ts`の`buildDeps()`(本物の部品を作るのはここだけ)と`src/app.ts`の`createApp(deps, config)`(helmet・CORS・JSON・Cookie・各ルーティング・404・エラー用のミドルウェア)。環境変数を読むのは`src/config.ts`の`loadConfig()`だけで、足りなければ起動のときに止まる。`server.ts`が`getConfig()`で読み、`createApp(buildDeps(config), config).listen(config.port)`する。テストは偽の部品と設定を渡す。

画面と共通の形は`shared/`(`@sinsakai/shared`): `error-codes.ts`(`code` → ステータス・文言の表。`docs/api.md`6章)、`problem.ts`(失敗の応答の形`problemSchema`)。

共通の部品は`src/lib/`: `route.ts`(`route()`。Zodで入力を検証してから型付きで渡し、`auth: true`ならログイン中の`user`を渡す)、`domain-error.ts`(`DomainError`)、`problem.ts`(エラーをRFC 9457の形に変える`toProblem`。Zodは400 `VALIDATION_ERROR`、壊れたJSONも400、Prismaの一意制約違反は409 `CONFLICT`(DBの列名は出さない)、P2025は404 `NOT_FOUND`、それ以外は500 `INTERNAL_ERROR`)、`response-handler.ts`(成功は`{ success: true, ...data }`)、`jwt.ts`、`mail.ts`(nodemailer)、`prisma.ts`。失敗を返すのは`middleware/error.middleware.ts`だけで、存在しないURLも同じ形の404にする。

`user/`だけは`UserRepository.ts`・`UserService.ts`という古い名前で、routeを持たず`auth`から使われる。

## API

すべて`/api`の下。

登録・ログインの6本と本人の2本は`docs/api.md`の新しい形(包まない。形は`shared/src/auth.ts`・`me.ts`。2026-10-25)。ほかはまだ今の形(`{ success: true, ...data }`)。

| メソッドとパス | 認証 | 内容 | 返すもの |
|---|---|---|---|
| `POST /verification-codes` | なし | `{ studentId, purpose: "signup" }`。名簿を確かめ、認証コードをメールで送る | 202(本文なし。名簿にいてもいなくても同じ) |
| `POST /verification-tokens` | なし | `{ studentId, purpose, code }` | 201 `{ token, expiresAt }`(登録用トークン) |
| `POST /users` | なし | `{ token, password }`。名簿にいる人の利用者を作る | 201 `{ user, accessToken }`(+Cookie`refreshToken`) |
| `POST /sessions` | なし | `{ studentId, password }`(ログイン) | 201 `{ user, accessToken }`(+Cookie) |
| `POST /sessions/refresh` | Cookie | リフレッシュトークンを回して新しいトークンを出す | 200 `{ user, accessToken }`(+Cookie) |
| `DELETE /sessions/current` | Cookie | Cookieを消し、DBのリフレッシュトークンも消す(ログアウト) | 204(本文なし) |
| `GET /items` | なし | 全物品(種類・ジャンル・カテゴリ付き、新しい順) | `success`, `data: Item[]` |
| `GET /me` | アクセストークン | 本人のプロフィール(名簿の名前・メール・学年・専攻・カードの番号)と貸し出しの決まり(借りている数・延滞の有無はサーバーで数える) | 200 `Me` |
| `GET /me/rentals` | アクセストークン | 本人が借りている物(状態とジャンル付き、借りた日の新しい順) | 200 `{ items: Rental[] }` |
| `POST /tablet/signin` | なし | `{ serialNumber }`。カードで本人確認 | `success`, `message`, `session`(タブレット用トークン), `user`, `data: Rental[]` |
| `POST /tablet/checkout` | タブレット用トークン | `{ barcode }`。貸し出す | `success`, `message`, `data: Rental` |
| `POST /tablet/return` | タブレット用トークン | `{ barcode }`。返却する | `success`, `message`, `data: Rental` |

登録・ログインの`user`は`SessionUser`(`id, name, studentId, userType, role`)。学年・専攻・カードの番号は`/me`で取る(カードの番号は0.8で使い捨てのバーコードに替えるまで。Me1)。

## 認証とトークン

| トークン | 期限 | 署名の鍵 | 置き場所 | 用途 |
|---|---|---|---|---|
| アクセストークン | 15分 | `JWT_ACCESS_SECRET` | 画面のCookie`accessToken`(JSから読める)→`Authorization: Bearer` | `/me`・`/me/rentals` |
| リフレッシュトークン | 7日 | `JWT_REFRESH_SECRET` | HttpOnly Cookie`refreshToken`(`sameSite: strict`)+ DB`refresh_tokens`(利用者1人1件。ログアウトで消す) | `/sessions/refresh` |
| 登録用トークン | 15分 | `JWT_REFRESH_SECRET`(同じ鍵) | 画面のメモリ | `/users` |
| タブレット用トークン | 3分 | `JWT_ACCESS_SECRET`(同じ鍵) | `TabletContext`のメモリ | `/tablet/checkout`・`return` |

- アクセストークンの中身は`{ sub: 利用者ID, role: 'MEMBER' | 'ADMIN' }`、タブレット用は`{ sub, role: 'TABLET_USER' }`
- リフレッシュはJWTの検証とDBの照合の両方を通ったときだけ。通るたびに新しいリフレッシュトークンを`upsert`する(古いものは使えなくなる)
- 鍵の使い回しで起きる問題は`docs/spec.md`の「現状とのずれ」2・3

### 画面の起動時の流れ(`front/src/contexts/AuthContext.tsx`)

1. Cookieにアクセストークンがあれば`GET /me`
2. 401なら`POST /sessions/refresh` → 新しいトークンで`/me`をもう一度(リフレッシュの応答は`SessionUser`だけなので、画面の利用者は`/me`の結果(`Me`)を入れる。借りている物はログインの状態に入れず、ダッシュボードが`/me/rentals`で取る)
3. アクセストークンが無ければ、すぐに2のリフレッシュを試す
4. どれも失敗したらログアウト状態。ページ側は`useAuth()`を見て`/auth`へ送る

## データモデル

```
Category 1─* Genre 1─* ItemType 1─* Item 1─* Rental *─1 User 1─1 ExternalUser(学籍番号でつながる)
                  └──── ItemTypeGenre ───┘(多対多。今は未使用)  ├─* RefreshToken(実際は1件)
                                                               └─* Notification(未使用)
VerificationCode(学籍番号ごとに1件の認証コード)
```

| テーブル | 中身 |
|---|---|
| `external_user` | 学校の名簿の代わり。学籍番号・メール・シリアル番号(一意)・名前・学年・専攻・種別(学生/教職員/外部)。**名前などはここにだけ持つ** |
| `user` | 登録した利用者。名簿の写しは持たず、`student_id`で名簿をたどる。パスワード・権限(`role`: 一般/管理者)・貸し出しの決まり(`can_borrow`・`max_items`初期値5・`suspended_until`・`suspension_reason`)・`is_active` |
| `verification_codes` | 登録の認証コード。主キーが学籍番号 |
| `refresh_tokens` | リフレッシュトークン。`userId`が一意 |
| `category` / `genre` | 分類(例: 機材 > ノートパソコン) |
| `item_type` | 物品の種類。書籍の項目(著者・出版社・ISBN)と機材の項目(メーカー・型番)を両方持つ。`rentalPeriodDays` |
| `item` | 物品1つ。`barcode`(必須・一意)・`location`・`status`(物そのものの状態) |
| `rental` | 貸し出しの記録。`rentedAt`・`dueDate`・`returnedAt`。状態の列は持たない |
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
| `/dashboard` | 自分の情報・バーコード・借りている物・カタログ | `useAuth`、`useItems`、`components/dashboard/` |
| `/items`、`/items/[title]` | 機材カタログと、種類ごとの詳細(全件を取って画面で絞り込む) | `useItems` |
| `/tablet` | 受付端末の画面。カード → 操作の選択 → バーコード → 完了 | `useTabletOperations`、`TabletContext`、`BarcodeScanner`(html5-qrcode)、`BarcodeInput` |
| `/barcodes` | テスト用のバーコードとカード番号の印刷ページ(seedと同じ値を直書き) | `react-barcode` |
