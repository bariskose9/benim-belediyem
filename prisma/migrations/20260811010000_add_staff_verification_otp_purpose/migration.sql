-- Adım 17c — personel yetkisini kimlik doğrulamasından ayır (ADR-017 ilke 2).
--
-- GERİYE UYUMLU: yalnızca bir ENUM DEĞERİ ekleniyor. Tablo, kolon ve satır
-- değişmiyor; eski sürüm kod bu değeri hiç bilmeden çalışmaya devam eder.
--
-- ⚠️ TEK YÖNLÜDÜR: PostgreSQL'de enum değeri kaldırmanın doğrudan yolu yok
-- (`DROP VALUE` yok). Riski yok — kullanılmayan bir enum değeri hiçbir
-- davranışı değiştirmez.
--
-- ⚠️ MEVCUT `users.is_staff` SATIRLARINA DOKUNULMUYOR ve bu bilinçli:
-- tohumla bağlanmış personel hesaplarının yetkisi İŞVERENİN verisinden
-- (`staff_members`) geliyor, kullanıcının kendi iddiasından değil. Bu adım
-- kullanıcının kendi kimliğinden yetki TÜRETMESİNİ kapatıyor; işverenin
-- doğrudan tanımladığı bağı geçersiz kılmıyor. Toplu bir `is_staff = false`
-- güncellemesi canlıdaki personel hesaplarını hastane ve spor salonu
-- ekranlarından atardı ve geri dönüşü kurumsal e-posta gerektirirdi — o da
-- bugün canlıda teslim edilemiyor (borç #25).

ALTER TYPE "OtpPurpose" ADD VALUE 'staff_verification';
