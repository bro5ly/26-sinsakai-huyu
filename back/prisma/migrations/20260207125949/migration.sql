/*
  Warnings:

  - A unique constraint covering the columns `[student_id]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - Made the column `student_id` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "user_email_key";

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "student_id" SET NOT NULL;

-- CreateTable
CREATE TABLE "external_user" (
    "UniqueID" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "slack_user_id" TEXT,
    "slack_team_id" TEXT,
    "serial_number" TEXT,
    "user_type" "UserType" NOT NULL DEFAULT 'STUDENT',
    "name" TEXT NOT NULL,
    "grade" TEXT,
    "major" TEXT,
    "student_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_user_pkey" PRIMARY KEY ("UniqueID")
);

-- CreateTable
CREATE TABLE "verification_codes" (
    "student_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("student_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_user_email_key" ON "external_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "external_user_student_id_key" ON "external_user"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_student_id_key" ON "user"("student_id");
