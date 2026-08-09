-- Dış bilgi servislerinin önbelleği (ADR-015).
-- Geriye uyumlu: yalnızca yeni bir tablo ekliyor, hiçbir kolonu ve veriyi
-- değiştirmiyor. Eski sürüm kod bu tabloyu hiç bilmeden çalışmaya devam eder.

-- CreateTable
CREATE TABLE "external_data_cache" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "external_data_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_data_cache_key_key" ON "external_data_cache"("key");

-- CreateIndex
CREATE INDEX "external_data_cache_expires_at_idx" ON "external_data_cache"("expires_at");
