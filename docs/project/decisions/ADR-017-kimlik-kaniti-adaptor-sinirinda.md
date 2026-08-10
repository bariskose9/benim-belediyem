# ADR-017 — Kimlik kanıtı bir adaptörün arkasına alınır; bilgi temelli kanıt geçici sayılır

**Tarih:** 2026-08-10
**Durum:** Kabul edildi
**İlgili:** ADR-003 (sahte KPS adaptörü) · ADR-009 (mock KPS paylaşılan gizli başlık) ·
teknik borç #76, #80 · PRD §5.0

## Bağlam

Adım 15c-2 ile `/kimlik-dogrulama` ekranı geldi: giriş yapmış bir kullanıcı
**T.C. kimlik numarası + doğum yılı** vererek hesabına bir KPS kimliği bağlıyor.
Bağlama başarılı olduğunda üç şey birden oluyor:

1. hesap `kps_verified` kademesine çıkıyor,
2. ad soyad KPS'ten gelen **gerçek** adla değişiyor,
3. numara personel rehberinde eşleşirse hesap **personel yetkisi kazanıyor**
   (`matchStaffMember` → `staff_member_id`).

Teknik borç #76 bu tasarımın üç ayrı zayıflığını kaydetti:

- **T.C. kimlik numarası ve doğum yılı Türkiye'de gizli bilgi değildir.**
  Kurbanın numarasını bilen biri kendi hesabını onun adıyla doğrulatabilir.
- **Kimlik doğrulaması yetki de veriyor.** Kurban personel rehberindeyse ve
  henüz hesabı yoksa, saldırgan `isStaff` yetkisini de kazanır — hastane
  randevusu ve spor salonu üyeliği bu yetkiye bağlı.
- **Bağlama geri alınamıyor.** Bir numara yalnızca bir hesaba bağlanabildiği
  için (PRD §5.0), gerçek kişi artık kendi kimliğini doğrulatamaz ve bağlantıyı
  çözecek hiçbir akış yok.

Aynı kanıt gücü kayıt akışında da geçerliydi; yani adım 15c-2 **yeni bir açık
açmadı**, mevcut tasarım kararını ikinci bir kapıya taşıdı. Ama kayıt akışında
saldırgan yalnızca yeni bir hesap açıyordu; burada **var olan bir hesaba yetki
ekleniyor**, dolayısıyla bedeli daha yüksek.

Proje sahibinin kararı (2026-08-10): *"sonuçta gerçek hayat projesi yapacağız,
ileride gerçek verilerle. Ona göre best practice neyse hep o seçenek."*
Yani karar bugünkü sahte KPS'e göre değil, **gerçek veriye geçileceği varsayımına
göre** verilmelidir.

## Karar

**Kimlik kanıtı, uygulamanın iş kurallarından ayrılmış değiştirilebilir bir
adaptörün arkasına alınır; bugünkü bilgi temelli kanıt (T.C. numarası + doğum
yılı) bu adaptörün GEÇİCİ bir uygulaması olarak açıkça işaretlenir.**

Karar üç ilkeye dayanıyor. Üçü de gerçek kimlik sistemlerinin standart pratiği:

### 1. Bildiğin bir şey kanıt değildir — sahip olduğun bir şey kanıttır

Bilgi temelli doğrulama (*knowledge-based verification*) gerçek kimlik
sistemlerinde **tek başına kabul edilmez**, çünkü kanıt olarak kullanılan
bilginin gizli kalacağı garanti edilemez. Türkiye'de bunun yerine kullanılan
yollar:

- **e-Devlet Kimlik Doğrulama Sistemi** — kullanıcı e-Devlet üzerinden kimlik
  doğrular, uygulamaya yalnızca doğrulama sonucu döner,
- **banka doğrulaması** — kullanıcının adına açılmış bir hesap üzerinden,
- **NVİ'nin kayıtlı iletişim kanalına gönderilen tek kullanımlık kod** —
  kanalın kendisi devletin kaydında olduğu için "sahip olma" kanıtıdır.

Bugün bunların hiçbiri projede yok ve sahte KPS tablosunda **iletişim bilgisi
alanı bile yok** (`kps_citizens`: ad, soyad, doğum tarihi, doğum yeri, ana-baba
adı, nüfusa kayıtlı yer — telefon veya e-posta yok). Yani bugün kanıt gücünü
yükseltmenin bir yolu **yok**; yapılabilecek tek doğru şey sınırı çizmek.

⛔ **Anne adı + baba adı + doğum yeri sormak bu adım için REDDEDİLDİ.** Çubuğu
biraz yükseltirdi ama kanıtın **sınıfını** değiştirmezdi: yine "bildiğin bir
şey" olurdu, yine sızabilirdi, ve gerçek veriye geçildiğinde yine atılacaktı.
Atılacak bir çözüme bugün kod yazmak, kayıt akışıyla da tutarsızlık üretirdi.

### 2. Kimlik doğrulaması yetki vermez

**Kim olduğun** ile **ne yapmaya yetkili olduğun** ayrı sorulardır ve ayrı
kanıt ister. Bir kişinin kurum personeli olduğu, o kişinin kimliğinden
türetilemez — **işverenin** doğrulaması gerekir (kurumsal e-posta adresine
gönderilen kod, İK onayı, veya kurumun kimlik sağlayıcısıyla federasyon).

Bugün `verifyIdentity` kimlik bağlamayı ve personel yetkisini **tek işlemde**
veriyor. Bu ayrılmalıdır: kimlik doğrulaması hesabı `kps_verified` yapar,
personel yetkisi **ayrı ve işveren kontrollü** bir adımdan gelir.

### 3. Her bağlama geri alınabilir olmalıdır

Kimlik bağlama, sonucu yanlış olduğunda **kurbanın kendi kimliğini kullanmasını
engelleyen** bir işlemdir. Geri alınamayan böyle bir işlem üretime çıkarılamaz.
Geri alma yetkili bir süreçten geçmeli ve denetim kaydına yazılmalıdır.

### Bugün yazılan kod

**Hiçbiri.** Bu ADR bir **sınır kararıdır**: kimlik kanıtı üreten katman zaten
tek bir yerde toplu (`src/features/identity/`, ADR-003'ün `KpsProvider`
adaptörü). Gerçek bir sağlayıcıya geçmek `verifyIdentity`'nin sırasını,
`attachVerifiedIdentity`'nin koşullu yazmasını veya ekranı değiştirmiyor —
yalnızca adaptörün arkasındaki uygulama değişiyor. Karar bunu **yazılı hâle
getiriyor** ve doğan üç işi roadmap'e adım olarak koyuyor.

## Değerlendirilen alternatifler

| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| **Kanıtı adaptör sınırına al, bilgi temelli kanıtı geçici işaretle, doğan işleri adıma böl** | Gerçek veriye geçiş tek dosyalık kalır; bugün kod değişmez; risk ve sınır yazılı | Bugünkü kanıt gücü olduğu gibi kalıyor — sahte KPS'le çalışırken de kalıyor | **Seçildi** |
| Riski sessizce kabul et, yalnızca borç satırı bırak | Sıfır iş | Gerçek veriye geçişte hangi işlerin yapılması gerektiği kayıtsız kalır; yetki/kimlik ayrımı gözden kaçar | Karar verilmemiş olur, ertelenmiş olur |
| Doğrulamaya anne adı + baba adı + doğum yeri ekle | Rastgele bir saldırgan için çubuk yükselir | Kanıt yine bilgi temelli; gerçek veriye geçince atılacak; kayıt akışıyla tutarsızlık | Sınıf değiştirmiyor, atılacak koda bugün maliyet |
| Doğrulamaya OTP ekle (ikinci kanal) | "İki adım" hissi verir | Kod saldırganın KENDİ e-postasına/telefonuna gidiyor (teknik borç #1: SMS simüle), kurbanınkine değil. Kanıt gücü **artmıyor**, yalnızca sürtünme ekleniyor | Güvenlik tiyatrosu olurdu |
| Kimlik doğrulamasını tamamen kaldır, gerçek sağlayıcı gelene kadar bekle | Yanlış kanıt hiç kullanılmaz | Google ile giren kullanıcı hiçbir hizmete erişemez; ürün çalışmaz hâle gelir | Ürünü durdurur |

## Sonuçlar

- **Olumlu:** gerçek kimlik sağlayıcısına (e-Devlet) geçiş, akışı ve ekranı
  değiştirmeyen tek dosyalık bir iş olarak tanımlandı.
- **Olumlu:** "kimlik ≠ yetki" ve "her bağlama geri alınabilir" kuralları yazılı
  hâle geldi; ikisi de roadmap'te adım oldu.
- **Bedel — KABUL EDİLDİ:** sahte KPS ile çalışıldığı sürece kimlik kanıtı
  bilgi temellidir ve kurbanın numarasını bilen biri onun adına doğrulama
  yapabilir. Bu, projenin **gerçek kişisel veriyle çalıştırılmasının önündeki
  engeldir** — ADR-003 zaten sahte KPS'in üretim için yeterli olmadığını
  söylüyor, bu ADR aynı sınırı kimlik bağlama tarafında da çiziyor.
- **Bedel:** bugünkü kod yanlış bağlanmış bir kimliği geri alamıyor. Geri alma
  akışı gelene kadar bu durum **elle veritabanı müdahalesi** gerektirir.
- **⛔ Üretime çıkma kapısı:** aşağıdaki üç iş bitmeden bu uygulama **gerçek
  kişisel veriyle çalıştırılamaz.** Bu cümle `docs/project/roadmap.md` ve
  `docs/project/altyapi-durumu.md` içinde de tekrarlanır.

### Bu karardan doğan işler

| İş | Nereye | Neden orada |
|---|---|---|
| Kimlik bağlantısını çözme akışı (denetim kayıtlı, yetkili süreç) | **adım 17b** (hesap yönetimi) | Aynı adımda "hesabımı sil / verimi indir" var; ikisi de hesabın kendi kayıtlarını geri alma işi |
| Personel yetkisini kimlik doğrulamasından ayırma (işveren kontrollü kanal) | **adım 17c** (yeni) | Erişim kademelerini değiştiriyor; hastane ve spor salonu ekranlarını etkiliyor, tek başına bir adım |
| Gerçek kimlik sağlayıcısı adaptörü (e-Devlet / banka doğrulaması) | **faz 2** — gerçek veriye geçiş | Dış hesap, sözleşme ve KVKK aydınlatma metni gerektiriyor; teknik iş en küçük parçası |

## Bu karar ne zaman gözden geçirilmeli

- Gerçek kimlik sağlayıcısı (e-Devlet veya banka doğrulaması) entegre edilirken —
  o an bu ADR'nin yerini yeni bir ADR alır.
- Sahte KPS tablosuna iletişim bilgisi eklenirse — o an "kayıtlı kanala kod
  gönderme" seçeneği teknik olarak mümkün hâle gelir ve yeniden değerlendirilir.
</content>
</invoke>
