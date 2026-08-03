# Sonraki oturum için hazır prompt — adım 8

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 8 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **8**'e geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/PRD.md` §5.3 — bu adımın iş kuralları
- `docs/project/fake-data-guide.md` — ürün kategorileri, fiyat bantları, stok
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 7 bitti**. Sepet ve ödeme altyapısı hazır.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt, giriş, çıkış, oturum, şifre sıfırlama, Google ile giriş** çalışıyor
- **Görsel iskelet** çalışıyor (marka paleti, tema düğmesi, mobil menü)
- **Hastane randevusu** çalışıyor: branş → doktor → gün → saat, alma ve iptal
- **Ortak sepet + ödeme** çalışıyor: ziyaretçi sepeti, girişte birleştirme,
  modül başına teslimat ücreti, Luhn + sahte kart sağlayıcısı, tek
  transaction'da ödeme + modül başına sipariş + stok düşümü, sahte fiş
- Preview ve production veritabanları dolu; gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında ilk iş:** dal adresini (`benim-belediyem-git-<dal>-barisss.vercel.app`)
  **iki panele** ekle: Cloudflare Turnstile hostname listesi **ve** Google OAuth
  redirect URI listesi (sonuna `/api/auth/google/callback`). Teknik borç #31

## YAPILACAK — roadmap adım 8

"Belediye Market + paket servis" → PRD §5.3

Dal: `feature/market` (öneri)

### Kapsam

- Ürün listesi: görselli, kategorili, fiyatlı, stoklu
- Arama ve kategori filtresi
- **Sepete ekleme, adet değiştirme, çıkarma** — sepet altyapısı ZATEN HAZIR,
  yalnızca ekranı bağlanacak
- Stok yetersizse sepete eklenemez (kural serviste hazır ve testli)
- **Kabul kriteri:** ödeme sonrası stok düşer; stok ve sipariş tek transaction'da
  yazılır → **bu da hazır ve testli** (`tests/db/checkout.test.ts`)

### Bu adımda özellikle dikkat

- **Şema DEĞİŞMİYOR** — `Product`, `ProductCategory` adım 3'te kuruldu ve tohumlu
  (45 ürün, 6 kategori, en az 2 tanesi stok 0)
- **Sepet servisini YENİDEN YAZMA.** `addItemToCart` stok, adet ve satır
  sınırlarını zaten uyguluyor; ekran yalnızca `POST /api/carts/current/items`
  ucunu çağıracak
- `src/config/navigation.ts` → market kartının `href`'i şu an `null`. Sayfa
  açılınca oraya `/market` yazılacak, rozet "Yakında"dan "Açık"a kendiliğinden döner
- Ürün görselleri kategori başına tek yer tutucu SVG (teknik borç #16)

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/lib/money.ts`** — para TAM SAYI KURUŞ. `toKurus` / `toDecimalInput` /
  `formatTry` / `sumKurus`. **Ondalık sayıyla para hesabı YAPMA**
- **Sepet katmanı** (`src/features/cart/`): `addItemToCart`,
  `changeItemQuantity`, `removeItemFromCart`, `getCartSummary`,
  `mergeGuestCartIntoUserCart`. Katalog çözümleyici üç modülü tek arayüzde
  topluyor (`catalog.repository.ts`) — market ürünü zaten destekli
- **`readCartOwner()`** sunucu bileşenleri için, **`getCartContext()`** uçlar
  için. **Sunucu bileşeninde çerez YAZILAMAZ**, ikisini karıştırma
- **Ödeme akışı** (`src/features/payment/`) — dokunma, çalışıyor
- **`requireAccess()`** uçlar için, **`guardPage()`** sayfalar için
- `messages.ts` — kullanıcıya görünen tüm Türkçe metinler burada, dağıtma
- Tasarım token'ları (`globals.css`) · `page-shell` · `TextField` · `FormAlert`
- `src/lib/datetime.ts` — İstanbul saatiyle tarih; teslimat aralığı bunu kullanıyor

## TUZAKLAR — daha önce vakit kaybettirenler

**Para**
- **Ondalık sayıyla para hesaplama.** `0.1 + 0.2 !== 0.3`; sepette on kalem
  sonra kuruş kayar. Her yerde tam sayı kuruş kullan, dönüşümü yalnızca
  sınırlarda yap

**Eşzamanlılık**
- **"Önce oku, boşsa yaz" İKİ ADIMDIR ve yarışı çözmez.** Tek koşullu UPDATE
  kullan (`WHERE stock >= n`) ve etkilenen satır sayısına bak
- **Yarış testini yazdıktan sonra korumayı geçici kaldırıp testin KIRMIZIYA
  döndüğünü gör.** Adım 7'de ilk yazdığım stok testi yanlış sebepten yeşildi:
  koşullu düşüme hiç varmadan sepet özeti kontrolüne takılıyordu

**Next.js**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR.** `/sepet` sayfası
  bu yüzden çerezi hiç olmayan ziyaretçide çöküyordu. Salt okuma gereken yerde
  `readAnonymousId()` / `readCartOwner()` kullan

**Test**
- Sunucu tarafı test dosyalarına `/** @vitest-environment node */` docblock'u ŞART
- **İş kuralı testlerini `tests/db/` içinde GERÇEK veritabanına karşı yaz.**
  Koşullu UPDATE ve transaction geri alması taklitle kanıtlanamaz
- **Vitest'te hata sınıflarını test gövdesinin İÇİNDE `await import()` etme** —
  ayrı modül örneği geliyor, `instanceof` tutmuyor, her iş hatası 500'e düşüyor
- **Her Playwright projesine (masaüstü / 375px) AYRI test hesabı VE ayrı veri
  havuzu ver.** Projeler paralel koşup tek veritabanına yazıyor; aynı kaydı
  hedefleyen iki proje "bazen geçen" testler üretir
- **E2E'yi 15 dakika içinde üst üste koşturma.** Sayaçlar veritabanında;
  tükenince testler kırmızıya döner ve hata kodda sanılır. Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra tek sefer koş
- **Sunucu ayaktayken `npx playwright test` `.next`'i BOZABİLİR** (kendi
  build'ini başlatır). Belirti: JS parçaları 500 dönüyor, konsolda
  `Refused to execute script ... MIME type ('text/plain')`, HER test kırmızı.
  Çözüm: sunucuyu durdur, `rm -rf .next && npm run build`, yeniden başlat
- **Testler zaman aşımına düşüyorsa önce `uptime` çalıştır.** 2026-08-03'te yük
  188'e çıktı (arka planda Chrome sekmeleri) ve testler kırmızıya döndü; tek tek
  koşturulduklarında hepsi geçiyordu. Yükü kontrol etmeden testi suçlama
- **Tohum verisi iş kurallarına UYMAK ZORUNDA.** Kural değişirse `prisma/seed/`
  içindeki karşılığı da değişmeli

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), tercih `localStorage`'da
- Etiketleri KISA yazma ("Ay" yerine "Son kullanma ayı"): kısa etiketler hem
  ekran okuyucuda bağlamsız kalıyor hem de sayfadaki başka metinlerle çakışıyor
- Dokunma hedefleri en az 44px (`min-h-11`)
- **Aynı bağlantıyı masaüstü ve mobil için iki kez render etme**

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok** (ADR-008)
- `migrate dev` üretilen istemciyi tazelemiyor → `npx prisma generate`
- `.map()` içinde enum alanı `string`'e genişliyor; enum taşıyan satırları tek tek yaz

**Yayın**
- **Neon uykudayken production deploy PATLIYOR** (`P1001`). Merge sonrası
  `/api/health` içindeki `commit` alanının değiştiğini **mutlaka doğrula**;
  değişmediyse veritabanını uyandırıp `npx vercel redeploy <url>`
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR** — canlıdaki tam akışı
  kullanıcının elle doğrulaması gerekiyor

**Git**
- **YENİ DALI HER ZAMAN `main`'DEN AÇ.** PR'lar squash ile giriyor; başka bir
  feature dalından açılan dal çakışıyor ve **GitHub Actions hiç başlamıyor**.
  Önlem: `git checkout main && git pull && git checkout -b <yeni-dal>`

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → uzak sorgu için `npx tsx` + Prisma betiği (proje kökünde)
- ESLint `console.log`'u ve efekt içinde `setState`'i yasaklıyor
- `.ts`/`.tsx` yazdıktan sonra `npm run format` çalıştır, yoksa `format:check` durur

## KOMUTLAR

`npm run db:up · db:migrate · db:reset · db:studio`
`npm run test · test:db · test:e2e · lint · typecheck · format · format:check · build`
`gh` PATH'te. `vercel` ve `neonctl` için `npx`.

**E2E'yi elle koşturma sırası:** `rm -rf .next && npm run build`, sonra ortam
değişkenleriyle `npm run start` (arka planda), sonra `npx playwright test`.

## BENİMLE İLETİŞİM

Kodu okuyup anlayamıyorum. Her adımı **Türkçe, kod göstermeden, en fazla 5
maddede** anlat. Sadece "ne" değil **"neden"** de söyle. Emin olmadığın yerde
**"emin değilim"** de, uydurma. Bir şeyi bozduğunu fark edersen hemen söyle.
Kod yazmadan önce **plan sun ve onayımı bekle** (CLAUDE.md §3 kapı 2).
