---
paths:
  - "back/src/**"
---

# バックエンド(Express)のルール

APIの一覧と認証の流れは`docs/architecture.md`。

## 新しいAPIを足すとき

- `src/features/<機能>/`に`<機能>.routes.ts`・`.service.ts`・`.repository.ts`・`.types.ts`(判断表があれば`.check.ts`)を置く(APIの入力と応答のスキーマは`shared/`に置く。`.schema.ts`はもう無い。`.types.ts`は中の型だけ。下の「serviceとrepositoryの形」)。`<機能>.routes.ts`は`create○○Routes(deps: Deps)`を書き、`src/routes/index.ts`にマウントする。新しい部品が要るなら`src/deps.ts`の`Deps`と`buildDeps()`に足す
- 1本のAPIは`router.post('/x', route({ body: schema }, async ({ body, res }) => ...))`と書き、「入力 → service → 返す」だけにする。判断はserviceと判断の関数に置く
- 新しい形のAPI(`docs/api.md`)は、入力のスキーマも応答の型も`shared/`に書き、`res.status(201).json({ ... } satisfies 型)`で包まずに返す。日付はAPIの境目でISOの文字列にする(T5)。本文の無い成功は`res.status(204).end()`
- 認証が要るものは`createAuthMiddleware(deps.sessions)`(Web。Cookieのセッションを毎回DBで確かめる)か`createTabletSessionMiddleware`(タブレットの本人確認。`/api/tablet`の中で端末の確かめの後に付ける)を付け、`route({ auth: true, ... })`で`user`を受け取る。利用者のIDは`user.id`から取り、ボディのIDは信じない
- 管理者だけのAPIは`/api/admin`の下に足す(`routes/index.ts`の`admin`のRouter。入口で`createAuthMiddleware`と`requireAdmin`を通る。2026-10-29 D1)。タブレットのAPIは`/api/tablet`の下に足す(入口の`createDeviceMiddleware`が登録された端末かを確かめ、`req.device`に入れる。D5)
- HTTPを通した形(URL・ステータス・応答・Cookie)は`src/app.test.ts`で、偽の部品を渡した`createApp`を`supertest`で叩いて確かめる
- 環境変数を足すときは、`src/config.ts`の`envSchema`と`Config`、`back/.env.example`に足し、使う所へは`buildDeps(config)`・`createApp(deps, config)`から渡す。`process.env`を直接読まない(2026-10-24 G1〜G3。`getConfig()`を呼ぶのは`server.ts`だけ)
- 複数のテーブルを書き換える処理(貸し出し・返却など)はrepositoryで`this.db.$transaction(async (tx) => ...)`にまとめ、中の確認と書き込みはすべて`tx`で行う
- Prismaの型は`@/generated/prisma/client.js`から取り、repositoryの中だけで使う。serviceは`*.types.ts`の名前の付いた記録の型だけを見る

## serviceとrepositoryの形(2026-10-29 0.9。どの機能も同じ形にする)

- **名前**: DBを読み書きするインターフェースは`<物>Store`、それ以外(名簿・メール・ハッシュ・乱数・ほかの機能に一部だけ見せる物)は役割の名前(N5)。repositoryのメソッドは、1件を読む`find<物>By<鍵>`(無ければ`null`)、全部を読む`findAll<物>s`、条件で何件も読む`find<条件><物>s`(例: `findActiveDevices`)、作る`create<物>`、書き換える`save<中身>`、消す`delete<物>By<鍵>`(N2)。ファイルは`<物>.repository.ts`
- **入力の型**: インターフェースとrepositoryの両方に出てくる入力は、`*.types.ts`で名前を付ける(`NewSession`・`LoginAttempt`など。M3)。`Parameters<...>`で取り出さない
- **行の型**: `select`を`as const`で置き、行の型は`Prisma.XxxGetPayload<{ select: typeof xxxSelect }>`で作る。手で書かない(M4)
- **service**: 部品は`type Parts = { ... }`で名前付きで受け取り、`Deps`と同じ名前の`private readonly`の項目に入れる(M2・N3)。組み立ては、その機能のroutesの`create<機能>Service(deps)`だけで、ほかの機能もそれを読む。メソッドは`async name()`の形(矢印関数のプロパティにしない)
- **引数**: 値が1つならそのまま、2つ以上なら1つのオブジェクト。時計(`now`)はいつも最後の別の引数。端末(`deviceId`)は入力のオブジェクトの中(M1)。同じ型が並ぶ引数(文字列2つなど)は作らない(T4)
- **副作用**: serviceの中でbcrypt・乱数・`new Date()`を直接呼ばない。`passwords`(`lib/password.ts`)・`secrets`(`lib/session-token.ts`)・`now`で受け取る(D1)
- **断る所**: `DomainError`を投げるのはserviceだけ。repositoryは、DBの制約でぶつかったら`null`などで知らせる(D2)
- **返す型**: serviceとrepositoryの公開のメソッドには返す型を書く(リントで確かめる。M5)
- **同じ形を2か所で作らない**: 借りている物の`select`と変換は`rentals/rental.select.ts`だけ(D3)

## テストの書き方(2026-10-30 TS1〜TS6。`docs/backlog.md`の0.10)

- **名前**: 「仕様の番号 条件のとき、結果になる」だけ(例: `C6 延滞中の物があるとき、HAS_OVERDUEで断る`)。理由と仕様の場所は`it`の上のコメントに書く。確かめることが2つあれば`it`を分ける(TS4)
- **中身**: 用意・実行・確かめの3つに分け、間を1行あける
- **型**: 偽の部品で`as never`・`as any`を使わない。インターフェースの型どおりの戻り値か`vi.fn<Store["method"]>()`で書く(TS1)。型で守っている決まりは`*.test-d.ts`の`expectTypeOf`で試す(TS2)
- **時計**: テストで`new Date()`・`Date.now()`を呼ばない。ファイルの上に止めた`now`を置いて渡す(TS3)
- **入力のスキーマ**: `shared/`のスキーマには、通る例と断られる例のテストを隣に置く(TS5)
- **例の表**: 判断表のように同じ形の例が並ぶときは`it.each`の表にする(TS6)

## 気をつけること

- 新しい`code`が要るときは、`shared/src/error-codes.ts`の表と`docs/api.md`6章の両方に足す。`code`ごとに文言は1つ。違う文言を出したいなら、別の`code`にする(2026-10-24 H5)
- ミドルウェアでも`throw new DomainError(...)`でよい(`next(err)`は要らない)。想定外のエラーのログに、リクエストの中身(学籍番号・パスワードなど)を出さない
- 推測されると困る番号(セッション・登録用トークン・端末)は`lib/session-token.ts`の`newToken()`で作り、DBには`hashToken()`のハッシュだけを置く。通してよいかの判断は、Webは`features/auth/session.check.ts`の`checkSession`(期限・種類・無効な人)、タブレットは`features/tablet-sessions/tablet-session.check.ts`の`checkTabletSession`(端末・無操作30秒・3分)。JWTは使わない(2026-10-29に全部なくした。A8-3・A8-8)
- パスワードを受け取るAPI(ログイン・PINの変更・端末の登録)には`lib/rate-limit.ts`の`createPasswordFailureLimiter()`を付ける(接続元ごとに、失敗を15分で100回まで。P6・2026-10-29 F2)。学籍番号ごとのロック(続けて5回で15分)は`AuthService.verifyCredentials`が`features/auth/attempt.check.ts`で判断する(F1)。メモリで数える制限は`lib/rate-limit.ts`に、DBの回数で数える判断は`attempt.check.ts`に置く
- 書き換えのリクエストは`app.ts`の`createOriginCheck`が`Origin`を確かめる(CSRFの対策。A8-7)。テストで書き換えのリクエストを送るときは`Origin`に`config.frontendUrl`を付ける
- 名前・メール・カードの番号は名簿(今は`ExternalUser`)にだけある。本番の名簿は学校のDBかAPIになるので、**名簿を読むJOIN(`externalUser`)を新しく増やさない**。名簿の窓口(`Roster`)ができたらそこを通す(`docs/backlog.md`の0.6)
- 貸し出しの状態と物品の「貸出中」はDBに無い。`rental.status.ts`の`rentalStatus`・`itemAvailability`で組み立てて返す
