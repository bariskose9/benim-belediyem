# Sonraki oturum için hazır prompt — adım 10

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 10 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **10**'a geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/PRD.md` §5.5 — bu adımın iş kuralları (sipariş durumları,
  bildirim, **sipariş iptali** ve dört kabul kriteri)
- `docs/project/data-model.md` — `Order`, `OrderItem`, `Notification` alanları
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 9 bitti ve canlıda.** Restoran ekranı çalışıyor.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt, giriş, çıkış, oturum, şifre sıfırlama, Google ile giriş** çalışıyor
- **Görsel iskelet** çalışıyor (marka paleti, tema düğmesi, mobil menü)
- **Hastane randevusu** çalışıyor: branş → doktor → gün → saat, alma ve iptal
- **Ortak sepet + ödeme** çalışıyor: ziyaretçi sepeti, girişte birleştirme,
  modül başına teslimat ücreti, Luhn + sahte kart sağlayıcısı, tek
  transaction'da ödeme + modül başına sipariş + stok düşümü, sahte fiş
- **Belediye Market** çalışıyor: ürün ızgarası, kategori süzgeci, arama,
  sepete ekleme, tükenmiş ürün işareti
- **Belediye Restoran + adisyon** çalışıyor: menü ızgarası, süzgeç, arama,
  adet + mutfak notuyla adisyona ekleme, notun sonradan düzenlenmesi,
  restoran teslimat ücreti (49,90 TL / 400 TL üzeri ücretsiz) ve
  tahmini hazırlık süresi (30-45 dk)
- Preview ve production veritabanları dolu; gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında ilk iş:** dal adresini (`benim-belediyem-git-<dal>-barisss.vercel.app`)
  **iki panele** ekle: Cloudflare Turnstile hostname listesi **ve** Google OAuth
  redirect URI listesi (sonuna `/api/auth/google/callback`). Teknik borç #31
- ⚠️ **Tohumlanmış doktor saatleri ~2026-08-15'te tükeniyor** (borç #38). O tarih
  geldiyse hastane ekranı "boş saat kalmamış" gösterir — çökme değil, uzak
  ortamlarda seed'i yeniden koşturmak gerekiyor

## YAPILACAK — roadmap adım 10

"Sipariş takibi + bildirim sistemi" → PRD §5.5

Dal: `feature/siparis-takibi` (öneri)

### Kapsam

- Sipariş durumları: `Alındı → Hazırlanıyor → Yola çıktı → Teslim edildi`
  (+ `İptal edildi`). Enum değerleri **şemada zaten var**
- **Durum simülasyonu**: yönetici paneli yok (borç #4), durumlar zamanlayıcıyla
  ilerliyor. ADR-007'nin "doğruluk okuma anında" deseni burada da geçerli —
  cron'a bağımlı bir doğruluk kurma
- **Uygulama içi bildirim**: ödeme tamamlanınca ve durum değiştikçe
- **Sipariş iptali**: YALNIZCA `Alındı` aşamasında. Sonrası **409**. Market
  siparişiyse **stok geri yüklenir**, sahte iade kaydı oluşur, denetim kaydına
  yazılır — hepsi **tek transaction**. Bilet hiç iptal edilemez
- Profilde sipariş geçmişi ve anlık durum

### Bu adımda özellikle dikkat

- **Dört kabul kriteri PRD §5.5'in sonunda yazılı** — dördü de teste dönüşmeli
- **`Hazırlanıyor` durumundaki siparişe gelen iptal isteği 409 dönmeli**,
  istemci düğmeyi göstermese bile. Yetki kontrolü sunucuda
- **Başkasının siparişini iptal etme isteği 403** (IDOR)
- Stok geri yükleme koşullu UPDATE ile yazılmalı; "önce oku, sonra yaz" iki
  adımdır ve yarışı çözmez (adım 7 ve 8'in dersi)
- **Şema muhtemelen DEĞİŞMİYOR**: `orders.status`, `orders.cancelled_at`,
  `orders.cancel_reason` ve `notifications` tablosu adım 3'ten beri var.
  Yazmadan önce `prisma/schema.prisma` içinde DOĞRULA
- `src/config/navigation.ts` → etkinlik ve destek kartlarının `href`'i hâlâ
  `null`; adım 10 yeni bir kart açmıyor, profil/sipariş ekranları menüye
  nasıl bağlanacak kararı senin
- `tests/e2e/layout.spec.ts` içindeki "açılmamış hizmet tıklanabilir bağlantı
  değildir" testi şu an **etkinlik** kartını örnek alıyor (market adım 8'de,
  restoran adım 9'da açıldığı için iki kez taşındı). Etkinlik adım 11'de
  açılınca örneği **destek** kartına taşı, testi silme

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/lib/money.ts`** — para TAM SAYI KURUŞ. **Ondalık sayıyla para hesabı YAPMA**
- **`src/features/catalog/`** — ORTAK katalog katmanı: arama kutusu, kategori
  şeridi, boş durum, adres parametresi şeması ve Türkçe `unaccent` araması.
  Yeni bir liste ekranı yazacaksan buradan başla, market/restoran'ı kopyalama
- **Sepet katmanı** (`src/features/cart/`): `addItemToCart` (not dahil),
  `changeItemQuantity`, `changeItemNote`, `removeItemFromCart`, `getCartSummary`
- **Ödeme katmanı** (`src/features/payment/`): `checkout.service.ts` siparişleri
  modül başına ve tek transaction'da yazıyor; iptal akışı buradaki desenle
  simetrik olmalı
- **`CartLines`** bileşeni dar kapsayıcıda da çalışıyor (`allowNoteEditing`
  bayrağı restoran satırlarında not düzenlemeyi açıyor)
- **Bildirim balonu**: `import { toast } from "sonner"`, kap `src/components/ui/sonner.tsx`
  içinde ve kök düzende takılı. `next-themes` KULLANMIYOR, tema CSS'ten geliyor
- **`readCartOwner()`** sunucu bileşenleri için, **`getCartContext()`** uçlar
  için. **Sunucu bileşeninde çerez YAZILAMAZ**, ikisini karıştırma
- **`requireAccess()`** uçlar için, **`guardPage()`** sayfalar için
- **`recordAuditLog()`** — kritik işlemler denetim kaydına yazılır (iptal dahil)
- `messages.ts` — kullanıcıya görünen tüm Türkçe metinler burada, dağıtma
- Tasarım token'ları (`globals.css`) · `page-shell` · `TextField` · `FormAlert`

## TUZAKLAR — daha önce vakit kaybettirenler

**E2E koşarken (adım 9'da 40 dakika yedi)**
- **`npm run start` ile KENDİ sunucunu açıp sonra `npx playwright test` KOŞMA.**
  `playwright.config.ts` sunucuyu kendi ortam değişkenleriyle başlatıyor
  (Turnstile kapalı, sahte Google istemcisi) ve `reuseExistingServer` yüzünden
  senin sunucunu olduğu gibi kullanıyor. Sonuç: kayıt, şifre sıfırlama ve
  Google testlerinin tamamı **kodla ilgisiz** sebeplerle kırmızıya dönüyor.
  **Doğrusu: portu boşalt (`lsof -ti:3000 | xargs kill -9`), sonra tek başına
  `npx playwright test` koştur** — sunucuyu Playwright kendi kurar
- **Sunucu ayaktayken `.next`'i silme** — statik dosyalar 500 döner ve duman
  testi "MIME type" hatalarıyla kırmızıya döner
- **Yük 3'ün üzerindeyken tam set koşarken 1-2 test kararsız** ("ERR_ABORTED",
  "bağlam yok edildi"). Tek tek koşturunca geçiyorlar. Önce `uptime` bak
- **E2E'yi 15 dakika içinde üst üste koşturma** (hız sınırı). Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra tek sefer koş
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan**
- **E2E'nin ürettiği ziyaretçi sepetini temizle** (`restaurant.spec.ts` örneği)

**Playwright seçicileri**
- **`getByRole("button", { name: "Ara" })` ÇOK EŞLEŞİR**: "Izgara", "Sigara",
  "Karışık Izgara" gibi kalem adları erişilebilir adın içinde geçiyor.
  `exact: true` şart
- **`getByText(<modül adı>)` de çok eşleşir**: modül adı hem bölüm başlığında
  hem ücretsiz teslimat ipucunda geçiyor. Başlık için `getByRole("heading")` kullan

**Türkçe metin**
- **Veritabanının kendi büyük/küçük harf araması TÜRKÇE BİLMİYOR.** Prisma'nın
  `contains` + `mode: "insensitive"` kombinasyonunu KULLANMA. Bunun yerine
  `src/features/catalog/repositories/catalog-search.repository.ts` içindeki
  `findIdsMatchingQuery` fonksiyonunu çağır — yeni bir tablo aranacaksa oraya
  yeni bir dal ekle (tablo adı sabit listeden seçilir, parametre DEĞİL)
- **`LIKE` deseni ŞART olarak `toLikePattern`'den geçer** (`src/lib/search-text.ts`)
- Yazım hatası toleransı YOK (borç #44)

**Para**
- **Ondalık sayıyla para hesaplama.** Her yerde tam sayı kuruş, dönüşüm yalnızca
  sınırlarda
- **Teslimat ücreti modül başına bir KURAL TABLOSUNDAN okunuyor**
  (`cart-pricing.ts` → `DELIVERY_RULES`). Yeni bir modül eklenirse tabloya satır
  ekle, yeni bir `if` dalı yazma

**Eşzamanlılık**
- **"Önce oku, boşsa yaz" İKİ ADIMDIR ve yarışı çözmez.** Tek koşullu UPDATE
  kullan (`WHERE stock >= n`) ve etkilenen satır sayısına bak
- **Korumayı yazdıktan sonra geçici kaldırıp testin KIRMIZIYA döndüğünü GÖR.**
  Adım 9'da iki koruma böyle ölçüldü (IDOR ve zaman aralığı kuralı) ve ikisinde
  de tam olarak beklenen testler kırmızıya döndü, diğerleri yeşil kaldı

**Next.js**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR.** Salt okuma gereken
  yerde `readAnonymousId()` / `readCartOwner()` kullan
- **`next/image` `.svg` kaynağında optimizasyonu KENDİLİĞİNDEN atlıyor**
- **Sunucuda çizilen bir panel istemci bir şey yazdıktan sonra kendiliğinden
  tazelenmez** — `router.refresh()` çağır (adisyon paneli böyle çalışıyor)

**Test**
- Sunucu tarafı test dosyalarına `/** @vitest-environment node */` docblock'u ŞART
- **İş kuralı testlerini `tests/db/` içinde GERÇEK veritabanına karşı yaz**
- **Vitest'te hata sınıflarını test gövdesinin İÇİNDE `await import()` etme**
- **Her Playwright projesine (masaüstü / 375px) AYRI test hesabı VE ayrı veri
  havuzu ver.** Giriş gerektirmeyen akışta hesap hiç kullanma

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), tercih `localStorage`'da. `next-themes`
  BİLEREK kullanılmıyor — shadcn CLI onu geri getirmeye çalışıyor, kaldır
- **shadcn'de Dialog bileşeni YOK ve bilerek eklenmedi** (adım 9). Küçük bir
  form için modal yerine kartın içinde açılan bölüm kullanıldı; modal gerçekten
  gerekirse önce kullanıcıya sor (yeni bağımlılık)
- **Dar kapsayıcıya konan bileşen taşabilir.** Adım 9'da sepet satırı 384px'lik
  adisyon panelinde sayfaya yatay kaydırma ekledi. Ölçüsü:
  `document.documentElement.scrollWidth > clientWidth`
- **Olmayan renk token'ı uydurma.** `warning` yok; uyarı vurgusu renkle değil
  kalınlıkla veriliyor
- Tailwind v4 kanonik biçimi `aspect-4/3`, `aspect-[4/3]` değil
- Dokunma hedefleri en az 44px (`min-h-11`)

**Bağımlılık**
- **`shadcn add <bileşen>` İSTENMEYEN PAKET GETİREBİLİR.** Kurulumdan sonra
  `git diff package.json` OKU
- **Yeni paket sonrası `npm audit` KOŞ**

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
`npm run test · test:db · lint · typecheck · format · format:check · build`
`gh` PATH'te. `vercel` ve `neonctl` için `npx`.

**E2E'yi elle koşturma sırası:** portu boşalt (`lsof -ti:3000 | xargs kill -9`),
sonra `npx playwright test`. Sunucuyu SEN başlatma.

## BENİMLE İLETİŞİM

Kodu okuyup anlayamıyorum. Her adımı **Türkçe, kod göstermeden, en fazla 5
maddede** anlat. Sadece "ne" değil **"neden"** de söyle. Emin olmadığın yerde
**"emin değilim"** de, uydurma. Bir şeyi bozduğunu fark edersen hemen söyle.
Kod yazmadan önce **plan sun ve onayımı bekle** (CLAUDE.md §3 kapı 2).
