-- Destek talebi yaşam döngüsü + ek dosyaları (roadmap adım 13 · PRD §5.7)
--
-- GERİYE UYUMLU: eklenen kolonların hepsi NULL kabul ediyor ya da geçici bir
-- varsayılanla doldurulabiliyor. Hiçbir kolon düşürülmüyor, hiçbir veri
-- silinmiyor; bu migration'ı görmeyen eski sürüm kod çalışmaya devam eder
-- (09-ci-cd-deploy.md "şema değişikliği geriye uyumlu adımlara bölünür").

-- `closed_at`: üyenin talebi kapattığı an.
-- `notified_status`: tembel bildirim senkronizasyonunun ilerlettiği işaret.
ALTER TABLE "support_tickets"
  ADD COLUMN "closed_at" TIMESTAMP(3),
  ADD COLUMN "notified_status" "SupportTicketStatus";

-- `content_type` NOT NULL ama mevcut satırlar için geçici varsayılanla ekleniyor.
-- Varsayılan hemen düşürülüyor: uygulama türü her zaman baytlardan doğrulayarak
-- yazıyor, bu yüzden kalıcı bir varsayılan yanlış bir değeri sessizce kabul
-- etmenin yolu olurdu.
ALTER TABLE "ticket_attachments"
  ADD COLUMN "content_type" TEXT NOT NULL DEFAULT 'image/png',
  ADD COLUMN "data" BYTEA;

ALTER TABLE "ticket_attachments"
  ALTER COLUMN "content_type" DROP DEFAULT;
