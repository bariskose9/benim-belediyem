# 09 — Paketleme, CI/CD ve Yayına Alma

## Ortamlar
| Ortam | Nerede | Veritabanı | Ne zaman |
|---|---|---|---|
| local | Docker Compose | local Postgres | geliştirme |
| preview | Vercel Preview | ayrı preview DB | her PR otomatik |
| production | Vercel Production | Neon production | `main`'e merge |

Ortamlar **veri paylaşmaz**. Production verisiyle test yapılmaz.

## Ürün nasıl paketlenir
- Next.js `next build` ile derlenir; Vercel bunu otomatik yapar.
- Build çıktısı repoya konmaz. Repo = kaynak kod + şema + migration + doküman.
- Docker imajı geliştirme ve öğrenme amaçlı tutulur:
  çok aşamalı build (deps → build → runner), root olmayan kullanıcı, `.dockerignore` zorunlu.
- Uygulama **12-factor** ilkesine uyar: yapılandırma ortam değişkeninden gelir,
  aynı imaj her ortamda çalışır, süreç durumsuzdur (state DB ve blob'da).

## CI pipeline (GitHub Actions — her PR'da)
```
install → lint → typecheck → unit test → build → bundle-size →
e2e test (+ axe) → lighthouse → npm audit
```
Herhangi biri kırmızıysa merge kapalıdır. Kural devre dışı bırakılmaz.

**Ölçülen kapılar** — `07-ui-design-system.md` bütçesi yalnızca yazılı bir hedef
değil, CI'da fiilen ölçülür:

| Adım | Neyi ölçer | Kırmızı olur |
|---|---|---|
| `bundle-size` | İlk yüklemedeki JS (gzip) | > 200KB |
| `lighthouse` | LCP, INP, CLS | LCP > 2.5s · CLS > 0.1 |
| `axe` (e2e içinde) | Erişilebilirlik ihlalleri | Kritik ihlal varsa |

Bu adımlar olmadan "performans bütçesi aşılırsa merge edilmez" kuralı
uygulanamaz — ölçüm yoksa kapı da yoktur.

## Yayına alma akışı
1. PR açılır → preview URL otomatik oluşur
2. Preview üzerinde manuel doğrulama yapılır
3. Merge → production build → migration çalışır → yayın
4. Yayın sonrası duman testi (smoke test): giriş, ana akış, sağlık ucu

## Migration ve deploy sırası
Şema değişikliği ile kod değişikliği **geriye uyumlu** olacak şekilde ayrılır:
önce kolon eklenir → kod yeni kolonu kullanır → eski kolon sonraki sürümde düşürülür.
Tek adımda kolon silen deploy yapılmaz.

## Geri alma (rollback)
- Kod: Vercel'de önceki dağıtıma tek tıkla dönülür.
- Veritabanı: her production migration öncesi yedek alınır.
- Her deploy öncesi "bozulursa nasıl geri dönerim" sorusunun cevabı hazır olur.

## Ortam değişkenleri
`.env.example` her zaman güncel tutulur. Yeni değişken eklendiğinde
PR açıklamasında hangi ortama eklenmesi gerektiği yazılır.

## README ve devreye alma kolaylığı
`README.md` şunları içerir: proje bir cümlede · gereksinimler (Node sürümü, Docker) ·
**tek komutla kurulum** · ortam değişkenleri listesi · sık kullanılan komutlar ·
klasör yapısı özeti · canlı ve preview bağlantıları.
Hedef: projeyi ilk kez klonlayan biri 10 dakikada çalıştırabilmeli.
`npm run setup` komutu: bağımlılık kurar, Docker'ı ayağa kaldırır, migrate eder, seed eder.

## Bağımlılık ve lisans politikası
- Yeni paket eklerken lisans kontrol edilir; GPL/AGPL paketler onay ister.
- Dependabot/Renovate ile güvenlik güncellemeleri otomatik PR olarak gelir.
- Kritik güvenlik açığı olan paket sürümü ile deploy yapılmaz.

## Özellik bayrakları (feature flag)
Yarım kalan büyük özellikler uzun ömürlü dalda bekletilmez; kapalı bayrak arkasında
`main`'e girer. Bayraklar `src/config/` altında merkezi tanımlanır ve
özellik kararlı hale gelince **bayrak ve ölü kod temizlenir**.
