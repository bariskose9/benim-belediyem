# 14 — Gizlilik, KVKK ve Denetlenebilirlik

Kamu/vatandaş odaklı uygulamalarda bu bölüm isteğe bağlı değildir.
Bu proje sahte veriyle çalışsa bile alışkanlık doğru kurulur.

## Veri minimizasyonu
- Gerekmeyen veri **toplanmaz**. "İleride lazım olur" gerekçesiyle alan eklenmez.
- Her yeni kişisel veri alanı için cevaplanır: neden gerekli, ne kadar saklanacak,
  kim erişebilir, nasıl silinecek.
- Sağlık verisi, din, biyometri gibi özel nitelikli veri **hiç toplanmaz**.
- Kimlik numarası yalnızca kimlik doğrulama zorunluysa toplanır (bkz. sahte KPS akışı);
  şifrelenerek saklanır, maskelenerek gösterilir, log'a yazılmaz ve
  başka hiçbir amaçla kullanılmaz.

## Saklama ve silme
- Her tablo için saklama süresi tanımlıdır (örn. destek eki 1 yıl, sipariş kaydı 10 yıl).
- Kullanıcı hesabını **kendisi** silebilir.
- Kullanıcı kendi verisini dışa aktarabilir (JSON indirme).
- Süresi dolan veriyi temizleyen planlı görev tanımlıdır.

### Hesap silme — KVKK'nın gerçekten istediği davranış

> Bu bölüm bir projede araştırıldı ve her projede geçerlidir. Kaynak:
> *Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi
> Hakkında Yönetmelik* (RG 28.10.2017/30224).

**ÜÇ İŞLEM BİRBİRİNİN YERİNE GEÇMEZ.** Yönetmelik üç ayrı şey tanımlıyor ve
hangisini yaptığını doğru adlandırmak yükümlülüğün parçasıdır:

| İşlem | Madde | Tanım |
|---|---|---|
| **Silme** | m.8 | Veri **ilgili kullanıcılar** için hiçbir şekilde erişilemez ve tekrar kullanılamaz hâle gelir |
| **Yok etme** | m.9 | Veri **hiç kimse** tarafından erişilemez, geri getirilemez ve tekrar kullanılamaz hâle gelir |
| **Anonim hale getirme** | m.10 | Veri, **başka verilerle eşleştirilse bile** kimliği belirli veya belirlenebilir bir gerçek kişiyle ilişkilendirilemez |

⛔ **EN SIK YAPILAN HATA: kişisel alanları boşaltıp satırı bırakmaya
"anonimleştirme" demek.** Satır hâlâ bir kullanıcı kimliği üzerinden
siparişlere, denetim kayıtlarına, IP özetlerine ve teslimat adresine bağlıysa
yeniden ilişkilendirme yolu kapanmamıştır — bu **takma adlaştırmadır**,
anonimleştirme değil. Anonimleştirme **geri döndürülemez** olmak zorundadır.
Doğru ad ne yapıldığını söyler: *"kişisel alanlar silindi, mali kayıtlar
kişiselleştirilmeden saklanıyor."*

**SİLME TALEBİ GELDİĞİNDE:**

- **Kural (m.12/1-a):** işleme şartlarının **tamamı** ortadan kalkmışsa veri
  silinir, yok edilir veya anonim hale getirilir. Talep **en geç 30 gün** içinde
  sonuçlandırılır.
- **İstisna (m.12/1-c):** şartlardan bir kısmı devam ediyorsa talep
  **gerekçesi açıklanarak** reddedilebilir ve ret 30 gün içinde yazılı ya da
  elektronik olarak bildirilir.
- Yani **"her şeyi sil" doğru cevap değildir.** Başka bir kanun saklamayı
  emrediyorsa o kayıt silinmez — ama bu kullanıcıya **açıkça söylenir.**
- Türkiye'de en sık çarpılan iki saklama yükümlülüğü: **TTK m.82** → ticari
  defter, belge ve ticari yazışmalar **10 yıl**; **VUK m.253** → defter ve
  vesikalar **5 yıl**. İkisi çakıştığında uzun olan uygulanır.
- **Self-service silme en iyi yoldur:** 30 günlük süreyi kendiliğinden karşılar,
  kullanıcı e-posta yazıp cevap beklemez.

**BU YÜZDEN "HESABIMI SİL" EKRANI ÜÇ ŞEYİ BİRDEN YAPAR:**

1. **Siler:** ad, e-posta, telefon, kimlik numarası (şifreli/özetli/maskeli üç
   hâli de), doğum tarihi, adresler, kart bilgileri, şifre, tüm oturumlar, dış
   hesap bağlantıları, bildirimler, sepetler.
2. **Saklar ama kişiselleştirmez:** yasal saklama yükümlülüğü olan mali kayıtlar
   (sipariş, ödeme, iade, tahsilat) tutar ve tarih olarak durur; kişi bağı
   okunamaz hâle gelir.
3. **Söyler:** ekranda ve aydınlatma metninde **neyin silindiği** ve **neyin
   hangi kanun gereği ne kadar süre saklandığı** yazılır. m.12/1-c'nin
   "gerekçesi açıklanarak" şartı tam olarak budur — sessizce saklamak ihlaldir.

**SİLİNEMEYEN KAYITLAR VE SEBEBİ:**

- **Rıza kayıtları ve denetim kayıtları silinmez.** İkisi de bir yükümlülüğün
  **kanıtıdır**; silinirse veri sorumlusu "rıza almıştım" ya da "bu işlemi
  kullanıcının kendisi yaptı" diyemez hâle gelir.
- **İmha işleminin kendisi kayda geçer** (m.7/3): yapılan bütün işlemler kayıt
  altına alınır ve kayıtlar **en az üç yıl** saklanır. Yani "hesabımı sil"
  işleminin denetim kaydı silmenin bir parçasıdır — hesapla birlikte silinemez.

**SAKLAMA SÜRESİ BİTİNCE:**

- Süre dolunca veri **gerçekten** yok edilir veya anonim hale getirilir.
  "10 yıl saklıyoruz" deyip 11. yılda hâlâ tutmak yükümlülüğün ihlalidir.
- **Periyodik imha aralığı altı ayı geçemez** (m.11/2). Günlük çalışan bir
  temizlik görevi bunu fazlasıyla karşılar.
- ⚠️ Yeni bir projede "10 yıl sonra ne olacak" sorusunun kodu henüz yoktur ve bu
  **kabul edilebilir** — ama **teknik borç olarak yazılır.** Kendiliğinden
  hatırlanmaz ve hatırlandığında geç olur.

### Verimi indir (taşınabilirlik)

- Kullanıcı kendi verisinin tamamını makine okunur biçimde (JSON) indirebilir.
- ⛔ **DOSYAYA KONMAZ:** şifre özeti, oturum jetonu, ham veya şifreli kimlik
  numarası, bot/CSRF jetonları, başka kullanıcıların verisi. Kimlik numarası
  **maskeli** hâliyle verilir. Bu dosya indirildiği andan itibaren kullanıcının
  cihazında, indirilenler klasöründe ve muhtemelen e-postasında dolaşacaktır —
  içine ne koyduğun senin kontrolünden çıkar.
- Uç **önbelleklenmez** (`Cache-Control: no-store`) ve indirme **denetim kaydına
  düşer** (kim, ne zaman kendi verisini dışa aktardı).

## Aydınlatma ve rıza
- KVKK aydınlatma metni, çerez politikası, kullanım şartları ve iletişim/başvuru
  sayfaları bulunur (`/gizlilik`, `/cerez-politikasi`, `/kullanim-sartlari`,
  `/iletisim`) ve **alt bilgiden** erişilir.
- Zorunlu olmayan çerez/analitik **rıza alınmadan** çalıştırılmaz.
- Rıza kaydı zaman damgasıyla saklanır.

### Yasal sayfaların yazım kuralları

Bu maddeler bir projede öğrenildi ve her projede geçerlidir.

- **ÇEREZ LİSTESİ ELLE YAZILMAZ, TEK KAYNAKTAN ÜRETİLİR.** Tarayıcıda saklanan
  her şey (çerez + `localStorage` + üçüncü taraf) bir katalog dosyasında durur;
  politika sayfasının tablosu, bandın kipi ve aydınlatma metnindeki "otomatik
  yollarla toplananlar" bölümü hep o kataloğu okur. Üç yerde ayrı ayrı yazılan
  bir liste, ilk değişiklikte gerçeğe aykırı düşer — ve yayımlanmış yanlış bir
  aydınlatma metni, hiç olmamasından ağırdır.
- **ZORUNLU OLMAYAN ÇEREZ YOKSA BANT "KABUL ET/REDDET" DEĞİL, BİLGİLENDİRMEDİR.**
  Reddedilecek bir şey yokken reddet düğmesi göstermek kullanıcıyı yanıltır ve
  rızayı anlamsızlaştırır. Kataloğa rıza gerektiren bir satır eklendiği anda
  **kırmızıya dönen bir test** yazılır; böylece onay arayüzü yazılmadan analitik
  eklenemez.
- **RIZA TABLOSU EKLEMELİDİR (append-only).** Geri alma, eski satırı
  güncellemek değil üzerine `isGranted = false` yazmaktır. Güncellenen bir
  satır "ne zaman verildi" bilgisini yok eder ve kayıt kanıt olmaktan çıkar.
- **RIZA ZİYARETÇİDEN DE ALINIR.** Giriş yapmamış kullanıcının rızası çerezdeki
  rastgele kimliğe bağlanır; kullanıcı sonradan giriş yaptığında kayıt **aynı
  satır üzerinden** hesaba bağlanır. Yeni satır yazılırsa rızanın tarihi giriş
  anına kayar ve kayıt yanlış bir şey söyler.
- **RIZANIN KANITI VERİTABANINDA, ARAYÜZ DURUMU ÇEREZDE.** Bandın çizilip
  çizilmeyeceğine çerez karar verir (her sayfada bir sorgu olmasın diye);
  kanıt tabloda durur. Çerezin değeri, kullanıcının gördüğü metnin **sürümüdür**
  — metin değişince sürüm artar ve bant herkese yeniden çıkar.
- **BANT SIFIR JAVASCRIPT OLMALIDIR.** Her sayfada çizilen bir bileşenin
  istemci paketine girmesi, tüm siteye bedel yükler. Düz bir `<form method="post">`
  + 303 yönlendirme (POST/Redirect/GET) hem betikleri kapalı tarayıcıda çalışır
  hem de bedava gelir. ⚠️ Bandın çerez okuması sayfaları istek anında çizilir
  hâle getirebilir; bu bedel **ölçülür**, varsayılmaz.
- **DÜZ FORM KABUL EDEN UÇTA CSRF KAPISI ŞART.** `Origin` başlığı varsa kendi
  alan adımızla eşleşmelidir. Aksi hâlde saldırganın sayfasındaki gizli bir
  form, kurbanın ziyaretçi kimliğini sıfırlayabilir.
- **VERİ SORUMLUSUNUN KİŞİSEL VERİSİ KODA YAZILMAZ.** Ad ve başvuru e-postası
  ortam değişkeninden okunur. Depo herkese açıksa koda yazılan bir ad git
  geçmişinden çıkarılamaz. Değişken eksikse sayfa **yine çizilir** ve ikincil
  bir başvuru kanalı gösterir — aydınlatma yükümlülüğü "e-postam yok" diye
  ortadan kalkmaz.
- **METNİN İDDİALARI ÖLÇÜLEREK YAZILIR.** Sunucuların hangi ülkede olduğu,
  hangi işleyicilere veri gittiği ve saklama sürelerinin ne olduğu; panelden,
  yanıt başlığından ve veri modeli belgesinden **doğrulanır**, ezberden yazılmaz.
- **YÜRÜRLÜK TARİHİ HER BELGEDE GÖRÜNÜR.** "Hangi metni okumuştum" sorusunun
  başka cevabı yok.
- **GÖSTERİM/PORTFÖY PROJESİNDE FERAGAT HER YASAL SAYFADA TEKRARLANIR.** Bu
  sayfalar arama sonucundan doğrudan açılır; alt bilgideki genel uyarıyı o
  kullanıcı hiç görmemiş olabilir.
- **SEO:** her yasal sayfanın kendi `title` ve `description`'ı, kendi canonical
  adresi ve **tek bir `h1`'i** olur; hepsi `sitemap.xml`'e aynı katalogdan
  eklenir. Giriş gerektiren adresler site haritasına yazılmaz.
- **ADRESTEN GELEN HATA KODU EKRANA BASILMAZ**, bilinen kodlar tablosunda
  aranır. Doğrudan yazılırsa sayfaya istediği metni gösteren bir bağlantı
  dağıtılabilir (içerik enjeksiyonu / kimlik avı).

## Denetim kaydı (audit log)
Kim, ne zaman, hangi kayıtta, ne yaptı — ayrı `audit_logs` tablosunda tutulur.
- Kapsam: giriş/çıkış, yetki değişikliği, ödeme, iptal, silme, yönetici işlemleri.
- Kayıt **değiştirilemez ve silinemez** (append-only).
- İçeriğe hassas veri yazılmaz; referans kimlik yazılır.

## Log ve hata takibinde gizlilik
- Log'a asla: şifre, token, kart numarası, kimlik numarası, adres, e-posta gövdesi.
- Hata takip aracına gönderilen veriler maskelenir.
- Üçüncü parti bir servise veri gönderiliyorsa bu listelenir ve gerekçelendirilir.

## Erişim
- En az yetki ilkesi: her rol yalnızca işini yapacak kadar erişir.
- Üretim veritabanına doğrudan erişim istisnadır; yapıldığında kaydedilir.
- Yetki değişiklikleri denetim kaydına düşer.

## Erişilebilirlik yükümlülüğü
Kamu hizmeti sunan arayüzlerde erişilebilirlik yasal bir beklentidir.
WCAG 2.1 AA hedefi `07-ui-design-system.md` altında tanımlıdır ve
otomatik denetim (axe) CI'da çalışır.
