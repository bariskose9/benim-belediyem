# Değişiklik Günlüğü

Format: [Keep a Changelog](https://keepachangelog.com/tr/) · Sürümleme: SemVer

## [Yayınlanmamış]

### Eklendi — adım 8: Belediye Market

- **Market ekranı** `/market`: 45 ürün, 6 kategori; görselli, fiyatlı, stoklu
  kartlar. Mobilde tek, tablette iki, masaüstünde dört sütun
- **Kategori süzgeci ve arama** — ikisi de adres çubuğunda taşınıyor
  (`?kategori=…&arama=…`), yani geri tuşu çalışıyor ve bağlantı paylaşılabiliyor.
  Arama formu sıradan bir `GET` formu olduğu için JavaScript kapalıyken de işliyor
- **Sepete ekleme**: hazır sepet ucu (`POST /api/carts/current/items`) çağrılıyor;
  yeni uç ve yeni iş kuralı yazılmadı. Ziyaretçi de ekleyebiliyor (PRD §4)
- **Bildirim balonu** (`sonner`): ekleme onayı ve içinde "Sepete git" bağlantısı.
  Balon `aria-live` bölgesine yazıyor, yani ekran okuyucuya da ulaşıyor
- **Tükenmiş ürün** listede kalıyor ama "Tükendi" rozetiyle ve düğmesiz. Asıl
  engel sunucuda: `addItemToCart` isteği zaten reddediyor (PRD §5.3)
- **Az stok uyarısı** ("Son 5 adet") 10 adedin altında görünüyor
- Ana sayfadaki market kartı ve üst menü artık `/market`'e bağlı; rozet
  "Yakında"dan "Açık"a döndü

### Düzeltildi — adım 8

- **Türkçe aramada büyük harf sorunu.** Veritabanının büyük/küçük harf duyarsız
  araması `I` harfini `i`'ye çeviriyor, oysa Türkçe'de karşılığı `ı`. Bu yüzden
  `KAĞIT` yazan kullanıcı "Kağıt Havlu"yu, `SIVI` yazan "Sıvı El Sabunu"yu
  **hiç bulamıyordu** (yerel veritabanında ölçüldü). Arama metni artık sorgudan
  önce Türkçe kurallarıyla küçük harfe çevriliyor (`src/lib/search-text.ts`).
  Koruma kaldırılıp testin kırmızıya döndüğü doğrulandı

### Güvenlik — adım 8

- `hono` **4.13.0**'a `overrides` ile yükseltildi (CORS ara katmanında ReDoS —
  GHSA-8j4g-w8fx-2239). Paket `shadcn` CLI üzerinden geliyordu ve zaten
  bağımlılık ağacındaydı; `npm audit` ve `npm audit --omit=dev` yeniden **0 açık**
- `next-themes` bağımlılığı **kaldırıldı**. shadcn CLI'ı `sonner` bileşeniyle
  birlikte getirmişti, oysa projede tema sınıf tabanlı ve `src/lib/theme.ts`
  içinde "bu paketi bilerek eklemiyoruz" yazıyor. Balon rengi artık tasarım
  token'larına bağlı, yani temayı CSS biliyor — ikinci bir tema kaynağı yok

### Eklendi — adım 7: ortak sepet + sahte kart ödemesi

- **Ortak sepet** `/sepet`: market, restoran ve etkinlik ürünleri tek sepette,
  modül başına ayrı bölüm ve ayrı ara toplam. Adet artırma/azaltma ve satır
  çıkarma anında çalışıyor
- **Ziyaretçi sepeti** (PRD §4): giriş yapmamış kullanıcı da sepete ekleyebiliyor,
  sepet `bb_anon` çerezinde taşınıyor. **Giriş yapıldığında hesaptaki sepetle
  birleşiyor** — aynı ürünün adetleri toplanıyor, stok ve satır sınırı aşılmıyor.
  Hem şifreyle hem Google ile girişte çalışıyor
- **Teslimat ücreti MODÜL BAŞINA** (PRD §6.1): market 59 TL, 750 TL üzeri
  ücretsiz. Eşik **yalnızca market tutarına** bakıyor — restoran ürünü ekleyerek
  market teslimatını bedavaya getirmek mümkün değil, testi de var
- **Ödeme ekranı** `/odeme` ve **sahte fiş** `/odeme/tamamlandi`: kayıtlı karttan
  seçme veya yeni kart girme, "kartımı kaydet", teslimat adresi ve zaman aralığı
- **Sahte ödeme sağlayıcısı** (ADR-003'ün deseni): gerçek tahsilat yok.
  `fake-data-guide.md`'deki test kartları sonucu belirliyor —
  `4000…0002` reddedildi, `4000…9995` yetersiz bakiye. Hata yolları böylece
  öngörülebilir biçimde test edilebiliyor
- **Kart doğrulaması sunucuda**: Luhn, son kullanma (ayın SONUNA kadar geçerli),
  CVV biçimi, kart sahibi adı. Marka numaranın ön ekinden çıkarılıyor;
  tanınmayan numara varsayılan bir markaya DÜŞMÜYOR, reddediliyor

### Kabul kriterleri (PRD §6.1) — gerçek PostgreSQL'e karşı kanıtlandı

- **Karışık sepet tek ödemeyle ÜÇ SİPARİŞ üretiyor**, hepsi aynı ödemeye bağlı.
  Bilet doğrudan `delivered` oluyor ve teslimat alanları boş kalıyor; market ile
  restoran `received` ile başlayıp adres ve zaman aralığı taşıyor
- **Ödeme başarısızsa HİÇBİR sipariş oluşmuyor, sepet korunuyor.** Sıralama
  bunu sağlıyor: sağlayıcıya sipariş yazılmadan ÖNCE soruluyor
- **Çift tahsilat veritabanı seviyesinde engelleniyor** (`unique(idempotency_key)`).
  Eşzamanlı iki istekten yalnızca biri tahsil ediyor
- **Stok koşullu UPDATE ile düşüyor** (`WHERE stock >= n`) — randevu modülündeki
  desenin aynısı. Son adedi aynı anda isteyen iki kullanıcıdan yalnızca biri
  alıyor, stok eksiye inmiyor

### Güvenlik

- **Tam kart numarası hiçbir yere yazılmıyor**: ne veritabanına, ne log'a, ne
  hata mesajına, ne ekrana. Repository imzalarında kart numarası için parametre
  YOK; sızması yanlışlıkla bile mümkün değil. Testler bunu yanıtta, şema
  hatasında, iş kuralı hatasında ve beklenmeyen hatada ayrı ayrı doğruluyor
- **Tutar sunucuda hesaplanıyor.** İstemcinin gönderdiği `expectedTotalKurus`
  tahsil edilmiyor; yalnızca "kullanıcının gördüğü ekran güncel miydi" diye
  karşılaştırılıyor, tutmuyorsa ödeme duruyor
- **IDOR**: başkasının adresi, kayıtlı kartı, sepet satırı veya fişi
  kullanılamıyor — sahiplik her sorgunun içinde
- Hız sınırı: sepet yazmalarında ziyaretçi başına 120/15dk, ödemede kullanıcı
  başına 10/15dk (kart deneme saldırısına karşı dar tutuldu)

### Değiştirildi

- **Para hesabı artık TAM SAYI KURUŞ** (`src/lib/money.ts`). Veritabanı
  `Decimal(10,2)` tutuyor, ekran lira gösteriyor, ama aradaki tüm hesap tam
  sayıyla yapılıyor — `0.1 + 0.2` hatası bir sepette kuruş kaymasına dönüşürdü.
  Testi bu davranışı doğrudan kanıtlıyor
- Üst menüye **sepet bağlantısı** eklendi; menünün içinde değil sağda, giriş
  düğmesi gibi her ekran boyutunda tek dokunuş uzaklıkta (PRD §4)
- Kart son kullanma etiketleri "Ay"/"Yıl" yerine **"Son kullanma ayı/yılı"**
  oldu: kısa hâli hem ekran okuyucuda bağlamsız kalıyordu hem de sayfadaki
  başka metinlerle çakışıyordu (testte fiilen çakıştı)
- `tests/db/helpers.ts` temizliği sepet, sipariş, ödeme, adres ve katalog
  tablolarını da kapsıyor — uygulamanın ürettiği kayıtlar `cuid()` aldığı için
  test önekiyle bulunamıyordu

### Düzeltildi

- **`/sepet` sayfası, çerezi hiç olmayan ziyaretçide çöküyordu.** Sunucu
  bileşeni ziyaretçi kimliğini üretmeye çalışıyordu; Next.js sunucu
  bileşeninde çerez yazılmasına izin vermiyor. Artık sayfa salt okuma yapıyor
  (`readCartOwner`), kimlik ilk yazma isteğinde uçta üretiliyor. E2E testi yakaladı
- **Hastane E2E testinde gizli bir yarış vardı** (adım 6'dan): iki Playwright
  projesi aynı branşın aynı ilk boş saatini kapmaya çalışıyordu. Adım 7'nin
  eklediği yükle görünür oldu; her projeye ayrı branş verildi


### Eklendi — adım 6: hastane randevu modülü (personele özel)

- **Randevu akışı** `/hastane`: branş → doktor → gün → saat, hepsi tek adreste
  ve adres çubuğunda taşınıyor (`?brans=…&doktor=…&gun=…`). Her adım sunucuda
  çiziliyor; geri tuşu bir adım geri alıyor, bağlantı paylaşılabiliyor
- **`/hastane/randevularim`**: yaklaşan ve geçmiş randevular, iptal düğmesi.
  Sayfa hiçbir kullanıcı kimliği parametresi almıyor — kimlik oturumdan
  geliyor, dolayısıyla unutulabilecek bir sahiplik kontrolü yok
- **İki uç**: `POST /api/appointments` (201) ve `DELETE /api/appointments/{id}`
  (204). İkisi de yalnızca personele açık; `userId` gövdeden değil oturumdan
  okunuyor ve istemcinin gönderdiği değer şemadan hiç geçmiyor
- **PRD §5.1'in dört kuralı da sunucuda**: dolu saat seçilemez · geçmiş tarihe
  randevu alınamaz · **aynı branşta aktif randevu varken ikinci randevu
  alınamaz** · iptal en geç randevudan 2 saat önce. Dördü de ayrı hata kodu ve
  409 döndürüyor, çünkü ekranın hangi kuralın devreye girdiğini bilmesi gerekiyor
- **Üçüncü kural canlı denemeden sonra sıkılaştırıldı (PRD §5.1 güncellendi).**
  Önce "aynı branşta **aynı gün**" diye yazılıydı ve öyle uygulanmıştı; proje
  sahibi preview'da deneyip gerçek randevu sistemlerinin böyle davranmadığını
  belirtti. Artık o branşta bekleyen randevunuz varken **hiçbir güne** yeni
  randevu alamıyorsunuz. "Aktif" = durumu `booked` ve saati henüz gelmemiş;
  saati geçen randevu engel olmaktan çıkıyor, iptal edilen hiç sayılmıyor.
  Kabul edilen bedel: kontrol randevusu önceden alınamıyor
- **Kabul kriteri karşılandı — iki kullanıcı aynı saati alamaz.** Koruma
  uygulama mantığında değil, `doctor_slots` üzerindeki koşullu güncellemede
  (`WHERE is_booked = false`): PostgreSQL ikinci işlemi bekletiyor, birinci
  commit edince WHERE'i yeniden değerlendiriyor ve satır artık koşulu
  sağlamadığı için atlıyor → 409. Beş eşzamanlı istekle gerçek veritabanına
  karşı sınandı; **koşul geçici olarak kaldırıldığında testin kırmızıya
  döndüğü de doğrulandı** (beşi de saati alabildi)
- **İptal randevuyu SİLMİYOR**: `status = cancelled` oluyor, kayıt 3 yıl
  saklanıyor (data-model.md) ve saat yeniden satışa açılıyor. Randevusunu
  iptal eden kullanıcı aynı gün yenisini alabiliyor — iptal bir cezaya
  dönüşmüyor
- **Denetim kaydı**: randevu oluşturma ve iptal `audit_logs`'a yazılıyor
  (CLAUDE.md §5.11 iptali açıkça sayıyor). IP düz değil özetlenerek
- **Hız sınırı yazma uçlarında**: 20 işlem / 15 dakika, **kullanıcı başına**.
  IP bazlı değil — bu hizmet tek bir kurumun personeline açık ve hepsi aynı
  dış IP'nin arkasından girebilir, IP sayacı onları birbirinin bütçesinden
  yerdi. Kullanıcı kimliği sayaç anahtarında özetlenerek tutuluyor
- **`src/lib/datetime.ts` (yeni)**: gün ve saat gösteriminin tek yeri. Ekranda
  her tarih **İstanbul saatine** çevriliyor (veritabanında UTC saklanıyor) ve
  gün şeridi günleri İstanbul takvimine göre grupluyor — UTC 21:00'den sonrası
  İstanbul'da ertesi gündür. Etkinlik ve teslimat modülleri de bunu kullanacak
- **`api-guard.ts` (yeni)**: korumalı uçların kapısı. `page-guard`'ın HTTP
  karşılığı, ama kararı **aynı saf fonksiyon** veriyor (`evaluateAccess`) —
  sayfada izin verilen bir işlem uçta reddedilemez, tersi de olamaz

### Değiştirildi

- `/hastane` artık gerçek içerik gösteriyor; "yakında" iskeleti yalnızca spor
  salonunda kaldı (`StaffOnlyService` bileşenine dokunulmadı)
- `rate-limit.ts` yeni bir anahtar türü tanıyor: `user`. Değer düz değil
  özetlenerek yazılıyor — `rate_limit_counters` tablosunu okuyan biri hangi
  hesabın ne zaman ne yaptığını çıkaramasın diye

### Düzeltildi

- **İki E2E testi yanıltıcı biçimde geçiyormuş.** `layout.spec.ts` içindeki
  "açık hizmet kendi sayfasına götürür" ve "mobilde bağlantıya basınca menü
  kapanır" testleri `/hastane$` adresini bekliyordu; oysa giriş yapmamış
  ziyaretçi kapıdan geçemiyor ve `/giris`'e yönlendiriliyor. Testler
  yönlendirme tamamlanmadan önceki **geçici adresi** yakalıyordu. Adım 6'da
  sayfaya `loading.tsx` eklenince zamanlama değişti ve testler kırmızıya
  döndü — yani bir davranış değişikliğini değil, kendi kırılganlıklarını
  bildirdiler. Beklentiler kalıcı sonuca (`/giris?...donus=%2Fhastane`)
  çevrildi
- `tests/db/helpers.ts` temizliği artık uygulamanın ürettiği kayıtları da
  siliyor. Randevu ve denetim satırları `cuid()` kimlik aldığı için test
  önekiyle bulunamıyordu; kalan satırlar yabancı anahtar kısıtı yüzünden
  (`Restrict`) tüm temizliği patlatıyordu

### Eklendi — adım 5: görsel iskelet (layout, tema, marka)
- **Marka paleti**: kurumsal lacivert (`--primary`) + turkuaz vurgu
  (`--brand-accent`), açık ve koyu tema için ayrı ayrı. Değerler tahminle
  seçilmedi: her metin/zemin çifti oklch → sRGB'ye çevrilip WCAG kontrast oranı
  hesaplandı. En düşük çift **4.67:1** (gereken 4.5:1), odak halkası **4.89:1**
  (gereken 3:1)
- **Kendi kelime-logomuz** (`Logo` bileşeni + `icon.svg` sekme simgesi):
  yuvarlak köşeli karo içinde sadeleştirilmiş kemerli kamu binası cephesi.
  **Hiçbir gerçek belediyenin logosu, arması veya rengi kullanılmadı** — depo
  herkese açık ve site canlı. İşaret SVG olduğu için rengini temadan alıyor,
  ayrı bir ağ isteği doğurmuyor ve düzen kaymasına yol açmıyor
- **Açık/koyu tema düğmesi**: tercih tarayıcıda saklanıyor, ilk girişte sistem
  tercihi kullanılıyor. Sınıf sayfa **boyanmadan önce** uygulanıyor (`<head>`
  içindeki satır içi betik), yani koyu tema kullanıcısı açılışta beyaz parlama
  görmüyor. **Yeni bağımlılık eklenmedi** — `next-themes` yerine 3 fonksiyonluk
  kendi çözümümüz (`src/lib/theme.ts`)
- **Üst menü yeniden**: solda logo, ortada hizmet bağlantıları, sağda tema
  düğmesi ve giriş/çıkış. Mobilde bağlantılar açılır menüye giriyor
  (`aria-expanded` + `aria-controls`), **giriş/çıkış düğmesi ise menünün dışında
  kalıyor** — en kritik eylem her ekran boyutunda tek dokunuş uzaklıkta
- **Bağlantılar tek kopya**: masaüstü ve mobil için ayrı menü YAZILMADI. İki
  kopya olsaydı ekran okuyucu her şeyi iki kez okur, testler de hangi
  bağlantının kastedildiğini ayırt edemezdi
- **Alt bilgi (yeni)**: her sayfada kalıcı feragat — "Bu site gerçek bir
  belediyeye ait değildir." Yasal sayfalar (adım 17) henüz yok, bu yüzden
  onlara bağlantı verilmedi: 404'e giden bir "KVKK" bağlantısı, bağlantının hiç
  olmamasından kötüdür
- **Ana sayfa**: tanıtım bölümü + 6 hizmet kartı. Sayfası olmayan hizmet
  **bağlantı değil**, "Yakında" rozetiyle duruyor — hem 404 önleniyor hem de
  Next'in bağlantı ön yüklemesi ana sayfada başarısız istek üretmiyor
- **"İçeriğe geç" atlama bağlantısı**: klavye kullanıcısı menüyü tek tek
  geçmeden içeriğe atlıyor (WCAG 2.1 AA "Bypass Blocks")
- **Dokunma hedefleri 44x44px'e çıkarıldı** (menü, tema düğmesi, çıkış düğmesi)
- 375px'te üst menü **tek satıra sığdırıldı**: tarayıcıda ölçüldüğünde satır
  10px taşıyor ve menü düğmesi alta düşüyordu. Kelime-logo dar ekranda bir punto
  küçültüldü, boşluk daraltıldı; dokunma hedefleri korundu
- Sayfa çerçevesinin ölçüleri tek yerde: `page-shell` yardımcı sınıfı +
  `--page-*` token'ları. Üst menü, içerik ve alt bilgi aynı hizada

### Değiştirildi — adım 5
- **Site açıklamasından gerçek kurum adı çıkarıldı.** Önceki metin gerçek bir
  belediyenin adını taşıyordu; arama sonuçlarında ve bağlantı önizlemelerinde
  görünen bu metin, sitenin o kuruma ait olduğu izlenimini doğurabilirdi
- **`getCurrentSession()` istek başına bir kez okuyor** (React `cache`). Oturum
  aynı sayfada birden fazla yerden okunuyordu (üst menü + sayfa + korumalı
  sayfalarda `page-guard`) ve her biri ayrı bir sorgu açıyordu. Önbellek
  yalnızca o istek boyunca yaşıyor; istekler arasında hiçbir şey paylaşılmıyor
- **E2E local'de 2 işçiyle koşuyor** (önceden çekirdek sayısının yarısı). Test
  sayısı 92'den 118'e çıkınca beş paralel işçi tek Next sunucusu üzerinde 30
  saniyelik zaman aşımlarına yol açıyordu; testler tek tek geçiyordu, yani sorun
  testlerde değil koşum ortamındaydı. CI zaten tek işçi kullanıyor
- Şema **değişmedi**, migration **yok**

### Eklendi — adım 4c: Google ile giriş (OAuth)
- **"Google ile devam et" ile giriş ve kayıt** (`/api/auth/google` →
  Google → `/api/auth/google/callback`). Düğme metni bilerek "giriş yap" değil:
  aynı düğme hesabı olmayanı da kaydediyor
- **Üç koruma birlikte, hiçbiri isteğe bağlı değil**: `state` (CSRF), **PKCE**
  (çalınan yetkilendirme kodu işe yaramaz), `nonce` (jeton tekrar oynatılamaz).
  Biri tutmazsa akış oracıkta ölüyor, "yine de devam et" dalı yok
- **Hesap birleştirme kuralı (PRD §5.0, güvenlik açısından kritik)**: aynı
  e-postalı hesap varsa **otomatik birleştirilmiyor**. Birleşme yalnızca Google
  e-postayı doğrulanmış bildiriyorsa **ve** bizdeki hesabın e-postası da
  doğrulanmışsa oluyor; aksi hâlde oturum açılmıyor, hesap yazılmıyor, bağlantı
  kurulmuyor. Bu olmasaydı saldırgan, kurbanın e-postasıyla açtığı bir Google
  hesabıyla mevcut hesabı şifreyi hiç bilmeden devralabilirdi
- **Google KİMLİK DOĞRULAMAZ** — hesap `dogrulanmamis` kademesinde açılıyor;
  kimlik numarası, doğum tarihi ve personel yetkisi almıyor. Bu ekranda
  kullanıcıya da açıkça yazıyor
- **Oturum mevcut mekanizmayla açılıyor** (ADR-005): Google ile giren kullanıcı
  "tüm cihazlardan çık", "şifre değişince oturum düşer" ve anında iptal
  davranışını ek kod yazılmadan alıyor
- **İşlem çerezi tek kullanımlık** — hata yolunda bile siliniyor; aynı `state`
  ile ikinci deneme mümkün değil (tarayıcıda fiilen doğrulandı)
- **Tüm hatalar tek ekrana çıkıyor**: `state` uyuşmazlığı, PKCE hatası, geçersiz
  kimlik jetonu, Google'ın 5xx'i, iznin reddi. Ayrıştırmak saldırgana hangi
  korumaya takıldığını söylerdi
- **Hata kodları beyaz listeden geçiyor** — adres çubuğuna yazılan uydurma bir
  metin ekrana basılmıyor (kimlik avı / metin enjeksiyonu koruması)
- **Jeton saklanmıyor**: `accounts` tablosundaki `access_token` / `id_token`
  alanları bilerek boş. Google API'si çağrılmıyor; saklanmayan jeton sızmaz
- Testler: 34 yeni birim/entegrasyon + 9 E2E (masaüstü ve 375px).
  Toplam: **397** unit/entegrasyon · 36 veritabanı · 83 E2E

### Değiştirildi — adım 4c
- `openid-client@6.8.4` eklendi — OpenID Foundation **sertifikalı** istemci.
  Auth.js kurulmadı: iki ayrı oturum mekanizması doğurur ve ADR-005'in
  jeton-özeti tasarımını bozardı. `npm audit`: 0 açık
- `AUTH_SECRET` **gerekmiyor**: OAuth işlem çerezi `httpOnly` olduğu için
  imzalanmıyor — yönetilecek bir sır eksildi
- Şema **değişmedi**, migration **yok**: `accounts` tablosu adım 3'ten beri hazır

### Düzeltildi — adım 4c (preview'da tarayıcı denemesinde yakalandı)
- **Preview'ın adresi artık DAL adresinden alınıyor** (`VERCEL_BRANCH_URL`),
  dağıtım adresinden değil. Dağıtım adresi her commit'te değiştiği için
  (`...-egg0uqrln-...`) Google paneline önceden yazılamıyordu ve her dönüş
  `redirect_uri_mismatch` ile ölecekti. Dal adresi (`...-git-<dal>-...`) dal
  boyunca sabit. Aynı düzeltme giriş sonrası yönlendirmede Turnstile'ın
  hostname kontrolünü de kurtarıyor — iki hata tek sebepten geliyormuş
- **E2E'ye sahte Google istemcisi verildi.** Anahtarlar yokken düğme bilerek
  çizilmiyor, dolayısıyla CI'da testler düğmeyi bulamıyordu. Gerçek anahtar
  CI'ya taşınmadı: testler Google'ın giriş ekranına hiç girmiyor, yalnızca
  bizim ürettiğimiz adresi doğruluyor

### Eklendi — adım 4b-3: şifre sıfırlama ve hesap sayımı koruması
- **Şifre sıfırlama akışı (`/sifremi-unuttum` → `/sifremi-unuttum/dogrulama`)**:
  kimlik numarası → kayıtlı e-posta adresine 6 haneli kod → kod + yeni şifre.
  Kod kuralları kayıttakiyle aynı (5 dakika, 3 deneme, tek kullanımlık) ve aynı
  OTP mekanizması kullanılıyor — yeni bir mekanizma kurulmadı
- **Şifre değişince kullanıcının TÜM oturumları düşüyor** (ADR-005'in varlık
  sebebi). 4b-2'de hazırlanan `revokeAllSessionsForUser()` artık çağrılıyor
- **Hesap sayımı koruması üç katmanlı** (PRD §5.0): (1) kayıtlı ve kayıtsız
  numara aynı yanıtı alıyor, (2) kayıtsız numara için de **kimseye ait olmayan
  bir sahte kod kaydı** açılıyor — böylece ikinci ekran da aynı davranıyor
  (aynı deneme hakkı, aynı kilitlenme, aynı mesajlar), (3) yanıt süresi sabit
  bir tabana dolduruluyor. Yalnızca birinci ekranı eşitlemek korumayı yarım
  bırakırdı: fark ikinci ekranda okunurdu
- **Bot doğrulaması bu akışta ilk denemeden itibaren zorunlu** — giriş
  ekranındaki "2 başarısız denemeden sonra" kuralı buraya geçmiyor (PRD)
- **Kod önce doğrulanıyor, şifre politikası sonra**: sıra ters olsaydı kodu hiç
  bilmeyen biri "bu şifre hesabın adını içeriyor" yanıtını alabilir ve hesap
  sahibinin adını doğrulayabilirdi. Doğru kod politika hatasında **tüketilmiyor**;
  kullanıcı aynı kodla daha güçlü bir şifre yazabiliyor
- **Denetim kaydı**: `password_reset`, kimlik numarası ve düz IP yazılmadan
- Giriş ekranına "Şifrenizi mi unuttunuz?" bağlantısı ve sıfırlama sonrası
  "tüm cihazlardaki oturumlarınız kapatıldı" bilgisi eklendi
- Testler: 46 yeni birim/entegrasyon + 6 E2E (masaüstü ve 375px).
  Toplam: **363** unit/entegrasyon · 36 veritabanı · 74 E2E

### Değiştirildi — adım 4b-3
- `verifyOtp()` artık `consumeOnSuccess` seçeneği alıyor (varsayılan: eskisi
  gibi tüketir) ve başarıda kayıt kimliğini döndürüyor. Kayıt akışının davranışı
  değişmedi
- `otp_challenges.user_id` ilk kez kullanılıyor: sıfırlama kodunun hangi hesaba
  ait olduğu **yalnızca sunucuda** bu alanda duruyor, tarayıcıda değil.
  **Şema değişmedi, migration yok** — alan adım 3'ten beri vardı
- `registration-availability.ts` → `auth-availability.ts`: e-posta gönderimine
  bağlı iki akış (kayıt ve şifre sıfırlama) aynı kuralı paylaşıyor; biri açılıp
  diğerinin unutulmaması için kural tek yerde

### Eklendi — adım 4b-2: giriş, çıkış, oturum ve erişim kademeleri
- **Giriş ekranı (`/giris`)**: T.C. kimlik numarası + şifre. Giriş anında KPS
  sorgulanmıyor (PRD §5.0 — hız ve dayanıklılık); sahte KPS çökse bile mevcut
  kullanıcılar girebiliyor
- **Veritabanı oturumu (ADR-005)**: `sessions` tablosu, httpOnly çerezde 32
  baytlık rastgele jeton, veritabanında jetonun **özeti**. 7 gün ömür, kalan
  ömür 6 günün altına düşünce kayan yenileme. Süresi dolan satır okuma anında
  siliniyor (ADR-007)
- **Çıkış (`DELETE /api/sessions/current`)**: oturum satırı siliniyor, çerez
  düşüyor. Adres bir oturum kimliği taşımıyor — herkes yalnızca kendi çerezini
  düşürebilir
- **"Tüm oturumları düşür" mekanizması** kuruldu (şifre değişimi için); ekranı
  4b-3'te gelecek
- **Hesap sayımı koruması**: "böyle bir hesap yok" ile "şifre yanlış" aynı
  durum kodunu, aynı mesajı ve **aynı süreyi** üretiyor — hesap bulunamadığında
  sahte bir argon2 doğrulaması çalıştırılıyor. Sahte özetin parametrelerinin
  gerçek ayarlarla aynı kaldığını bir test koruyor
- **Giriş hız sınırı** 5 deneme / 15 dakika (IP + ziyaretçi bacağı) ve
  **2 başarısız denemeden sonra bot doğrulaması** (PRD §5.0)
- **Erişim kademeleri (PRD §5.0)**: `/hesabim` oturum istiyor; `/hastane` ve
  `/spor-salonu` yalnızca personele açık. Eksiğine göre farklı mesaj — kimlik
  doğrulanmamışsa yönlendirme var, personel değilse yok
- **Üst menü** oturum durumuna göre değişiyor (sunucuda okunuyor, istemciden
  gelen bir bayrağa güvenilmiyor)
- Açık yönlendirme koruması: `?donus=` yalnızca kendi yollarımızı kabul ediyor
- Testler: 54 yeni birim/entegrasyon + 12 E2E (masaüstü ve 375px).
  Toplam: 317 unit/entegrasyon · 36 veritabanı · 62 E2E

### Değiştirildi
- `docs/standards/00-stack.md` — "Auth" satırı ikiye ayrıldı: şifreyle giriş
  paketsiz (elle yazılmış veritabanı oturumu), Auth.js uyarısı artık yalnızca
  4c (Google ile giriş) için geçerli
- `ADR-005` — 2026-08-01 tarihli güncelleme notu: karar geçerli, mekanizma
  Auth.js değil elle yazılmış oturum; gerekçesi kaynak koddan doğrulandı
- Kayıt tamamlandı ekranındaki düğme artık giriş ekranına gidiyor

### Eklendi — yeni proje başlangıç kiti
- `docs/standards/16-yeni-proje-kurulumu.md` — **her projede aynı**: yeni bir
  projeye başlarken hangi dosyanın nereye kopyalanacağı, hangisinin projeye göre
  değişip hangisinin değişmediği. Amaç: iskeleti kurmak kullanıcının işi olmasın;
  kullanıcı yalnızca analiz dokümanını ve (varsa) farklı stack'i versin
- `docs/standards/sablonlar/` — dokuz doldurulabilir şablon (`PRD`, `roadmap`,
  `altyapi-durumu`, `CHANGELOG`, `sonraki-adim-prompt`, `data-model`,
  `integrations`, `fake-data-guide`, `ADR-000`) + klasör indeksi `OKUBENI.md`.
  Her şablonun başında **neden var olduğu** ve **ne zaman güncellendiği** yazıyor;
  doldurulunca o açıklama bloğu siliniyor
- `16-yeni-proje-kurulumu.md` içine **"proje hafızası — dört dosya"** tablosu:
  "hangi teknolojiyi kullandık" (`00-stack.md`), "hangi hesabı açtık"
  (`altyapi-durumu.md`), "neden böyle yaptık" (ADR'ler), "nerede kaldık"
  (`roadmap.md`). Gerekçe: oturum hafızasızdır, bu dört soru dosyaya yazılmazsa
  bir daha cevaplanamaz

### Değiştirildi — adım 4b-2 kararı
- **Auth.js `Credentials` sağlayıcısının veritabanı oturumunu desteklemediği
  kaynak koddan doğrulandı** (`@auth/core` → `assert.ts`: *"Signing in with
  credentials only supported if JWT strategy is enabled"*). Bu yüzden 4b-2'de
  şifreyle giriş **elle yazılmış veritabanı oturumuyla** yapılacak; ADR-005
  (oturum veritabanında) yürürlükte kalıyor ve `next-auth` kurulmuyor.
  Karar gerekçesi ve sonuçları `sonraki-adim-prompt.md` içinde

### Eklendi — oturum devri altyapısı
- `docs/standards/15-oturum-devri.md` — **her projede aynı**: bir bilginin
  hangi dosyaya yazılacağını söyleyen yönlendirme tablosu ve oturum sonu
  protokolü. Gerekçesi gerçek bir hata: bir oturumda Cloudflare hesabı açılmıştı,
  sonraki oturum bunu bilmediği için kullanıcıya aynı işi tekrar yaptırdı
- `docs/project/altyapi-durumu.md` — **projeye özel**: hangi hesap açık, panelde
  ne yapılandırılmış, hangi ortam değişkeni hangi ortamda tanımlı, ajan hangi
  araçlara erişebiliyor. Gizli anahtar DEĞERİ yazılmaz, yalnızca adı ve yeri
- `CLAUDE.md` kaynak hiyerarşisine `altyapi-durumu.md` eklendi: kullanıcıya
  "şunu aç" demeden önce okunması zorunlu

### Değiştirildi — canlı ortam
- Cloudflare Turnstile **gerçek anahtarlarla** devrede (preview + production);
  canlıda gerçek onay kutusu çıktığı doğrulandı. Teknik borç #21 kapandı
- Resend anahtarı production'a girildi, **canlıda kayıt açıldı**.
  Teknik borç #22 kapandı, yerine #25 doğdu (doğrulanmış alan adı olmadığı için
  yalnızca hesabın kayıtlı e-postasına gönderim yapılabiliyor)

### Eklendi — adım 4b-1 (TCKN ile kayıt)
- `src/app/kayit/` — üç adımlı kayıt akışı: kimlik doğrulama →
  salt okunur kimlik + iletişim/şifre → **iki bağımsız doğrulama kodu**.
  Her adım gerçek bir adres; geri tuşu çalışıyor, her adımın kendi
  yükleniyor/hata durumu var
- `POST /api/registrations` + `GET|PATCH|DELETE /api/registrations/current` +
  `.../current/otp-challenges` + `.../current/verifications`.
  **Taslak kimliği URL'de geçmez**, httpOnly çerezde taşınır
- `src/features/otp/` — `OtpChannel` adaptörü ve üç uygulaması:
  `MockChannel` (local/preview, kodu ekrana döndürür), `EmailChannel`,
  `EmailSmsSimulationChannel`. **Telefon kodu e-postaya gider ve simülasyon
  olduğu ekranda da e-postada da açıkça yazar** (teknik borç #1)
- `src/features/auth/` — kayıt servisi, **18 yaş kontrolü** (KPS'ten gelen
  tarihten, İstanbul takvim günüyle), argon2id şifre özetleme, şifre
  politikası, personel eşleştirme
- `registration_drafts` tablosu (ADR-012) — KPS yanıtının 15 dakikalık şifreli
  önbelleği. Düz metin kimlik numarası, e-posta, telefon veya kod hiçbir
  kolonda yok; çerez yalnızca rastgele bir jeton taşıyor
- `src/lib/turnstile.ts` — bot koruması, kayıt formunda **KPS sorgusundan önce**
  (ADR-004). Cloudflare'a ulaşılamazsa akış DURUR, kapı atlanmaz
- `src/lib/audit.ts` — `audit_logs` tablosuna ilk yazan. `src/lib/anonymous-id.ts` —
  hız sınırının oturum bacağını besleyen rastgele ziyaretçi kimliği
- Yeni bağımlılıklar: `argon2` (ADR-011), `react-hook-form`,
  `@hookform/resolvers`, `date-fns`
- Yeni ADR: **011** (argon2id) ve **012** (kayıt taslağı sunucuda şifreli)

### Değiştirildi
- `NATIONAL_ID_ENCRYPTION_KEY` artık **zorunlu** ve 32 bayt olduğu açılışta
  doğrulanıyor. Opsiyonel bırakılsaydı uygulama açılır, kayıt ucu çalışma
  anında ham bir kripto hatasıyla 500 dönerdi
- Ortam doğrulaması **production'da sahte OTP kanalını reddediyor**: sahte kanal
  kodu ekrana bastığı için yanlış yapılandırılmış bir production dağıtımının
  hiç açılmaması tercih edildi
- CSP'ye `challenges.cloudflare.com` eklendi (`script-src`, `frame-src`,
  `connect-src`). Bu satırlar olmadan Turnstile SESSİZCE bozuluyordu
- `created()` yanıtları artık her zaman `Cache-Control: no-store` taşıyor
- Tohumlama demo hesaplara argon2id şifresi yazıyor (teknik borç #15 kapandı)

### Düzeltildi
- `getRegistrationState` yanıtı **tam kimlik numarasını sızdırıyordu**: kimlik
  görünümü saklanan yükü olduğu gibi yayıyordu, o yük ise düz numarayı taşıyor.
  Artık alanlar tek tek beyaz listeden geçiyor
- Kontrol basamağı hatalı numara 422 yerine PRD'nin istediği **400** dönüyor;
  farklı bir durum kodu, tek tip mesajın sildiği ayrımı geri sızdırıyordu
- Doğrulama panelleri artık adlandırılmış bölge (`<section aria-labelledby>`);
  bilgi kutuları ekran okuyucuyu kesen `role="alert"` yerine `role="status"`

### Eklendi — adım 4a (sahte KPS servisi)
- `src/app/api/mock-kps/identity-queries/` — taklit edilen DIŞ KURUM ucu.
  Yalnızca POST (kimlik numarası URL'e değil gövdeye yazılır), yapay gecikme
  200–800 ms, `simulationBehavior` alanına göre `timeout` / `error` /
  `not_found` üretimi. **Paylaşılan gizli başlık olmadan 401 döner** (ADR-009)
- `src/features/identity/` — `IdentityProvider` arayüzü + `MockKpsProvider`.
  Zaman aşımı 3 sn, en fazla 2 yeniden deneme (üstel geri çekilme), devre
  kesici. **Yeniden deneme yalnızca zaman aşımı ve 5xx'te**; `not_found`,
  `mismatch` ve 4xx iş sonucudur, tekrarlanmaz
- `src/features/identity/services/identity-lookup.service.ts` — numara taraması
  koruması: tek tip başarısızlık mesajı, **sabit yanıt süresi** (bulundu /
  eşleşmedi / bulunamadı aynı sürer), her sorgu `KpsQueryLog`'a **numara
  yazılmadan** kaydedilir
- `src/lib/rate-limit.ts` — Postgres üzerinde hız sınırı sayacı (ADR-006).
  5 deneme / 15 dakika, IP + oturum bazlı. IP tuzlanmış özet olarak saklanır.
  **Sayaç kullanıcı denemesi başına artar**, iç yeniden denemeler artırmaz
- `src/lib/circuit-breaker.ts` — devre kesici, mevcut `rate_limit_counters`
  tablosu üzerinde (ADR-010). Yeni migration yok
- `MOCK_KPS_API_KEY` ortam değişkeni — **zorunlu**, her ortamda farklı
- `docs/project/decisions/ADR-009-*`, `ADR-010-*`
- Testler: 54 yeni unit/entegrasyon + 6 veritabanı + 5 E2E. E2E, derlenmiş ve
  çalışan uygulamaya dışarıdan başlıksız istek atıp 401 aldığını kanıtlıyor

### Değişti — adım 4a
- `NATIONAL_ID_HASH_SALT` artık **zorunlu** (IP özeti bunu kullanıyor)
- `src/lib/crypto.ts` — `hashPseudonym()` eklendi: kimlik numarası dışındaki
  tanımlayıcılar için alan ayrımlı (domain-separated) takma ad özeti
- `src/app/robots.ts` — production'da `/api/mock-kps` açıkça kapatıldı

### Eklendi — adım 3
- `prisma/schema.prisma` — `data-model.md`'deki **37 tablonun tamamı**, 26 enum,
  yabancı anahtarlar, index'ler ve eşzamanlılık için benzersiz index'ler
- `prisma/migrations/*_add_core_data_model` — tek migration; boş baseline'ın üstüne
  yalnızca `CREATE TABLE` / `CREATE INDEX` ekler, hiçbir şey silmez
- `prisma/seed/` — modül modül tohumlama: 200 sahte KPS vatandaşı, 35 birimlik
  teşkilat şeması, 100 personel, 90 üye hesabı, 45 market ürünü, 31 menü kalemi,
  4 üyelik paketi, 26 doktor + 6552 slot, 3 mekân + 576 koltuk + 12 etkinlik.
  Sabit kimlikler ve sabit tohumlu üreteç sayesinde **idempotent ve deterministik**
- `src/lib/national-id.ts` — kimlik numarası doğrulama (kontrol basamağı),
  maskeleme, tuzlanmış özet (HMAC-SHA256) ve AES-256-GCM şifreleme.
  Bağımlılık eklenmedi; `node:crypto` kullanıldı
- `tests/db/` + `npm run test:db` — **gerçek veritabanına bağlanan** testler:
  benzersiz index'lerin çalıştığı ve tohumlamanın idempotentliği kanıtlanıyor.
  CI'da `e2e.yml` içinde, PostgreSQL servisi ayakken koşuyor
- `docs/project/test-hesaplari.md` — tohumlama tarafından üretilir; sınır durum
  kayıtlarının (18 yaş altı, tam bugün 18, timeout, error, bulunamayan numara)
  ve örnek hesapların listesi. Production'da üretilmez
- `public/images/market|restaurant/*.svg` — telifsiz, kategori başına yer tutucu görsel

### Değişti — adım 3
- `docs/project/data-model.md` — iki düzeltme: tekilliği şifreli kolon değil
  `nationalIdHash` zorlar; `idempotencyKey` `Payment` üzerindedir, `Order` üzerinde değil.
  Ayrıca `OrgUnit.unitType` altı kademeye çıktı (üst yapı için)
- `.env.example` — `NATIONAL_ID_ENCRYPTION_KEY` / `NATIONAL_ID_HASH_SALT` artık
  adım 3'ten itibaren zorunlu ve local varsayılan değerleri var; `OWNER_BIRTH_DATE` eklendi

### Eklendi — adım 2
- `docker-compose.yml` — local PostgreSQL 18.4 (Neon'daki sürümle birebir aynı),
  sağlık kontrollü; `docker compose up -d --wait` bu kontrolü bekler
- `Dockerfile` — çok aşamalı build (deps → builder → runner), root olmayan kullanıcı,
  konteyner sağlık kontrolü. Vercel bu imajı kullanmaz; taşınabilirlik ve öğrenme için
- `prisma/schema.prisma` + `prisma.config.ts` — Prisma 7 kurulumu (model yok, adım 3'te gelir)
- `prisma/migrations/0_init` — boş baseline migration; migration boru hattının
  local (`migrate dev`) ve preview/production (`migrate deploy`) tarafında çalıştığını kanıtlar
- `prisma/seed.ts` — idempotent seed iskeleti
- `src/lib/db.ts` — tekil PrismaClient, `@prisma/adapter-pg` üzerinden (ADR-008)
- `npm run setup` — tek komutla kurulum: `npm ci` → Docker → migration → seed (~2,5 dk)
- `db:up`, `db:down`, `db:reset`, `db:migrate`, `db:deploy`, `db:studio` komutları
- **ADR-008** — Prisma bağlantısı için `@prisma/adapter-pg` kararı ve alternatifleri

### Değişti — adım 2
- `GET /api/health` artık veritabanını da kontrol ediyor: ulaşılabiliyorsa
  `200` + `db: "ok"`, ulaşılamıyorsa `503` + hangi parçanın düştüğü.
  Sorgunun zaman aşımı var (3 sn) — cevap vermeyen veritabanı ucu askıda bırakmaz
- `src/config/env.ts` — `DATABASE_URL` ve `DIRECT_URL` artık **zorunlu** ve
  `postgresql://` protokolü doğrulanıyor
- `next.config.ts` — `standalone` çıktısı yalnızca Docker imajı için açılıyor
  (`NEXT_OUTPUT=standalone`); `next start` bu modda çalışmadığı için kalıcı değil
- `e2e.yml` — Postgres servis kabı eklendi; E2E artık gerçek veritabanına bağlanıyor
  ve `migrate deploy` ile migration'ları uyguluyor
- `src/lib/http.ts` — hata yanıtları artık her zaman `Cache-Control: no-store` gönderiyor

### Düzeltildi — adım 2
- `prisma.config.ts` Prisma'nın `env()` yardımcısını kullanıyordu; bu, veritabanına
  hiç bağlanmayan `prisma generate` komutunu bile `DIRECT_URL` olmadan başarısız
  kılıyordu. Docker imajı derlenirken ve Vercel'in `postinstall` adımında patlıyordu

### Eklendi — adım 1
- `GET /api/health` — uygulama sağlık ucu; ortam, sürüm, commit ve zaman damgası döner.
  Yayın sonrası duman testinin ilk adımı bu (`CLAUDE.md §5.8`)
- `src/lib/errors.ts` — tiplenmiş hata sınıfları. Her hatanın makine için `code`'u ve
  kullanıcı için Türkçe mesajı var; beklenmeyen hatalar iç detay sızdırmadan
  `InternalError`'a düşer
- `src/lib/http.ts` — tek tip yanıt zarfı (`{ data }` / `{ error }`), tüm route
  handler'lar yanıtı buradan üretir
- `.github/workflows/ci.yml` — `format:check` → `lint` → `typecheck` → `test` → `build`
  + bağımlılık denetimi. Build ortam doğrulamasını gerçekten çalıştırır
- `.github/workflows/e2e.yml` — Playwright (masaüstü + 375px), tarayıcı önbellekli
- `.github/pull_request_template.md` — Definition of Done kontrol listesiyle

### Değişti — adım 1
- `src/config/env.ts` — preview ortamında `NEXT_PUBLIC_APP_URL` artık Vercel'in
  `NEXT_PUBLIC_VERCEL_URL` değişkeninden türetiliyor. Preview adresi her dalda
  değiştiği için sabit bir değer doğru olamıyordu
- `src/config/constants.ts` — `APP_VERSION` ve `BUILD_COMMIT` eklendi

### Düzeltildi — adım 1
- Sağlık ucu `Cache-Control` başlığı göndermiyordu. `export const dynamic =
  "force-dynamic"` yalnızca Next'in render davranışını değiştiriyor, yanıt başlığı
  eklemiyor — araya giren bir CDN "sağlıklı" cevabını dondurabilirdi. Artık
  `no-store` gönderiliyor ve bu üç seviyede test ediliyor (unit, entegrasyon, E2E)

### Eklendi — adım 0
- Roadmap adım 0 — proje iskeleti: Next.js 16 (App Router), TypeScript 6 (strict),
  Tailwind CSS 4, shadcn/ui (Radix tabanlı), ESLint + Prettier
- `src/config/env.ts` — ortam değişkenlerinin tek okuma noktası, Zod 4 ile doğrulanır;
  eksik değişkende uygulama açılışta Türkçe hata verip durur
- `src/components/layout/EnvBanner.tsx` — local ve preview ortamlarında ekranın
  üstünde `LOCAL` / `PREVIEW` şeridi (13-environments.md)
- `src/app/robots.ts` ve `src/app/sitemap.ts` — production dışındaki ortamlar
  arama motorlarına kapalı (`noindex`)
- `next.config.ts` — baseline güvenlik başlıkları (CSP, HSTS, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Test altyapısı: Vitest 4 + Testing Library (16 unit testi) ve
  Playwright (12 E2E testi — masaüstü + 375px mobil)
- `.env.example`, `.nvmrc`, `README.md`

### Değişti
- `docs/standards/00-stack.md` — sürüm sütunu eklendi ve fiilen kurulu sürümlerle
  eşitlendi (Next 15→16, PostgreSQL 16→18); sürüm tavanlarının gerekçesi yazıldı
- `REPO-YAPISI.md` — `tailwind.config.ts` çıkarıldı (Tailwind v4 bu dosyayı
  üretmiyor), `postcss.config.mjs` ve `components.json` eklendi
- `docs/project/roadmap.md` — teknik borç tablosuna 6 yeni satır (7–12)

### Güvenlik
- `sharp` 0.34.5 → **0.35.3** ve `postcss` 8.4.31 → **8.5.25** `overrides` ile
  yükseltildi; üretim bağımlılıklarında bilinen açık kalmadı (`npm audit --omit=dev`: 0)
