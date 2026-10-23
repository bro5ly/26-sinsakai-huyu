-- 同じ事実を2か所に持つのをやめる(docs/backlog.md 0.5)
-- - user: 名簿(external_user)の写しを消し、rental_setting の列を移す。student_id で名簿をたどる
-- - item.status: RENTED を外す(貸出中かどうかは返却されていない rental で決まる)
-- - rental.status: 消す(returned_at と due_date から決まる)
-- prisma migrate diff の出力から、user の列を消す処理を UserType の作り直しより前に移した
-- (user.user_type が古い型を使ったままだと DROP TYPE が失敗するため)

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'ADMIN');

-- AlterTable
ALTER TABLE "user" DROP COLUMN "email",
DROP COLUMN "grade",
DROP COLUMN "major",
DROP COLUMN "name",
DROP COLUMN "serial_number",
DROP COLUMN "user_type",
ADD COLUMN     "can_borrow" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "max_items" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'MEMBER',
ADD COLUMN     "suspended_until" TIMESTAMP(3),
ADD COLUMN     "suspension_reason" TEXT;

-- AlterEnum
BEGIN;
CREATE TYPE "ItemStatus_new" AS ENUM ('AVAILABLE', 'MAINTENANCE', 'LOST', 'DISPOSED');
ALTER TABLE "public"."item" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "item" ALTER COLUMN "status" TYPE "ItemStatus_new" USING ("status"::text::"ItemStatus_new");
ALTER TYPE "ItemStatus" RENAME TO "ItemStatus_old";
ALTER TYPE "ItemStatus_new" RENAME TO "ItemStatus";
DROP TYPE "public"."ItemStatus_old";
ALTER TABLE "item" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserType_new" AS ENUM ('STUDENT', 'FACULTY', 'EXTERNAL');
ALTER TABLE "public"."external_user" ALTER COLUMN "user_type" DROP DEFAULT;
ALTER TABLE "external_user" ALTER COLUMN "user_type" TYPE "UserType_new" USING ("user_type"::text::"UserType_new");
ALTER TYPE "UserType" RENAME TO "UserType_old";
ALTER TYPE "UserType_new" RENAME TO "UserType";
DROP TYPE "public"."UserType_old";
ALTER TABLE "external_user" ALTER COLUMN "user_type" SET DEFAULT 'STUDENT';
COMMIT;

-- DropForeignKey
ALTER TABLE "rental_setting" DROP CONSTRAINT "rental_setting_userId_fkey";

-- AlterTable
ALTER TABLE "item" ALTER COLUMN "barcode" SET NOT NULL;

-- AlterTable
ALTER TABLE "rental" DROP COLUMN "status";

-- DropTable
DROP TABLE "rental_setting";

-- DropEnum
DROP TYPE "RentalStatus";

-- CreateIndex
CREATE UNIQUE INDEX "external_user_serial_number_key" ON "external_user"("serial_number");

-- 返却されていない貸し出しは物1つにつき1件(同時に借りられても2件目は一意制約違反になる)。Prismaでは書けない
CREATE UNIQUE INDEX "rental_active_item_key" ON "rental"("itemId") WHERE "returned_at" IS NULL;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "external_user"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;
