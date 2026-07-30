# 13 — Ortamlar: Test ve Canlı

## Temel kural: Ayrı proje değil, ayrı ORTAM

Tek repo, tek Vercel projesi, tek kod tabanı. Değişen şey **hangi ortam değişkenleriyle
hangi veritabanına bağlandığı**. İki ayrı proje açmak (benim-belediyem-test /
benim-belediyem-canli) yaygın bir yeni başlayan hatasıdır: kod iki yerde ayrışır,
"testte çalışıyordu canlıda çalışmıyor" sorunu kalıcı hale gelir.

| Ortam | Nerede çalışır | Veritabanı | Ne zaman oluşur | Kim görür |
|---|---|---|---|---|
| **local** | Kendi bilgisayarın (Docker) | Docker Postgres | `npm run dev` | Sadece sen |
| **preview** | Vercel Preview | Neon `preview` dalı | Her PR'da OTOMATİK | Link'i olan |
| **production** | Vercel Production | Neon `main` dalı | `main`'e merge'de | Herkes |

Her ortamın **kendi veritabanı, kendi ortam değişkenleri, kendi API anahtarları** vardır.
Ortamlar veri paylaşmaz. Canlı veriyle test yapılmaz.

## Docker nerede duruyor?

Docker **sadece local** içindir — bilgisayarında Postgres kurmadan veritabanı çalıştırmak için.
Vercel'e Docker imajı gönderilmez; Vercel `next build` çıktısını kendi çalıştırır.
Dockerfile yine de repoda durur: başka bir sunucuya taşıma ihtiyacı doğarsa hazır olsun
ve konteynerleştirmeyi öğrenmiş ol diye.

```
local:      docker compose up -d  →  Postgres :5432  →  npm run dev  →  localhost:3000
preview:    git push  →  PR  →  Vercel build  →  xxx-git-feature.vercel.app  →  Neon preview
production: merge main  →  Vercel build  →  benimbelediyem.vercel.app  →  Neon main
```

## Tam süreç — bir değişikliğin yolculuğu

```
1. git checkout -b feature/hastane-randevu
2. docker compose up -d            → local Postgres ayağa kalkar
3. npx prisma migrate dev          → şema değişikliği LOCAL'de uygulanır
4. npm run dev                     → localhost:3000'de geliştir
5. npm run lint && npm run test    → local kapı
6. git push -u origin feature/...  → PR aç
7. GitHub Actions çalışır          → lint, typecheck, test, build, e2e
8. Vercel otomatik PREVIEW üretir  → preview DB'ye migrate eder
9. SEN preview URL'i açıp elle test edersin          ← EN ÖNEMLİ ADIM
10. Onay → squash merge → main
11. Vercel PRODUCTION build         → prisma migrate deploy → yayın
12. Duman testi: /api/health + giriş + ana akış
```

**"Test projesinde yapıp canlıya aktarmak" diye ayrı bir kopyalama adımı yoktur.**
Aynı kod merge edildiğinde kendisi canlıya gider. Aktarım = merge.

## Veritabanı ortamları (Neon dallanması)
- Neon'da veritabanı da git gibi dallanır. `main` dalı canlı, `preview` dalı test.
- Preview dalı canlının **şemasını** alır, verisini değil. Test verisi seed ile oluşur.
- Canlıdan test ortamına veri kopyalanmaz. Gerekirse kişisel veriler maskelenerek kopyalanır.

## Migration ortam farkı
- **local:** `prisma migrate dev` — migration dosyası ÜRETİR
- **preview / production:** `prisma migrate deploy` — sadece mevcut migration'ları UYGULAR
- Üretimde `migrate dev` veya `db push` **asla** çalıştırılmaz.
- Yıkıcı migration (kolon/tablo silme) ayrı PR'da, öncesinde yedek alınarak.

## Ortam değişkenleri
- `.env.example` tüm anahtar adlarını içerir, değer içermez ve **her zaman günceldir**.
- `.env` sadece local'de, commit edilmez.
- preview ve production değerleri Vercel panelinden ortam seçilerek girilir.
- Aynı anahtarın üç ortamda **farklı değeri** olur. Canlı anahtar local'de kullanılmaz.
- `src/config/env.ts` içinde Zod ile doğrulanır: eksik değişken varsa uygulama
  açılışta net hata verir, çalışma anında gizemli hata vermez.

## Ortam ayrımı için görsel işaret
Local ve preview ortamlarında ekranın üstünde renkli bir şerit görünür
(`LOCAL` / `PREVIEW`). Böylece yanlışlıkla canlı sanılıp test verisi girilmez.

## Kontrol listesi — yeni ortam kurarken
- [ ] Veritabanı ayrı mı?
- [ ] Ortam değişkenleri ayrı mı, canlı anahtar sızmış mı?
- [ ] Migration otomatik çalışıyor mu?
- [ ] Arama motorlarına kapalı mı (`noindex` — preview için zorunlu)?
- [ ] Ortam etiketi ekranda görünüyor mu?
