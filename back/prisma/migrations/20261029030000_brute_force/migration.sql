-- 総当たりの対策(docs/backlog.md 0.8 F1〜F5、docs/auth.md 4.6)。
-- 今いる利用者は、どれも失敗0回・止めていない状態になる。
-- 認証コードの列は名前を変えるだけで行は消さない。今ある行のコードはハッシュではないので合わなくなるが、
-- 15分で切れるコードなので、申請し直せば済む

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "login_failed_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "login_locked_until" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "verification_codes" RENAME COLUMN "code" TO "code_hash";
ALTER TABLE "verification_codes" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;
