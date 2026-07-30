# ADR-007 — Süresi dolan kayıtlar okuma anında geçersiz sayılır; cron yalnızca temizlik yapar

**Tarih:** 2026-07-30
**Durum:** Kabul edildi

## Bağlam

PRD ve standartlar süreye bağlı birkaç kayıt tanımlıyor:

| Kayıt | Süre | Süre dolunca ne olmalı |
|---|---|---|
| Koltuk rezervasyon kilidi | 10 dakika | Koltuk yeniden satılabilir olmalı |
| Doğrulama kodu (OTP) | 5 dakika | Kod kabul edilmemeli |
| Oturum | 7 gün | Oturum geçersiz olmalı |
| Hız sınırı penceresi | 15 dakika | Sayaç sıfırlanmalı |
| KPS önbelleği | 15 dakika | Yeniden sorgulanmalı |

`12-operations-and-scaling.md` bunları "planlı görev (cron)" ile çözmeyi öneriyor.
**Sorun:** Vercel'in ücretsiz planında zamanlanmış görev **günde bir kez** çalışır.
10 dakikalık koltuk kilidini günde bir çalışan bir görevle serbest bırakmak
mümkün değil — koltuk saatlerce boş yere kilitli kalır ve etkinlik satışı durur.

Daha derin sorun: **doğruluğu bir zamanlayıcının çalışmasına bağlamak kırılgandır.**
Görev gecikirse, hata alırsa veya iki kez çalışırsa veri yanlış duruma düşer.

## Karar

**Doğruluk okuma anında sağlanır (tembel/lazy geçersizleştirme):**
Süresi dolmuş bir kayıt, sorgulandığı anda **yokmuş gibi** davranılır.

- Koltuk müsaitliği sorgulanırken `status = 'held' AND hold_expires_at < now()`
  olan satırlar **dolu sayılmaz**; o koltuk satılabilir.
- Yeni rezervasyon yazımı **transaction içinde**, benzersiz indeks korumasıyla
  yapılır: süresi dolmuş kilit aynı işlemde serbest bırakılıp yeni kilit konur.
  Böylece iki kullanıcı aynı anda talip olursa biri 409 alır (PRD §5.2 kabul kriteri).
- Aynı kural OTP, oturum, hız sınırı penceresi ve KPS önbelleği için geçerlidir.

**Cron yalnızca temizlik ve bildirim yapar** — doğruluktan sorumlu değildir:
günde bir kez süresi dolmuş satırları siler (tablo şişmesin), üyelik yenileme
tahsilatını dener ve hatırlatma bildirimlerini gönderir. Cron hiç çalışmazsa
uygulama **yanlış davranmaz**, sadece ölü satırlar birikir.

Her planlı görev idempotenttir ve `CRON_SECRET` ile korunur; kimliği doğrulanmamış
istek 401 alır.

## Değerlendirilen alternatifler

| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| **Okuma anında geçersizleştirme + temizlik cron'u** | Zamanlayıcıdan bağımsız doğruluk; ücretsiz planda çalışır | Her sorguya zaman koşulu eklenir | **Seçildi** |
| Sık çalışan cron (10 dk) | Kavramsal olarak basit | Ücretsiz planda **mümkün değil**; ücretli plan gerekir; gecikirse veri yanlış | Bütçe dışı ve kırılgan |
| Dış zamanlayıcı servisi (GitHub Actions vb.) | Ücretsiz, sık çalışabilir | Uygulama doğruluğu repo dışı bir sisteme bağlanır; gizli anahtar dışarı çıkar | Bağımlılık yönü yanlış |
| Veritabanı zamanlayıcısı (pg_cron) | Veritabanına yakın | Neon'da yönetilen ortamda kullanılamaz | Platform desteklemiyor |

## Sonuçlar

- **Olumlu:** koltuk kilidi, OTP ve oturum süreleri **gerçekten** doğru çalışır;
  ücretsiz planda kalınır; cron çökse bile kullanıcı yanlış sonuç görmez.
- **Bedel:** süreye bağlı her sorgu zaman koşulu içermek zorundadır; bu koşul
  unutulursa süresi dolmuş kayıt geçerli sayılır. Bu yüzden ilgili her sorgu için
  **süre dolumu testi zorunludur** (`vi.setSystemTime` ile sabitlenmiş saatte).
- **Bedel:** `hold_expires_at`, `expires_at` gibi kolonlarda indeks gerekir.
- **Gözden geçirme:** ücretli plana geçilirse sık cron eklenebilir — ama okuma
  anındaki kontrol **yine kaldırılmaz**, ikisi birlikte çalışır.
