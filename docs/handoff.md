# 引き継ぎ(2026-10-30)

このファイルは、作業を次のセッション(クラウドのClaude Codeなど)へ引き継ぐためのもの。**新しいセッションは、まずこのファイルと`CLAUDE.md`を読み、下の「1. 最初に開発者と認識を確かめる」を開発者に見せてから作業に入る。** 引き継ぎが済んだら、このファイルを今の状態に書き直す。

## 1. 最初に開発者と認識を確かめる

新しいセッションは、次の文章を開発者に見せ、食い違いがないかを確かめる。食い違いがあれば、`docs/`とこのファイルを直してから作業に入る。

> 引き継ぎを読みました。私の理解は次のとおりです。違うところがあれば教えてください。
>
> 1. **進め方**: まとめて進めず、問題を1つずつ出し、修正案と論点を番号付きの表(選択肢・おすすめと理由)にして、あなたに選んでもらう。決まったことは`docs/`に日付と番号付きで残してから次へ進む。作業の前に触るファイルと理由を見せ、作業の後にテストなどの結果を見せて止まる。答えの無い質問は実装の前に聞き直すが、返事から読み取れることは聞き直さない。文書や決まりを直すときは、同じことを書いている古い記述をすべて探して直す
> 2. **テスト**: 実装を優先し、テストも私が書く(赤 → 緑 → 整える)。テストは関数ごとの`describe`の中を正常系・異常系・境界値に分け、名前に仕様の番号を入れる。あなたが練習としてテストを書くのは、今は考えない(2026-10-30 INV13)
> 3. **今いる所**: 作り直しの予定(0.5〜0.9・1・2)は済んだ(2026-10-30。2章)。パスワードの再設定は後回し。次は、Macでのまとめての確かめ(ブラウザ)のあと、あなたが画面からDBまで全体のコードを学ぶ段(L1・L2。進め方はそのとき決める)。`buildDeps(config)`・`createApp(deps, config)`・`create○○Routes(deps)`・`route()`の役割と型の書き方は、前のセッションで説明して理解してもらった
> 4. **進め方の決まり**: 区切りごとに、前に予定・後に結果を見せて止まる。確認せずに直したもの(文書など)も、後でまとめて見せる。クラウドではテスト・型チェック・画面のビルドまでを確かめてコミットとpushをし、PRを`main`に入れる前にあなたのMacで`curl`などを確かめる。Macに貼るコマンドには`#`のコメントを付けない(zshでは引数になってしまう)
> 5. **大事な決まり**: 失敗の応答はRFC 9457の形で、エラー用のミドルウェアだけが返す。serviceは`DomainError(code)`を投げる(`code`は`shared/src/error-codes.ts`の表のものだけ)。判断の関数は`{ ok: false, reason }`を返す。名簿は名簿の窓口(`Roster`)からだけ読む
> 6. **環境**: 私の環境(クラウド)にはDockerが無い。テスト・型チェック・リント・ビルドはコンテナを使わずに動かす。DBとAPIと画面は、一時的なPostgreSQL 16を立てれば動かせるので、`curl`とPlaywrightで確かめられる(5章)。Macでの確かめ(Docker・ブラウザ)は、あなたにお願いする
>
> この理解で合っていれば、3章のとおり、次の作業の進め方を決めるところから始めます。

## 2. ここまでに済んだこと(すべて`main`に入っている)

| まとまり | PR | 中身 |
|---|---|---|
| 0.5 DB | #5 | 名簿の写し・`rental_setting`・「貸出中」の二重管理をやめた |
| 0.6 名簿の窓口 | #7 | `Roster`・`PrismaRoster`・`FakeRoster`。外部キーを外した |
| エラーの扱い | #8 | `DomainError`・`code`の表・RFC 9457・エラー用のミドルウェア1つ |
| 組み立て | #9 | `buildDeps`・`createApp`・`config.ts`・`route()`。HTTPを通すテスト(`supertest`) |
| 0.7 `shared/` | #11・#13〜#15・#25 | npm workspaces、APIをすべて`docs/api.md`の新しい形に移した、画面の手書きの型を消した、コマンドの呼び名 |
| 0.8 認証 | #16〜#24 | Webもタブレットもサーバーのセッション(JWTは無い)、PIN、端末の登録、カード + PIN、貸し出しと返却(判断表C)、総当たりの対策、カードの番号のバーコードを消した(G0)、Mailpit |
| 2 登録・ログイン | #26 | 乱数・トークン・bcryptを外から渡す |
| 0.9 形をそろえる | #27・#28 | Prettierと`back`のESLint、serviceとrepositoryの形(`.claude/rules/backend.md`) |
| レビュー | ブランチ`fix/review-findings` | 2026-10-30。仕様とコードを読み比べた。A1(無操作30秒の数え方)・A2(タブレットに借りている物を出さない)・B1〜B4・C2と、古い文書の整理 |

決めたことは、どれも`docs/backlog.md`に日付と番号付きで書いてある(0.8はA8-1〜A8-11・P1〜P6・D1〜D6・E1〜E8・BC1〜BC3・F1〜F5・G0、0.9はS・N・M・D、レビューはA1・A2・B1〜B4・C1・C2)。

## 3. 今やっていること

- レビューで見つけたもの(`fix/review-findings`)を、PRにしてマージするところ
- そのあと: Macでのまとめての確かめ(ブラウザ)。続けて、開発者の学習(L1: 1つのリクエストを画面からDBまで追う、L2: 要点を`docs/learning.md`に残す。進め方はそのとき決める)

## 4. このあとの順番

`docs/backlog.md`のとおり。残っているのは:
- 後回しにしたもの: パスワードの再設定(UC-4)、タブレットのカメラで読めない件(E4。画面のリントのエラー2件も同じファイル)、APIのイメージのOpenSSL、CI
- 「3. 掃除」: 画面の英語の文言を日本語に(C1)、ダッシュボードで延滞を目立たせる(R-30)、`app/page.tsx`、期限の切れたセッションの行の片付け
- 0.10 テストの書き方をそろえる(TS1〜TS6)→ 5 在庫管理(要件は`docs/inventory.md`。要確認IQ1〜IQ5は決めた。`docs/api.md`に形を書いて作る)、6 Slackの通知

## 5. 環境の注意

**Dockerが使えるとき(開発者のMac)**: `CLAUDE.md`の「コマンド」のとおり、コマンドはコンテナの中で動かす(直下の`package.json`の`npm run check`などの呼び名もある)。`curl`で確かめる前に、`docker compose logs api`で再起動を確かめる。依存が増えたら`docker compose up -d --build -V api web`。画面の見た目が崩れたら、`docker compose stop web`・`rm -rf front/.next`・`docker compose up -d web`(Turbopackの古いキャッシュ)。

**Dockerが使えないとき(クラウド)**:
- リポジトリの直下で`npm ci`のあと、`back/`で`npx vitest run`・`npx tsc --noEmit`・`npx eslint src prisma`、`front/`で`npx tsc --noEmit`・`npx eslint src`・`npx next build`が動く。テストはDBも`.env`も使わない
- DBとAPIと画面も動かせる: `/usr/lib/postgresql/16/bin/`の`initdb`・`pg_ctl`を`postgres`の利用者で動かし(データは`/var/tmp/pgtest`など)、`DATABASE_URL`を渡して`npx prisma migrate deploy`・`npm run db:seed`・`npx tsx src/server.ts`。画面は`NEXT_PUBLIC_API_URL`を渡して`npx next dev`。メールは小さなSMTPの受け口を立てて受ける。Playwright(入っている)でブラウザも確かめられる
- 止めるときは、起動したときのPIDで`kill`する。**`pkill -f`は使わない**(コマンドの文字列に当たり、自分のシェルを止めてしまう。2回やった)

**知っておくこと**:
- `prisma migrate dev`は対話が要るので、自動では動かない。マイグレーションのSQLは手で書くか`prisma migrate diff`で作り、一時的なDBで`prisma migrate deploy`のあと`migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`が空になることで確かめる
- `npm ci -w back`は直下の依存を入れないので、コンテナで使う道具(Prettierなど)は`back`か`front`に入れる
- APIのイメージにOpenSSLが無く、Prismaの道具が警告を出す。今は動いている(後回し)
- テスト用のデータ: ログイン`20240001`/`password123`(管理者`90240001`)、カード`IC-CARD-001`〜`003`、物品`MAC-002`など(`MAC-001`は貸出中、`IPAD-005`は修理中)。seedを入れ直すとPINと端末の登録も消える

## 6. まだ確かめていないこと・気になっていること

- 0.9とレビューの変更を、Macのブラウザでまだ確かめていない(クラウドではPlaywrightで確かめた)
- 想定外のエラー(500)のログの出方は、単体テストでしか確かめていない
- READMEの表示(Mermaidの図・画像の表)をGitHubで見ていない
