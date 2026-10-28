-- Webのログインを、JWTのリフレッシュトークンからサーバーのセッションに変える(docs/backlog.md 0.8 A8-3)。
-- セッションと登録用トークンは、番号そのものではなくSHA-256のハッシュだけを持つ(A8-8)。
-- refresh_tokensの中身は移さない(JWTそのものを持っていて、セッションの番号にできない)。今ログインしている人は、一度ログインし直しになる

-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('WEB', 'TABLET');

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_userId_fkey";

-- AlterTable
ALTER TABLE "verification_codes" ADD COLUMN     "token_expires_at" TIMESTAMP(3),
ADD COLUMN     "token_hash" TEXT;

-- DropTable
DROP TABLE "refresh_tokens";

-- CreateTable
CREATE TABLE "session" (
    "UniqueID" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "SessionKind" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_pkey" PRIMARY KEY ("UniqueID")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_token_hash_key" ON "session"("token_hash");

-- CreateIndex
CREATE INDEX "session_user_id_idx" ON "session"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_codes_token_hash_key" ON "verification_codes"("token_hash");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("UniqueID") ON DELETE CASCADE ON UPDATE CASCADE;

