---
paths:
  - "back/prisma/**"
  - "back/prisma.config.ts"
---

# データベース(Prisma)のルール

テーブルの関係は`docs/architecture.md`の「データモデル」。

## 書き方

- モデル名・項目名はキャメルケース、DBの名前は`@map("snake_case")`・`@@map("snake_case")`で付ける(既存に合わせる。IDの列は`@map("UniqueID")`)
- 状態は文字列ではなくenumにする(`ItemStatus`・`RentalStatus`など)
- 同じ事実を2か所に持たない(2026-10-23に、名簿の写しと「貸出中」の二重管理をやめた)。他の列から分かるものは列にしない
- Prismaで書けない制約(部分インデックスなど)は、`--create-only`で作ったマイグレーションのSQLに手で足し、`schema.prisma`にコメントで書く

## 変えたとき

- スキーマを変えたら`docker compose exec api npm run db:migrate -- --name <内容>`。マイグレーションのSQLと`src/generated/prisma/`の両方をコミットする
- 作成済みのマイグレーション(`prisma/migrations/`)は書き換えない。直すときは新しいマイグレーションを足す
- `seed.ts`は全テーブルを消してから入れ直す。新しいテーブルを足したら、外部キーの逆順で`deleteMany`に加える
- seedのバーコード・カード番号は`front/src/app/barcodes/page.tsx`の印刷用データと揃っている。片方を変えたらもう片方も直す
