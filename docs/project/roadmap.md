# Yol Haritası

Sıra kasıtlıdır: her adım bir öncekinin üzerine kurulur. Bir adım
`docs/standards/10-definition-of-done.md` kapılarını geçmeden sonrakine geçilmez.

| # | Adım | Çıktı |
|---|---|---|
| 0 | Repo, Next.js, TypeScript, Tailwind, ESLint/Prettier, docs/, CLAUDE.md | Boş proje ayakta |
| 1 | GitHub + Vercel + Neon bağlantısı, `/api/health`, CI pipeline | **Canlı boş sayfa** |
| 2 | Docker Compose (local Postgres), Prisma kurulumu, ilk migration | Local DB çalışıyor |
| 3 | Veri modeli + tüm tablolar + `fake-data-guide.md`'ye uygun seed | Veri hazır |
| 4a | Sahte KPS servisi: `kps_citizens` seed, mock uç, gecikme/hata simülasyonu, hız sınırı | KPS sorgusu çalışıyor |
| 4b | Auth: TCKN ile kayıt (KPS sorgusu + **e-posta ve telefon OTP**), giriş, çıkış, **veritabanı oturumu** (ADR-005), rol, korumalı route, **hız sınırı tablosu** (ADR-006), **bot koruması** (ADR-004) | Giriş çalışıyor |
| 4c | Google ile giriş (OAuth) + hesap birleştirme + personel eşleştirmesi + erişim kademeleri | Test + PR + deploy |
| 5 | Layout: navbar, logo, dark mode, responsive iskelet, tasarım token'ları | Görsel iskelet |
| 6 | Hastane randevu modülü (personele özel) | Test + PR + deploy |
| 7 | Ortak sepet + sahte kart ödemesi + kayıtlı kart altyapısı | Ödeme çalışıyor |
| 8 | Belediye Market + paket servis | Test + PR + deploy |
| 9 | Belediye Restoran + adisyon | Test + PR + deploy |
| 10 | Sipariş takibi + bildirim sistemi | Test + PR + deploy |
| 11 | Etkinlik + koltuk seçimi + bilet | Test + PR + deploy |
| 12 | Spor salonu üyeliği (personele özel) | Test + PR + deploy |
| 13 | Destek talebi + dosya yükleme | Test + PR + deploy |
| 14 | Bilgi widget'ları (hava, haber, piyasa) | Test + PR + deploy |
| 15 | Profil sayfası: tüm kayıtların tek yerden yönetimi | Test + PR + deploy |
| 15b | Hakkımızda: teşkilat şeması + 100 kişilik personel rehberi | Test + PR + deploy |
| 16 | Planlı görevler (temizlik, aidat tahsilatı, durum simülasyonu) + denetim kaydı | Test + PR + deploy |
| 17 | Yasal sayfalar (KVKK, çerez, kullanım şartları) + çerez rızası (ziyaretçi dahil) | Test + PR + deploy |
| 17b | **Hesap yönetimi: verimi indir (JSON) + hesabımı sil (anonimleştirme)** — PRD §5.11 | Test + PR + deploy |
| 18 | Güvenlik denetimi, E2E test seti, Swagger (`/api/docs`), performans bütçesi ölçümü, Sentry, axe | Üretime hazır |
| 19 | Expo mobil uygulama (aynı API) | Mobil |

## Teknik borç
Buraya sadece **bilinen ve kabul edilmiş** eksikler yazılır. Boş bırakılmaz, gizlenmez.

| # | Borç | Neden kabul edildi | Ne zaman ödenir |
|---|---|---|---|
| 1 | **Telefon sahipliği doğrulanmıyor** — SMS kodu e-postayla gidiyor | Türkiye'de gerçek SMS ücretli ve İYS/marka onayı istiyor | Gerçek SMS sağlayıcısı eklenirse (`SmsChannel` hazır) |
| 2 | **Hız sınırı Postgres'te** — Redis'ten yavaş | Ek servis, hesap ve yapılandırma maliyeti bu ölçekte gereksiz (ADR-006) | Ölçüm darboğaz gösterirse |
| 3 | **Sık çalışan cron yok** — ücretsiz planda günde 1 | Doğruluk okuma anında sağlanıyor, cron yalnızca temizlik yapıyor (ADR-007) | Ücretli plana geçilirse |
| 4 | **Yönetici paneli yok** — sipariş ve destek durumları zamanlayıcıyla simüle ediliyor | Faz 2'ye bırakıldı (PRD §2) | Faz 2 |
| 5 | **Veritabanı oturumu her istekte bir okuma yapıyor** | Anında iptal edilebilirlik için bilinçli tercih (ADR-005) | p95 yanıt süresi SLO'yu zorlarsa |
| 6 | **Bot koruması ABD merkezli servise bağlı** (Cloudflare) | Ücretsiz ve çerezsiz tek makul seçenek (ADR-004) | Yurt içi işleyici zorunluluğu doğarsa |
| 7 | **`tailwind.config.ts` yok** — Tailwind v4 CSS-first yapılandırma | v4 bu dosyayı üretmiyor; token'lar `globals.css` içinde. v3'e dönmek projeyi eski sürümle başlatmak olurdu | Ödenmesi gerekmiyor — `REPO-YAPISI.md` güncellendi |
| 8 | **TypeScript 6 kullanılıyor, 7 değil** | `typescript-eslint` TS 7'yi desteklemiyor (peer `<6.1.0`); TS 7'ye çıkmak lint kapısını devre dışı bırakırdı | `typescript-eslint` TS 7 desteği yayınlayınca |
| 9 | **ESLint 9 kullanılıyor, 10 değil** | `eslint-config-next`'in bağımlılıkları (`eslint-plugin-import`, `jsx-a11y`) en fazla 9 kabul ediyor | Next.js bu eklentileri ESLint 10'a taşıyınca |
| 10 | **Sıkı (nonce tabanlı) CSP yok** — baseline başlıklar var | Next hidrasyon için satır içi script kullanıyor; nonce imzası middleware gerektiriyor, iskelet aşamasında erken | Adım 18 (güvenlik denetimi) |
| 11 | **CI'da `bundle-size` / `lighthouse` / `axe` kapıları yok** | Ölçülecek gerçek sayfa yok; boş sayfada performans bütçesi ölçmek yanıltıcı olurdu | Adım 18 |
| 12 | **`npm audit` geliştirme bağımlılıklarında 9 yüksek uyarı veriyor** | `eslint-config-next` → `minimatch` → `brace-expansion@1.x`; upstream'de yamalı 1.x sürümü **yok**. Yalnızca lint sırasında çalışır, üretim paketine girmez. Üretim bağımlılıklarında 0 açık var | Next.js bağımlılığını yükseltince |
| 13 | **`prisma.config.ts` Prisma'nın `env()` yardımcısını kullanmıyor** | `env()` değişkeni yapılandırma yüklenirken zorunlu kılıyor ve veritabanına hiç bağlanmayan `prisma generate` komutunu bile başarısız kılıyor (Docker derlemesi ve Vercel `postinstall` bu yüzden patlıyordu). Eksik değişken zaten `src/config/env.ts` tarafından açılışta yakalanıyor | Prisma bu davranışı düzeltirse |
| ~~14~~ | ~~**Docker imajı yerel makinede doğrulanamadı**~~ | **ÖDENDİ (2026-07-31):** imaj derlendi (264MB), kap `healthy` durumuna geçti, root olmayan `nextjs` kullanıcısıyla çalıştı, `/api/health` veritabanına bağlanıp `db: ok` döndü, anasayfa 200 verdi. İmaj ayrıca her PR'da CI'da derleniyor | — |
