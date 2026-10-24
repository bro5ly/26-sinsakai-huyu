# 引き継ぎ(2026-10-24)

このファイルは、作業を次のセッション(クラウドのClaude Codeなど)へ引き継ぐためのもの。**新しいセッションは、まずこのファイルと`CLAUDE.md`を読み、下の「1. 最初に開発者と認識を確かめる」を開発者に見せてから作業に入る。** 引き継ぎが済んだら、このファイルを今の状態に書き直す。

## 1. 最初に開発者と認識を確かめる

新しいセッションは、次の文章を開発者に見せ、食い違いがないかを確かめる。食い違いがあれば、`docs/`とこのファイルを直してから作業に入る。

> 引き継ぎを読みました。私の理解は次のとおりです。違うところがあれば教えてください。
>
> 1. **進め方**: まとめて進めず、問題を1つずつ出し、修正案と論点を番号付きの表(選択肢・おすすめと理由)にして、あなたに選んでもらう。決まったことは`docs/`に日付と番号付きで残してから次へ進む。作業の前に触るファイルと理由を見せ、作業の後にテストなどの結果を見せて止まる。答えの無い質問は実装の前に聞き直すが、返事から読み取れることは聞き直さない
> 2. **テスト**: 実装を優先し、テストも私が書く(赤 → 緑 → 整える)。テストは関数ごとの`describe`の中を正常系・異常系・境界値に分け、名前に仕様の番号を入れる。最後のほうの機能だけ、あなたが練習としてテストを書く
> 3. **今いる所**: 残タスク0.7の2つ目「組み立てとrouteの作り直し」の入り口。ブランチ`refactor/app-composition`(`main`の上に文書だけのコミットが載っている。コードはまだ何も変えていない)。`buildDeps()`(本物の部品を作る)・`createApp(deps)`(部品を受け取ってExpressのappを組み立てて返す。自作の関数で、サーバーを立てるのは`listen`)・`create○○Routes(deps)`(機能ごとのルーティング)の役割は、前のセッションで説明して理解してもらった
> 4. **進め方の決まり**: C1〜C7(下の3章)は2026-10-24に決まった。①〜④の区切りごとに、前に予定・後に結果を見せて止まる。クラウドではテスト・型チェック・画面のビルドまでを確かめてコミットとpushをし、PRを`main`に入れる前にあなたのMacで`curl`などを確かめる
> 5. **大事な決まり**: 失敗の応答はRFC 9457の形で、エラー用のミドルウェアだけが返す。serviceは`DomainError(code)`を投げる(`code`は`lib/error-codes.ts`の表のものだけ)。判断の関数は`{ ok: false, reason }`を返す。名簿は名簿の窓口(`Roster`)からだけ読む
> 6. **環境**: 私の環境ではDockerが使えないかもしれない。その場合、テストと型チェックはコンテナを使わずに動かし、`curl`やブラウザでの確認はできないので、そのことを毎回はっきり書く
>
> この理解で合っていれば、3章の今の段の続きから進めます。

## 2. ここまでに済んだこと(すべて`main`に入っている)

| PR | 内容 |
|---|---|
| #5 | DBの二重管理をやめた(名簿の写し・`rental_setting`・「貸出中」)。要件・設計の文書を作った |
| #6 | 開発サーバーがファイルの変更に気づかない不具合(Macのコンテナ)をpollingで直した |
| #7 | 名簿の窓口(`Roster`・`PrismaRoster`・`FakeRoster`)。外部キーを消した。壊れたトークンの500を401にした。API設計(`docs/api.md`)。テストを40件に |
| #8 | エラーの扱いの作り直し(`DomainError`・`code`の表・RFC 9457・エラー用のミドルウェア1つ。`code`を`docs/api.md`にそろえた)。テストを正常系・異常系・境界値で分けた(49件)。READMEを採用担当の人向けに作り直した。LICENSE(MIT)・`.env.example` |

決めたことの番号: エラーの扱いはO1-A・E1〜E4・H1〜H8、組み立てとrouteはR1〜R5、中の型はT1〜T7、名簿の窓口はF1・F2(どれも`docs/backlog.md`の0.6・0.7に書いてある)。

## 3. 今やっていること: 組み立てとrouteの作り直し(`docs/backlog.md` 0.7、R1〜R5)

**今の形**: 各`*.route.ts`が、読み込んだ瞬間に本物の部品(Prisma・名簿の窓口・メール)を`new`している。テストで偽物に替えられず、HTTPを通すテストが1件も無い。

**変える形**:

```
server.ts: createApp(buildDeps()).listen(PORT)
  buildDeps()      … src/deps.ts。本物の部品を1か所で作って返す(引数なし)
  createApp(deps)  … src/app.ts。CORS・JSON・Cookie・各ルーティング・404・エラー用ミドルウェアをつないで返す
  createAuthRoutes(deps) など … features/*/…routes.ts。今のroute + controllerを1つにしたもの
テスト: createApp(偽の部品) を supertest で叩く(DB無し)
```

**進め方(2026-10-24、すべておすすめ通りに決定。`docs/backlog.md` 0.7にも書いた)**

| # | 論点 | 決めたこと |
|---|---|---|
| C1 | 進める順番 | ①`buildDeps`・`createApp` → ②HTTPを通すテストで今の動きを守る → ③controllerを`*.routes.ts`と`route()`に置き換える → ④helmet・JSONの大きさの上限・回数の制限 |
| C2 | HTTPを通すテストの道具 | `supertest`で、偽の部品を使いDB無しで |
| C3 | 今回の範囲 | URLと成功の応答の形は変えない(新しいURLに移すのは次の手順) |
| C4 | `route()`の形 | 検証した`body`と`user`を渡し、応答は今どおり`res`で書く |
| C5 | 回数の制限 | 今はログインだけに、接続元ごと15分で20回 |

C6(進め方): `supertest`・`helmet`・`express-rate-limit`は、バージョンを固定し、公開から2週間以上たった版にする。入れる前に版を開発者に見せる。

C7: `shared/`はまだ無いので、R3のスキーマは今の`*.schema.ts`を使い、`shared/`ができたら移す。

**クラウドとMacの分担**: クラウドではテスト・型チェック・画面のビルドまでを確かめてコミットとpushをする。PRを`main`に入れる前に、開発者のMacで`git pull`・`docker compose up -d --build -V api`・`npm test`・`docker compose logs api --tail 5`(「server is running」)・`curl`(ログイン・カード認証・貸し出し・返却)を確かめる。PRを出す前に開発者に声をかける。

**今の段**: ①・②は済み(2026-10-24。K1・K2も済み)。③(controllerを`*.routes.ts`と`route()`に置き換える。R6・R7)の作業中。④の最初に環境変数を`config.ts`にまとめる(G1〜G3)。Macでの`curl`はまだ(依存が増えたので`docker compose up -d --build -V api`が要る)

## 4. このあとの順番

`docs/backlog.md`のとおり。0.7の残り(APIを`docs/api.md`の形に1本ずつ移す、`shared/`とnpm workspaces、中の型T1〜T7、画面の型) → 0.8 認証の作り直し(`docs/auth.md`) → 1 貸し出しの判断表(`canCheckout`) → 2〜4 → 5 在庫管理 → 6 Slackの通知。

## 5. 環境の注意

**Dockerが使えるとき(開発者のMac)**: `CLAUDE.md`の「コマンド」のとおり、コマンドはコンテナの中で動かす。`curl`で確かめる前に、`docker compose logs api`で再起動を確かめる。

**Dockerが使えないとき(クラウドなど)**:
- `back/`で`npm ci`のあと、`npx vitest run`と`npx tsc --noEmit`はDB無しで動く(テストは偽の部品を使う)。Node 22以上が要る(Vitest 5)
- **テストはJWTの鍵を環境変数から読む**。`back/.env`が無いと、トークンを作るテストが落ちる。`cp back/.env.example back/.env`のあと、`JWT_ACCESS_SECRET`と`JWT_REFRESH_SECRET`に適当な長い文字列(別々の値)を入れる(`.env`はコミットしない)
- テストは`vitest.config.ts`の`setupFiles`で`back/.env`を読む(2026-10-24 D1)。`cd back && npx vitest run`だけで動く
- `src/generated/prisma/`はコミットしてあるので、`prisma generate`は要らない(スキーマを変えたら要る)
- DBとAPIのサーバーは動かせないので、`curl`・ブラウザでの確認・マイグレーションの適用はできない。できなかったことは、報告とこのファイルに書き、開発者のMacで確かめてもらう

**知っておくこと**:
- `prisma migrate dev`は対話が要るので、自動では動かない。マイグレーションは`prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`でSQLを作り、開発者に見せてから`prisma migrate deploy`で入れる(前回、Prismaが出したSQLの順番を手で直したことがある)
- APIのイメージにOpenSSLが無く、Prismaの道具が警告を出す。今は動いている。後回しで、ブランチ`fix/api-image-openssl`を切ってある(手元だけ)
- 新しいnpmは、インストール時のスクリプトを許可制にしている(prisma・bcrypt・esbuildなどは止められているが、今は無くても動く)
- テスト用のデータ: ログイン`20240001`/`password123`(管理者`90240001`)、カード`IC-CARD-001`〜`003`、物品`MAC-002`など(`MAC-001`は貸出中、`IPAD-005`は修理中)

## 6. まだ確かめていないこと・気になっていること

- 画面をブラウザで操作して確かめていない(エラーの文言が`detail`から出るか、ログインの失敗の表示など)
- タブレットの画面は、カードの認証の失敗でも「Session Expired」と出る(画面が401をすべてセッション切れとみなす)。0.8で直す
- 想定外のエラー(500)のログの出方は、単体テスト(P5)でしか確かめていない
- READMEの表示(Mermaidの図・画像の表)をGitHubで見ていない
