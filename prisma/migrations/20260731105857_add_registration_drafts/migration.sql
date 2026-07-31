-- CreateTable
CREATE TABLE "registration_drafts" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "national_id_hash" TEXT NOT NULL,
    "kps_payload_encrypted" TEXT NOT NULL,
    "contact_encrypted" TEXT,
    "email_hash" TEXT,
    "phone_hash" TEXT,
    "password_hash" TEXT,
    "actor_ip_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "registration_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registration_drafts_token_hash_key" ON "registration_drafts"("token_hash");

-- CreateIndex
CREATE INDEX "registration_drafts_expires_at_idx" ON "registration_drafts"("expires_at");

-- CreateIndex
CREATE INDEX "registration_drafts_national_id_hash_idx" ON "registration_drafts"("national_id_hash");
