---
paths:
  - "back/src/**"
---

# バックエンド(Express)のルール

APIの一覧と認証の流れは`docs/architecture.md`。

## 新しいAPIを足すとき

- `src/features/<機能>/`に`<機能>.routes.ts`・`.service.ts`・`.repository.ts`・`.schema.ts`・`.types.ts`を置く(新しい形に移したAPIの入力と応答のスキーマは`.schema.ts`ではなく`shared/`に置く。`.types.ts`は中の型だけ)。`<機能>.routes.ts`は`create○○Routes(deps: Deps)`を書き、`src/routes/index.ts`にマウントする。新しい部品が要るなら`src/deps.ts`の`Deps`と`buildDeps()`に足す
- 1本のAPIは`router.post('/x', route({ body: schema }, async ({ body, res }) => ...))`と書き、「入力 → service → 返す」だけにする。判断はserviceと判断の関数に置く
- 新しい形のAPI(`docs/api.md`)は、入力のスキーマも応答の型も`shared/`に書き、`res.status(201).json({ ... } satisfies 型)`で包まずに返す。日付はAPIの境目でISOの文字列にする(T5)。本文の無い成功は`res.status(204).end()`
- 認証が要るものは`createAuthMiddleware(deps.sessions)`(Web。Cookieのセッションを毎回DBで確かめる)か`tabletMiddleware`(タブレット)を付け、`route({ auth: true, ... })`で`user`を受け取る。利用者のIDは`user.id`から取り、ボディのIDは信じない
- HTTPを通した形(URL・ステータス・応答・Cookie)は`src/app.test.ts`で、偽の部品を渡した`createApp`を`supertest`で叩いて確かめる
- 環境変数を足すときは、`src/config.ts`の`envSchema`と`Config`、`back/.env.example`に足し、使う所へは`buildDeps(config)`・`createApp(deps, config)`から渡す。`process.env`を直接読まない(2026-10-24 G1〜G3。`lib/jwt.ts`だけは0.8まで`getConfig()`)
- 複数のテーブルを書き換える処理(貸し出し・返却など)はrepositoryで`this.db.$transaction(async (tx) => ...)`にまとめ、中の確認と書き込みはすべて`tx`で行う
- Prismaの型は`@/generated/prisma/client.js`から取る。返す形は`Prisma.XxxGetPayload<{ include: ... }>`で`*.types.ts`に書く

## 気をつけること

- 新しい`code`が要るときは、`shared/src/error-codes.ts`の表と`docs/api.md`6章の両方に足す。`code`ごとに文言は1つ。違う文言を出したいなら、別の`code`にする(2026-10-24 H5)
- ミドルウェアでも`throw new DomainError(...)`でよい(`next(err)`は要らない)。想定外のエラーのログに、リクエストの中身(学籍番号・パスワードなど)を出さない
- 推測されると困る番号(セッション・登録用トークン・端末)は`lib/session-token.ts`の`newToken()`で作り、DBには`hashToken()`のハッシュだけを置く。通してよいかの判断は`features/auth/session.check.ts`の`checkSession`(期限・種類・無効な人)。JWTを新しく使わない(残りはタブレットの今のトークンだけで、0.8のeで消す。2026-10-28 A8-3・A8-8)
- 書き換えのリクエストは`app.ts`の`createOriginCheck`が`Origin`を確かめる(CSRFの対策。A8-7)。テストで書き換えのリクエストを送るときは`Origin`に`config.frontendUrl`を付ける
- 名前・メール・カードの番号は名簿(今は`ExternalUser`)にだけある。本番の名簿は学校のDBかAPIになるので、**名簿を読むJOIN(`externalUser`)を新しく増やさない**。名簿の窓口(`Roster`)ができたらそこを通す(`docs/backlog.md`の0.6)
- 貸し出しの状態と物品の「貸出中」はDBに無い。`rental.status.ts`の`rentalStatus`・`itemAvailability`で組み立てて返す
