-- 貸し出しの記録に、借りた端末と返した端末を足す(docs/backlog.md 0.8 E3、docs/auth.md A-Q4)。
-- この列より前の記録と、まだ返していない記録では空

-- AlterTable
ALTER TABLE "rental" ADD COLUMN     "rented_device_id" TEXT,
ADD COLUMN     "returned_device_id" TEXT;

-- AddForeignKey
ALTER TABLE "rental" ADD CONSTRAINT "rental_rented_device_id_fkey" FOREIGN KEY ("rented_device_id") REFERENCES "tablet_device"("UniqueID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental" ADD CONSTRAINT "rental_returned_device_id_fkey" FOREIGN KEY ("returned_device_id") REFERENCES "tablet_device"("UniqueID") ON DELETE SET NULL ON UPDATE CASCADE;

