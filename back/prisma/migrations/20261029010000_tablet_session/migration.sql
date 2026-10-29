-- タブレットの本人確認のセッションを、Webと同じ session の表に持つ(docs/backlog.md 0.8 e1、docs/auth.md R-A8・R-A9)。
-- 作った端末(その端末でだけ使える)と、最後に使った日時(無操作30秒で切る)を足す。Webのセッションではどちらも空

-- AlterTable
ALTER TABLE "session" ADD COLUMN     "device_id" TEXT,
ADD COLUMN     "last_used_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "tablet_device"("UniqueID") ON DELETE SET NULL ON UPDATE CASCADE;

