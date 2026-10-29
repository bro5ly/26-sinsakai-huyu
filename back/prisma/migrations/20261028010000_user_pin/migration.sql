-- タブレット用のPINの列を足す(docs/backlog.md 0.8 c、docs/auth.md R-A5〜A7・P4)。
-- 今いる利用者は、どれもPIN未登録(NULL)・失敗0回・ロック無しになる

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "pin_failed_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pin_hash" TEXT,
ADD COLUMN     "pin_locked_at" TIMESTAMP(3);

