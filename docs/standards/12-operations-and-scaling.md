# 12 — Çalıştırma, İzleme, Büyütme ve Bakım

## Çalışma zamanı
- Uygulama durumsuzdur; kalıcı veri yalnızca veritabanı ve blob depolamadadır.
- Sağlık ucu: `GET /api/health` → uygulama + veritabanı durumunu döner.
- Zaman aşımı ve yeniden deneme: dış API çağrılarında timeout zorunlu,
  yeniden deneme üstel geri çekilme ile ve en fazla 2 kez.
- Dış servis çökerse uygulama çökmez: widget hata durumunu gösterir, sayfa ayakta kalır.

## Loglama
- Yapılandırılmış (JSON) log. `console.log` ile hata ayıklama çıktısı bırakılmaz.
- Her log satırında: zaman, seviye, istek kimliği, kullanıcı kimliği (mümkünse anonim), olay.
- **Log'a asla:** şifre, token, kart numarası, TCKN, e-posta gövdesi.
- Seviyeler: `error` (müdahale gerekir) · `warn` (beklenmedik ama tolere edilebilir) ·
  `info` (iş olayı: sipariş oluştu) · `debug` (sadece local).

## İzleme (observability)
- Hata takibi: Sentry (ücretsiz katman) — üretimdeki her istisna yakalanır.
- Performans: Vercel Analytics — Core Web Vitals izlenir (LCP < 2.5s, INP < 200ms, CLS < 0.1).
- Çalışma süresi izleme: sağlık ucuna dışarıdan periyodik ping.
- Uyarı eşikleri tanımlıdır: hata oranı %1'i geçerse, yanıt süresi 2 katına çıkarsa haber ver.

## Yedekleme ve kurtarma
- Veritabanı otomatik günlük yedek (Neon point-in-time recovery).
- Yedekten geri dönüş **denenmiş** olmalı; denenmemiş yedek yedek değildir.
- Blob depolamadaki kullanıcı dosyaları da yedek kapsamındadır.

## Performans ve büyütme sırası
Büyütme kararı **ölçümle** verilir, tahminle değil. Sıra:
1. **Sorgu ve index düzeltmesi** (kazancın çoğu burada)
2. **Önbellek**: dış API yanıtları, nadiren değişen listeler (ISR / route cache)
3. **CDN**: statik içerik ve görseller (Next.js Image ile otomatik boyutlandırma)
4. **Bağlantı havuzu**: sunucusuz ortamda Prisma için pooler kullan
5. **Yatay ölçekleme**: Vercel otomatik; uygulama durumsuz olduğu için sorun çıkmaz
6. **Kuyruk**: e-posta, bildirim, rapor gibi işler istek döngüsünden çıkarılır
7. **Okuma replikası / veri bölme**: ancak gerçekten gerekirse, ADR ile

Erken optimizasyon yapılmaz. Önce ölç, sonra düzelt, sonra tekrar ölç.

## Bakım
- Haftalık: hata panosu gözden geçirilir, `npm audit` çalıştırılır.
- Aylık: bağımlılık güncellemeleri ayrı PR ile; major yükseltmeler tek tek.
- Sürekli: teknik borç `docs/project/roadmap.md` içinde açıkça listelenir, gizlenmez.
- Kullanılmayan özellik, tablo ve bağımlılık silinir (bkz. deprecation süreci).

## Olay (incident) müdahalesi
1. Durdur: gerekiyorsa önceki dağıtıma dön (rollback)
2. Etkiyi ölç: kaç kullanıcı, hangi akış
3. Düzelt: önce hatayı yakalayan test, sonra düzeltme
4. Yaz: `docs/project/decisions/` altında kısa olay notu — ne oldu, neden, tekrarı nasıl önlenir
Suçlu aranmaz, süreç düzeltilir.

## Hizmet hedefleri (SLO)
Ölçülebilir hedef yoksa "yavaş" tartışması bitmez. Bu proje için:
- Kullanılabilirlik: aylık %99
- API p95 yanıt süresi: < 500ms
- Hata oranı: < %1
Hedef aşılırsa performans işi, yeni özellik işinin önüne geçer.

## Planlı görevler (cron)
- Süresi dolan koltuk rezervasyonlarını serbest bırakma
- Süresi dolan verileri temizleme (saklama politikası)
- Üyelik bitiş hatırlatması
Her planlı görev **idempotent** olur: iki kez çalışırsa veri bozulmaz.
Çalıştığı ve sonucu loglanır; sessizce başarısız olmasına izin verilmez.

## Bakım penceresi ve duyuru
Kesinti gerektiren işlem varsa kullanıcıya önceden bildirilir ve
bakım sayfası gösterilir; boş beyaz ekran bırakılmaz.
