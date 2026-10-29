---
paths:
  - "front/src/**"
---

# フロントエンド(Next.js)のルール

## 置き場所

- `app/`: ページ。データの取得や状態はhooksに出し、ページは組み立てに専念する
- `components/<画面>/`: 部品。UIはHeroUI(`@heroui/react`)とTailwindで作る
- `hooks/`: `useAuthForm`・`useCatalog`(種類の一覧とカテゴリ。`useFilteredItemTypes`で画面で絞り込む)・`useItemType`(詳細)・`useMyRentals`(借りている物をその都度取る。どれもログインを確かめ終えたか(`enabled`)を受け取る)・`usePinForm`(PINの登録・変更。送る前に`shared/`の`setPinRequestSchema`で確かめる)・`useTabletDevice`(この端末が登録されているか)・`useDeviceRegistrationForm`(タブレットでの端末の登録)・`useAdminTabletDevices`(管理者の端末の一覧と取り消し)・`useTablet`(タブレットのセッション。番号は画面のメモリにだけ持つ)・`useTabletOperations`(カード → PIN → 操作の選択 → 完了。無操作30秒・完了10秒・「終わる」で最初に戻し、サーバーのセッションも消す)
- `contexts/`: `AuthContext`(Webのログイン状態。確かめ中かどうかと本人の`Me`だけを持ち、`useAuth()`で取り出す。借りている物は入れない)、`TabletContext`(タブレットのセッション)
- `services/`: API呼び出し。`ApiService`を継承して`get`/`post`を使う。`lib/api.ts`・`lib/auth-api.ts`は古い重複なので新しく使わない
- `types/`: APIの型。**まだ新しい形に移していないAPIは、バックエンドの`sendSuccess`の形(`{ success, ...data }`)に合わせる**。移したAPI(登録・ログイン・本人・カタログ)は包まれず、成否はHTTPのステータスで分かる(失敗は`ApiError`で来る。`response.success`を見ない)。`shared/`(`@sinsakai/shared`)にある形はそちらを使い、手で書き直さない(今はエラーの`code`とRFC 9457の形、登録・ログインの形(`Session`・`VerificationToken`)、本人の形(`Me`・`Rental`・`SetPinRequest`)、カタログの形(`ItemTypeSummary`・`ItemTypeDetail`・`Category`)、タブレットの端末の形(`TabletDevice`・`CurrentTabletDevice`・`RegisterTabletDeviceRequest`)、タブレットの本人確認の形(`TabletSession`・`CreateTabletSessionRequest`)。`ApiService`はエラーの応答を`problemSchema`で確かめてから読む)

## 認証

- Webのログインはサーバーのセッションで、番号はHttpOnlyのCookieにある。画面はトークンを持たず、読めない(2026-10-28 A8-3)。`ApiService`がどの呼び出しにも`credentials: "include"`を付ける
- `AuthContext`は`status`(`"loading" | "authenticated" | "unauthenticated"`)と本人の`Me`だけを持つ(A8-4)。開いたときに`/api/me`を1回呼んで確かめる。ログイン・登録のあとは`loadMe()`を呼ぶ
- ページは`status === "unauthenticated"`のときだけ`/auth`へ送る。`"loading"`の間は送らず、読み込み中を出す(送ると再読み込みでログインの画面に戻される。Ca6〜Ca8)。データを取るhooksには`status === "authenticated"`を渡し、確かめ終わってから取る

## 気をつけること

- カタログ(棚にある物)の物品のバーコードは画面に出さない(実物を持たずに借りられてしまうため。2026-10-28 Ca5-B)。ダッシュボードの借りている物のバーコードも、0.8のe2で外す(2026-10-29 BC1。値が分かれば、実物を持たずにタブレットで返却できてしまうため)。物品のバーコードを画面に出すのは、管理者の画面だけ。`/barcodes`はテスト用で、e2で開発のときだけ使えるようにする(BC2)
- `app/page.tsx`はNext.jsの初期のまま
- カメラでの読み取りは`html5-qrcode`(`components/BarcodeScanner.tsx`)、バーコードの表示は`react-barcode`
