---
paths:
  - "front/src/**"
---

# フロントエンド(Next.js)のルール

## 置き場所

- `app/`: ページ。データの取得や状態はhooksに出し、ページは組み立てに専念する
- `components/<画面>/`: 部品。UIはHeroUI(`@heroui/react`)とTailwindで作る
- `hooks/`: `useAuthForm`・`useItems`・`useMyRentals`(借りている物をその都度取る)・`useTablet`・`useTabletOperations`
- `contexts/`: `AuthContext`(Webのログイン状態。本人の`Me`だけを持ち、`useAuth()`で取り出す。借りている物は入れない)、`TabletContext`(タブレットのセッション)
- `services/`: API呼び出し。`ApiService`を継承して`get`/`post`を使う。`lib/api.ts`・`lib/auth-api.ts`は古い重複なので新しく使わない
- `types/`: APIの型。**まだ新しい形に移していないAPIは、バックエンドの`sendSuccess`の形(`{ success, ...data }`)に合わせる**。移したAPI(登録・ログイン・本人)は包まれず、成否はHTTPのステータスで分かる(失敗は`ApiError`で来る。`response.success`を見ない)。`shared/`(`@sinsakai/shared`)にある形はそちらを使い、手で書き直さない(今はエラーの`code`とRFC 9457の形、登録・ログインの形(`Session`・`VerificationToken`)、本人の形(`Me`・`Rental`)。`ApiService`はエラーの応答を`problemSchema`で確かめてから読む)

## 認証

- アクセストークンは`AuthContext`がCookie`accessToken`(JSから読める)に保存する。リフレッシュトークンはHttpOnly Cookieなので、触れるのはサーバーだけ。リフレッシュ・ログイン・ログアウトの呼び出しには`credentials: "include"`が要る
- 起動時の流れ: アクセストークンで`/api/me` → 401ならリフレッシュ → 失敗ならログアウト状態。ページは`useAuth()`を使うだけでよい
- `dashboard`は初期化を2秒待ってから`/auth`へ送る(初期化中に送ってしまう不具合の回避)。直すなら`AuthContext`に読み込み中の状態を持たせる

## 気をつけること

- `services/item.service.ts`の`getItemsByTitle`が呼ぶ`/api/items/:title`はバックエンドに無い。詳細ページは`useItems`の全件から絞り込んでいる
- `app/page.tsx`はNext.jsの初期のまま
- カメラでの読み取りは`html5-qrcode`(`components/BarcodeScanner.tsx`)、バーコードの表示は`react-barcode`
