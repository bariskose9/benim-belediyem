/**
 * Yasal sayfaların metinleri (adım 17 · PRD §5.10 · 14-privacy-and-compliance.md).
 *
 * NEDEN AYRI DOSYA: `messages.ts` zaten 2200 satır ve bu metinler arayüz
 * kopyası değil, YÜRÜRLÜK TARİHİ OLAN BELGELER. Ayrı dosyada durunca "metin
 * değişti mi" sorusu tek bir `git diff` ile cevaplanıyor ve sürüm numarasının
 * ne zaman artması gerektiği görülebiliyor. Yine de `messages.ts` içine
 * `legal` adıyla dahil ediliyor, yani kullanıcıya görünen metinlerin TEK GİRİŞ
 * NOKTASI kuralı bozulmuyor.
 *
 * ⛔ BURADAKİ İDDİALAR ÖLÇÜLEREK YAZILDI, EZBERDEN DEĞİL:
 *  - işleyici listesi `docs/project/integrations.md`'den
 *  - saklama süreleri `docs/project/data-model.md` → "Saklama süreleri"nden
 *  - çerez listesi `src/features/legal/cookie-registry.ts`'ten
 *  - sunucu konumları 2026-08-10'da ölçüldü (Neon `aws-eu-central-1`,
 *    Vercel fonksiyon bölgesi `iad1`)
 * Bunlardan biri değişirse metin de değişmek zorunda — yayımlanmış yanlış bir
 * aydınlatma metni, hiç olmamasından daha ağır bir sorundur.
 */

export type LegalSection = {
  readonly heading: string;
  readonly body: readonly string[];
  readonly bullets?: readonly string[];
};

export type LegalDocumentCopy = {
  readonly pageTitle: string;
  readonly title: string;
  readonly description: string;
  readonly intro: string;
  readonly sections: readonly LegalSection[];
};

/**
 * Belgelerin yürürlük tarihi.
 *
 * ⛔ METİN DEĞİŞİRSE BU TARİH DE DEĞİŞİR. Kullanıcının "ben hangi metni
 * okumuştum" sorusunu cevaplayabilmesinin tek yolu bu.
 */
const EFFECTIVE_DATE = "10 Ağustos 2026";

/** Her yasal sayfanın tepesinde tekrarlanan feragat — bağlamdan koparılamasın. */
const DEMO_DISCLAIMER =
  "Bu site gerçek bir belediyeye ait değildir. Eğitim ve portföy amacıyla geliştirilmiş " +
  "bir gösterim uygulamasıdır; kurum adları, personel, ürünler, fiyatlar ve ödemeler " +
  "dahil tüm veriler uydurmadır. Buradan gerçek bir belediye hizmeti alınamaz.";

export const legal = {
  /** Dört sayfada da ortak olan parçalar. */
  common: {
    effectiveDate: EFFECTIVE_DATE,
    effectiveDateLabel: "Yürürlük tarihi",
    disclaimerHeading: "Önce şunu bilin",
    disclaimer: DEMO_DISCLAIMER,
    /** Sayfalar birbirine bağlanıyor: biri açılan diğerini de bulabilsin. */
    otherDocumentsHeading: "Diğer yasal belgeler",
  },

  /** Alt bilgideki bağlantı adları. */
  links: {
    privacy: "KVKK Aydınlatma Metni",
    cookies: "Çerez Politikası",
    terms: "Kullanım Şartları",
    contact: "İletişim ve başvuru",
  },

  /** Veri sorumlusu bilgisi ortamdan gelmediğinde gösterilen karşılık. */
  controller: {
    heading: "Veri sorumlusu",
    unnamed: "Bu gösterim uygulamasını geliştiren ve işleten gerçek kişi",
    /**
     * ⛔ AD VE E-POSTA KODA YAZILMAZ (`LEGAL_CONTROLLER_NAME`,
     * `LEGAL_CONTACT_EMAIL`). Depo herkese açık; koda yazılan bir kişisel veri
     * git geçmişinden çıkarılamaz.
     */
    nameLabel: "Ad",
    emailLabel: "Başvuru e-postası",
    fallbackChannelLabel: "Başvuru kanalı",
    fallbackChannel:
      "Veri sorumlusunun e-posta adresi bu ortamda tanımlı değil. Başvurularınızı " +
      "aşağıdaki kaynak kodu deposu üzerinden iletebilirsiniz.",
    repositoryLabel: "Kaynak kodu deposu",
  },

  // =========================================================================
  // /gizlilik — KVKK aydınlatma metni
  // =========================================================================
  privacy: {
    pageTitle: "KVKK Aydınlatma Metni",
    title: "Kişisel Verilerin Korunması Aydınlatma Metni",
    description:
      "Bu gösterim uygulamasında hangi kişisel verilerin, hangi amaçla ve ne kadar süreyle " +
      "işlendiğini, kimlere aktarıldığını ve KVKK kapsamındaki haklarınızı açıklar.",
    intro:
      "6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 10. maddesi uyarınca, bu " +
      "uygulamayı kullandığınızda hangi verilerinizin işlendiğini bilme hakkınız var. " +
      "Aşağıdaki metin bunu olabildiğince sade anlatmaya çalışıyor.",
    sections: [
      {
        heading: "Hangi kişisel verileriniz işleniyor?",
        body: [
          "Yalnızca hizmetin çalışması için gereken veriler toplanıyor. Aşağıdaki listede " +
            "olmayan bir veri istenmiyor; istenseydi burada yazması gerekirdi.",
        ],
        bullets: [
          "Kimlik: ad, soyad, doğum tarihi. Kimlik doğrulaması yaptıysanız T.C. kimlik " +
            "numaranız — bu numara veritabanında şifrelenerek saklanır, ekranda yalnızca " +
            "maskeli gösterilir (örn. 912******32) ve hiçbir kayda ya da hata günlüğüne yazılmaz.",
          "İletişim: e-posta adresiniz, telefon numaranız ve varsa kaydettiğiniz teslimat adresleri.",
          "İşlem geçmişi: siparişleriniz, hastane randevularınız, etkinlik biletleriniz, " +
            "spor salonu üyeliğiniz ve destek talepleriniz.",
          "Ödeme: kart numaranız SAKLANMAZ. Yalnızca kartın markası, son dört hanesi, son " +
            "kullanma ay/yılı ve sahte işlem numarası tutulur. Gerçek bir tahsilat yapılmaz.",
          "İşlem güvenliği: oturum kayıtları, kritik işlemlerin denetim kaydı ve kötüye " +
            "kullanımı sınırlamak için IP adresinizin geri döndürülemez özeti. Düz IP adresiniz saklanmaz.",
          "Otomatik yollarla toplananlar: yalnızca zorunlu çerezler. Ayrıntısı Çerez Politikası'nda.",
        ],
      },
      {
        heading: "Özel nitelikli veri toplanıyor mu?",
        body: [
          "Din, biyometri, sağlık raporu gibi özel nitelikli veriler istenmiyor.",
          "Tek istisna dikkatinizi çekmek istediğimiz bir ayrıntı: hastane randevusu " +
            "aldığınızda hangi branştan randevu aldığınız kaydediliyor. Branş bilgisi tek " +
            "başına bir teşhis değildir ama sağlıkla ilişkilidir. Bu kayıt yalnızca " +
            "randevunuzun size gösterilebilmesi için tutuluyor, başka hiçbir amaçla " +
            "kullanılmıyor ve üç yıl sonra anonimleştiriliyor.",
        ],
      },
      {
        heading: "Hangi amaçla ve hangi hukuki sebeple?",
        body: [
          "Her veri, karşısında yazan amaç için işleniyor. Amaç ortadan kalktığında veri de siliniyor.",
        ],
        bullets: [
          "Hesabınızı açmak, girişinizi sağlamak ve talep ettiğiniz hizmeti sunmak — " +
            "sözleşmenin kurulması ve ifası (KVKK m.5/2-c).",
          "Sipariş, ödeme ve tahsilat kayıtlarını tutmak — hukuki yükümlülük (KVKK m.5/2-ç).",
          "Hesabınızı otomatik saldırılara ve sahte kayıtlara karşı korumak, kötüye " +
            "kullanımı sınırlamak — meşru menfaat (KVKK m.5/2-f).",
          "Kimliğinizi doğrulamak ve kurum personeli olup olmadığınızı belirlemek — " +
            "hizmetin bir kısmı yalnızca personele açık olduğu için, sözleşmenin ifası (KVKK m.5/2-c).",
          "Zorunlu olmayan çerez, analitik veya pazarlama amacıyla HİÇBİR veri işlenmiyor. " +
            "Bu yüzden bugün sizden açık rıza istenmiyor; istenmesi gereken bir gün gelirse " +
            "önce sorulacak, sonra çalıştırılacak.",
        ],
      },
      {
        heading: "Kimlere aktarılıyor ve yurt dışına çıkıyor mu?",
        body: [
          "Verileriniz hiç kimseye satılmıyor, reklam amacıyla paylaşılmıyor. Ancak uygulama " +
            "bulut hizmetleri üzerinde çalıştığı için aşağıdaki sağlayıcılar teknik olarak " +
            "veriye erişebilecek konumdadır. Bir kısmı Türkiye dışındadır; KVKK m.9 anlamında " +
            "bu bir yurt dışına aktarımdır.",
        ],
        bullets: [
          "Vercel Inc. — uygulamanın çalıştığı sunucular. Sunucu bölgesi Amerika Birleşik " +
            "Devletleri (Washington D.C.). Her istek buradan geçer.",
          "Neon — veritabanı. Sunucu bölgesi Almanya (Frankfurt). Kayıtlı verilerin tamamı burada durur.",
          "Cloudflare, Inc. — giriş ve kayıt ekranlarındaki “robot değilim” kontrolü " +
            "(Turnstile). Amerika Birleşik Devletleri. Cloudflare bu kontrolde toplanan " +
            "sinyalleri yalnızca bot tespiti için kullandığını beyan eder.",
          "Resend — doğrulama kodlarını taşıyan e-postalar. Amerika Birleşik Devletleri. " +
            "Yalnızca e-posta adresiniz ve kodun kendisi gider.",
          "Google LLC — yalnızca “Google ile giriş” seçeneğini kullanırsanız. Amerika " +
            "Birleşik Devletleri. Google'a hangi verinin gittiğini Google'ın kendi gizlilik " +
            "politikası belirler; biz Google'dan yalnızca e-posta adresinizi ve adınızı alırız.",
          "Ana sayfadaki hava durumu, döviz, kripto ve haber bilgileri dış kaynaklardan " +
            "gelir; bu çağrılar SUNUCUMUZDAN yapılır. Yani o sağlayıcılar sizin IP adresinizi " +
            "veya tarayıcınızı hiç görmez.",
        ],
      },
      {
        heading: "Ne kadar süre saklanıyor?",
        body: [
          "Her kayıt türü için bir süre tanımlı ve süresi dolan kayıtları temizleyen bir " +
            "görev her gece çalışıyor. Öne çıkanlar:",
        ],
        bullets: [
          "Yarım kalan kayıt bilgileri: 15 dakika. Doğrulama kodları: 24 saat.",
          "Oturum kayıtları: süresi + 7 gün. Terk edilmiş sepetler: 30 gün.",
          "Kimlik sorgusu kayıtları: 90 gün. Bildirimler: 1 yıl.",
          "Destek talepleri, randevular ve rezervasyonlar: 3 yıl, sonra anonimleştirilir.",
          "Sipariş, ödeme ve tahsilat kayıtları: 10 yıl. Bu süre mali mevzuattan gelir; " +
            "süre sonunda kişisel alanlar anonimleştirilir, tutarlar korunur.",
          "Denetim ve rıza kayıtları: 10 yıl. Bu kayıtlar değiştirilemez ve silinemez — " +
            "amacı zaten “ne olduğunu” kanıtlamaktır.",
        ],
      },
      {
        heading: "Verileriniz nasıl korunuyor?",
        body: [
          "Şifreniz geri döndürülemez biçimde saklanır; kimse (biz dahil) şifrenizi göremez. " +
            "T.C. kimlik numaranız şifrelenerek tutulur. Oturumunuz tarayıcının JavaScript " +
            "kodunun okuyamayacağı bir çerezde taşınır. Giriş, kayıt ve yazma işlemlerinde " +
            "deneme sayısı sınırlıdır. Şifre, kod, kart numarası ve kimlik numarası hiçbir " +
            "günlüğe yazılmaz.",
        ],
      },
      {
        heading: "KVKK kapsamındaki haklarınız",
        body: [
          "Kanunun 11. maddesi size aşağıdaki hakları veriyor. Başvurunuzu bu sayfanın " +
            "sonundaki kanaldan iletebilirsiniz; en geç otuz gün içinde cevaplanır.",
        ],
        bullets: [
          "Kişisel verinizin işlenip işlenmediğini öğrenme ve işlenmişse bilgi talep etme.",
          "İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.",
          "Yurt içinde veya yurt dışında verinin aktarıldığı üçüncü kişileri bilme.",
          "Eksik veya yanlış işlenmişse düzeltilmesini isteme.",
          "Kanundaki şartlar çerçevesinde silinmesini veya yok edilmesini isteme.",
          "Düzeltme, silme ve yok etme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme.",
          "Yalnızca otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonuç " +
            "doğmasına itiraz etme.",
          "Kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme.",
        ],
      },
      {
        heading: "Hesabınızı silmek ve verinizi indirmek",
        body: [
          "Dürüst olalım: hesabı kendi başınıza silme ve verinizi JSON olarak indirme " +
            "ekranları HENÜZ YAZILMADI; yol haritasında bir sonraki adımda. O ekranlar " +
            "gelene kadar aynı talebi aşağıdaki başvuru kanalından iletebilirsiniz.",
          "Hesap silme, kayıtların tamamının yok edilmesi anlamına gelmeyecek: adınız, " +
            "e-postanız, telefonunuz, kimlik numaranız, adresleriniz ve kart bilgileriniz " +
            "silinecek ya da anonimleştirilecek; mali kayıtlar ise tutar ve tarih olarak, " +
            "kime ait olduğu belli olmayacak biçimde yasal süre boyunca korunacak.",
        ],
      },
      {
        heading: "Bu metin değişirse",
        body: [
          "Metin değiştiğinde yukarıdaki yürürlük tarihi de değişir. Çerez listesini " +
            "ilgilendiren bir değişiklikte çerez bildirimi herkese yeniden gösterilir; " +
            "eski bir metne verilen onay yeni metni kapsamaz.",
        ],
      },
    ],
  } satisfies LegalDocumentCopy,

  // =========================================================================
  // /cerez-politikasi
  // =========================================================================
  cookies: {
    pageTitle: "Çerez Politikası",
    title: "Çerez Politikası",
    description:
      "Bu uygulamanın tarayıcınızda ne sakladığını çerez çerez açıklar. Zorunlu olmayan " +
      "çerez, analitik veya reklam takibi kullanılmıyor.",
    intro:
      "Çerez, bir sitenin tarayıcınızda bıraktığı küçük bir metin parçasıdır. Aşağıdaki " +
      "tablo, bu uygulamanın bıraktığı her şeyi eksiksiz listeler — tablo, uygulamanın " +
      "kodundaki tek kaynaktan üretilir, elle yazılmaz.",
    sections: [
      {
        heading: "Kısa cevap",
        body: [
          "Bu uygulama analitik, ölçüm, reklam veya takip çerezi KULLANMIYOR. Tarayıcınızda " +
            "sakladığımız her şey hizmetin çalışması için zorunlu: oturumunuz, güvenlik " +
            "kontrolleri ve tema tercihiniz.",
          "Bu yüzden karşınıza “kabul et / reddet” düğmeleri çıkmıyor. Reddedebileceğiniz " +
            "bir şey olsaydı düğme de olurdu; olmayan bir seçim için düğme koymak sizi yanıltmak olurdu.",
        ],
      },
    ],
    /** Tablo bileşeninin başlıkları — kayıt defterinden çizilir. */
    table: {
      caption: "Tarayıcınızda saklanan her şey",
      nameHeader: "Ad",
      kindHeader: "Tür",
      purposeHeader: "Ne işe yarıyor",
      lifetimeHeader: "Ömrü",
      partyHeader: "Kaynak",
      firstParty: "Bu site",
      thirdParty: "Üçüncü taraf",
      kindCookie: "Çerez",
      kindLocalStorage: "Yerel depolama",
      lifetimeUntilCleared: "Siz silene kadar",
      /**
       * Ömrü kullanıcının anlayacağı birime çevirir.
       *
       * NEDEN `Intl.RelativeTimeFormat` DEĞİL: o biçimlendirici "7 gün sonra"
       * gibi bir YÖN cümlesi üretiyor; buradaki değer bir süre, bir an değil.
       */
      formatLifetime: (ms: number | null): string => {
        if (ms === null) return "Siz silene kadar";

        const minutes = Math.round(ms / 60_000);

        if (minutes < 60) return `${minutes} dakika`;

        const hours = Math.round(minutes / 60);

        if (hours < 24) return `${hours} saat`;

        const days = Math.round(hours / 24);

        if (days < 365) return `${days} gün`;

        return `${Math.round(days / 365)} yıl`;
      },
    },
    categories: {
      necessary: "Zorunlu",
      necessaryIntro:
        "Bu grup olmadan giriş yapılamaz, sipariş verilemez ve hesabınız korunamaz. " +
        "Rıza gerektirmez ama yine de bilmeniz gerekir.",
      analytics: "Ölçüm ve istatistik",
      analyticsIntro: "Ziyaret istatistikleri için kullanılır. Onayınız olmadan çalıştırılmaz.",
      marketing: "Pazarlama",
      marketingIntro: "Reklam ve hedefleme için kullanılır. Onayınız olmadan çalıştırılmaz.",
      emptyGroup: "Bu grupta bugün hiçbir kayıt yok.",
    },
    afterTable: [
      {
        heading: "Çerezleri nasıl silersiniz?",
        body: [
          "Tarayıcınızın ayarlarından bu sitenin çerezlerini istediğiniz an silebilirsiniz. " +
            "Sildiğinizde oturumunuz kapanır, tema tercihiniz sıfırlanır ve bu bildirimi " +
            "yeniden görürsünüz; başka bir şey kaybetmezsiniz — hesabınız ve kayıtlarınız yerinde kalır.",
        ],
      },
      {
        heading: "Çerez bildirimini okuduğunuz kaydediliyor mu?",
        body: [
          "Evet. “Anladım” dediğinizde bunun kaydı zaman damgasıyla tutulur. Giriş " +
            "yapmadıysanız kayıt, tarayıcınızdaki rastgele bir numaraya bağlanır — adınıza " +
            "değil, çünkü adınızı bilmiyoruz. Sonradan giriş yaparsanız kayıt hesabınıza bağlanır.",
          "Bu tercihi aşağıdaki düğmeyle geri alabilirsiniz. Geri aldığınızda bildirim " +
            "yeniden gösterilir; önceki kayıt silinmez, üzerine “geri alındı” kaydı yazılır.",
        ],
      },
    ],
    /** Rıza durumu kutusu (bu sayfaya özel). */
    status: {
      heading: "Çerez bildirimi tercihiniz",
      acknowledged: "Bu bildirimi okuduğunuzu belirtmişsiniz.",
      notAcknowledged: "Bu bildirimi henüz okuduğunuzu belirtmediniz.",
      withdrawAction: "Tercihimi geri al",
      acknowledgeAction: "Okudum, anladım",
    },
  },

  // =========================================================================
  // /kullanim-sartlari
  // =========================================================================
  terms: {
    pageTitle: "Kullanım Şartları",
    title: "Kullanım Şartları",
    description:
      "Bu gösterim uygulamasını kullanırken geçerli olan kurallar: gerçek işlem yapılmadığı, " +
      "hesap sorumluluğu, yasak kullanımlar ve sorumluluk sınırı.",
    intro:
      "Bu uygulamayı kullanarak aşağıdaki şartları kabul etmiş olursunuz. Şartlar sade " +
      "tutuldu; anlamadığınız bir madde varsa sayfanın sonundaki kanaldan sorabilirsiniz.",
    sections: [
      {
        heading: "Bu ne değildir",
        body: [
          "Bu uygulama gerçek bir belediyenin hizmet portalı DEĞİLDİR ve hiçbir kurumla " +
            "bağlantısı yoktur. Bir yazılım geliştiricisinin portföy çalışmasıdır.",
          "Buradan alınan hiçbir randevu, sipariş, bilet veya üyelik gerçek dünyada " +
            "karşılığı olan bir hak doğurmaz. Görünen kurumlar, personel, ürünler ve " +
            "fiyatlar uydurmadır.",
        ],
      },
      {
        heading: "Ödemeler gerçek değildir",
        body: [
          "Ödeme ekranı bir sahte ödeme sağlayıcısıyla çalışır. Hiçbir tahsilat yapılmaz, " +
            "hiçbir bankaya bağlanılmaz ve girdiğiniz kart numarası veritabanına yazılmaz.",
          "⛔ Buna rağmen GERÇEK bir kart numarası girmeyin. Test için sağlanan sahte kart " +
            "numaralarını kullanın. Gerçek kart bilgisi girerseniz bunun sorumluluğu size aittir.",
        ],
      },
      {
        heading: "Hesabınız ve doğru bilgi",
        body: [
          "Hesap açarken verdiğiniz bilgilerin doğruluğundan siz sorumlusunuz. Şifrenizi " +
            "kimseyle paylaşmayın; hesabınızdan yapılan işlemler size ait sayılır.",
          "Kimlik doğrulaması sahte bir nüfus kayıt sistemine karşı yapılır. Kendi gerçek " +
            "T.C. kimlik numaranız bu sistemde bulunmadığı için çalışmaz — bu bir arıza değil, " +
            "bilinçli bir sınırdır. Başkasının kimlik bilgilerini girmeyin.",
        ],
      },
      {
        heading: "Yapmamanız gerekenler",
        body: ["Aşağıdakiler bu uygulamada yasaktır:"],
        bullets: [
          "Başka bir kişinin kimlik bilgilerini, e-postasını veya telefonunu kullanmak.",
          "Otomatik araçlarla toplu istek göndermek, güvenlik kontrollerini aşmaya çalışmak " +
            "veya servisi çalışamaz hâle getirmeyi denemek.",
          "Başkasının kaydına erişmeye çalışmak.",
          "Destek talebine hukuka aykırı, zararlı ya da başkasına ait kişisel veri içeren " +
            "dosya yüklemek.",
          "Uygulamayı gerçek bir belediyenin sitesiymiş gibi sunmak veya başkalarını buna inandırmak.",
        ],
      },
      {
        heading: "Güvenlik açığı bulursanız",
        body: [
          "Bulduğunuz açığı yaymadan önce sayfanın sonundaki kanaldan bildirirseniz memnun " +
            "oluruz. Açığı doğrulamak için başkasının verisine erişmeye çalışmayın; kendi " +
            "hesabınız üzerinde kalın.",
        ],
      },
      {
        heading: "Hizmetin sürekliliği ve sorumluluk",
        body: [
          "Uygulama “olduğu gibi” sunulur. Kesintisiz çalışacağı, verilerin kaybolmayacağı " +
            "veya bilgilerin hatasız olacağı taahhüt edilmez. Ücretsiz ve deneysel bir " +
            "gösterim olduğu için, kullanımından doğan zararlardan sorumluluk kabul edilmez.",
          "Uygulama önceden haber verilmeksizin durdurulabilir ve veritabanı sıfırlanabilir.",
        ],
      },
      {
        heading: "Kaynak kodu",
        body: [
          "Uygulamanın kaynak kodu herkese açıktır. Kodun lisansı depodaki lisans dosyasında " +
            "belirtilir; bu şartlar kodu değil, çalışan uygulamanın kullanımını düzenler.",
        ],
      },
      {
        heading: "Şartlar değişirse",
        body: [
          "Değişiklikte yürürlük tarihi güncellenir. Kullanmaya devam etmeniz güncel " +
            "şartları kabul ettiğiniz anlamına gelir.",
        ],
      },
    ],
  } satisfies LegalDocumentCopy,

  // =========================================================================
  // /iletisim
  // =========================================================================
  contact: {
    pageTitle: "İletişim ve KVKK Başvurusu",
    title: "İletişim ve başvuru",
    description:
      "Kişisel verilerinize ilişkin başvurularınızı ve uygulamayla ilgili sorularınızı " +
      "hangi kanaldan iletebileceğinizi açıklar.",
    intro:
      "Bu sayfada iki ayrı iletişim bilgisi var ve karıştırılmamaları önemli: biri " +
      "uygulamada gösterilen HAYALİ kurumun bilgileri, diğeri bu uygulamayı gerçekten " +
      "işleten kişinin başvuru kanalı.",
    sections: [
      {
        heading: "Gösterilen kurum bilgileri gerçek değildir",
        body: [
          "Hakkımızda sayfasındaki adres, çağrı merkezi ve e-posta uydurmadır; oraya " +
            "yazdığınız hiçbir mesaj kimseye ulaşmaz. Bu bilgiler yalnızca gerçek bir " +
            "portalın nasıl görüneceğini göstermek için duruyor.",
        ],
      },
      {
        heading: "Kişisel verilerinize ilişkin başvurular",
        body: [
          "KVKK'nın 11. maddesindeki haklarınızı kullanmak, verinizin silinmesini istemek " +
            "veya bir gizlilik endişenizi iletmek için aşağıdaki kanalı kullanın. " +
            "Başvurunuzda kimliğinizi doğrulayabileceğimiz kadar bilgi vermeniz gerekir; " +
            "aksi hâlde başkasının verisini yanlış kişiye açmış oluruz.",
          "Başvurular en geç otuz gün içinde cevaplanır. Cevaptan memnun kalmazsanız " +
            "Kişisel Verileri Koruma Kurumu'na şikâyette bulunma hakkınız saklıdır.",
        ],
      },
      {
        heading: "Diğer sorular ve hata bildirimleri",
        body: [
          "Uygulamayla ilgili teknik sorunları, hataları ve önerileri kaynak kodu deposu " +
            "üzerinden iletebilirsiniz. Güvenlik açıkları için Kullanım Şartları'ndaki " +
            "bildirim maddesine bakın.",
        ],
      },
    ],
  } satisfies LegalDocumentCopy,

  // =========================================================================
  // Çerez bandı (her sayfanın altında)
  // =========================================================================
  cookieNotice: {
    /** Erişilebilir bölge adı — ekran okuyucu bandı içerikten ayırabilsin. */
    regionLabel: "Çerez bildirimi",
    title: "Bu sitede yalnızca zorunlu çerezler var",
    body:
      "Analitik, reklam veya takip çerezi kullanılmıyor. Sakladığımız her şey oturumunuzun " +
      "açık kalması, güvenlik kontrolleri ve tema tercihiniz için gerekli.",
    detailsAction: "Ayrıntılar",
    acknowledgeAction: "Anladım",
  },

  /**
   * Kayıt akışının son adımında, hesap açılmadan HEMEN ÖNCE görünen cümle
   * (adım 17).
   *
   * ⛔ ONAY KUTUSU DEĞİL, BİLDİRİM. Gerekçe `consent.service.ts` içindeki
   * `recordRegistrationConsents` açıklamasında; bilinen sınırı da orada yazılı.
   */
  registrationNotice: {
    prefix: "Kaydınızı tamamladığınızda ",
    termsLabel: "Kullanım Şartları",
    middle: "'nı ve ",
    privacyLabel: "KVKK Aydınlatma Metni",
    suffix: "'ni okuduğunuzu ve kabul ettiğinizi onaylamış olursunuz.",
  },

  /** Rıza ucunun kullanıcıya görünen hataları. */
  consentErrors: {
    invalidRequest: "İsteğiniz anlaşılamadı. Sayfayı yenileyip tekrar deneyin.",
    tooManyRequests: "Çok fazla deneme yaptınız. Lütfen bir süre sonra tekrar deneyin.",
  },
} as const;
