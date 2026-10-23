---
paths:
  - "back/src/**"
---

# バックエンド(Express)のルール

APIの一覧と認証の流れは`docs/architecture.md`。

## 新しいAPIを足すとき

- `src/features/<機能>/`に`<機能>.route.ts`・`.controller.ts`・`.service.ts`・`.repository.ts`・`.schema.ts`・`.types.ts`を置き、`src/routes/index.ts`にマウントする
- controllerのメソッドはアロー関数のプロパティで書く(`router.post('/x', controller.x)`と渡したときに`this`が外れないため)
- 認証が要るものは`authMiddleware`(Web)か`tabletMiddleware`(タブレット)を付け、利用者のIDは`req.user?.id`から取る。ボディのIDは信じない
- 複数のテーブルを書き換える処理(貸し出し・返却など)はrepositoryで`this.db.$transaction(async (tx) => ...)`にまとめ、中の確認と書き込みはすべて`tx`で行う
- Prismaの型は`@/generated/prisma/client.js`から取る。返す形は`Prisma.XxxGetPayload<{ include: ... }>`で`*.types.ts`に書く

## 気をつけること

- `tabletMiddleware`は失敗を`next(err)`で渡しているが、エラーハンドラが無いのでJSONではなくExpress既定の応答になる。直すなら`handleError(res, ...)`に揃える
- アクセストークンとタブレット用トークンは同じ秘密鍵で署名され、ミドルウェアは`role`を見ていない(互いに通ってしまう)。権限で分けるならここを直す
- 登録用トークンはリフレッシュトークンの秘密鍵で署名されている(`lib/jwt.ts`の`REGISTRATION_SECRET`)
- 名前・メール・カードの番号は名簿(今は`ExternalUser`)にだけある。本番の名簿は学校のDBかAPIになるので、**名簿を読むJOIN(`externalUser`)を新しく増やさない**。名簿の窓口(`Roster`)ができたらそこを通す(`docs/backlog.md`の0.6)
- 貸し出しの状態と物品の「貸出中」はDBに無い。`rental.status.ts`の`rentalStatus`・`itemAvailability`で組み立てて返す
