-- Adım 16 (planlı görevler): günlük görevin denetim kaydına yazabilmesi için
-- iki yeni enum değeri.
--
-- GERİYE UYUMLU ve TEK YÖNLÜ: enum'a değer EKLEMEK eski satırları ve eski kodu
-- etkilemez, ama PostgreSQL enum değeri SİLMEYİ desteklemez. Geri alma yolu
-- tabloyu ve tipi yeniden yazmaktır; bu yüzden değer adları baştan doğru
-- seçildi (04-database.md).

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'scheduled_task_run';

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'scheduled_task';
