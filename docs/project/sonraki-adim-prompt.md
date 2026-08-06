# Sonraki oturum için hazır prompt — adım 9

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 9 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **9**'a geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/PRD.md` §5.4 — bu adımın iş kuralları
- `docs/project/fake-data-guide.md` — menü kategorileri ve fiyat bantları
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 8 bitti**. Market ekranı çalışıyor.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt, giriş, çıkış, oturum, şifre sıfırlama, Google ile giriş** çalışıyor
- **Görsel iskelet** çalışıyor (marka paleti, tema düğmesi, mobil menü)
- **Hastane randevusu** çalışıyor: branş → doktor → gün → saat, alma ve iptal
- **Ortak sepet + ödeme** çalışıyor: ziyaretçi sepeti, girişte birleştirme,
  modül başına teslimat ücreti, Luhn + sahte kart sağlayıcısı, tek
  transaction'da ödeme + modül başına sipariş + stok düşümü, sahte fiş
- **Belediye Market** çalışıyor: ürün ızgarası, kategori süzgeci, arama,
  sepete ekleme, bildirim balonu, tükenmiş ürün işareti
- Preview ve production veritabanları dolu; gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında ilk iş:** dal adresini (`benim-belediyem-git-<dal>-barisss.vercel.app`)
  **iki panele** ekle: Cloudflare Turnstile hostname listesi **ve** Google OAuth
  redirect URI listesi (sonuna `/api/auth/google/callback`). Teknik borç #31
- ⚠️ **Tohumlanmış doktor saatleri ~2026-08-15'te tükeniyor** (borç #38). O tarihten
  sonra hastane ekranı "boş saat kalmamış" gösterir — çökme değil, seed'i yeniden
  koşturmak gerekiyor

## YAPILACAK — roadmap adım 9

"Belediye Restoran + adisyon" → PRD §5.4

Dal: `feature/restoran` (öneri)

### Kapsam

- Menü: ana yemek, ara sıcak, yan ürün/salata, içecek, tatlı — görselli, fiyatlı
- **Adisyon:** seçilen kalemler adisyona eklenir, **adet ve NOT** girilebilir
  (örn. "az acılı") — market'te olmayan tek yeni kavram bu
- Adisyon sepete aktarılır ve ödenir
- Paket servis: teslimat adresi + tahmini hazırlık süresi

### Bu adımda özellikle dikkat

- **Şema DEĞİŞMİYOR** — `MenuCategory`, `MenuItem` adım 3'te kuruldu ve tohumlu
  (31 kalem, 5 kategori, en az 2 tanesi `isAvailable = false`)
- **Sepet satırında `note` alanı ZATEN VAR** (`cart_items.note`) ve
  `addItemToCart` onu kabul ediyor. Yeni alan açma, yeni uç yazma
- **Market ekranı bire bir kopyalanacak bir şablon DEĞİL.** Ortak çıkan parça
  varsa (ürün kartı iskeleti, boş durum) paylaşıma çıkar; kopyalama DRY'ı bozar
- `src/config/navigation.ts` → restoran kartının `href`'i şu an `null`. Sayfa
  açılınca `/restoran` yazılacak, rozet kendiliğinden "Açık"a döner
- **Restoran teslimat ücreti SIFIR** ve bu bilinçli (borç #39): hiçbir doküman
  restoran için ücret tanımlamıyor. Sayı UYDURMA — gerekirse kullanıcıya sor
- `tests/e2e/layout.spec.ts` içindeki "açılmamış hizmet tıklanabilir bağlantı
  değildir" testi şu an **restoran** kartını örnek alıyor. Restoran açılınca o
  test doğru sebepten kırmızıya döner: örneği **etkinlik** veya **destek**
  kartına taşı, testi silme

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/lib/money.ts`** — para TAM SAYI KURUŞ. **Ondalık sayıyla para hesabı YAPMA**
- **`src/lib/search-text.ts`** — `normalizeSearchQuery` + `toLikePattern`. Arama
  kutusu yazacaksan ŞART (aşağıda tuzaklarda: Türkçe harf + joker kaçışı)
- **Sepet katmanı** (`src/features/cart/`): `addItemToCart` (not alanı dahil),
  `changeItemQuantity`, `removeItemFromCart`, `getCartSummary`. Katalog
  çözümleyici restoran kalemini zaten destekliyor (`catalog.repository.ts`)
- **Market katmanı** (`src/features/market/`) — aynı desenin çalışan örneği:
  repository → Zod şeması → sunucu bileşeni sayfa → tek istemci düğme
- **Bildirim balonu**: `import { toast } from "sonner"`, kap `src/components/ui/sonner.tsx`
  içinde ve kök düzende takılı. `next-themes` KULLANMIYOR, tema CSS'ten geliyor
- **`readCartOwner()`** sunucu bileşenleri için, **`getCartContext()`** uçlar
  için. **Sunucu bileşeninde çerez YAZILAMAZ**, ikisini karıştırma
- **`requireAccess()`** uçlar için, **`guardPage()`** sayfalar için
- `messages.ts` — kullanıcıya görünen tüm Türkçe metinler burada, dağıtma
- Tasarım token'ları (`globals.css`) · `page-shell` · `TextField` · `FormAlert`

## TUZAKLAR — daha önce vakit kaybettirenler

**Türkçe metin**
- **Veritabanının kendi büyük/küçük harf araması TÜRKÇE BİLMİYOR.** `I` harfini
  `i`'ye çeviriyor (karşılığı `ı`) ve aksanları eşlemiyor. Ölçüldü: `KAĞIT` → 0,
  `kagit` → 0, yalnızca `kağıt` → 1 sonuç
- **ÇÖZÜM KURULU: `unaccent` eklentisi.** Yeni bir arama yazarken Prisma'nın
  `contains` + `mode: "insensitive"` kombinasyonunu KULLANMA — Türkçe'de
  yanlış sonuç verir. Bunun yerine `product.repository.ts` içindeki
  `findIdsMatchingQuery` desenini izle: `lower(unaccent(...)) LIKE
  lower(unaccent(${pattern})) ESCAPE '\'`
- **`LIKE` deseni ŞART olarak `toLikePattern`'den geçer** (`src/lib/search-text.ts`):
  kullanıcının yazdığı `%` ve `_` joker sayılırsa tek karakterle tüm katalog
  eşleşir. Sessiz bir hata, çökme yok — bu yüzden testi var
- Yazım hatası toleransı YOK (borç #44): "kagıt havulu" yazan bulamaz

**Para**
- **Ondalık sayıyla para hesaplama.** Her yerde tam sayı kuruş, dönüşüm yalnızca
  sınırlarda

**Eşzamanlılık**
- **"Önce oku, boşsa yaz" İKİ ADIMDIR ve yarışı çözmez.** Tek koşullu UPDATE
  kullan (`WHERE stock >= n`) ve etkilenen satır sayısına bak
- **Korumayı yazdıktan sonra geçici kaldırıp testin KIRMIZIYA döndüğünü GÖR.**
  Adım 8'de bu yapıldı ve işe yaradı: tam olarak bir test kırmızıya döndü,
  diğer 16'sı yeşil kaldı — yani test doğru şeyi ölçüyordu

**Next.js**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR.** Salt okuma gereken
  yerde `readAnonymousId()` / `readCartOwner()` kullan
- **`next/image` `.svg` kaynağında optimizasyonu KENDİLİĞİNDEN atlıyor** (Next 16
  resmî dokümanı). `dangerouslyAllowSVG` açmaya gerek yok

**Test**
- Sunucu tarafı test dosyalarına `/** @vitest-environment node */` docblock'u ŞART
- **İş kuralı testlerini `tests/db/` içinde GERÇEK veritabanına karşı yaz**
- **Vitest'te hata sınıflarını test gövdesinin İÇİNDE `await import()` etme**
- **Her Playwright projesine (masaüstü / 375px) AYRI test hesabı VE ayrı veri
  havuzu ver.** Giriş gerektirmeyen akışta hesap hiç kullanma — market testleri
  ziyaretçi olarak koşuyor ve bu yüzden hız sınırına hiç takılmıyor
- **E2E'yi 15 dakika içinde üst üste koşturma.** Çözüm: `rate_limit_counters`
  tablosunu boşalt, sonra tek sefer koş
- **Sunucu ayaktayken `npx playwright test` `.next`'i BOZABİLİR.** Çözüm:
  sunucuyu durdur, `rm -rf .next && npm run build`, yeniden başlat
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan.** `toHaveURL`'ün
  5 saniyelik varsayılan sınırı yük altında yetmiyor ve gerçek hata yokken
  kırmızı veriyor. Adım 8'de tam olarak bu oldu: aynı test yük 3'te kırmızı,
  yük 12'de (düzeltmeden sonra) yeşil
- **Testler zaman aşımına düşüyorsa önce `uptime` çalıştır.** Yük 7-8'e çıktığında
  iki test "bağlam yok edildi" diye kırmızıya döndü, tek tek koşturulunca geçti
- **E2E'nin ürettiği ziyaretçi sepetini temizle:** kimliğini uygulama üretiyor,
  test öneki taşımıyor, ortak temizlik yakalamıyor (`market.spec.ts` örneği)

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), tercih `localStorage`'da. `next-themes`
  BİLEREK kullanılmıyor — shadcn CLI onu geri getirmeye çalışıyor, kaldır
- **Olmayan renk token'ı uydurma.** `warning` yok; uyarı vurgusu renkle değil
  kalınlıkla veriliyor (renk körü kullanıcı için de ayırt edilebilir)
- Tailwind v4 kanonik biçimi `aspect-4/3`, `aspect-[4/3]` değil (linter uyarıyor)
- Dokunma hedefleri en az 44px (`min-h-11`)

**Bağımlılık**
- **`shadcn add <bileşen>` İSTENMEYEN PAKET GETİREBİLİR.** `sonner` eklerken
  `next-themes`'i de kurdu. Kurulumdan sonra `git diff package.json` OKU
- **Yeni paket sonrası `npm audit` KOŞ.** Adım 8'de eklemeyle ilgisiz ama yeni
  yayınlanmış bir `hono` uyarısı çıktı; `overrides` ile kapatıldı

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok** (ADR-008)
- `migrate dev` üretilen istemciyi tazelemiyor → `npx prisma generate`

**Yayın**
- **Neon uykudayken production deploy PATLIYOR** (`P1001`). Merge sonrası
  `/api/health` içindeki `commit` alanının değiştiğini **mutlaka doğrula**
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR** — canlıdaki tam akışı
  kullanıcının elle doğrulaması gerekiyor

**Git**
- **YENİ DALI HER ZAMAN `main`'DEN AÇ.** PR'lar squash ile giriyor; başka bir
  feature dalından açılan dal çakışıyor ve **GitHub Actions hiç başlamıyor**.
  Önlem: `git checkout main && git pull && git checkout -b <yeni-dal>`

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → uzak sorgu için `npx tsx --env-file=.env` + Prisma
  betiği (proje kökünde; scratchpad'den çalışmıyor, yol çözümlenmiyor)
- Docker Desktop kapalı olabilir → `open -a Docker`, sonra `npm run db:up`
- ESLint `console.log`'u ve efekt içinde `setState`'i yasaklıyor
- `.ts`/`.tsx` yazdıktan sonra `npm run format` çalıştır, yoksa `format:check` durur

## KOMUTLAR

`npm run db:up · db:migrate · db:reset · db:studio`
`npm run test · test:db · test:e2e · lint · typecheck · format · format:check · build`
`gh` PATH'te. `vercel` ve `neonctl` için `npx`.

**E2E'yi elle koşturma sırası:** `rm -rf .next && npm run build`, sonra
`npm run start` (arka planda), sonra `npx playwright test`.

## BENİMLE İLETİŞİM

Kodu okuyup anlayamıyorum. Her adımı **Türkçe, kod göstermeden, en fazla 5
maddede** anlat. Sadece "ne" değil **"neden"** de söyle. Emin olmadığın yerde
**"emin değilim"** de, uydurma. Bir şeyi bozduğunu fark edersen hemen söyle.
Kod yazmadan önce **plan sun ve onayımı bekle** (CLAUDE.md §3 kapı 2).
