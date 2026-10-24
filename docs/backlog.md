# 残タスク

上から順に進める。番号は`docs/spec.md`の要件(R-)・判断表(C)・現状とのずれ(ずれ)・要確認(Q)。

## 進め方

- **動きを変えない整理**(`refactor:`): 先に今の動きを確かめるテストを書いて緑にし、緑のまま形を変える
- **動きを変える修正**(`fix:`・`feat:`): 仕様の表に行を足してから、赤 → 緑 → 整える。緑になるたびに1コミット
- 判断は副作用(DB・時計・乱数・トークン・メール)の無い関数に出し、テストはその関数に対して書く。DBに触る部分は薄くする
- **実装を優先し、テストもClaudeが書く**(2026-10-23に変更。それまでは開発者が書く決まりだった)。大体の機能ができたら、最後のほうの機能だけ開発者が練習としてテストを書く

## 0. テストの土台

- [x] `back/`にVitest 5.0.5を入れ、`docker compose exec api npm test`で動くようにする(Vitest 5はNode 22以上なので、APIのイメージをNode 20(サポート切れ)から24に上げた)
- [x] テストの置き場所を決める(`src/`の中で元のファイルの隣に`*.test.ts`)
- [x] CLAUDE.mdのコマンドの表に足す
- [x] `rental.status.test.ts`(S1〜S6・I1〜I4)を書いた。期限の比べ方を`<=`に変えるとS4が赤になることも確かめた
- [ ] 画面(`front/`)のイメージもNode 20のまま。上げるかを決める

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
- 同時に借りられたときの2件目は409だが、文言が「既に登録されているデータです」(Prismaの一意制約違反の既定)。「貸し出し中の物品です」にする
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

- [ ] npm workspacesにする(直下の`package.json`に`back`・`front`・`shared`)。ロックファイルを1つにまとめる
- [ ] `shared/`を作り、`docs/api.md`で決めたAPIの入力と出力の形・エラーの形(RFC 9457)・`code`の一覧をZodのスキーマで書く(`z.infer`で型も作る)。今の`back/src/features/*/…schema.ts`の入力の検証もここに移す
- [ ] **エラーの扱いを作り直す(最初にやる。新しいAPIは全部この形で作る。2026-10-24決定 E1〜E4)**
  - 判断の関数(判断表C・T)は、Resultを返す(`{ ok: true }`か`{ ok: false, reason }`)。HTTPを知らない(E1)
  - serviceは、断るときに`throw new DomainError(code)`。持つのは`code`だけで、`code`は`docs/api.md`6章の一覧の型で縛る(一覧に無い値は型チェックで落ちる)
  - `code` → ステータスと画面の文言(`detail`)の対応表を、サーバーの1か所(`errors.ts`)に持つ(E2)
  - エラー用のミドルウェアを1つにする: `DomainError`は表を引いてRFC 9457で返す、入力の検証の失敗は400 `VALIDATION_ERROR`、想定外は500 `INTERNAL_ERROR`、存在しないURLも同じ形の404。controllerの`try/catch`と`handleError`はなくす(Express 5はthrowをミドルウェアに渡す)
  - 想定外の例外は、エラーの種類とスタックだけをログに出す。リクエストの中身(学籍番号・パスワードなど)は出さない(E3)
  - 今の`AppError`・`tabletMiddleware`の`next(err)`・`response-handler.ts`を置き換える
- [ ] **組み立てとrouteの書き方を作り直す(エラーの扱いの直後。2026-10-24決定 R1〜R5)**
  - 組み立ては1か所: `src/deps.ts`の`buildDeps()`で本物の依存(Prisma・名簿の窓口・メール)を作り、`createApp(deps)`に渡す。`server.ts`は本物、テストは偽物を渡す(HTTPを通すテストをDB無しで書ける)。名簿の窓口の切り替え(`ROSTER_SOURCE`)もここだけ(R1)
  - controllerのクラスはなくし、`*.routes.ts`(`createAuthRoutes(deps)`など)に「入力 → service → 返す」を直接書く。判断はserviceと判断の関数に残す(R2)
  - 入力の検証は小さな関数(`route({ body: schema }, async ({ body, user }) => ...)`)で、検証してから型付きで渡す。`req.body as 型`の決めつけは使わない。スキーマは`shared/`から使う(R3)
  - `createApp`で、セキュリティのヘッダ(`helmet`)・JSONの大きさの上限・404のミドルウェア・エラー用のミドルウェアをかける。回数の制限(`express-rate-limit`)はログインなどのrouteにだけかける(数字は`docs/auth.md`4.6)(R4)
- [ ] APIを`docs/api.md`の新しいURLと形に1本ずつ移す(画面も同じ変更で移し、古いURLは残さない)
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
- [ ] Dockerの作り直し: ビルドの起点をリポジトリ直下にし、webとapiの両方のコンテナから`shared/`が見えるようにする。`node_modules`のボリュームも合わせる
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
- [ ] JWTの鍵と用途の印を分ける、ログアウトでDBのトークンを消す(R-A16〜A19)
- [ ] ダッシュボードの使い捨てのバーコード(R-28・R-29、A-Q6)
- [ ] パスワードの再設定(UC-4、R-33〜R-37)。認証コードの表に用途(登録・再設定)を足す

`2. 登録・ログイン`のうち、鍵の分離・ログアウト・回数の制限はここに含める。

## 1. 貸し出し・返却(タブレット)

- [ ] 判断表(C1〜C8)から例の表(正常系・異常系・境界値)を作る
- [ ] 貸し出せるかの判断を`rental.repository.ts`の`saveCheckout`から、副作用の無い関数(例: `canCheckout`)に出す。repositoryは読み書きだけにする
- [ ] 返却期限の計算に「今」を外から渡す
- [ ] C4〜C7: `RentalSetting`(貸し出し停止・停止期間・上限数)と延滞を見る(ずれ6、Q5・Q6)
- [ ] 同じ物品を同時に借りても1件になるようにする(状態が`AVAILABLE`のときだけ更新する)
- [ ] `tabletMiddleware`のエラーをJSONで返し、タブレットがセッション切れに気づけるようにする(ずれ4、R-26)
- [ ] タブレット用トークンとWebのトークンを互いに使えないようにする(ずれ3)

## 2. 登録・ログイン

- [ ] `auth.service.ts`の副作用(時計・認証コードの乱数・トークン・bcrypt・メール)を外から渡す
- [ ] 認証コードを再申請できるようにする(ずれ1、R-5)
- [ ] 登録用トークンを専用の鍵か用途の印で分ける(ずれ2)
- [ ] ログアウトでDBのリフレッシュトークンも消す(ずれ8、R-15)
- [ ] 認証コードの失敗回数の上限(R-8、Q1)、ログイン失敗の文言(R-16、Q2)

## 3. 掃除

- [ ] 利用者の情報を出す`console.log`を消す(ずれ5)
- [ ] 中身が素通しのserviceと空のファイル(`item.schema.ts`・`auth/strategies/`)を整理する
- (フロントの古いAPI呼び出し`lib/api.ts`・`lib/auth-api.ts`の整理は、0.7でやる)
- [ ] 存在しないAPIを呼ぶ`getItemsByTitle`を消す(ずれ11)
- [ ] `app/page.tsx`(Next.jsの初期のまま)をどこかへの案内にする

## 4. フロントの認証

- [ ] `AuthContext`に読み込み中の状態を持たせ、`dashboard`の2秒待ちをやめる
- [ ] アクセストークンのCookieの期限をサーバーと揃える(ずれ10)

## 5. 在庫管理(新機能)

- [ ] `docs/inventory.md`に要件を書く(UC-21〜UC-24: 物品の種類と物品の追加・編集、状態の変更、貸出中の物を紛失にしたときの貸し出しの記録の扱い、誰が何を借りているかの一覧、利用者の貸し出しを止める・上限を変える)
- [ ] 管理者の権限(`user.role = ADMIN`)の確かめ方を決める

## 6. Slackでの返却期限の通知(在庫管理のあと)

- [ ] 要件を書く(UC-11: 期限が近い・過ぎたときに、誰に・いつ・何を送るか。Slackのアカウントとのつなげ方)。テーブル`notification`は用意してある
