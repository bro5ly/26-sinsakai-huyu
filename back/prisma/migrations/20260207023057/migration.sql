-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('STUDENT', 'FACULTY', 'ADMIN', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('AVAILABLE', 'RENTED', 'MAINTENANCE', 'LOST', 'DISPOSED');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('RENTING', 'RETURNED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('RENTAL_CONFIRMATION', 'RETURN_REMINDER', 'OVERDUE_ALERT', 'SYSTEM_NOTICE');

-- CreateTable
CREATE TABLE "user" (
    "UniqueID" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "slack_user_id" TEXT,
    "slack_team_id" TEXT,
    "serial_number" TEXT,
    "user_type" "UserType" NOT NULL DEFAULT 'STUDENT',
    "name" TEXT NOT NULL,
    "grade" TEXT,
    "major" TEXT,
    "student_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("UniqueID")
);

-- CreateTable
CREATE TABLE "rental_setting" (
    "UniqueID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "can_borrow" BOOLEAN NOT NULL DEFAULT true,
    "max_items" INTEGER NOT NULL DEFAULT 5,
    "supended_until" TIMESTAMP(3),
    "suspention_reason" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_setting_pkey" PRIMARY KEY ("UniqueID")
);

-- CreateTable
CREATE TABLE "category" (
    "UniqueID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_pkey" PRIMARY KEY ("UniqueID")
);

-- CreateTable
CREATE TABLE "genre" (
    "UniqueID" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "genre_pkey" PRIMARY KEY ("UniqueID")
);

-- CreateTable
CREATE TABLE "item_type" (
    "UniqueID" TEXT NOT NULL,
    "genre_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "author" TEXT,
    "publisher" TEXT,
    "isbn" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "rental_period_days" INTEGER NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_type_pkey" PRIMARY KEY ("UniqueID")
);

-- CreateTable
CREATE TABLE "item_type_genres" (
    "UniqueID" TEXT NOT NULL,
    "genre_id" TEXT NOT NULL,
    "item_type_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_type_genres_pkey" PRIMARY KEY ("UniqueID")
);

-- CreateTable
CREATE TABLE "item" (
    "UniqueID" TEXT NOT NULL,
    "item_typeId" TEXT NOT NULL,
    "barcode" TEXT,
    "location" TEXT,
    "status" "ItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_pkey" PRIMARY KEY ("UniqueID")
);

-- CreateTable
CREATE TABLE "rental" (
    "UniqueID" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "returned_at" TIMESTAMP(3),
    "status" "RentalStatus" NOT NULL DEFAULT 'RENTING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_pkey" PRIMARY KEY ("UniqueID")
);

-- CreateTable
CREATE TABLE "notification" (
    "UniqueID" TEXT NOT NULL,
    "rental_id" TEXT,
    "user_id" TEXT NOT NULL,
    "notification_type" "NotificationType" NOT NULL,
    "status" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "slack_channel_id" TEXT,
    "slack_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("UniqueID")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rental_setting_userId_key" ON "rental_setting"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "item_barcode_key" ON "item"("barcode");

-- AddForeignKey
ALTER TABLE "rental_setting" ADD CONSTRAINT "rental_setting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("UniqueID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genre" ADD CONSTRAINT "genre_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("UniqueID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_type" ADD CONSTRAINT "item_type_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genre"("UniqueID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_type_genres" ADD CONSTRAINT "item_type_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genre"("UniqueID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_type_genres" ADD CONSTRAINT "item_type_genres_item_type_id_fkey" FOREIGN KEY ("item_type_id") REFERENCES "item_type"("UniqueID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_item_typeId_fkey" FOREIGN KEY ("item_typeId") REFERENCES "item_type"("UniqueID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental" ADD CONSTRAINT "rental_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("UniqueID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental" ADD CONSTRAINT "rental_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("UniqueID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rental"("UniqueID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("UniqueID") ON DELETE RESTRICT ON UPDATE CASCADE;
