# Sonraki oturum için hazır prompt — adım 17b

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 17b bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **17b**'ye geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/roadmap.md` — adım 17b satırı ve teknik borç listesi
- `docs/project/PRD.md` §5.11 + `docs/project/decisions/ADR-017-*.md`
  — hesap yönetiminin ve kimlik çözme akışının tam konusu
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 17 bitti** (15, 15b, 15c-1, 15c-2, 16, 17 dahil).

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt, giriş, çıkış, oturum, şifre sıfırlama, Google ile giriş** çalışıyor
- **Hastane randevusu** · **Ortak sepet + ödeme** · **Market** · **Restoran**
  · **Sipariş takibi + bildirim** · **Etkinlik + koltuk** · **Spor salonu**
  · **Destek talebi** · **Bilgi panosu** · **Profil merkezi** · **Hakkımızda**
  · **Profilden Google bağlantısı** · **Kimlik doğrulama** · **Planlı görevler**
  · **Yasal sayfalar + çerez rızası** çalışıyor
- **Planlı görevler (adım 16) 2026-08-10'da canlıya çıktı** (`fe7cf16`).
  `/api/cron/daily` yetkisiz isteğe 401 dönüyor (canlıda doğrulandı)
- **Hizmet ızgarasında KAPALI HİZMET KALMADI**
- Preview ve production veritabanları dolu; gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında:** dal adresini
  (`benim-belediyem-git-<dal>-barisss.vercel.app`) Cloudflare Turnstile
  hostname listesine ekle (giriş gerektiren ekran varsa **ZORUNLU**).
  Teknik borç #31. **Liste hâlâ 10 sınırında.**
  ⛔ **ADIM 15c-2, 16 VE 17'DE PANELE HİÇ GİRİLMEDİ** — proje sahibi preview'ı
  atlayıp doğrudan production'a çıkıyor. **Adım 17b GİRİŞ GEREKTİREN ekranlar
  yazacak**, yani preview'da denenecekse Turnstile satırı gerekir

## 🔧 PANEL İŞİ — ZORUNLU, İKİ DEĞİŞKEN

**Vercel → benim-belediyem → Settings → Environment Variables → Production:**

| Değişken | Ne yazılacak |
|---|---|
| `LEGAL_CONTROLLER_NAME` | Siteyi işleten **gerçek kişinin adı soyadı** |
| `LEGAL_CONTACT_EMAIL` | KVKK başvurularının ulaşacağı **gerçek e-posta** |

**Neden zorunlu:** KVKK aydınlatma metni canlıda yayımlandı ve başvuruların
ulaşabileceği gerçek bir kanal göstermek zorunda. Değişkenler **boşken sayfa
yine açılıyor** ama veri sorumlusu yerine "bu gösterim uygulamasını işleten
gerçek kişi" yazıyor ve başvuru kanalı olarak yalnızca GitHub deposu görünüyor.

⛔ **Bu değerler koda YAZILMADI ve yazılmayacak** — depo herkese açık. Ajan
panele giremiyor, bu iş sende. Girdikten sonra **yeniden dağıtım gerekiyor**
(`npx vercel redeploy <dagitim-url> --scope barisss`) ve `/gizlilik` sayfasının
altında adının göründüğünü doğrula.

## 📱 TOPLU ELLE TEST — OTURUMUN BAŞINDA GÜNDEME GETİR

> Proje sahibi bunu **2026-08-10'da DÖRDÜNCÜ kez erteledi** ("sonra — listeyi
> koru"). Liste eksilmedi, adım 17'nin maddesi eklendi.
> Kod yazmadan önce hatırlat ve **"şimdi mi yapalım, sonra mı?"** diye sor —
> cevabı "sonra" ise bu bölümü olduğu gibi bırak, adım işine geç.
>
> Kapsanan teknik borçlar: **#50 · #62 · #73 · #83** + adım 15c-1 giriş
> yöntemleri + adım 15c-2 kimlik doğrulama + adım 16 cron + adım 17 yasal.
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

### B4) ADIM 16 — PLANLI GÖREV (borç #83) — **BİLGİSAYARDAN**

> ⚠️ **BU MADDE TELEFONDAN DEĞİL.** Ekranı yok; kanıt Vercel panelinde.
> ✅ **Deploy 2026-08-10 18:22'de yapıldı**, yani ilk cron koşusu
> **2026-08-11 gecesi** (TR 03:00–04:00). O tarihten sonra bakılabilir.

1. Vercel → proje → **Settings → Cron Jobs** → `/api/cron/daily` satırı
   görünüyor mu, zamanlaması `0 0 * * *` mi
2. Aynı satırda **View Logs** → gece bir çağrı düşmüş mü, yanıt **200** mü
   (401 görürsen `CRON_SECRET` production'da yok demektir — ama girildi,
   `altyapi-durumu.md` ortam değişkeni matrisine bak)
3. Yanıt gövdesinde `"failedCount": 0` ve **dokuz görev** var mı
4. **Hastane**'ye gir → gün şeridinde **14 gün** görünüyor mu. ⛔ Adım 16'dan
   önce production'da saatler 2026-08-15'te bitiyordu (borç #38); cron ilk kez
   çalıştıktan sonra takvim her gün 14 güne tamamlanıyor olmalı

### B5) ADIM 17 — YASAL SAYFALAR VE ÇEREZ BANDI (YENİ)

1. Siteyi **temiz bir tarayıcıda** (veya gizli sekmede) aç → altta
   **"Bu sitede yalnızca zorunlu çerezler var"** bandı çıkıyor mu
2. Bantta **yalnızca TEK düğme** ("Anladım") ve bir "Ayrıntılar" bağlantısı
   olmalı — ⛔ "Reddet" düğmesi ÇIKMAMALI (zorunlu olmayan çerez yok)
3. **"Anladım"**a bas → bant kayboluyor ve **aynı sayfada mı kalıyorsun**
   (ana sayfaya atmamalı) → sayfayı yenile, bant geri gelmemeli
4. Alt bilgide **dört yasal bağlantı** görünüyor mu (KVKK · Çerez · Kullanım
   Şartları · İletişim) → dördünü de aç, hepsinde **yürürlük tarihi** ve
   "bu gerçek bir belediye değildir" uyarısı var mı
5. `/gizlilik` → en altta **veri sorumlusu** kutusu. ⚠️ Panel işini yaptıysan
   **adın ve e-postan** görünmeli; yapmadıysan "işleten gerçek kişi" yazar
6. `/cerez-politikasi` → tablo **8 satır** listeliyor mu · "Ölçüm ve istatistik"
   ile "Pazarlama" grupları **boş** diyor mu · **"Tercihimi geri al"**a bas →
   durum değişiyor ve bant yeniden çıkıyor mu
7. Telefonda: çerez tablosu **kendi içinde yana kayıyor** mu, **sayfa yana
   kaymıyor** mu
8. Kayıt akışının **son adımında** (doğrulama kodları ekranı) "Kaydınızı
   tamamladığınızda Kullanım Şartları'nı ve KVKK Aydınlatma Metni'ni …"
   cümlesi ve iki bağlantı görünüyor mu

### C) HER İKİ EKRAN İÇİN ORTAK

1. Tema düğmesiyle **açık/koyu** geçiş → iki temada da metinler okunuyor mu
2. Düğmelere parmakla rahat basılıyor mu (hedefler 44px olmalı)

### D) ⏱️ SAYAÇLARA GERİ DÖN

1. **Restoran siparişinden 10 dakika sonra** (borç #50): `/siparislerim` →
   sipariş **`Hazırlanıyor`** olmalı ve **iptal düğmesi kaybolmalı**.
   25. dakikada tekrar bak: **`Yolda`** olmalı
2. **Talepten 30 dakika sonra** (borç #62): `/destek` → talep **`İnceleniyor`**
   olmalı (`Çözüldü` eşiği 180 dakika, beklemeye gerek yok)

> **Neden bekleme gerekiyor (D bölümü):** durumlar veritabanında bir kolonda
> tutulmuyor, **okuma anında zamandan türetiliyor** (ADR-013).

## ADIM 17'DEN DEVREDEN NOTLAR — ÖNCE BUNLARI OKU

- **`src/features/legal/` YENİ BİR KATMAN**: `cookie-registry.ts` tarayıcıda
  saklanan HER ŞEYİN tek kaynağı, `legal-pages.ts` yasal sayfa kataloğu,
  `services/consent.service.ts` rıza mantığı, `services/cookie-notice-cookie.ts`
  HTTP tarafı, `components/` ekranlar
- ⛔ **TARAYICIDA YENİ BİR ŞEY SAKLAYAN HER DEĞİŞİKLİK `cookie-registry.ts`'e
  BİR SATIR EKLER.** Eklenmezse çerez politikası eksik kalır — bu yalnızca bir
  belge hatası değil, KVKK aydınlatma yükümlülüğünün ihlali
- ⛔ **`analytics` VEYA `marketing` SINIFINDA BİR SATIR EKLERSEN İKİ TEST
  KIRMIZIYA DÖNER** (`tests/unit/cookie-registry.test.ts` +
  `tests/e2e/yasal-sayfalar.spec.ts`). Bu bir arıza değil, KAPI: onay arayüzü
  yazılmadan analitik eklenmesin diye kuruldu. **Testi gevşetme, arayüzü yaz**
- **YASAL METİNLER `src/config/messages-legal.ts` İÇİNDE** ve `messages.legal`
  olarak dışa açılıyor. Metin değişirse **`EFFECTIVE_DATE` de değişir**;
  çerez listesini ilgilendiren bir değişiklikte ayrıca
  **`COOKIE_NOTICE_VERSION` artırılır** (yoksa eski onay yeni metni kapsar)
- **RIZA TABLOSU EKLEMELİ (append-only)**: geri alma eski satırı GÜNCELLEMİYOR,
  üzerine `isGranted = false` yazıyor. Testle ölçüldü
- **ZİYARETÇİ RIZASI GİRİŞTE AYNI SATIR ÜZERİNDEN HESABA BAĞLANIYOR** —
  yeni satır yazılsaydı rızanın tarihi giriş anına kayardı
- ⛔ **`consent_records.user_id` YABANCI ANAHTARI `Restrict`**: test temizliği
  kullanıcıdan ÖNCE rıza satırlarını silmek zorunda. `tests/db/helpers.ts`
  içinde İKİ ayrı yerde (`cleanupTestData` ve `cleanupRegistration`) —
  **ikincisi unutuldu ve E2E kayıt testleri `23001` ile patladı, YAŞANDI**
- **BANT SIFIR JAVASCRIPT**: sunucu bileşeni + düz form POST + 303. Yeni bir
  etkileşim eklerken istemci bileşenine çevirme — bant her sayfada çiziliyor
- ⛔ **DÜZ FORM KABUL EDEN UÇTA `Origin` KAPISI ŞART** (CSRF). `/api/consents`
  bunu yapıyor; yeni bir form ucu yazılırsa aynısı gerekir
- ⚠️ **BANT TÜM SAYFALARI DİNAMİK YAPTI** (borç #84): `cookies()` okuduğu için
  `npm run build` çıktısında artık statik sayfa yok. Bedel ÖLÇÜLMEDİ
- **VERİ SORUMLUSU BİLGİSİ ORTAMDAN GELİYOR**, koda yazılmıyor
- ⚠️ **HASTANE RANDEVUSUNDAKİ BRANŞ ÖZEL NİTELİKLİ VERİ SAYILABİLİR**
  (borç #86) — aydınlatma metninde açıkça yazıldı, gizlenmedi

### ADR-017'den devreden — KİMLİK KANITI KARARI

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

## YAPILACAK — roadmap adım 17b

"Hesap yönetimi: verimi indir (JSON) + hesabımı sil (anonimleştirme) — PRD §5.11
· + kimlik bağlantısını çözme akışı (ADR-017)"

Dal: `feature/hesap-yonetimi` (öneri)

### Bu adımda özellikle dikkat

- **PRD §5.11 KABUL KRİTERİ NET**: "silinen hesabın kimlik numarasıyla yeniden
  kayıt olunabilir; eski siparişler kişiye bağlanamaz". Testin ölçmesi gereken
  cümle bu
- **SİLME = ANONİMLEŞTİRME, YOK ETME DEĞİL**: mali kayıtlar (sipariş, ödeme,
  üyelik tahsilatı) tutar ve tarih olarak 10 yıl korunuyor
  (`data-model.md` → Saklama süreleri). `users` satırı SİLİNMİYOR,
  kişisel alanları temizleniyor — `deletedAt` kolonu ZATEN VAR
- ⛔ **`consent_records` ve `audit_logs` SİLİNMEZ** (10 yıl, append-only) —
  ikisi de `user_id` üzerinden `Restrict`. Yani "hesabı sil" gerçekten
  `user.delete()` yapamaz, yapmaya çalışırsa yabancı anahtara takılır
- **VERİ İNDİRME KAPSAMI PRD'DE YAZILI**: profil, adresler, siparişler,
  randevular, rezervasyonlar, üyelikler, destek talepleri, **rıza kayıtları**
- ⛔ **İNDİRİLEN JSON'A ŞİFRE ÖZETİ, OTURUM JETONU VEYA ŞİFRELİ KİMLİK
  NUMARASI KOYMA.** Kimlik numarası **maskeli** hâliyle verilir
- **KİMLİK BAĞLANTISINI ÇÖZME (ADR-017)**: bugün bir T.C. numarası yalnızca bir
  hesaba bağlanabiliyor ve çözecek akış YOK — yani gerçek kişi kendi kimliğini
  bir daha doğrulatamıyor. Bu adım o kapıyı açıyor
- **Telefon güncelleme akışı da bu adıma ait** (borç #80)

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/features/legal/`** — rıza kaydı, çerez kataloğu, yasal sayfa deseni
- **`src/features/scheduled-tasks/`** — günlük iş eklemenin deseni
- **`src/lib/anonymous-id.ts`** — ziyaretçi kimliği
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
  (tek istisna `messages-legal.ts`, gerekçesi dosyanın başında)
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
- ⚠️ **E2E'Yİ 15 DAKİKA İÇİNDE ÜST ÜSTE KOŞTURMA** (hız sınırı). **2026-08-10'da
  YİNE YAŞANDI**: art arda üç koşuda önce `hospital`, sonra `google-login`
  testleri düştü — kodda hata yoktu, sayaçlar doluydu. Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra **tek sefer** koş
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
  sonra `orgUnit` (`users.staff_member_id` Restrict).
  ⚠️ **YENİ (adım 17):** `consentRecord` KULLANICIDAN ÖNCE silinmeli
- ⚠️ **TÜM TABLOYA YAZAN BİR GÖREVİ TEST EDERKEN YAN ETKİYİ GERİ AL**

**Vitest**
- ⚠️ **`vi.resetModules()` + dinamik `import` KULLANIRKEN `instanceof` ÇALIŞMAZ**
  — hata sınıfı her yüklemede yeniden oluşuyor. **Çözüm: hata KODUNA bak**

**Playwright seçicileri**
- **`getByRole("button", { name: "Ara" })` ÇOK EŞLEŞİR** → `exact: true` şart
- ⚠️ **`getByText(BAŞLIK)` AÇIKLAMA METNİYLE DE EŞLEŞİYOR** → `{ exact: true }`
- ⚠️ **`exact: true` BİLE YETMEYEBİLİR — GÖRÜNMEZ ÖĞELER DE EŞLEŞİYOR.**
  **Çözüm: aramayı BÖLGEYE sınırla** (`page.getByRole("region", { name: ... })`)
- ⚠️ **ÇIPLAK `getByRole("listitem")` SAYFA İSKELETİNİ DE SAYAR**
- ⚠️ **ÇIPLAK METİN DÜĞÜMÜ `getByText(..., { exact: true })` İLE BULUNAMAZ**
- ⚠️ **AYNI METNİ İKİ BAŞLIKTA VEYA İKİ ERİŞİLEBİLİR ADDA KULLANMA**
- **Kapalı `<details>` içindeki öğe GÖRÜNMEZ sayılır**
- ⚠️ **YENİ (adım 17): yasal belgeler BİRBİRİNE de bağlantı veriyor.** Alt bilgi
  bağlantısını ararken `page.getByRole("navigation", { name: ... })` ile
  sınırla, yoksa iki eşleşme çıkar

**Next.js**
- ⚠️ **`router.refresh()`'i BAŞARI PANELİNİ ÇİZDİĞİN ANDA ÇAĞIRMA**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR** — route handler
  veya server action gerekir
- ⚠️ **KÖK YERLEŞİMDE `cookies()` OKUMAK TÜM SAYFALARI DİNAMİK YAPAR**
  (adım 17'de yaşandı, borç #84)
- **Sunucuda çizilen sayfa istemci bir şey yazdıktan sonra tazelenmez** —
  `router.refresh()` çağır
- **Formu sıfırlamak için alanları tek tek temizleme**, bileşene `key` ver
- **Zamana bağlı metin hidrasyon uyuşmazlığı üretir** → `suppressHydrationWarning`
- **`FormData` gövdesinde `content-type` başlığını ELLE YAZMA**
- **Kendi kimlik üretme, `useId()` kullan**
- ⚠️ **SUNUCU BİLEŞENİ SAYFANIN ADRESİNİ OKUYAMAZ.** Kök yerleşimdeki bir form
  dönüş adresini alana yazamaz; çözüm `Referer` başlığı (ama MUTLAKA aynı alan
  adı kontrolünden ve `sanitizeRedirectPath`'ten geçir)

**Test veritabanı temizliği**
- **`tests/db/helpers.ts` temizliği KİMLİK ÖNEKİNE GÜVENEMEZ.** Kaydı UYGULAMA
  üretiyorsa kimliği `cuid()` olur — `userId`/`anonymousId` üzerinden yakala

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
- ⚠️ **Türkiye'nin UTC farkı `slot-calendar.ts` içinde SABİT +3**

**Eşzamanlılık**
- **"Önce oku, boşsa yaz" İKİ ADIMDIR ve yarışı çözmez.** Tek koşullu yazma
  kullan ve **etkilenen satır sayısına bak**
- ⚠️ **TRANSACTION İÇİNDE `create` KULLANMA, `createMany({skipDuplicates})` KULLAN**
- **Korumayı yazdıktan sonra geçici kaldırıp testin KIRMIZIYA döndüğünü GÖR**

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), `next-themes` BİLEREK kullanılmıyor
- **shadcn'de Dialog bileşeni YOK ve bilerek eklenmedi** — yıkıcı işlem onayı
  SATIR İÇİ yapılıyor
- **Olmayan renk token'ı uydurma.** `warning` YOK, **`success` de YOK**
- Tailwind v4 kanonik biçimi `aspect-4/3` ve `wrap-break-word`
- Dokunma hedefleri en az 44px (`min-h-11`) · **Gövde metni en az 16px**
- ⚠️ **macOS'ta tarayıcı penceresi 375px'e İNMİYOR** (alt sınır ~485px).
  Mobil ölçümü **Playwright `mobile-375` projesiyle** yap
- **Geniş tablo `overflow-x-auto` sarmalayıcıya girer** ve sarmalayıcıya
  `tabIndex={0}` verilir; yoksa 375px'te SAYFANIN TAMAMI yana kayar

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
- **`prisma migrate reset --force` bayrağı yutuluyor.** Local'i sıfırlamak için
  `docker compose down -v` + `npm run db:up`

**Yayın**
- **Neon uykudayken deploy PATLIYOR** (`P1001`) — **production'da da PREVIEW'da
  da**. Çözüm `npx vercel redeploy <dagitim-url> --scope barisss`.
  **`vercel redeploy`'a panel adresini DEĞİL dağıtım adresini (`*.vercel.app`)
  ver.** Merge sonrası `/api/health` içindeki `commit` alanının değiştiğini
  **mutlaka doğrula**
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR**
- ⚠️ **Ücretsiz planda cron GÜNDE 1 ve saati garanti DEĞİL**

**Git**
- **YENİ DALI HER ZAMAN `main`'DEN AÇ:**
  `git checkout main && git pull && git checkout -b <yeni-dal>`

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → uzak sorgu için `npx tsx --env-file=.env` + Prisma
  betiği. ⚠️ **Betik PROJE KÖKÜNDE ve `.mts` uzantılı olmalı** ve
  **commit edilmeden SİLİNMELİ**; ⚠️ **boş `-e ""` çağrısı ASILI KALIYOR**
  (2026-08-10'da yine yaşandı — dosya yaz, `-e` kullanma)
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
