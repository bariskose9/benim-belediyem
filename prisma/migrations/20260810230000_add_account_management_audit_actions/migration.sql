-- Adım 17b — hesap yönetimi (PRD §5.11 · ADR-017).
--
-- GERİYE UYUMLU: yalnızca iki ENUM DEĞERİ ekleniyor. Tablo, kolon ve satır
-- değişmiyor; eski sürüm kod bu değerleri hiç bilmeden çalışmaya devam eder.
--
-- ⚠️ TEK YÖNLÜDÜR: PostgreSQL'de enum değeri kaldırmanın doğrudan yolu yok
-- (`DROP VALUE` yok). Riski yok — kullanılmayan bir enum değeri hiçbir
-- davranışı değiştirmez.
--
-- ⚠️ `account_delete` ve `data_export` değerleri ZATEN VARDI (adım 3'ten beri),
-- bu yüzden burada yoklar. Eklenen ikisi bu adımda doğan yeni olaylar.

ALTER TYPE "AuditAction" ADD VALUE 'identity_unlink';
ALTER TYPE "AuditAction" ADD VALUE 'contact_update';
