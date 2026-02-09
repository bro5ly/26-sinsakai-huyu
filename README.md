# Sinsakai Huyu プロジェクト

フロントエンド（Next.js）、バックエンド（Express + Prisma）、PostgreSQLで構成されたフルスタックアプリケーションです。

## 技術スタック

### フロントエンド
- Next.js 16.1.6
- React 19.2.3
- TypeScript 5
- Tailwind CSS 4

### バックエンド
- Node.js + Express 5.2.1
- TypeScript 5.9.3
- Prisma 7.3.0
- PostgreSQL 16

### インフラ
- Docker & Docker Compose
- Prisma Studio（データベース管理）

## セットアップ

### 必要な環境
- Docker
- Docker Compose

### 起動手順

1. リポジトリをクローン
```bash
git clone <repository-url>
cd 2-13-sinsakai
```

2. Dockerコンテナを起動
```bash
docker-compose up -d
```

このコマンドで以下のサービスが起動します：
- **web**: フロントエンド (http://localhost:4545)
- **api**: バックエンドAPI (http://localhost:5454)
- **db**: PostgreSQLデータベース (localhost:1919)
- **studio**: Prisma Studio (http://localhost:5555)

3. データベースのマイグレーション（初回のみ）
```bash
docker-compose exec api npm run db:migrate
```

4. ブラウザでアクセス
- フロントエンド: http://localhost:4545
- Prisma Studio: http://localhost:5555

### 開発時のコマンド

#### 全体
```bash
# すべてのコンテナを起動
docker-compose up -d

# ログを表示
docker-compose logs -f

# コンテナを停止
docker-compose down

# コンテナを停止してボリュームも削除
docker-compose down -v
```

#### フロントエンド
```bash
# コンテナ内に入る
docker-compose exec web sh

# 開発サーバー起動（コンテナ起動時に自動実行）
npm run dev

# ビルド
npm run build

# Lint
npm run lint
```

#### バックエンド
```bash
# コンテナ内に入る
docker-compose exec api sh

# 開発サーバー起動（コンテナ起動時に自動実行）
npm run dev

# Prismaマイグレーション
npm run db:migrate

# Prisma Clientの再生成
npm run db:generate
```

## プロジェクト構成

```
.
├── docker-compose.yml    # Docker構成ファイル
├── .env                  # 環境変数（データベース接続情報）
├── front/                # Next.jsフロントエンド
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
└── back/                 # Express + Prismaバックエンド
    ├── src/
    ├── prisma/
    ├── Dockerfile
    └── package.json
```

## ポート番号

| サービス | ポート | 説明 |
|---------|--------|------|
| web (フロントエンド) | 4545 | Next.jsアプリケーション |
| api (バックエンド) | 5454 | Express APIサーバー |
| db (データベース) | 1919 | PostgreSQLデータベース |
| studio | 5555 | Prisma Studio |

## データベース接続情報

```
ホスト: localhost
ポート: 1919
ユーザー: postgres
パスワード: postgres
データベース名: sinsakai-huyu-db
```

コンテナ内部からの接続（APIサーバーから）：
```
DATABASE_URL="postgresql://postgres:postgres@db:5432/sinsakai-huyu-db?schema=public"
```

## トラブルシューティング

### データベース接続エラー
データベースが起動するまで待つ必要があります。`docker-compose.yml`にはヘルスチェックが設定されているため、通常は自動的に待機します。

### ポートが使用中
他のアプリケーションが同じポートを使用している場合は、`docker-compose.yml`のポート設定を変更してください。

### データをリセットしたい
```bash
docker-compose down -v
docker-compose up -d
docker-compose exec api npm run db:migrate
```
