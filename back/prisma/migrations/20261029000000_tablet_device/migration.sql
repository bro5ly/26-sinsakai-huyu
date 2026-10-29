-- タブレットの端末の表を足す(docs/backlog.md 0.8 d、docs/auth.md R-A1〜A3・D4)。
-- 番号はハッシュだけを持つ。取り消しても行は消さず、revoked_at に日時を入れる

-- CreateTable
CREATE TABLE "tablet_device" (
    "UniqueID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "registered_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "tablet_device_pkey" PRIMARY KEY ("UniqueID")
);

-- CreateIndex
CREATE UNIQUE INDEX "tablet_device_token_hash_key" ON "tablet_device"("token_hash");

-- AddForeignKey
ALTER TABLE "tablet_device" ADD CONSTRAINT "tablet_device_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "user"("UniqueID") ON DELETE RESTRICT ON UPDATE CASCADE;

