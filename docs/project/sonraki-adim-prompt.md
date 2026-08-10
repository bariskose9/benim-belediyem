# Sonraki oturum için hazır prompt — adım 17

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 17 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **17**'ye geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/roadmap.md` — adım 17 satırı ve teknik borç listesi
- `docs/project/PRD.md` §5.11 ve `docs/standards/14-privacy-and-compliance.md`
  — yasal sayfaların ve rıza kaydının tam konusu
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 16 bitti** (15, 15b, 15c-1, 15c-2 dahil).

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt, giriş, çıkış, oturum, şifre sıfırlama, Google ile giriş** çalışıyor
- **Görsel iskelet** çalışıyor (marka paleti, tema düğmesi, mobil menü)
- **Hastane randevusu** · **Ortak sepet + ödeme** · **Market** · **Restoran**
  · **Sipariş takibi + bildirim** · **Etkinlik + koltuk** · **Spor salonu**
  · **Destek talebi** · **Bilgi panosu** · **Profil merkezi** · **Hakkımızda**
  · **Profilden Google bağlantısı** · **Kimlik doğrulama** çalışıyor ve canlıda
- **Planlı görevler** (adım 16) canlıda: `GET /api/cron/daily`, her gece
  TR 03:00 civarı, dokuz görev. Teknik borç **#18 · #38 · #53 · #55 · #63
  ÖDENDİ**
- **Hizmet ızgarasında KAPALI HİZMET KALMADI**
- Preview ve production veritabanları dolu; gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında:** dal adresini
  (`benim-belediyem-git-<dal>-barisss.vercel.app`) Cloudflare Turnstile
  hostname listesine ekle (giriş gerektiren ekran varsa **ZORUNLU**) ve
  Google OAuth akışına dokunuyorsan Google redirect URI listesine de.
  Teknik borç #31. **Liste hâlâ 10 sınırında.**
  ⛔ **ADIM 15c-2 VE 16'DA PANELE HİÇ GİRİLMEDİ** — proje sahibi preview'ı
  atlayıp doğrudan production'a çıkıyor. Adım 17 **yasal sayfalar**, yani
  ziyaretçiye açık ekranlar: giriş gerekmiyorsa Turnstile satırı da gerekmiyor

## 📱 TOPLU ELLE TEST — OTURUMUN BAŞINDA GÜNDEME GETİR

> Proje sahibi bunu **2026-08-10'da ÜÇÜNCÜ kez erteledi** ("benlik olan her
> şeyi sonraki adıma aktar"). Liste eksilmedi, adım 16'nın maddesi eklendi.
> Kod yazmadan önce hatırlat ve **"şimdi mi yapalım, sonra mı?"** diye sor —
> cevabı "sonra" ise bu bölümü olduğu gibi bırak, adım işine geç.
>
> Kapsanan teknik borçlar: **#50 · #62 · #73 · #83** + adım 15c-1 giriş
> yöntemleri + adım 15c-2 kimlik doğrulama + adım 16 cron.
> Tamamlananları bu listeden ve roadmap'ten SİL, yarım kalanı bırak.

**Nerede:** https://benim-belediyem.vercel.app (production) · **telefondan**
**Hesap:** `docs/project/test-hesaplari.md` → "Örnek üye hesapları", şifre
`Test1234!`. **Personel olan bir hesap seç** (tabloda "✔ evet") — hastane ve
spor salonu ekranları yalnızca personele açık.
⛔ **#11-#16 arası hesaplar production'da YOK** (tohum 2026-08-01), onları seçme.

### ⏱️ ADIM 0 — ÖNCE SAYAÇLARI BAŞLAT (sonra beklemeyesin)

1. **Sipariş oluştur** (borç #50): **RESTORAN'dan** sipariş ver — restoran
   eşiği **10 dakika**, markette **20 dakika**. Adisyona bir yemek ekle →
   Sepet → Öde → adres seç/ekle → sahte kart **`4111 1111 1111 1111`**
   (`…0002` ve `…9995` bilerek BAŞARISIZ döner), son kullanma ileri bir tarih,
   CVV üç hane → ödemeyi tamamla. **Saati not et.** Sipariş `Alındı` olmalı ve
   **iptal düğmesi görünmeli**
2. **Destek talebi oluştur** (borç #62): Destek → yeni talep → konu + açıklama
   → gönder. **Saati not et.** Talep `Açık` durumunda olmalı

### A) ADIM 15 — PROFİL EKRANLARI (borç #73)

1. **Hesabım** → "Kayıtlarım" ve "Hesap ayarları" bölümleri görünüyor mu
2. **Teslimat adreslerim** → yeni adres ekle → **Düzenle** ile başlığını değiştir
3. Aynı adreste **Sil** → onay kutusu çıkıyor mu → "Evet, sil" → liste güncelleniyor mu
4. **Kayıtlı kartlarım** → adım 0'da kullandığın kart burada mı ve
   **tam numara hiçbir yerde görünmüyor mu** (yalnızca son 4 hane)
5. Kartı kaldırmayı dene → onay metni çıkıyor mu

### B) ADIM 15b — HAKKIMIZDA (borç #73)

1. `/hakkimizda` → şemadaki oklara dokun, birimler açılıp kapanıyor mu
2. **"Bilgi İşlem Dairesi Başkanlığı personelini listele"** → 100 kişi geliyor mu
3. **"İtfaiye Dairesi Başkanlığı"** → "henüz yayınlanmadı" mesajı çıkıyor mu
4. Arama kutusuna bir personel adını **BÜYÜK HARFLE** yaz → yine buluyor mu
5. Şema satırları taşıyor mu — sayfa **yana kayıyor mu** (kaymamalı)

### B2) ADIM 15c-1 — GİRİŞ YÖNTEMLERİ

1. **Hesabım** → "Giriş yöntemleri" kartı görünüyor mu (Şifre: Tanımlı,
   Google: Bağlı değil)
2. "Google'a git" düğmesine **şifreni girmeden** bas → şifre alanı zorunlu mu
3. **Yanlış şifreyle** dene → "Şifreniz doğrulanamadı" diyor mu
4. Doğru şifreyle dene → Google'a gidiyor mu (⚠️ Google "Testing" modunda,
   yalnızca test kullanıcısı listesindeki e-postayla girilebilir)
5. Bağladıysan: kartta "Bağlı" + tarih → **Bağlantıyı kaldır** → onay kutusu
   → kaldırınca "Bağlı değil"e dönüyor mu

### B3) ADIM 15c-2 — KİMLİK DOĞRULAMA

> ✅ **PRODUCTION'DA ÇALIŞIYOR, panel işi GEREKMİYOR.**
> ⚠️ Bu test **Google ile açılmış, kimliği doğrulanmamış** bir hesap istiyor.
> Şifreyle giriş yapılan tohum hesaplarının kimliği ZATEN doğrulanmış — onlarda
> ekran "kimliğiniz doğrulanmış" der ve form hiç çıkmaz (bu da geçerli bir test).

1. **Google ile giriş yap** → `/hesabim` → "Kimliğiniz henüz doğrulanmadı"
   kartı görünüyor mu, "Kimlik durumu: Doğrulanmamış" yazıyor mu
2. **Hastane**'ye git → "Kimlik doğrulaması gerekiyor" + **"Kimlik
   doğrulamasına git"** bağlantısı çıkıyor mu (⛔ bu bağlantı KAYIT ekranına
   GİTMEMELİ)
3. Bağlantıya bas → bot kutusu **çiziliyor mu** (production'da çizilmeli)
4. **Yanlış doğum yılıyla** dene → "Girdiğiniz bilgiler doğrulanamadı" tek tip
   mesajı çıkıyor mu
5. **Kendi T.C. kimlik numaran ÇALIŞMAZ** — sahte KPS'te yoksun.
   `docs/project/test-hesaplari.md` içindeki **sahte vatandaş** numaralarından
   HİÇBİR HESABA BAĞLI OLMAYAN birini kullan
6. Doğru bilgilerle doğrula → "Kimliğiniz doğrulandı" + **gerçek ad soyad**
   görünüyor mu → **"Devam et"** seni hastaneye geri götürüyor mu ve oradaki
   mesaj **"yalnızca kurum personeline açıktır"** olarak DEĞİŞİYOR mu
7. `/hesabim` → kimlik durumu "Nüfus kayıtlarıyla doğrulandı", ad soyad
   değişmiş, kimlik numarası **maskeli** (`912******32`) mi
8. `/kimlik-dogrulama` adresini tekrar aç → form YOK, "Kimliğiniz doğrulanmış"
   yazıyor mu

### B4) ADIM 16 — PLANLI GÖREV (borç #83) — **DEPLOY'DAN SONRAKİ GÜN**

> ⚠️ **BU MADDE TELEFONDAN DEĞİL, BİLGİSAYARDAN.** Ekranı yok; kanıt
> Vercel panelinde ve veritabanında.
> ⏳ **Deploy gecesinden ÖNCE bakmanın anlamı yok** — cron günde bir kez,
> TR saatiyle 03:00–04:00 arasında çalışıyor.

1. Vercel → proje → **Settings → Cron Jobs** → `/api/cron/daily` satırı
   görünüyor mu, zamanlaması `0 0 * * *` mi
2. Aynı satırda **View Logs** → gece bir çağrı düşmüş mü, yanıt **200** mü
   (401 görürsen `CRON_SECRET` production'da yok demektir — ama girildi,
   `altyapi-durumu.md` ortam değişkeni matrisine bak)
3. Yanıt gövdesinde `"failedCount": 0` ve **dokuz görev** var mı
4. **Hastane**'ye gir → gün şeridinde **14 gün** görünüyor mu. ⛔ Adım 16'dan
   önce production'da saatler 2026-08-15'te bitiyordu (borç #38); cron ilk kez
   çalıştıktan sonra takvim her gün 14 güne tamamlanıyor olmalı

### C) HER İKİ EKRAN İÇİN ORTAK

1. Tema düğmesiyle **açık/koyu** geçiş → iki temada da metinler okunuyor mu
2. Düğmelere parmakla rahat basılıyor mu (hedefler 44px olmalı)

### D) ⏱️ SAYAÇLARA GERİ DÖN

1. **Restoran siparişinden 10 dakika sonra** (borç #50): `/siparislerim` →
   sipariş **`Hazırlanıyor`** olmalı ve **iptal düğmesi kaybolmalı**.
   25. dakikada tekrar bak: **`Yolda`** olmalı
2. **Talepten 30 dakika sonra** (borç #62): `/destek` → talep **`İnceleniyor`**
   olmalı (`Çözüldü` eşiği 180 dakika, beklemeye gerek yok)

### E) 🔧 PANEL İŞİ — ŞU AN ZORUNLU DEĞİL

**Bu turda panele girmen gerekmiyor** (B4'teki "bak" maddesi hariç — o okuma,
yapılandırma değil).

⏳ **TETİK — ne zaman gerekecek:** giriş gerektiren bir ekranı **preview'da**
denemek istediğin ilk seferde. Liste 10 sınırında olduğu için o gün boş satır
bulunmayacak. O zaman **Cloudflare Turnstile → Hostname Management**'ta:

- **KALACAK:** `benim-belediyem.vercel.app` (production)
- **SİLİNECEK:** adı `benim-belediyem-git-feature-...` ile başlayan ve dalı
  merge edilmiş HER satır (google-ile-giris · sifre-sifirlama · market ·
  restoran · etkinlik-bilet · spor-salonu-uyeligi · destek-talebi ·
  bilgi-widgetlari · hakkimizda · google-baglantisi)

⚠️ Ajan bu listeyi panelden GÖREMİYOR. Temizlik yapılırsa söylenmeli ki
`altyapi-durumu.md` gerçeğe göre güncellensin.

> **Neden bekleme gerekiyor (D bölümü):** durumlar veritabanında bir kolonda
> tutulmuyor, **okuma anında zamandan türetiliyor** (ADR-013).

## ADIM 16'DAN DEVREDEN NOTLAR — ÖNCE BUNLARI OKU

- **`src/features/scheduled-tasks/` YENİ BİR KATMAN**: `task-registry.ts`
  görev listesi (TEK kaynak), `task-runner.ts` koşturucu, `services/*-tasks.ts`
  görevlerin kendisi. Yeni bir günlük iş = yeni bir `ScheduledTask` + kataloğa
  bir satır. Başka hiçbir yere dokunulmuyor
- ⛔ **GÖREVLER MANTIĞI KOPYALAMIYOR, ÇAĞIRIYOR**: aidat tahsilatı adım 12'nin
  `renewMembershipPeriod()`'unu, hatırlatma ekranın kullandığı
  `syncMembershipNotifications()`'ı çağırıyor. Kural iki yerde yaşamıyor
- **TEMİZLİK "PAYLI" (24 saat, `CLEANUP_GRACE_MS`)**: süresi dolan satır anında
  silinmiyor. Sebep: tüketilmiş bir OTP satırı, kayıt taslağı yaşadığı sürece
  (15 dk) hâlâ okunuyor. Pay kaldırılıp test kırmızıya döndürülerek ölçüldü
- ⚠️ **DIŞ VERİ ÖNBELLEĞİNİN ÖLÇÜTÜ FARKLI**: `expiresAt` değil `fetchedAt`,
  pay da `INFO_WIDGET_MAX_STALE_MS`. Süresi dolmuş kayıt orada ÖLÜ DEĞİL —
  sağlayıcı çökünce 24 saate kadar bayat gösteriliyor (ADR-015)
- ⛔ **KOLTUK TEMİZLİĞİ `status = 'held'` İSTİYOR** — koşul kaldırılınca test
  kırmızıya dönüyor, çünkü kaybolacak şey satılmış bir bilet olurdu
- **`CRON_SECRET` YOKSA UÇ HERKESE KAPALI** (fail-closed) ve karşılaştırma
  **sabit süreli** (`timingSafeEqual`). `===` zamanlama saldırısına açıktı
- **EŞZAMANLI KOŞU İÇİN KİLİT YOK, BİLİNÇLİ**: Vercel iki çözüm öneriyor
  (kilit veya idempotentlik); ikincisi seçildi çünkü takılı kalan bir kilit
  görevi günlerce durdurabilir. İdempotentlik ÖLÇÜLÜYOR
- **DOKTOR SAATLERİ ARTIK TEK YERDE**: `slot-calendar.ts`. **Tohumlama da
  oradan okuyor** — iki yerde yazılsalardı 15. günün saatleri farklı olurdu
- **YENİLEME ANAHTARI DÖNEMDEN TÜRÜYOR** (`renewal:<üyelik>:<dönem>`), rastgele
  DEĞİL: gönderecek istemci yok, anahtar tekrarlanabilir olmak zorunda
- ⚠️ **`payment_pending` ÜYELİKLER YENİDEN DENENMİYOR** (borç #82)
- ⚠️ **TEMİZLİK SAYFALAMA YAPMIYOR** (borç #81) — ölçüm yapılmadan eklenmedi
- ⚠️ **DB TESTİ TAKVİM GÖREVİNİN YAN ETKİSİNİ GERİ ALIYOR**: görev TÜM
  doktorlara yazıyor, yani tohumlanmış doktorların takvimi de büyüyor.
  `undoCalendarSideEffects()` bunu `isSeedData: false` ölçütüyle temizliyor.
  Yeni bir "tüm tabloya yazan" görev eklenirse aynı tuzağa dikkat

### ADR-017'den devreden — KİMLİK KANITI KARARI

- **Bugün kod değişmedi, SINIR çizildi.** T.C. numarası + doğum yılı bilgi
  temelli bir kanıt ve **geçici** işaretlendi
- ⛔ **GERÇEK KİŞİSEL VERİYLE ÇALIŞTIRMA KAPISI KAPALI**: adım 17b (kimlik
  bağlantısını çözme), adım 17c (personel yetkisini kimlikten ayırma) ve
  gerçek sağlayıcı (e-Devlet) bitmeden production'a gerçek vatandaş verisi
  girmez. Cümle `roadmap.md`'de de yazılı
- **Adım 17c YENİ BİR ADIM** ve roadmap'e eklendi — atlanmasın

### Adım 15c-2'den devreden (hâlâ geçerli)

- **`identity-verification.service.ts` SIRAYI ANLATIYOR**: bot kapısı →
  "zaten doğrulanmış mı" → `lookupIdentity` → 18 yaş → "numara başka hesapta mı"
  → `matchStaffMember` → tek koşullu yazma → denetim kaydı
- ⛔ **`isStaff` İSTEMCİDEN GELMEZ** · **P2002'nin ayrıntısı `meta.target`'ta
  DEĞİL**, `meta.driverAdapterError.cause.constraint.fields` içinde
- **`sanitizeRedirectPath` KONTROL KARAKTERİ REDDEDİYOR** — yeni bir yerde
  dönüş adresi kullanılacaksa MUTLAKA bu fonksiyondan geçir
- ⚠️ **TELEFON BOŞ KALIYOR** (borç #80)
- ⛔ **Uzak ortamlarda tohumlama GÜNCEL DEĞİL — ALTI hesap eksik** (#11-#16)

## YAPILACAK — roadmap adım 17

"Yasal sayfalar (KVKK, çerez, kullanım şartları) + çerez rızası (ziyaretçi dahil)"

Dal: `feature/yasal-sayfalar` (öneri)

### Bu adımda özellikle dikkat

- **`consent_records` TABLOSU VE `ConsentType` ENUM'U ZATEN VAR** (adım 3'te
  kuruldu, `consent_change` denetim işlemi de var). Şema muhtemelen
  DEĞİŞMEYECEK — önce bak, sonra karar ver
- **Rıza ZİYARETÇİYİ de kapsıyor**: giriş yapmamış kullanıcının rızası
  `anonymous_id`'ye bağlanmalı (`src/lib/anonymous-id.ts` hazır)
- **`docs/project/integrations.md` DIŞ İŞLEYİCİLERİN LİSTESİ** — KVKK aydınlatma
  metni bu listeden yazılır, ezberden değil. Cloudflare, Resend, Google, Neon,
  Vercel + dört bilgi sağlayıcısı
- **Çerez bandı ölçülebilir bir performans yüküdür** ve her sayfada çiziliyor;
  adım 18'in performans bütçesini şimdiden zorlamasın
- **Zorunlu olmayan çerez YOKSA bant "kabul et/reddet" değil bilgilendirme
  olur** — bugün analitik veya pazarlama çerezi var mı, ÖNCE bunu doğrula

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/features/scheduled-tasks/`** — günlük iş eklemenin deseni
- **`src/lib/anonymous-id.ts`** — ziyaretçi kimliği (çerez rızası buna bağlanır)
- **`src/features/profile/`** — kullanıcıya ait kayıt yönetiminin DESENİ
- **`src/features/auth/`** — oturum, Google OAuth (PKCE + `state` + `nonce`)
- **`src/features/identity/`** — KPS sorgusu, personel eşleştirmesi, ortak şema
- **`src/features/catalog/`** — ORTAK arama katmanı, Türkçe `unaccent` araması
- **`src/lib/external-fetch.ts`** — dış servis çağrısı (zaman aşımı + deneme +
  devre kesici + Zod). **Yeni dış servis buradan geçer**
- **`src/lib/money.ts`** — para TAM SAYI KURUŞ
- **`src/features/events/`** — **YARIŞ KORUMASI DESENİ**
- **`src/features/notifications/`** — bildirim yazma ve **tembel senkronizasyon**
- **`recordAuditLog()`** — kritik işlemler denetim kaydına yazılır
- **`requireAccess()`** uçlar için, **`guardPage()`** sayfalar için
- `messages.ts` — kullanıcıya görünen tüm Türkçe metinler burada, dağıtma
- Tasarım token'ları (`globals.css`) · `page-shell` · `TextField` · `FormAlert`

## TUZAKLAR — daha önce vakit kaybettirenler

**E2E koşarken**
- **`npm run start` ile KENDİ sunucunu açıp sonra `npx playwright test` KOŞMA.**
  **Doğrusu: portu boşalt (`lsof -ti:3000 | xargs kill -9`), sonra tek başına
  `npx playwright test`** — sunucuyu Playwright kendi kurar
- ⚠️ **PLAYWRIGHT KOŞTUKTAN SONRA `npm run start` YANLIŞ YAPIYI SERVİS EDİYOR**:
  Playwright derlemeyi `NEXT_PUBLIC_TURNSTILE_SITE_KEY=""` ile yapıyor ve
  `NEXT_PUBLIC_*` değerleri DERLEME ANINDA gömülüyor. Elle tarayıcı testinden
  önce **`npm run build`'i yeniden koş**
- **Sunucu ayaktayken `.next`'i silme**
- **YÜK 3'ÜN ÜZERİNDEYKEN TAM SET KOŞMA.** `uptime` bak. **Kırmızı görünce ÖNCE
  YÜKE BAK**
- **E2E'yi 15 dakika içinde üst üste koşturma** (hız sınırı). Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra tek sefer koş
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan**
- **`npm run test:db` `docs/project/test-hesaplari.md` dosyasını YENİDEN
  ÜRETEBİLİYOR.** Commit etmeden önce `git status`'a bak
- **HER PLAYWRIGHT PROJESİNE AYRI PAYLAŞILAN KAYNAK VER**
- ⚠️ **E2E KENDİ KULLANICISINI KURABİLİR**: oturum satırını doğrudan yazıp
  çereze ham jetonu koymak yeterli (`sessionToken` = jetonun SHA-256 özeti,
  çerez adı `bb_session`)
- **E2E'nin ürettiği veriyi temizle — ama TOHUM VERİSİNİ ONAR, SİLME**
- **Sipariş temizliğinde SIRA:** `refund → orderItem → order → notification →
  payment → cartItem → cart`. **Üyelikte:** `membershipPayment → membership →
  notification → savedCard`. **Teşkilatta:** önce `user`, sonra `staffMember`,
  sonra `orgUnit` (`users.staff_member_id` Restrict)
- ⚠️ **TÜM TABLOYA YAZAN BİR GÖREVİ TEST EDERKEN YAN ETKİYİ GERİ AL** (adım
  16'da yaşandı): takvim görevi tohumlanmış doktorlara da yazdı ve yerel
  veritabanında takvim 14 gün yerine 36 güne çıktı
- **Kullanılmış test hesapları:** `nurcan.yilmaz3`, `burak.tas2` · `mehmet.duman7`,
  `arda.aydin9` · `ipek.kurt4`, `ferhat.tunc5` · `gamze.toprak8`, `baris.ates10` ·
  `zehra.kilic91`, `esra.arslan92` · `emre.arslan1`, `nazli.mentes6` ·
  `asli.avci93`, `ege.kurt94` · `kemal.guler95`, `sinan.turan96`.
  **BOŞTA HESAP KALMADI**

**Vitest**
- ⚠️ **`vi.resetModules()` + dinamik `import` KULLANIRKEN `instanceof` ÇALIŞMAZ**
  (adım 16'da yaşandı): hata sınıfı her yüklemede yeniden oluşuyor, testin
  üstte içe aktardığı sınıfla aynı nesne olmuyor. **Çözüm: hata KODUNA bak**
  (`error.code === "UNAUTHORIZED"`) — zaten istemcinin gördüğü sözleşme o

**Playwright seçicileri**
- **`getByRole("button", { name: "Ara" })` ÇOK EŞLEŞİR** → `exact: true` şart
- ⚠️ **`getByText(BAŞLIK)` AÇIKLAMA METNİYLE DE EŞLEŞİYOR** → `{ exact: true }`
- ⚠️ **`exact: true` BİLE YETMEYEBİLİR — GÖRÜNMEZ ÖĞELER DE EŞLEŞİYOR.**
  **Çözüm: aramayı BÖLGEYE sınırla** (`page.getByRole("region", { name: ... })`)
- ⚠️ **ÇIPLAK `getByRole("listitem")` SAYFA İSKELETİNİ DE SAYAR**
- ⚠️ **ÇIPLAK METİN DÜĞÜMÜ `getByText(..., { exact: true })` İLE BULUNAMAZ**
- ⚠️ **AYNI METNİ İKİ BAŞLIKTA VEYA İKİ ERİŞİLEBİLİR ADDA KULLANMA**
- **Kapalı `<details>` içindeki öğe GÖRÜNMEZ sayılır**

**Next.js**
- ⚠️ **`router.refresh()`'i BAŞARI PANELİNİ ÇİZDİĞİN ANDA ÇAĞIRMA**: sunucu
  sayfanın DİĞER dalını çiziyor ve gösterdiğin sonuç paneli kayboluyor
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR**
- **Sunucuda çizilen sayfa istemci bir şey yazdıktan sonra tazelenmez** —
  `router.refresh()` çağır
- **Formu sıfırlamak için alanları tek tek temizleme**, bileşene `key` ver
- **Zamana bağlı metin hidrasyon uyuşmazlığı üretir** → `suppressHydrationWarning`
- **`FormData` gövdesinde `content-type` başlığını ELLE YAZMA**
- **Kendi kimlik üretme, `useId()` kullan**

**Test veritabanı temizliği**
- **`tests/db/helpers.ts` temizliği KİMLİK ÖNEKİNE GÜVENEMEZ.** Kaydı UYGULAMA
  üretiyorsa kimliği `cuid()` olur

**Dış servis çağrısı**
- **`429` YENİDEN DENENMEZ** · **Önbelleğe HAM GÖVDE yazma** ·
  **Önbellekten OKURKEN de Zod çalıştır**

**Dosya yükleme**
- **İSTEMCİNİN SÖYLEDİĞİ TÜRE GÜVENME** — tür baytların imzasından doğrulanır
- **`next/image` YETKİLİ bir uçtan görsel çekerken `unoptimized` ŞART**

**Türkçe metin**
- **Prisma'nın `contains` + `mode: "insensitive"` kombinasyonunu KULLANMA.**
  `findIdsMatchingQuery` (`catalog-search.repository.ts`) çağır
- **`LIKE` deseni ŞART olarak `toLikePattern`'den geçer**

**Para**
- **Ondalık sayıyla para hesaplama.** Her yerde tam sayı kuruş
- **Tutar İSTEMCİDEN ALINMAZ** · **DÖVİZ KURU PARA DEĞİLDİR**

**Zaman ve durum**
- **Sipariş, üyelik ve destek talebi durumları KOLONDA DEĞİL** (ADR-013)
- **Takvim ayı ekle, 30 gün EKLEME** (`addCalendarMonths`)
- **Süreye bağlı her sorgu ZAMAN KOŞULU içermek zorunda** (ADR-007)
- ⚠️ **Türkiye'nin UTC farkı `slot-calendar.ts` içinde SABİT +3** — varsayım
  test ediliyor (`formatIstanbulTime` ile geri okunuyor), ezberlenmiyor

**Eşzamanlılık**
- **"Önce oku, boşsa yaz" İKİ ADIMDIR ve yarışı çözmez.** Tek koşullu yazma
  kullan ve **etkilenen satır sayısına bak**
- ⚠️ **TRANSACTION İÇİNDE `create` KULLANMA, `createMany({skipDuplicates})` KULLAN**
- **Korumayı yazdıktan sonra geçici kaldırıp testin KIRMIZIYA döndüğünü GÖR.**
  ⚠️ Testin korumayı GERÇEKTEN ölçtüğünden emin ol

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), `next-themes` BİLEREK kullanılmıyor
- **shadcn'de Dialog bileşeni YOK ve bilerek eklenmedi** — yıkıcı işlem onayı
  SATIR İÇİ yapılıyor
- **Olmayan renk token'ı uydurma.** `warning` YOK, **`success` de YOK**
- Tailwind v4 kanonik biçimi `aspect-4/3` ve `wrap-break-word`
- Dokunma hedefleri en az 44px (`min-h-11`) · **Gövde metni en az 16px**
- ⚠️ **macOS'ta tarayıcı penceresi 375px'e İNMİYOR** (alt sınır ~485px).
  Mobil ölçümü **Playwright `mobile-375` projesiyle** yap

**Bağımlılık**
- **`shadcn add <bileşen>` İSTENMEYEN PAKET GETİREBİLİR** → `git diff package.json`
- **Yeni paket sonrası `npm audit` KOŞ**

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok** (ADR-008)
- ⚠️ **`migrate dev` BU ORTAMDA ETKİLEŞİMLİ ÇALIŞAMIYOR.** İzlenen yol:
  `npx prisma migrate diff --from-config-datasource --to-schema
  prisma/schema.prisma --script` ile SQL üret → migration klasörünü elle
  oluştur → `npx prisma migrate deploy` → `npx prisma generate`
- **ENUM DEĞERİ EKLEMEK GERİYE UYUMLU ama TEK YÖNLÜDÜR**
- **PostgreSQL enum'ları TANIMLANMA SIRASINA göre sıralar**
- **`prisma migrate reset --force` bayrağı yutuluyor.** Local'i sıfırlamak için
  `docker compose down -v` + `npm run db:up`

**Yayın**
- **Neon uykudayken deploy PATLIYOR** (`P1001`) — **production'da da PREVIEW'da
  da**. Çözüm `npx vercel redeploy <dagitim-url> --scope barisss`.
  **`vercel redeploy`'a panel adresini DEĞİL dağıtım adresini (`*.vercel.app`)
  ver.** Merge sonrası `/api/health` içindeki `commit` alanının değiştiğini
  **mutlaka doğrula**
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR**
- ⚠️ **Ücretsiz planda cron GÜNDE 1 ve saati garanti DEĞİL** (belirtilen saatin
  içinde herhangi bir dakika). Daha sık bir ifade **deploy'u başarısız kılıyor**

**Git**
- **YENİ DALI HER ZAMAN `main`'DEN AÇ:**
  `git checkout main && git pull && git checkout -b <yeni-dal>`

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → uzak sorgu için `npx tsx --env-file=.env` + Prisma
  betiği. ⚠️ **Betik PROJE KÖKÜNDE ve `.mts` uzantılı olmalı** ve
  **commit edilmeden SİLİNMELİ**; ⚠️ **boş `-e ""` çağrısı ASILI KALIYOR**
- **Chrome DevTools MCP yalnızca ÇALIŞMA ALANI İÇİNDEKİ dosyayı yükleyebiliyor**
- Docker Desktop kapalı olabilir → `open -a Docker`, sonra `npm run db:up`
- ESLint `console.log`'u ve efekt içinde `setState`'i yasaklıyor
- `.ts`/`.tsx` yazdıktan sonra `npm run format` çalıştır
- Uzun süren işlerde ekranın uyumaması için `caffeinate -dimsu &`; **oturum
  bitince `pkill caffeinate` ile kapat**

## KOMUTLAR

`npm run db:up · db:migrate · db:reset · db:studio`
`npm run test · test:db · lint · typecheck · format · format:check · build`
`gh` PATH'te. `vercel` ve `neonctl` için `npx`.

**Planlı görevi elle tetikleme (local):**
`npm run build && npm run start`, sonra
`curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily`

**E2E'yi elle koşturma sırası:** `rate_limit_counters`'ı boşalt → `uptime` bak
(yük < 2.5) → portu boşalt (`lsof -ti:3000 | xargs kill -9`) → `npx playwright
test`. **Sunucuyu SEN başlatma.**

## BENİMLE İLETİŞİM

Kodu okuyup anlayamıyorum. Her adımı **Türkçe, kod göstermeden, en fazla 5
maddede** anlat. Sadece "ne" değil **"neden"** de söyle. Emin olmadığın yerde
**"emin değilim"** de, uydurma. Bir şeyi bozduğunu fark edersen hemen söyle.
Kod yazmadan önce **plan sun**; PC başında değilsem onay bekleme, yalnızca
commit/merge kapısında dur (CLAUDE.md §3 kapı 2'nin istisnası).
