-- Spor salonu üyeliği (roadmap adım 12 · PRD §5.6).
--
-- İKİ EKLEME, İKİ İŞ KURALI. Veri silinmiyor, var olan kolon değişmiyor:
-- iki kolon da NULL kabul ettiği için mevcut satırlar olduğu gibi kalır ve
-- eski sürüm kod bu kolonları hiç bilmeden çalışmaya devam eder
-- (09-ci-cd-deploy.md → geriye uyumlu şema değişikliği).
--
-- 1. active_user_id — "aynı anda tek üyelik" kuralının veritabanı tarafı.
--    Üyelik yaşadığı sürece user_id ile aynı, sona erdiğinde NULL.
--    PostgreSQL benzersiz indekste birden çok NULL kabul ettiği için geçmiş
--    üyelikler birikebilir, yaşayan yalnızca bir tane olabilir.
--
-- 2. renewal_reminder_for_billing_at — "yenilemeden 3 gün önce hatırlatma"
--    bildiriminin ikinci kez yazılmasını engelleyen işaret. orders.notified_status
--    ile aynı iş: koşullu güncelleme tuttuysa bildirim yazılır.

-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "active_user_id" TEXT,
ADD COLUMN     "renewal_reminder_for_billing_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "memberships_active_user_id_key" ON "memberships"("active_user_id");
