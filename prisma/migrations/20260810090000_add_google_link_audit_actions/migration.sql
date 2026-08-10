-- Profilden Google bağlantısı (roadmap adım 15c · teknik borç #33) — denetim
-- sözlüğüne giriş yöntemi değişiklikleri ekleniyor.
--
-- GERİYE UYUMLU: yalnızca yeni enum DEĞERLERİ ekleniyor. Hiçbir tablo, kolon
-- veya satır değişmiyor; eski sürüm kod bu değerleri hiç bilmeden çalışmaya
-- devam eder (13-environments.md → geriye uyumlu adımlar).
--
-- GERİ ALMA: bir enum değerini PostgreSQL'den kaldırmanın doğrudan yolu yok
-- (`DROP VALUE` yok). Değer eklemek bu yüzden bilinçli olarak TEK YÖNLÜ kabul
-- ediliyor; riski yok, kullanılmayan bir enum değeri hiçbir davranışı
-- değiştirmez (adım 15'teki aynı karar).
--
-- PostgreSQL 12+ `ADD VALUE` ifadesine transaction içinde izin verir; şart,
-- eklenen değerin AYNI transaction içinde kullanılmamasıdır. Burada yalnızca
-- ekleme var, kullanım yok.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'google_link';
ALTER TYPE "AuditAction" ADD VALUE 'google_unlink';

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'account';
