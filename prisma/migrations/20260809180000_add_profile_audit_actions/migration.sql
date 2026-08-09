-- Profil sayfası (roadmap adım 15) — denetim sözlüğüne adres ve kayıtlı kart
-- işlemleri ekleniyor.
--
-- GERİYE UYUMLU: yalnızca yeni enum DEĞERLERİ ekleniyor. Hiçbir tablo, kolon
-- veya satır değişmiyor; eski sürüm kod bu değerleri hiç bilmeden çalışmaya
-- devam eder (13-environments.md → geriye uyumlu adımlar).
--
-- GERİ ALMA: bir enum değerini PostgreSQL'den kaldırmanın doğrudan yolu yok
-- (`DROP VALUE` yok). Geri dönüş gerekirse tipin yeniden oluşturulması gerekir;
-- bu yüzden değer eklemek bilinçli olarak TEK YÖNLÜ kabul ediliyor. Riski yok:
-- kullanılmayan bir enum değeri hiçbir davranışı değiştirmez.
--
-- PostgreSQL 12+ `ADD VALUE` ifadesine transaction içinde izin verir; şart,
-- eklenen değerin AYNI transaction içinde kullanılmamasıdır. Burada yalnızca
-- ekleme var, kullanım yok — Prisma'nın transaction'lı migration'ıyla uyumlu.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'address_create';
ALTER TYPE "AuditAction" ADD VALUE 'address_update';
ALTER TYPE "AuditAction" ADD VALUE 'address_delete';
ALTER TYPE "AuditAction" ADD VALUE 'saved_card_delete';

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'address';
ALTER TYPE "AuditEntityType" ADD VALUE 'saved_card';
