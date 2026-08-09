/**
 * Kullanıcıya görünen TÜM Türkçe metinler burada (docs/standards/02-coding-standards.md).
 *
 * Neden tek dosya: metin koda dağılırsa hem tutarlılık kaybolur hem de ileride
 * ikinci bir dil eklenecekse her bileşeni tek tek açmak gerekir.
 */

/**
 * Bot kapısının metinleri — kayıt VE giriş akışının ikisi de aynı kapıyı
 * kullanıyor (ADR-004). Metni iki yere kopyalamak, birini düzeltip diğerini
 * unutmanın en kısa yoludur; bu yüzden tek yerde durup iki gruba da yayılıyor.
 */
const botCheckErrors = {
  botCheckRequired: "Devam etmek için “Ben robot değilim” doğrulamasını tamamlayın.",
  botCheckFailed: "Doğrulama geçersiz. Sayfayı yenileyip tekrar deneyin.",
  /**
   * ADR-004 bedel 2: Turnstile erişilemezse akış DURUR, atlanmaz.
   * Mesaj bunu kullanıcıya anlaşılır biçimde söylüyor.
   */
  botCheckUnavailable:
    "Güvenlik doğrulaması servisine şu an ulaşılamıyor. İşlemi biraz sonra tekrar deneyin.",
} as const;

export const messages = {
  app: {
    name: "benim belediyem",
    title: "benim belediyem",

    /**
     * AÇIKLAMADA GERÇEK KURUM ADI GEÇMEZ.
     *
     * Bu metin arama sonuçlarında ve bağlantı önizlemelerinde çıkıyor. Önceki
     * hâli gerçek bir belediyenin adını taşıyordu; depo herkese açık ve site
     * canlı olduğu için bu, o kurumun sitesiymiş izlenimi doğurabilirdi.
     * Aynı gerekçeyle hiçbir kurumun logosu, arması veya rengi kullanılmıyor.
     */
    description:
      "Örnek belediye hizmet portalı. Gerçek bir kuruma ait değildir; " +
      "eğitim ve portföy amacıyla geliştirilmiştir, tüm veriler sahtedir.",

    /** Kelime-logo iki parçadan oluşuyor: ince "benim" + kalın "belediyem". */
    brand: {
      first: "benim",
      second: "belediyem",
    },
  },

  /** Açık/koyu tema düğmesi — erişilebilir ad temaya göre değişir. */
  theme: {
    switchToDark: "Koyu temaya geç",
    switchToLight: "Açık temaya geç",
  },

  envBanner: {
    local: {
      label: "LOCAL",
      description: "Kendi bilgisayarınızdaki geliştirme ortamı. Veriler sahtedir.",
    },
    preview: {
      label: "PREVIEW",
      description: "Test ortamı. Burası canlı site değildir, veriler sahtedir.",
    },
  },

  errors: {
    // "Bir hata oluştu" değil: kullanıcıya ne yapacağını söyler
    // (docs/standards/02-coding-standards.md → copy kuralları)
    unexpected: "Şu an bağlanamıyoruz. Lütfen biraz sonra tekrar deneyin.",
    databaseUnavailable: "Veritabanına şu an ulaşılamıyor. Lütfen biraz sonra tekrar deneyin.",
  },

  identity: {
    /**
     * TEK TİP MESAJ — hem "böyle bir kayıt yok" hem "doğum yılı tutmadı" hem de
     * "numaranın kontrol basamağı hatalı" durumunda AYNI metin döner.
     *
     * Hangi alanın tutmadığını söylemek, saldırgana "bu numara sistemde var,
     * sadece yılı bilmiyorsun" bilgisini verirdi — numara taramasının tam
     * aradığı ipucu (05-auth-security.md → "tek tip mesaj döner").
     */
    lookupFailed:
      "Girdiğiniz bilgiler doğrulanamadı. Kimlik numaranızı ve doğum yılınızı kontrol edip tekrar deneyin.",

    /** Hız sınırı aşıldı — kaç deneme kaldığı da söylenmez, o da bilgi sızdırır. */
    tooManyAttempts:
      "Çok fazla deneme yaptınız. Güvenliğiniz için sorgulama geçici olarak durduruldu, lütfen 15 dakika sonra tekrar deneyin.",

    /**
     * Dış servis çöktü. PRD §5.0: bu durumda yeni kayıt alınamaz ama mevcut
     * kullanıcılar giriş yapabilir — mesaj bu yüzden "kayıt" odaklı.
     */
    serviceUnavailable:
      "Kimlik doğrulama servisine şu an ulaşılamıyor. Kayıt işlemini biraz sonra tekrar deneyin; mevcut hesabınızla giriş yapmaya devam edebilirsiniz.",
  },

  home: {
    heading: "Belediye hizmetleri tek hesapta",
    intro:
      "Randevu, sipariş, bilet ve üyelik işlemlerinizi tek bir hesapla yönetin. " +
      "Bu bir örnek projedir; hizmetler sırayla açılıyor.",

    /**
     * BAĞLANTI ADLARI ÜST MENÜDEKİLERDEN FARKLI ("Giriş yap" değil "Zaten
     * hesabım var"). Sebebi yalnızca üslup değil: aynı sayfada aynı adı taşıyan
     * iki bağlantı olsaydı hem ekran okuyucu kullanıcısı hangisinin ne olduğunu
     * ayırt edemezdi hem de otomatik testler "hangi bağlantı?" diye takılırdı.
     */
    ctaRegister: "Hemen hesap oluşturun",
    ctaLogin: "Zaten hesabım var",
    ctaAccount: "Hesabıma git",

    servicesHeading: "Hizmetler",
    servicesIntro: "Açılan hizmetleri kullanabilir, hazırlananları buradan takip edebilirsiniz.",
  },

  /**
   * Anasayfadaki bilgi widget'ları (PRD §5.8 · adım 14).
   *
   * ÜÇ DURUM DA METİNLE YAZILI (07-ui-design-system.md → yükleniyor / boş /
   * hata): veri gelirken "yükleniyor", sağlayıcıya ulaşılamayıp elde eski kayıt
   * varken "güncellenemiyor", hiç veri yokken "erişilemiyor".
   */
  infoWidgets: {
    heading: "Bilgi panosu",
    intro: "Hava durumu, güncel haberler ve piyasa değerleri tek ekranda.",

    /** Yükleniyor durumunun ekran okuyucuya duyurulan karşılığı. */
    loading: "Yükleniyor…",

    updatedAt: (time: string) => `${time} itibarıyla`,

    /**
     * BAYAT VERİ SESSİZ GÖSTERİLMEZ (ADR-015 bedel 2).
     *
     * Kur ve kripto hızlı değişiyor; "güncel" başlığı altında saatler önceki
     * bir sayıyı işaretsiz göstermek kullanıcıyı yanıltırdı.
     */
    staleNotice: (time: string) => `Şu an güncellenemiyor — ${time} itibarıyla son veri`,

    /** Dış servis çökse bile SAYFA AYAKTA: yalnızca bu kart hata gösterir. */
    unavailable: "Bu bilgiye şu anda ulaşılamıyor. Sayfanın kalanı çalışmaya devam ediyor.",

    weather: {
      title: "Hava durumu",
      city: "İzmir",
      humidity: (percent: number) => `Nem %${percent}`,
      wind: (kmh: string) => `Rüzgâr ${kmh} km/s`,
      forecastHeading: "Sonraki 3 gün",
      /** Ekran okuyucu için: "24 derece / 15 derece" yerine anlamlı cümle. */
      dayRange: (max: string, min: string) => `En yüksek ${max}, en düşük ${min}`,
      empty: "Tahmin bilgisi bulunamadı.",
    },

    markets: {
      title: "Piyasa",
      ratesHeading: "Döviz kuru",
      cryptoHeading: "Kripto",
      /** Kur ANLIK DEĞİL: ECB günlük referans kuru — tarihi yazmak şart. */
      rateDate: (date: string) => `Merkez bankası kuru · ${date}`,
      unit: (code: string) => `1 ${code}`,
      changeUp: (percent: string) => `%${percent} arttı`,
      changeDown: (percent: string) => `%${percent} azaldı`,
      coins: {
        bitcoin: "Bitcoin",
        ethereum: "Ethereum",
      },
    },

    news: {
      title: "Güncel haberler",
      /** Haber bize ait DEĞİL: kaynak açıkça yazılıyor (ADR-016). */
      source: (name: string) => `Kaynak: ${name}`,
      /** Bağlantı yeni sekmede açılıyor; ekran okuyucu bunu bilmeli. */
      opensInNewTab: "yeni sekmede açılır",
      empty: "Şu anda gösterilecek haber yok.",
    },
  },

  /**
   * Hizmet kartları (PRD §5). Anahtarlar `src/config/navigation.ts` içindeki
   * `ServiceKey` ile birebir aynıdır — biri değişirse TypeScript diğerini de
   * değiştirmeye zorlar.
   */
  services: {
    market: {
      title: "Belediye Market",
      description: "Temel gıda ve temizlik ürünleri, paket servis teslimatıyla.",
    },
    restaurant: {
      title: "Belediye Restoran",
      description: "Günlük menü, masa rezervasyonu ve paket sipariş.",
    },
    events: {
      title: "Etkinlik ve bilet",
      description: "Konser ve gösteri programı, koltuk seçimiyle bilet alma.",
    },
    support: {
      title: "Destek talebi",
      description: "Talep ve şikâyetlerinizi iletin, durumunu takip edin.",
    },
    hospital: {
      title: "Hastane randevusu",
      description: "Personel sağlık birimi randevuları.",
    },
    gym: {
      title: "Spor salonu",
      description: "Personel spor tesisi üyeliği ve paketleri.",
    },
  },

  /** Kart ve liste rozetleri. Bilgi yalnızca renkle değil METİNLE de verilir. */
  badges: {
    comingSoon: "Yakında",
    open: "Açık",
    staffOnly: "Personele özel",
  },

  /** Alt bilgi — her sayfada görünür. */
  footer: {
    /**
     * KALICI FERAGAT. Site canlı ve depo herkese açık; ziyaretçi hangi sayfaya
     * düşerse düşsün buranın gerçek bir kurum olmadığını görmeli
     * (14-privacy-and-compliance.md → yanıltıcı sunum yapılmaz).
     */
    disclaimer:
      "Bu site gerçek bir belediyeye ait değildir. Eğitim ve portföy amacıyla " +
      "geliştirilmiş bir örnektir; kurum adları, kişiler, ürünler ve tüm veriler uydurmadır.",
    sourceCode: "Kaynak kodu (GitHub)",
    sourceCodeUrl: "https://github.com/bariskose9/benim-belediyem",
  },

  /**
   * Kimlik doğrulama metinleri. `auth.register` altında toplanıyor çünkü
   * adım 4b-2 `auth.login` ve 4b-3 `auth.passwordReset` ekleyecek — şekli
   * şimdi seçmek o PR'ların dosyayı yeniden düzenlemesini önlüyor.
   */
  auth: {
    register: {
      pageTitle: "Kayıt Ol",
      stepLabel: "Adım {current} / {total}",

      steps: {
        identity: {
          title: "Kimlik doğrulama",
          description:
            "T.C. kimlik numaranız ve doğum yılınız Nüfus ve Vatandaşlık İşleri " +
            "kayıtlarıyla karşılaştırılır.",
        },
        contact: {
          title: "İletişim bilgileri",
          description: "Hesabınıza giriş yapmak ve size ulaşmak için kullanacağımız bilgiler.",
        },
        verify: {
          title: "Doğrulama kodları",

          /**
           * İKİ AYRI METİN VAR ve bu zorunlu.
           *
           * Local ve preview'da hiçbir e-posta GÖNDERİLMİYOR (sahte kanal),
           * kod ekranda gösteriliyor. "Kod gönderdik" demek o ortamlarda
           * düpedüz yanlış bilgi olur: kullanıcı posta kutusuna bakıp bekler.
           * Bu fiilen yaşandı, o yüzden metin ortama göre değişiyor.
           */
          description:
            "E-posta adresinize ve telefonunuza birer kod gönderdik. " +
            "Hesabınız ikisi de doğrulanınca açılır.",
          descriptionSimulated:
            "TEST ORTAMI — hiçbir e-posta gönderilmez. Kodlarınız aşağıda, " +
            "her panelde “Kodu göster” düğmesine bastığınızda EKRANDA çıkar. " +
            "Hesabınız ikisi de doğrulanınca açılır.",
        },
        done: { title: "Kayıt tamamlandı", description: "" },
      },

      identity: {
        nationalIdLabel: "T.C. kimlik numarası",
        nationalIdHelp: "11 haneli kimlik numaranız",
        birthYearLabel: "Doğum yılı",
        birthYearHelp: "Örnek: 1990",
        submit: "Kimliğimi doğrula",
        submitting: "Doğrulanıyor…",
      },

      contact: {
        readOnlyNotice: "Bu bilgiler nüfus kayıtlarından geldi ve değiştirilemez.",

        /**
         * Veri minimizasyonu (PRD §5.0 · 14-privacy-and-compliance.md).
         * Kullanıcı hangi alanların saklanmadığını görmeli — KVKK'nın
         * "aydınlatma" ilkesi bunu istiyor.
         */
        notStoredNotice:
          "Baba adı, anne adı, doğum yeri, cinsiyet, medeni hâl ve nüfus adresi " +
          "yalnızca bu ekranda gösterilir; veritabanına kaydedilmez.",

        fields: {
          fullName: "Ad soyad",
          nationalId: "T.C. kimlik numarası",
          birthDate: "Doğum tarihi",
          birthPlace: "Doğum yeri",
          fatherName: "Baba adı",
          motherName: "Anne adı",
          gender: "Cinsiyet",
          maritalStatus: "Medeni hâl",
          registeredProvince: "Nüfusa kayıtlı il",
          registeredDistrict: "Nüfusa kayıtlı ilçe",
          registeredAddress: "Nüfus adresi",
        },

        genderLabels: {
          male: "Erkek",
          female: "Kadın",
          unspecified: "Belirtilmemiş",
        },

        maritalStatusLabels: {
          single: "Bekâr",
          married: "Evli",
          divorced: "Boşanmış",
          widowed: "Dul",
          unspecified: "Belirtilmemiş",
        },

        emailLabel: "E-posta adresi",
        emailHelp: "Doğrulama kodu bu adrese gönderilir.",
        /** Test ortamında gönderim YOK; söz vermemek için ayrı metin. */
        emailHelpSimulated: "Test ortamında bu adrese e-posta gönderilmez, kod ekranda gösterilir.",
        phoneLabel: "Cep telefonu",
        phoneHelp: "Örnek: 05321234567",
        passwordLabel: "Şifre",
        passwordHelp: "En az 8 karakter.",
        passwordConfirmLabel: "Şifre (tekrar)",
        submit: "Doğrulama kodlarını gönder",
        submitSimulated: "Doğrulama kodlarını oluştur",
        submitting: "Kodlar gönderiliyor…",
        submittingSimulated: "Kodlar oluşturuluyor…",
      },

      verify: {
        emailTitle: "E-posta kodu",
        phoneTitle: "Telefon kodu",

        /**
         * PRD §5.0: telefon kodu her ortamda e-posta ile taşınıyor. Bunu
         * gizlemek kullanıcıyı yanıltmak olurdu — ekranda açıkça yazıyor.
         */
        smsSimulationNotice:
          "SMS simülasyonu: gerçek SMS sağlayıcısı olmadığı için telefon kodunuz da " +
          "e-posta adresinize gönderildi.",
        smsSimulationNoticeSimulated:
          "SMS simülasyonu: bu projede gerçek SMS gönderilmez. Canlı sitede telefon " +
          "kodu e-posta adresine gider; burada iki kod da ekranda gösterilir.",

        /**
         * Local ve preview'da kod, gönderim yanıtında dönüyor ve sayfa
         * değişince kayboluyor. Test edenin ne yapacağını bilmesi için
         * ekranda açıkça yazıyor. Production'da bu metin GÖSTERİLMEZ.
         */
        codeLabel: "6 haneli kod",
        submit: "Doğrula",
        submitting: "Doğrulanıyor…",
        resend: "Yeni kod gönder",
        /** Test ortamında düğme ne yaptığını dürüstçe söylüyor: gönderim yok, gösterim var. */
        revealCode: "Kodu göster",
        remainingAttempts: "Kalan deneme hakkı: {count}",
        verified: "Doğrulandı",
        pending: "Bekliyor",
        waitingOther: "Hesabınızın açılması için diğer kodu da doğrulamanız gerekiyor.",

        /**
         * Yalnızca local ve preview'da görünür. Production'da bu metnin
         * gösterilebileceği bir kod parçası YOKTUR — `src/config/env.ts`
         * production'da sahte kanalı zaten reddediyor.
         */
        simulationNotice:
          "Test ortamı — doğrulama kodu: {code}. Bu kutu yalnızca local ve preview " +
          "ortamlarında görünür, canlı sitede asla gösterilmez.",
      },

      success: {
        title: "Hesabınız oluşturuldu",
        body: "Kaydınız tamamlandı. Artık T.C. kimlik numaranız ve şifrenizle giriş yapabilirsiniz.",
        cta: "Giriş yap",
      },

      errors: {
        /**
         * PRD §5.0 bu mesajı ve 403 kodunu açıkça istiyor. Kimliğin var
         * olduğunu sızdırır, ama saldırgan doğum yılını zaten kendisi girdiği
         * için ek bilgi kazanmaz (ADR-012'de yazılı).
         */
        ageRestricted: "Bu hizmet 18 yaşını doldurmuş vatandaşlara açıktır.",

        identityAlreadyRegistered:
          "Bu kimlik numarasıyla daha önce bir hesap açılmış. Giriş yapabilir veya şifrenizi sıfırlayabilirsiniz.",
        emailAlreadyRegistered:
          "Bu e-posta adresi başka bir hesapta kullanılıyor. Farklı bir adres deneyin.",
        registrationExpired:
          "Kayıt işleminin süresi doldu. Güvenliğiniz için baştan başlamanız gerekiyor.",

        ...botCheckErrors,

        otpInvalid: "Kod hatalı. Lütfen e-postanıza gelen 6 haneli kodu kontrol edin.",
        otpExpired: "Kodun süresi doldu. Yeni bir kod isteyin.",
        otpTooManyAttempts: "Çok fazla hatalı deneme yaptınız. Yeni bir kod isteyin.",
        otpResendRateLimited:
          "Çok fazla kod istediniz. Güvenliğiniz için lütfen 15 dakika sonra tekrar deneyin.",

        weakPassword: "Şifreniz en az 8 karakter olmalı.",
        leakedPassword:
          "Bu şifre çok yaygın kullanılıyor ve tahmin edilmesi kolay. Lütfen başka bir şifre seçin.",
        passwordMismatch: "Şifreler birbiriyle aynı değil.",
        passwordTooLong: "Şifre 128 karakterden uzun olamaz.",
        passwordContainsPersonalData:
          "Şifreniz kimlik numaranızı, adınızı veya e-posta adresinizi içeremez.",

        invalidEmail: "Geçerli bir e-posta adresi girin.",
        invalidPhone: "Geçerli bir cep telefonu numarası girin. Örnek: 05321234567",
        invalidBirthYear: "Geçerli bir doğum yılı girin.",

        /** Kayıt kapalı: production'da e-posta sağlayıcısı henüz yapılandırılmamış. */
        registrationClosed:
          "Kayıt işlemi şu an geçici olarak kapalı. Lütfen daha sonra tekrar deneyin.",

        channelUnavailable: "Doğrulama kodu gönderilemedi. Lütfen biraz sonra tekrar deneyin.",
      },
    },

    /** Giriş akışı (PRD §5.0 "Giriş akışı" · adım 4b-2). */
    login: {
      pageTitle: "Giriş Yap",
      title: "Giriş yap",
      description: "T.C. kimlik numaranız ve şifrenizle hesabınıza girin.",

      nationalIdLabel: "T.C. kimlik numarası",
      nationalIdHelp: "11 haneli kimlik numaranız",
      passwordLabel: "Şifre",
      submit: "Giriş yap",
      submitting: "Giriş yapılıyor…",

      registerPrompt: "Hesabınız yok mu?",
      registerCta: "Kayıt olun",
      forgotPasswordCta: "Şifrenizi mi unuttunuz?",

      /** Oturum gerektiren bir sayfadan yönlendirilen kullanıcıya sebebi söylenir. */
      redirectedNotice: "Bu sayfayı görebilmek için önce giriş yapmanız gerekiyor.",

      /**
       * Şifre sıfırlamadan sonra buraya yönlendirilen kullanıcıya ne olduğu
       * söylenir. Oturumlarının düştüğü de yazıyor: diğer cihazında oturumu
       * kapanan kullanıcı bunu bir arıza sanmamalı (ADR-005).
       */
      passwordResetDoneNotice:
        "Şifreniz güncellendi. Güvenliğiniz için tüm cihazlardaki oturumlarınız kapatıldı; " +
        "yeni şifrenizle giriş yapabilirsiniz.",

      errors: {
        /**
         * TEK MESAJ — hem "böyle bir kullanıcı yok" hem "şifre yanlış" hem de
         * "kimlik numarasının kontrol basamağı hatalı" durumunda AYNI metin,
         * AYNI durum kodu (401) döner.
         *
         * HESAP SAYIMI KORUMASI (05-auth-security.md · PRD §5.0): farklı mesaj
         * vermek "bu numarayla bir hesap var, sadece şifresini bilmiyorsun"
         * bilgisini sızdırırdı. Kayıt akışındaki 409 bilinçli bir istisnaydı ve
         * BURAYA KOPYALANMADI. Yanıt SÜRESİ de eşitleniyor: kullanıcı
         * bulunamadığında sahte bir argon2 doğrulaması çalıştırılıyor
         * (`login.service.ts`), yoksa zamanlama farkı aynı bilgiyi ele verirdi.
         */
        invalidCredentials:
          "T.C. kimlik numarası veya şifre hatalı. Bilgilerinizi kontrol edip tekrar deneyin.",

        /** Kaç deneme kaldığı söylenmez — o da bilgi sızdırır. */
        tooManyAttempts:
          "Çok fazla giriş denemesi yapıldı. Güvenliğiniz için lütfen 15 dakika sonra tekrar deneyin.",

        ...botCheckErrors,
      },

      /**
       * Google ile giriş (PRD §5.0 · adım 4c).
       *
       * Düğmenin metni "Google ile giriş yap" DEĞİL, "Google ile devam et":
       * bu düğme hem giriş hem kayıt işini yapıyor ve hesabı olmayan kullanıcı
       * "giriş yap" yazan bir düğmeye basmakta tereddüt ediyor.
       */
      google: {
        cta: "Google ile devam et",
        divider: "veya",

        /**
         * Google'ın kimlik doğrulamadığı KULLANICIYA DA söyleniyor.
         * Kullanıcı, hastane randevusuna neden erişemediğini sonradan değil,
         * en baştan bilmeli (PRD §5.0 "Google KİMLİK DOĞRULAMAZ").
         */
        identityNotice:
          "Google ile giriş yalnızca e-posta adresinizi doğrular, kimliğinizi doğrulamaz. " +
          "Hastane ve spor salonu hizmetleri için ayrıca T.C. kimlik doğrulaması gerekir.",

        errors: {
          /**
           * TEK MESAJ — `state` uyuşmazlığı, PKCE hatası, geçersiz kimlik
           * jetonu, Google'ın 5xx'i ve kullanıcının izni reddetmesi hepsi
           * buraya düşer. Ayrıştırmak, saldırgana hangi korumaya takıldığını
           * söylerdi (`callback/route.ts` içinde aynı gerekçe yazılı).
           */
          failed:
            "Google ile giriş tamamlanamadı. Lütfen tekrar deneyin veya şifrenizle giriş yapın.",

          /** Akış başka bir tarayıcıda başladı ya da 10 dakikayı aştı. */
          expired:
            "Google girişi zaman aşımına uğradı. Lütfen “Google ile devam et” düğmesine tekrar basın.",

          /** Ortam değişkeni yok — kullanıcıya iç detay verilmez. */
          unavailable: "Google ile giriş şu anda kullanılamıyor. Şifrenizle giriş yapabilirsiniz.",

          tooManyAttempts: "Çok fazla deneme yapıldı. Lütfen bir süre bekleyip tekrar deneyin.",

          /**
           * HESAP BİRLEŞTİRME ENGELİ (PRD §5.0). İki sebep de aynı sonucu
           * doğuruyor ama mesaj AYRI: kullanıcı neyi kanıtlaması gerektiğini
           * bilmeli. Mesaj "bu e-postayla hesap var" demiyor — o bilgi hesap
           * sayımına yol açardı; yalnızca ne yapması gerektiğini söylüyor.
           */
          verificationRequired:
            "Bu hesaba Google bağlantısı eklemek için önce şifrenizle giriş yapmanız gerekiyor. " +
            "Giriş yaptıktan sonra profilinizden Google hesabınızı bağlayabilirsiniz.",
        },
      },
    },

    /** Şifre sıfırlama (PRD §5.0 "Şifre sıfırlama" · adım 4b-3). */
    passwordReset: {
      pageTitle: "Şifremi Unuttum",

      request: {
        title: "Şifremi unuttum",
        description:
          "T.C. kimlik numaranızı girin. Hesabınız varsa kayıtlı e-posta adresinize " +
          "6 haneli bir kod göndereceğiz.",
        descriptionSimulated:
          "TEST ORTAMI — hiçbir e-posta gönderilmez. T.C. kimlik numaranızı girin; " +
          "hesabınız varsa kodunuz bir sonraki ekranda EKRANDA gösterilir.",

        nationalIdLabel: "T.C. kimlik numarası",
        nationalIdHelp: "11 haneli kimlik numaranız",
        submit: "Kod gönder",
        submitting: "Gönderiliyor…",
        submitSimulated: "Kod oluştur",
        submittingSimulated: "Oluşturuluyor…",

        backToLogin: "Giriş ekranına dön",
      },

      verify: {
        title: "Yeni şifrenizi belirleyin",

        /**
         * HESAP SAYIMI KORUMASI METNE DE YANSIR (PRD §5.0): "kod gönderdik"
         * denseydi, cümlenin kendisi numaranın kayıtlı olduğunu doğrulardı.
         * "Hesabınız varsa" şartlı ifadesi kayıtlı ve kayıtsız numarada AYNI
         * cümlenin gösterilmesini mümkün kılıyor.
         */
        description:
          "Girdiğiniz numaraya ait bir hesap varsa, kayıtlı e-posta adresine 6 haneli " +
          "bir kod gönderdik. Kod 5 dakika geçerlidir.",
        /** Local ve preview'da gönderim YOK; söz vermemek için ayrı metin. */
        descriptionSimulated:
          "TEST ORTAMI — hiçbir e-posta gönderilmez. Girdiğiniz numaraya ait bir hesap " +
          "varsa, “Kodu göster” düğmesi kodu EKRANDA gösterir. Kod 5 dakika geçerlidir.",

        codeLabel: "6 haneli kod",
        passwordLabel: "Yeni şifre",
        passwordHelp: "En az 8 karakter.",
        passwordConfirmLabel: "Yeni şifre (tekrar)",

        submit: "Şifremi değiştir",
        submitting: "Değiştiriliyor…",

        resend: "Yeni kod gönder",
        /** Test ortamında düğme ne yaptığını dürüstçe söylüyor: gönderim yok, gösterim var. */
        revealCode: "Kodu göster",
        resending: "Gönderiliyor…",

        /**
         * "Gönderildi" değil "hesabınız varsa gönderildi": kayıtsız numarada da
         * bu ekran görülüyor ve kesin ifade hesabın varlığını doğrulardı.
         */
        resendNotice: "Hesabınız varsa yeni bir kod gönderildi.",

        /**
         * Yalnızca local ve preview'da görünür. Kayıt akışındaki kutunun aynısı.
         */
        simulationNotice:
          "Test ortamı — doğrulama kodu: {code}. Bu kutu yalnızca local ve preview " +
          "ortamlarında görünür, canlı sitede asla gösterilmez.",

        /**
         * Kayıtsız numarada da kod isteme adımı başarıyla tamamlanır ve
         * kullanıcı bu ekrana gelir. Test ortamında kod hiç gösterilmez —
         * gösterilecek bir kod üretilmediği için. Metin bunu ele vermez.
         */
        simulationNoCode:
          "Test ortamı — gösterilecek bir kod yok. Girdiğiniz numaraya ait bir hesap " +
          "bulunmadıysa bu normaldir.",
      },

      errors: {
        /**
         * Çerez yok, süresi doldu veya sıfırlama kaydı bulunamadı.
         * Kayıtlı ve kayıtsız numarada AYNI koşullarda çıkar.
         */
        resetExpired:
          "Şifre sıfırlama işleminin süresi doldu. Güvenliğiniz için baştan başlamanız gerekiyor.",

        /** Kaç deneme kaldığı söylenmez — o da bilgi sızdırır. */
        tooManyAttempts:
          "Çok fazla deneme yaptınız. Güvenliğiniz için lütfen 15 dakika sonra tekrar deneyin.",

        sendRateLimited:
          "Çok fazla kod istediniz. Güvenliğiniz için lütfen 15 dakika sonra tekrar deneyin.",

        /** Production'da e-posta sağlayıcısı yapılandırılmamışsa akış en baştan kapalı. */
        closed: "Şifre sıfırlama şu an geçici olarak kapalı. Lütfen daha sonra tekrar deneyin.",

        /** Kimlik numarası 11 haneli değil — hangi kuralın tutmadığı söylenmez. */
        invalidNationalId: "Geçerli bir T.C. kimlik numarası girin.",

        ...botCheckErrors,
      },
    },

    /** Çıkış — hem üst menüdeki düğme hem hesabım sayfası kullanıyor. */
    logout: {
      submit: "Çıkış yap",
      submitting: "Çıkış yapılıyor…",
    },

    /** Hesabım sayfası — kullanıcının YALNIZCA kendi kaydı (PRD §5.0). */
    account: {
      pageTitle: "Hesabım",
      title: "Hesabım",
      description: "Hesabınızın bilgileri ve erişim durumunuz.",

      fields: {
        fullName: "Ad soyad",
        nationalId: "T.C. kimlik numarası",
        email: "E-posta adresi",
        phone: "Cep telefonu",
        identityStatus: "Kimlik durumu",
        staffStatus: "Personel durumu",
      },

      identityStatusLabels: {
        unverified: "Doğrulanmamış",
        kps_verified: "Nüfus kayıtlarıyla doğrulandı",
      },

      staffStatusLabels: {
        staff: "Kurum personeli",
        citizen: "Vatandaş",
      },

      /** Kimlik numarası burada bile maskeli gösterilir (05-auth-security.md). */
      maskedNotice: "Kimlik numaranız güvenlik gereği maskeli gösterilir.",
    },

    /**
     * Erişim kademeleri (PRD §5.0 tablosu).
     *
     * ÜÇ FARKLI DURUM, ÜÇ FARKLI MESAJ — ve bu PRD'nin açık isteği:
     * eksiğin ne olduğunu bilmeyen kullanıcı ne yapacağını da bilemez.
     */
    access: {
      signInRequired: {
        title: "Giriş yapmanız gerekiyor",
        description: "Bu sayfayı görmek için hesabınızla giriş yapın.",
        cta: "Giriş yap",
      },
      identityRequired: {
        title: "Kimlik doğrulaması gerekiyor",
        description:
          "Bu hizmet için kimlik doğrulaması gerekiyor. Nüfus kayıtlarıyla doğrulama adımını tamamlayın.",
        cta: "Kimlik doğrulamasına git",
      },
      /** Yönlendirme YOK: personel olmak kullanıcının tamamlayabileceği bir adım değil. */
      staffOnly: {
        title: "Bu hizmet yalnızca kurum personeline açıktır",
        description:
          "Hastane ve spor salonu hizmetleri belediyenin personel sağlık birimi ve " +
          "personel spor tesisidir. Kayıt oluşturulamaz.",
      },
    },
  },

  /** Üst menü — oturum durumuna göre değişir. */
  nav: {
    home: "Ana sayfa",
    login: "Giriş yap",
    register: "Kayıt ol",
    account: "Hesabım",
    /** Yalnızca giriş yapmış kullanıcıya görünür — girişsiz kullanıcının
        siparişi ve bildirimi olamaz, boş bir sayfaya bağlantı vermenin
        anlamı yok. Gizlemek burada KOLAYLIK; kapı sayfanın kendisinde. */
    orders: "Siparişlerim",
    notifications: "Bildirimler",
    market: "Market",
    restaurant: "Restoran",
    events: "Etkinlikler",
    hospital: "Hastane",
    gym: "Spor salonu",
    support: "Destek",
    /** Ekran okuyucular için: menünün ne olduğu söylenmeli (WCAG 2.1 AA). */
    label: "Ana menü",

    /** Mobilde menüyü açıp kapatan düğme; adı duruma göre değişir. */
    openMenu: "Menüyü aç",
    closeMenu: "Menüyü kapat",

    /**
     * Klavye kullanıcısı her sayfada menünün tamamını tek tek geçmek zorunda
     * kalmasın diye ilk odaklanan bağlantı (WCAG 2.1 AA "Bypass Blocks").
     */
    skipToContent: "İçeriğe geç",
  },

  /**
   * Personele özel hizmetlerin iskeletleri. Modüllerin kendisi roadmap'te
   * kendi adımlarında gelecek; bu sayfalar şimdilik YALNIZCA erişim kapısının
   * çalıştığını gösteriyor ve bunu kullanıcıya dürüstçe söylüyor.
   */
  staffServices: {
    hospital: {
      pageTitle: "Hastane Randevusu",
      title: "Hastane randevusu",
      description: "Personel sağlık birimi randevu hizmeti.",
    },
    gym: {
      pageTitle: "Spor Salonu",
      title: "Spor salonu üyeliği",
      description: "Personel spor tesisi üyelik hizmeti.",
    },
    comingSoon: "Bu hizmet henüz açılmadı; yakında burada olacak.",
  },

  /** Hastane randevu modülü (PRD §5.1 · adım 6). */
  hospital: {
    pageTitle: "Hastane Randevusu",
    title: "Hastane randevusu",
    description: "Personel sağlık biriminden randevu alın. Randevular ücretsizdir.",

    /**
     * Doktor unvanlarının Türkçe karşılıkları.
     *
     * Veritabanındaki enum değerleri İngilizce (`professor`,
     * `associate_professor`, …); kullanıcıya gösterilen karşılıkları burada
     * (data-model.md → "Enum değerleri İngilizce; kullanıcıya gösterilen
     * karşılıkları src/config/ altında").
     */
    doctorTitles: {
      professor: "Prof. Dr.",
      associate_professor: "Doç. Dr.",
      specialist: "Uzm. Dr.",
      physician: "Dr.",
    },

    /** Branş kartındaki doktor sayısı. */
    doctorCount: (count: number) => `${count} doktor`,

    /**
     * Gün şeridindeki boş saat sayısı.
     *
     * Sayı gösteriliyor çünkü hiç boş saati olmayan güne tıklayıp boş liste
     * görmek kullanıcıyı iki kez uğraştırır; şeritte görünen "0 boş" o günü
     * baştan eler.
     */
    freeCount: (count: number) => (count === 0 ? "0 boş" : `${count} boş`),

    /** Adım adım akışın gezinme metinleri. */
    steps: {
      specialty: "Branş seçin",
      doctor: "Doktor seçin",
      slot: "Gün ve saat seçin",
      backToSpecialties: "Branşlar",
      backToDoctors: "Doktorlar",
      /** Ekran okuyucu, kullanıcının akışın neresinde olduğunu bilmeli. */
      breadcrumbLabel: "Randevu adımları",
    },

    myAppointments: {
      pageTitle: "Randevularım",
      title: "Randevularım",
      description: "Yaklaşan randevularınızı görüntüleyin ve iptal edin.",
      link: "Randevularım",
      upcomingHeading: "Yaklaşan randevular",
      pastHeading: "Geçmiş ve iptal edilen randevular",
      empty: "Henüz randevunuz yok. Branş seçerek randevu alabilirsiniz.",
      pastEmpty: "Geçmiş randevunuz bulunmuyor.",
      newAppointment: "Yeni randevu al",
      statusCancelled: "İptal edildi",
      statusPast: "Tamamlandı",
    },

    slots: {
      /** Saat düğmesinin erişilebilir adı — yalnızca "09:20" yazmak yetmez. */
      bookLabel: (time: string, doctor: string) => `${time} · ${doctor} · randevu al`,
      booked: "Dolu",
      bookedLabel: (time: string) => `${time} · dolu, seçilemez`,
      booking: "Alınıyor…",
      /** Kart üstündeki saat listesinin başlığı. */
      heading: "Uygun saatler",
    },

    /**
     * Boş durumlar. "Sonuç yok" demek yetmez; kullanıcıya NE YAPACAĞI söylenir
     * (07-ui-design-system.md → zorunlu ekran durumları).
     */
    empty: {
      specialties: "Şu an randevu verilen bir branş bulunmuyor.",
      doctors: "Bu branşta şu an randevu veren doktor bulunmuyor. Başka bir branş seçin.",
      slots: "Bu doktorun önümüzdeki günlerde boş saati kalmamış. Başka bir doktor seçin.",
      daySlots: "Seçtiğiniz günde boş saat kalmamış. Başka bir gün seçin.",
    },

    /** Yükleniyor durumu — iskelet kutular çizilirken ekran okuyucuya söylenir. */
    loading: "Randevu bilgileri yükleniyor…",

    cancel: {
      action: "İptal et",
      pending: "İptal ediliyor…",
      /** Geri alınamaz bir işlem; onay istenir (07-ui-design-system.md). */
      confirmTitle: "Randevuyu iptal etmek istiyor musunuz?",
      confirmBody:
        "Randevunuz iptal edilecek ve saat başkalarına açılacak. Bu işlem geri alınamaz.",
      confirmAction: "Evet, iptal et",
      confirmDismiss: "Vazgeç",
      /** İptal penceresi kapandığında düğmenin yerini bu açıklama alır. */
      closed: "Randevuya 2 saatten az kaldığı için iptal edilemez.",
      success: "Randevunuz iptal edildi.",
    },

    booked: {
      success: "Randevunuz oluşturuldu.",
    },

    /**
     * Hata metinleri. Dördü de KURAL ihlali, arıza değil: kullanıcıya ne
     * olduğunu ve bundan sonra ne yapabileceğini söylerler.
     */
    errors: {
      slotTaken: "Bu saat az önce başkası tarafından alındı. Lütfen listeden başka bir saat seçin.",
      slotInPast: "Geçmiş bir saate randevu alınamaz. Lütfen ileri bir tarih seçin.",
      slotNotFound: "Seçtiğiniz saat artık takvimde yok. Lütfen listeyi yenileyip tekrar deneyin.",
      /**
       * PRD §5.1 (2026-08-03 güncellemesi). Mesaj kullanıcıya İKİ çıkış yolu
       * söylüyor: bekle ya da iptal et. "Randevunuz var" demek yeterli
       * olmazdı — kullanıcı ne yapacağını bilemezdi.
       */
      activeSpecialtyAppointment:
        "Bu branşta bekleyen bir randevunuz var. Yeni randevu alabilmek için mevcut randevunuzun tarihini bekleyin veya onu iptal edin.",
      appointmentNotFound: "Randevu bulunamadı. Listeyi yenileyip tekrar deneyin.",
      alreadyCancelled: "Bu randevu zaten iptal edilmiş.",
      cancellationTooLate: "Randevuya 2 saatten az kaldığı için iptal edilemez.",
      tooManyAttempts:
        "Kısa sürede çok fazla randevu işlemi yaptınız. Lütfen 15 dakika sonra tekrar deneyin.",
    },
  },
  /** Belediye Market (PRD §5.3 · adım 8). */
  market: {
    pageTitle: "Belediye Market",
    title: "Belediye Market",
    description:
      "Temel gıda ve temizlik ürünlerini sepete ekleyin, paket servisle adresinize gelsin.",

    search: {
      label: "Ürün ara",
      placeholder: "Ürün adı veya açıklaması",
      submit: "Ara",
      clear: "Aramayı temizle",
    },

    filters: {
      /** Süzgeç şeridinin ekran okuyucudaki adı. */
      label: "Kategoriler",
      all: "Tümü",
      /** Kategori rozetindeki ürün sayısı. */
      itemCount: (count: number) => `${count} ürün`,
    },

    /**
     * Süzgeç sonucu boşsa gösterilen metin.
     *
     * Arama metni geri gösteriliyor ki kullanıcı ne aradığını görsün —
     * "sonuç yok" tek başına yazım hatasını fark ettirmez.
     */
    empty: {
      title: "Aradığınız ürün bulunamadı",
      withQuery: (query: string) => `"${query}" için sonuç çıkmadı. Farklı bir kelime deneyin.`,
      withoutQuery: "Bu kategoride şu an ürün yok.",
      reset: "Tüm ürünleri göster",
    },

    product: {
      outOfStock: "Tükendi",
      /**
       * Az stokta uyarısı.
       *
       * Eşik altında sayı gösteriliyor: "son 3 adet" bilgisi kullanıcının
       * sepete eklerken kaç adet isteyebileceğini baştan söylüyor, deneme
       * yanılmaya bırakmıyor.
       */
      lowStock: (stock: number) => `Son ${stock} adet`,
      addToCart: "Sepete ekle",
      adding: "Ekleniyor…",
      /** Ekran okuyucu için: "Sepete ekle" tek başına hangi ürün belirsiz. */
      addToCartLabel: (name: string) => `${name} ürününü sepete ekle`,
    },

    toast: {
      added: (name: string) => `${name} sepete eklendi.`,
      goToCart: "Sepete git",
      /** Beklenmeyen hatada kullanıcıya gösterilen genel metin. */
      failed: "Ürün sepete eklenemedi. Lütfen tekrar deneyin.",
    },
  },

  /** Belediye Restoran ve adisyon (PRD §5.4 · adım 9). */
  restaurant: {
    pageTitle: "Belediye Restoran",
    title: "Belediye Restoran",
    description:
      "Menüden seçtiklerinizi adisyonunuza ekleyin, notunuzu yazın, paket servisle adresinize gelsin.",

    search: {
      label: "Menüde ara",
      placeholder: "Yemek adı veya içeriği",
      submit: "Ara",
      clear: "Aramayı temizle",
    },

    filters: {
      label: "Menü kategorileri",
      all: "Tümü",
      itemCount: (count: number) => `${count} kalem`,
    },

    empty: {
      title: "Aradığınız kalem menüde yok",
      withQuery: (query: string) => `"${query}" için sonuç çıkmadı. Farklı bir kelime deneyin.`,
      withoutQuery: "Bu kategoride şu an kalem yok.",
      reset: "Tüm menüyü göster",
    },

    item: {
      /**
       * Markette "Tükendi" yazıyor çünkü orada stok sayısı var; burada yalnızca
       * "var / yok" bilgisi var ve mutfak yarın yeniden yapabilir.
       */
      unavailable: "Bugün yok",
      addToTab: "Adisyona ekle",
      /** Ekran okuyucu için: "Adisyona ekle" tek başına hangi kalem belirsiz. */
      addToTabLabel: (name: string) => `${name} kalemini adisyona ekle`,
    },

    /**
     * Kartın içinde açılan adet + not formu — adım 9'un tek yeni kavramı.
     *
     * MODAL PENCERE DEĞİL, KARTIN İÇİNDE AÇILAN BİR BÖLÜM: modal, odak
     * tuzağı ve kapatma davranışı için yeni bir bağımlılık gerektirirdi;
     * kazancı ise yok — form üç alanlık ve sayfanın geri kalanını
     * kilitlemesi gerekmiyor.
     */
    form: {
      heading: (name: string) => `${name} — adisyona ekle`,
      quantity: "Adet",
      note: "Mutfak notu (isteğe bağlı)",
      notePlaceholder: "Örn. az acılı, soğansız",
      noteHelp: "En fazla 200 karakter. Notu daha sonra sepetten de düzenleyebilirsiniz.",
      submit: "Adisyona ekle",
      submitting: "Ekleniyor…",
      cancel: "Vazgeç",
    },

    /** Sayfanın sağındaki adisyon paneli — sepetin restoran bölümünün kendisi. */
    tab: {
      heading: "Adisyonunuz",
      description: "Adisyondaki kalemler sepetinizin restoran bölümünde bekliyor.",
      empty: "Adisyonunuz henüz boş. Menüden bir kalem ekleyin.",
      subtotal: "Ara toplam",
      goToCart: "Sepete git",
      /** Hazırlık süresi bir TAHMİN, sipariş kaydına yazılmıyor (PRD §5.4). */
      prepTime: (min: number, max: number) => `Tahmini hazırlık: ${min}-${max} dakika`,
    },

    toast: {
      added: (name: string) => `${name} adisyona eklendi.`,
      goToCart: "Sepete git",
      failed: "Kalem adisyona eklenemedi. Lütfen tekrar deneyin.",
    },
  },
  /** Etkinlik, salon planı ve koltuk kilidi (PRD §5.2 · adım 11). */
  events: {
    pageTitle: "Etkinlikler",
    title: "Etkinlik ve bilet",
    description:
      "Konser ve gösteri programına göz atın, salon planından koltuğunuzu seçin, biletinizi alın.",

    search: {
      label: "Etkinlik ara",
      placeholder: "Etkinlik adı veya sanatçı",
      submit: "Ara",
      clear: "Aramayı temizle",
    },

    filters: {
      label: "Etkinlik türleri",
      all: "Tümü",
      itemCount: (count: number) => `${count} etkinlik`,
    },

    empty: {
      title: "Aradığınız etkinlik bulunamadı",
      withQuery: (query: string) => `"${query}" için sonuç çıkmadı. Farklı bir kelime deneyin.`,
      withoutQuery: "Bu türde şu an planlanmış etkinlik yok.",
      reset: "Tüm etkinlikleri göster",
    },

    /** `EventCategory` enum'unun ekrandaki karşılıkları (CLAUDE.md §0 dil kuralı). */
    categories: {
      concert: "Konser",
      theatre: "Tiyatro",
      kids: "Çocuk",
    },

    card: {
      /** Boş koltuk sayısı — süresi dolmuş kilitler boş sayılır (ADR-007). */
      availableSeats: (count: number) => `${count} boş koltuk`,
      soldOut: "Tükendi",
      priceFrom: (price: string) => `${price} / koltuk`,
      details: "Koltuk seç",
      detailsLabel: (name: string) => `${name} etkinliği için koltuk seç`,
    },

    detail: {
      backToList: "Tüm etkinlikler",
      /** Ekran okuyucu için alan adları — ikonlar tek başına bilgi taşımaz. */
      performerHeading: "Sanatçı",
      dateHeading: "Tarih",
      venueHeading: "Mekân",
      /** Sahnenin salon planındaki yeri — kullanıcı yönünü bilmeden koltuk seçemez. */
      stage: "SAHNE",
      seatMapHeading: "Salon planı",
      seatMapHelp:
        "Boş koltuklara basarak seçim yapın. Seçtiğiniz koltuk 10 dakika size ayrılır ve sepetinize eklenir.",
      blockLabel: (block: string) => `${block} Blok`,
      rowLabel: (row: string) => `${row}. sıra`,
      legendAvailable: "Boş",
      legendSelected: "Sizin seçiminiz",
      legendTaken: "Dolu",
      /** Ekran okuyucu bir koltuğun tam adresini tek cümlede duymalı. */
      seatLabel: (block: string, row: string, seat: number) =>
        `${block} Blok, ${row}. sıra, ${seat}. koltuk`,
      seatTakenLabel: (block: string, row: string, seat: number) =>
        `${block} Blok, ${row}. sıra, ${seat}. koltuk — dolu`,
      selectedHeading: "Seçtiğiniz koltuklar",
      goToCart: "Sepete git",
      signInToSelect: "Koltuk seçmek için giriş yapın",
      started: "Bu etkinlik başladı; koltuk seçimi kapandı.",
      soldOut: "Bu etkinlikte boş koltuk kalmadı.",
    },

    /**
     * Kalan süre geri sayımı.
     *
     * Dakika:saniye biçiminde çünkü son bir dakikada yalnızca dakika göstermek
     * kullanıcıya "hâlâ 1 dakikam var" dedirtip koltuğu kaybettirirdi.
     */
    countdown: {
      label: (remaining: string) => `Koltuk süresi: ${remaining}`,
      expired: "Süre doldu",
    },

    toast: {
      held: (seat: string) => `${seat} sepetinize eklendi.`,
      released: (seat: string) => `${seat} bırakıldı.`,
      failed: "Koltuk seçilemedi. Lütfen tekrar deneyin.",
    },

    errors: {
      notFound: "Etkinlik bulunamadı.",
      seatNotFound: "Koltuk bulunamadı.",
      eventStarted: "Bu etkinlik başladı; bilet satışı kapandı.",
      seatTaken: "Bu koltuk az önce başkası tarafından alındı. Başka bir koltuk seçin.",
      holdNotFound: "Koltuk süreniz dolmuş olabilir. Salon planını yenileyin.",
      tooManyHolds:
        "Aynı anda en fazla 8 koltuk tutabilirsiniz. Ödemeyi tamamlayın ya da bir koltuğu bırakın.",
      tooManyAttempts: "Çok fazla deneme yaptınız. Lütfen biraz bekleyip tekrar deneyin.",
      signInRequired: "Koltuk seçmek için giriş yapmanız gerekiyor.",
    },
  },

  /**
   * Spor salonu üyeliği (PRD §5.6 · adım 12) — PERSONELE ÖZEL.
   *
   * ═══ BU MODÜLÜN METİNLERİ NEDEN BU KADAR AÇIK ═══
   *
   * Üyelik, kullanıcının tek tıkla girdiği ama aylarca sürecek bir taahhüt.
   * PRD §5.6 "bu kural satın alma öncesi ekranda açıkça gösterilir" diyor ve
   * bunu iki yerde istiyor: taahhüt süresi ve erken çıkış farkı. Metinler
   * TUTARI ve TARİHİ birlikte veriyor — "indirimlisiniz" gibi tek yanlı bir
   * cümle, aynı ekranın kullanıcıya söylemesi gereken bedeli gizlerdi.
   */
  gym: {
    pageTitle: "Spor Salonu",
    title: "Spor salonu üyeliği",
    description:
      "Belediye personel spor tesisine üye olun. Tüm paketler aylık tahsil edilir; " +
      "peşin toplu ödeme yoktur.",
    loading: "Spor salonu bilgileri yükleniyor",

    facility: {
      heading: "Tesis",
      addressHeading: "Adres",
      amenitiesHeading: "Tesiste neler var",
      hoursHeading: "Salon saatleri",
      closed: "Kapalı",
      scheduleHeading: "Haftalık ders programı",
      scheduleNote:
        "Derslere önceden kayıt alınmaz; üyeler ders saatinde stüdyoya gelir. Program aylık güncellenir.",
      classDuration: (minutes: number) => `${minutes} dk`,
      noClasses: "Bu gün grup dersi yok.",
    },

    plans: {
      heading: "Üyelik paketleri",
      note:
        "Uzun taahhüt aylık ücreti düşürür. Hangi paketi seçerseniz seçin tahsilat aylıktır; " +
        "tutarın tamamı peşin alınmaz.",
      monthlyPrice: (price: string) => `${price} / ay`,
      noCommitment: "Taahhüt yok",
      commitment: (months: number) => `${months} ay taahhüt`,
      discountBadge: (percent: number) => `%${percent} indirimli`,
      choose: "Bu paketi seç",
      chooseLabel: (name: string) => `${name} paketini seç`,
      current: "Mevcut paketiniz",
      switchTo: "Bu pakete geç",
      switchToLabel: (name: string) => `${name} paketine geç`,
      empty: "Şu an tanımlı üyelik paketi yok.",
    },

    /** Satın alma ekranı — üyelik SEPETE GİRMEZ, kendi akışı vardır (PRD §5.6). */
    purchase: {
      pageTitle: "Üyelik başlat",
      heading: "Üyeliği başlat",
      backToPlans: "Paketlere dön",
      summaryHeading: "Seçtiğiniz paket",
      firstChargeHeading: "Bugün tahsil edilecek",
      firstChargeNote: "İlk ay şimdi tahsil edilir; sonraki aylar her ayın aynı gününde çekilir.",
      nextBillingLabel: "Sonraki tahsilat",
      commitmentEndsLabel: "Taahhüt bitişi",

      /**
       * Onay kutusu METNİ İKİ ŞEYİ BİRDEN SÖYLÜYOR: taahhüt süresi ve
       * erken çıkarsa ne olacağı. PRD §5.6 ikisinin de satın alma ÖNCESİ
       * gösterilmesini istiyor; ayrı ayrı iki kutu, kullanıcının ikincisini
       * okumadan işaretlemesinin en kısa yolu olurdu.
       */
      termsHeading: "Taahhüt ve erken çıkış",
      termsNoCommitment:
        "Bu pakette taahhüt yoktur. Üyeliğinizi istediğiniz zaman iptal edebilirsiniz; " +
        "iptal ettiğinizde ödediğiniz ayın sonuna kadar tesisi kullanmaya devam edersiniz.",
      termsCommitment: (months: number, monthlyGap: string) =>
        `Bu pakette ${months} ay taahhüt vardır. Taahhüt süresi dolmadan iptal ederseniz, ` +
        `o güne kadar ödediğiniz aylar taahhütsüz fiyattan yeniden hesaplanır ve ` +
        `aradaki fark (ay başına ${monthlyGap}) iptal anında kartınızdan tek seferde tahsil edilir.`,
      termsAccept: "Taahhüt ve erken çıkış kuralını okudum, kabul ediyorum.",

      /**
       * Yeni kart MUTLAKA KAYDEDİLİR ve bu bir tercih değil zorunluluk:
       * üyelik her ay aynı karttan çekilecek. Kaydedilmezse ikinci ay
       * tahsilat yapılamaz ve üyelik daha ilk yenilemede ödeme bekliyora
       * düşerdi. Kullanıcıya sessizce yapılmıyor — burada yazıyor.
       */
      cardSaveNotice:
        "Aylık tahsilat için kartınız hesabınıza kaydedilir. Kart numarası saklanmaz; " +
        "yalnızca markası ve son 4 hanesi tutulur.",
      submit: "Üyeliği başlat ve ilk ayı öde",
      submitting: "Tahsilat yapılıyor…",
    },

    /** Üyelik ekranı (PRD §5.6 "Profilde görünür" listesinin karşılığı). */
    membership: {
      pageTitle: "Üyeliğim",
      heading: "Üyeliğim",
      backToGym: "Spor salonu sayfası",
      viewMembership: "Üyeliğimi görüntüle",
      planLabel: "Paket",
      statusLabel: "Durum",
      startedLabel: "Başlangıç",
      commitmentEndsLabel: "Taahhüt bitişi",
      nextBillingLabel: "Sonraki tahsilat",
      nextAmountLabel: "Sonraki tutar",
      autoRenewLabel: "Otomatik yenileme",
      autoRenewOn: "Açık",
      autoRenewOff: "Kapalı",
      cardLabel: "Tahsilat kartı",
      noCommitment: "Taahhüt yok",
      endsAt: (date: string) => `Üyeliğiniz ${date} tarihinde sona erecek.`,
      paymentDueBy: (date: string) =>
        `Son tahsilat başarısız oldu. ${date} tarihine kadar ödeme yapılmazsa üyeliğiniz pasifleşir.`,

      /** `MembershipStatus` enum'unun ekrandaki karşılıkları. */
      statuses: {
        active: "Aktif",
        cancelled: "İptal edildi",
        payment_pending: "Ödeme bekliyor",
        expired: "Sona erdi",
      },

      pendingChange: (planName: string, date: string, price: string) =>
        `${date} tarihinde ${planName} paketine geçeceksiniz. Yeni aylık tutar: ${price}`,
      cancelPendingChange: "Paket değişimini iptal et",

      historyHeading: "Ödeme geçmişi",
      historyEmpty: "Henüz tahsilat kaydı yok.",
      historyPeriod: (start: string, end: string) => `${start} – ${end}`,
      /** `MembershipPaymentKind` ve `MembershipPaymentStatus` karşılıkları. */
      paymentKinds: {
        renewal: "Aylık aidat",
        early_exit_fee: "Erken çıkış farkı",
      },
      paymentStatuses: {
        success: "Başarılı",
        failed: "Başarısız",
      },

      changeHeading: "Paket değiştir",
      changeNote: (date: string) =>
        `Yeni paket ${date} tarihindeki tahsilatla yürürlüğe girer. Ödediğiniz ay kısalmaz veya uzamaz.`,
      /**
       * Taahhütsüze (ya da daha kısa taahhüde) düşme de erken çıkış farkı
       * doğurur (PRD §5.6). Metin farkı ONAYDAN ÖNCE ve TL cinsinden veriyor;
       * iptaldeki metinden ayrı çünkü burada üyelik devam ediyor.
       */
      changeWithFee: (fee: string) =>
        `Taahhüdünüz sürüyor. Daha kısa taahhütlü bir pakete geçerseniz erken çıkış farkı olarak ` +
        `${fee} kartınızdan tek seferde tahsil edilir. Üyeliğiniz devam eder.`,

      /**
       * İPTAL SATIR İÇİ ONAYLA: shadcn'de Dialog bileşeni yok ve bilerek
       * eklenmedi (07-ui-design-system.md · adım 10'daki sipariş iptaliyle
       * aynı desen). Onay, tutarı gösteren metnin hemen altında açılıyor.
       */
      cancelHeading: "Üyeliği iptal et",
      cancel: "Üyeliği iptal et",
      cancelling: "İptal ediliyor…",
      cancelConfirm: "Evet, iptal et",
      cancelDismiss: "Vazgeç",
      cancelNoFee: (date: string) =>
        `Üyeliğiniz iptal edilecek ve ${date} tarihine kadar tesisi kullanmaya devam edeceksiniz. Ek ücret alınmaz.`,
      cancelWithFee: (fee: string, months: number, date: string) =>
        `Taahhüdünüz sürüyor. İptal ederseniz ödediğiniz ${months} ay taahhütsüz fiyattan ` +
        `yeniden hesaplanacak ve ${fee} tutarındaki fark kartınızdan tek seferde tahsil edilecek. ` +
        `Tesisi ${date} tarihine kadar kullanmaya devam edersiniz.`,

      empty: {
        title: "Aktif üyeliğiniz yok",
        description: "Yukarıdaki paketlerden birini seçerek üyelik başlatabilirsiniz.",
      },
    },

    toast: {
      created: "Üyeliğiniz başladı ve ilk ay tahsil edildi.",
      cancelled: "Üyeliğiniz iptal edildi.",
      planChangeScheduled: "Paket değişiminiz sıraya alındı.",
      planChangeCleared: "Paket değişimi iptal edildi.",
      failed: "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
    },

    errors: {
      planNotFound: "Seçtiğiniz üyelik paketi bulunamadı. Sayfayı yenileyip tekrar deneyin.",
      membershipNotFound: "Üyelik bulunamadı.",
      /**
       * PRD §5.6 KURALI: "Aktif üyelik varken ikinci üyelik alınamaz —
       * 'paket değiştir' önerilir." Hata mesajı bu yüzden yalnızca reddetmiyor,
       * kullanıcıyı doğru yere yönlendiriyor.
       */
      alreadyMember:
        "Zaten aktif bir üyeliğiniz var. İkinci üyelik alınamaz; üyelik sayfanızdan paket değiştirebilirsiniz.",
      noMembership: "Aktif bir üyeliğiniz yok.",
      termsNotAccepted: "Devam etmek için taahhüt ve erken çıkış kuralını onaylayın.",
      samePlan: "Zaten bu paketi kullanıyorsunuz.",
      /** Erken çıkış farkı ekranda gösterilenden farklıysa: kullanıcı eski bir sayfaya bakıyor. */
      feeChanged:
        "Erken çıkış farkı bu arada değişti. Güncel tutarı görmek için sayfayı yenileyin.",
      declined: "Kartınız reddedildi. Farklı bir kartla tekrar deneyin.",
      insufficientFunds: "Kartınızda yeterli bakiye yok. Farklı bir kartla tekrar deneyin.",
      invalidRequest:
        "Üyelik bilgilerinde eksik veya hatalı bir alan var. Paket ve kart bilgilerinizi kontrol edip tekrar deneyin.",
      alreadyProcessed: "Bu işlem zaten yapılmış. Üyelik sayfanızı yenileyin.",
      tooManyAttempts:
        "Çok fazla üyelik işlemi denediniz. Güvenliğiniz için lütfen 15 dakika sonra tekrar deneyin.",
      cardRequired: "Aylık tahsilat için bir kart seçin veya yeni kart girin.",
    },
  },

  /** Ortak sepet (PRD §4 · adım 7). */
  cart: {
    pageTitle: "Sepetim",
    title: "Sepetim",
    description:
      "Market, restoran ve etkinlik ürünleriniz tek sepette toplanır ve tek seferde ödenir.",
    navLabel: "Sepet",

    /** Modül başlıkları — `CartItemType` enum'ıyla birebir aynı anahtarlar. */
    sections: {
      market: "Belediye Market",
      restaurant: "Belediye Restoran",
      event: "Etkinlik bileti",
    },

    empty: {
      title: "Sepetiniz boş",
      description: "Hizmetlerden ürün ekledikçe burada görünecek.",
      cta: "Hizmetlere göz at",
    },

    line: {
      quantity: "Adet",
      increase: (name: string) => `${name} adedini artır`,
      decrease: (name: string) => `${name} adedini azalt`,
      remove: (name: string) => `${name} ürününü sepetten çıkar`,
      removeAction: "Çıkar",
      unitPrice: "Birim fiyat",
      note: "Not",

      /**
       * Mutfak notunun düzenlenmesi (PRD §5.4). Yalnızca restoran satırlarında
       * gösteriliyor: markette bir ürüne not bırakmanın karşılığı yok, alan
       * her satırda görünseydi kullanıcı yazdığı notun bir işe yaradığını
       * sanırdı.
       */
      noteAdd: "Not ekle",
      noteChange: "Notu değiştir",
      noteEdit: (name: string) => `${name} kaleminin notunu düzenle`,
      notePlaceholder: "Örn. az acılı, soğansız",
      noteSave: "Notu kaydet",
      noteSaving: "Kaydediliyor…",
      noteCancel: "Vazgeç",
      noteSaved: "Not güncellendi.",
    },

    summary: {
      heading: "Sipariş özeti",
      subtotal: "Ara toplam",
      deliveryFee: "Teslimat ücreti",
      freeDelivery: "Ücretsiz",
      /**
       * Eşiğe ne kadar kaldığını söylemek, kullanıcıyı boşuna tahmin ettirmez.
       *
       * MODÜL ADI PARAMETRE: market ve restoranın ayrı eşikleri var (PRD §6.1)
       * ve ipucu hangi bölümün altındaysa onu söylemeli. Metne "market"
       * gömülü kalsaydı restoran bölümünde yanlış bilgi verirdi.
       */
      freeDeliveryHint: (remaining: string, sectionName: string) =>
        `${remaining} daha ekleyin, ${sectionName} teslimatı ücretsiz olsun.`,
      total: "Genel toplam",
      checkout: "Ödemeye geç",
      /** Ödeme adımı giriş zorunlu (PRD §4). */
      signInToCheckout: "Ödeme için giriş yapın",
    },

    errors: {
      itemNotFound: "Bu ürün artık satışta değil. Sepetten çıkarıp devam edebilirsiniz.",
      outOfStock: "Bu üründen yeterli stok kalmamış.",
      unavailable: "Bu ürün şu an satışta değil.",
      quantityTooHigh: "Bir üründen en fazla 20 adet alabilirsiniz.",
      cartTooLarge: "Sepette en fazla 50 farklı ürün olabilir.",
      cartEmpty: "Sepetiniz boş. Ödeme yapabilmek için önce ürün ekleyin.",
      tooManyAttempts: "Kısa sürede çok fazla işlem yaptınız. Lütfen biraz sonra tekrar deneyin.",
    },
  },

  /** Sahte kart ödemesi (PRD §6.1 · §6.2 · adım 7). */
  payment: {
    pageTitle: "Ödeme",
    title: "Ödeme",
    description: "Kart bilgileriniz saklanmaz; bu bir örnek projedir ve gerçek tahsilat yapılmaz.",

    /** Ekranda KALICI uyarı: kullanıcı gerçek kart girmemeli. */
    fakeNotice:
      "Bu bir örnek projedir. Gerçek kart bilgisi girmeyin — sahte test kartlarını kullanın.",

    delivery: {
      heading: "Teslimat",
      addressLabel: "Teslimat adresi",
      addressPlaceholder: "Adres seçin",
      slotLabel: "Teslimat zaman aralığı",
      newAddress: "Yeni adres ekle",
      newAddressTitle: "Adres başlığı",
      newAddressFull: "Açık adres",
      newAddressDistrict: "İlçe",
      saveAddress: "Adresi kaydet",
      ticketNotice: "Etkinlik bileti için teslimat gerekmez; bilet hesabınıza tanımlanır.",
      /**
       * Restoran siparişinde ZAMAN ARALIĞI SORULMUYOR (PRD §5.4): market
       * "yarın 10:00-12:00" gibi bir pencere seçtirirken restoran siparişi
       * ödeme sonrası hemen hazırlanmaya başlar. Kullanıcıya sorulacak bir şey
       * yok, söylenecek bir şey var — bu yüzden seçim değil bilgi metni.
       */
      prepTimeNotice: (min: number, max: number) =>
        `Restoran siparişiniz ödemeden hemen sonra hazırlanmaya başlar. Tahmini hazırlık süresi ${min}-${max} dakikadır.`,
    },

    card: {
      heading: "Kart bilgileri",
      savedHeading: "Kayıtlı kartlarım",
      useNew: "Yeni kart kullan",
      number: "Kart numarası",
      holder: "Kart üzerindeki isim",
      expiry: "Son kullanma (AA/YYYY)",
      /**
       * Etiketler AÇIK yazılıyor ("Ay" değil "Son kullanma ayı").
       * Kısa hâli hem ekran okuyucuda bağlamsız kalıyordu hem de sayfadaki
       * başka metinlerle karışıyordu — testte fiilen çakıştı.
       */
      expiryMonth: "Son kullanma ayı",
      expiryYear: "Son kullanma yılı",
      cvv: "CVV",

      /**
       * ÖRNEKLER ALANIN ALTINDA, İÇİNDE DEĞİL.
       *
       * Önce yer tutucu (`placeholder`) olarak duruyorlardı ve fiilen yanılttı:
       * kullanıcı kutunun içindeki soluk `12` metnini yazılmış bir değer sanıp
       * son kullanma alanlarını boş bıraktı, ödeme reddedildi. Yer tutucu bir
       * ÖRNEK değil bir İPUÇU gibi okunuyor; kayıt formundaki "Örnek: 1990"
       * deseni bu yüzden alanın altında duruyor (07-ui-design-system.md).
       */
      numberHelp: "Örnek: 4111 1111 1111 1111",
      expiryMonthHelp: "Örnek: 12",
      expiryYearHelp: "Örnek: 2030",
      cvvHelp: "Kartın arkasındaki 3 haneli kod. Örnek: 123",
      save: "Bu kartı sonraki ödemeler için kaydet",
      /** Kayıtlı kart etiketinde YALNIZCA son 4 hane geçer. */
      maskedLabel: (brand: string, last4: string) => `${brand} •••• ${last4}`,
      /** Şemadaki `CardBrand` enum'ıyla birebir aynı anahtarlar. */
      brands: {
        visa: "Visa",
        mastercard: "Mastercard",
      },
    },

    submit: "Ödemeyi tamamla",
    submitting: "Ödeme işleniyor…",

    success: {
      title: "Ödemeniz alındı",
      description: "Siparişleriniz oluşturuldu.",
      receiptHeading: "Sahte fiş",
      transactionId: "İşlem kodu",
      orderHeading: "Oluşturulan siparişler",
      /** Ödeme sonrası doğal sonraki adım: siparişin durumunu izlemek. */
      viewOrders: "Siparişlerimi takip et",
      backToHome: "Ana sayfaya dön",
    },

    errors: {
      /**
       * Sahte sağlayıcıdan gelen iki ret sebebi AYRI mesaj alıyor: PRD §6.2
       * hata yollarının test edilebilmesini istiyor ve kullanıcı "kartımda
       * para yok" ile "kart reddedildi" arasındaki farkı bilmeli.
       */
      declined: "Kartınız reddedildi. Farklı bir kartla tekrar deneyin.",
      insufficientFunds: "Kartınızda yeterli bakiye yok. Farklı bir kartla tekrar deneyin.",

      invalidNumber: "Kart numarası geçersiz. Lütfen kontrol edip tekrar girin.",

      /**
       * İSTEĞİN TAMAMI şemaya uymadığında gösterilir — hangi alan olduğu
       * SÖYLENMEZ, çünkü gövdede kart numarası var ve Zod'un hata nesnesi
       * girdinin parçalarını taşıyabiliyor (`InvalidCheckoutRequestError`).
       *
       * Metin "kart numarası geçersiz" DEĞİL: eskiden öyleydi ve boş bırakılan
       * son kullanma alanı yüzünden reddedilen kullanıcı kart numarasını
       * kontrol etmeye yönlendiriliyordu. Yanlış yeri gösteren bir hata
       * mesajı, genel bir mesajdan kötüdür.
       */
      invalidRequest:
        "Ödeme bilgilerinde eksik veya hatalı bir alan var. Kart bilgilerinizi " +
        "(numara, son kullanma ayı ve yılı, CVV) ve teslimat bilgilerinizi kontrol edip tekrar deneyin.",
      invalidExpiry: "Son kullanma tarihi geçersiz veya geçmiş.",
      invalidCvv: "CVV kodu geçersiz.",
      invalidHolder: "Kart üzerindeki ismi girin.",

      addressRequired: "Market ve restoran siparişleri için teslimat adresi seçin.",
      slotRequired: "Teslimat zaman aralığı seçin.",
      savedCardNotFound: "Seçtiğiniz kayıtlı kart bulunamadı. Listeyi yenileyin.",
      cartChanged: "Sepetiniz bu arada değişti. Tutarı kontrol edip ödemeyi tekrar başlatın.",
      alreadyPaid: "Bu ödeme zaten alınmış. Siparişlerinizi profilinizden görebilirsiniz.",
      tooManyAttempts:
        "Çok fazla ödeme denemesi yapıldı. Güvenliğiniz için lütfen 15 dakika sonra tekrar deneyin.",
      /** Sağlayıcı erişilemez: kullanıcıya "tekrar dene" denir, iç detay verilmez. */
      providerUnavailable: "Ödeme servisine şu an ulaşılamıyor. Lütfen biraz sonra tekrar deneyin.",
    },
  },

  orders: {
    pageTitle: "Siparişlerim",
    title: "Siparişlerim",
    description: "Siparişlerinizin güncel durumunu buradan takip edebilirsiniz.",

    /**
     * Şemadaki `OrderStatus` enum'ıyla BİREBİR aynı anahtarlar (PRD §5.5:
     * "enum değerleri İngilizce, ekranda gösterilen karşılıkları src/config
     * altında"). Anahtar eşleşmesi zorunlu — eksik bir anahtar derleme
     * hatasına dönüşsün diye tip tarafından da bekleniyor.
     */
    statuses: {
      received: "Alındı",
      preparing: "Hazırlanıyor",
      on_the_way: "Yola çıktı",
      delivered: "Teslim edildi",
      cancelled: "İptal edildi",
    },

    /** `FulfillmentType` enum'ıyla birebir aynı anahtarlar. */
    fulfillment: {
      market_delivery: "Belediye Market",
      restaurant_delivery: "Belediye Restoran",
      ticket: "Etkinlik bileti",
    },

    orderCode: (code: string) => `Sipariş kodu: ${code}`,
    placedAt: (date: string) => `Sipariş tarihi: ${date}`,
    deliverySlot: (slot: string) => `Teslimat aralığı: ${slot}`,
    itemCount: (count: number) => `${count} kalem`,
    quantity: (count: number) => `${count} adet`,
    subtotal: "Ara toplam",
    deliveryFee: "Teslimat ücreti",
    total: "Toplam",
    paidWith: (last4: string) => `Ödeme: •••• ${last4}`,

    /** Bilinmeyen kalem: ürün katalogdan silinmişse satır yine de gösterilir. */
    unknownItem: "Ürün bilgisi bulunamadı",

    /** Bir sonraki aşamanın tahmini zamanı — SÖZ DEĞİL, tahmin olduğu yazıyor. */
    nextStageAt: (time: string) => `Tahmini bir sonraki güncelleme: ${time}`,

    cancel: {
      action: "Siparişi iptal et",
      pending: "İptal ediliyor…",
      /** Geri alınamaz işlem: onay istenir (randevu iptaliyle aynı desen). */
      confirmTitle: "Siparişi iptal etmek istiyor musunuz?",
      confirmBody: "İptal geri alınamaz. Ödediğiniz tutar için iade kaydı oluşturulur.",
      confirmAction: "Evet, iptal et",
      confirmDismiss: "Vazgeç",
      /** İptal düğmesinin yerini alan açıklama (PRD §5.5). */
      closed: "Hazırlık başladı, sipariş iptal edilemez.",
      ticketClosed: "Etkinlik bileti iptal edilemez.",
      cancelledAt: (date: string) => `İptal edildi: ${date}`,
      refunded: (amount: string) => `${amount} tutarında iade kaydı oluşturuldu.`,
      success: "Siparişiniz iptal edildi.",
    },

    empty: {
      title: "Henüz siparişiniz yok",
      description:
        "Belediye Market veya Belediye Restoran'dan sipariş verdiğinizde burada görünür.",
      marketAction: "Belediye Market'e git",
      restaurantAction: "Belediye Restoran'a git",
    },

    errors: {
      /**
       * KAYIT YOK: 404. Sipariş kodu adres çubuğunda geçmiyor ve kullanıcı
       * kendi listesinden tıklıyor; bu hatayı normal akışta göremez.
       */
      notFound: "Sipariş bulunamadı. Listeyi yenileyip tekrar deneyin.",
      /**
       * BAŞKASININ SİPARİŞİ: 403 (PRD §5.5 kabul kriteri bunu açıkça istiyor).
       *
       * Randevu modülünde aynı durum 404 dönüyor — orada kaydın varlığını
       * gizlemek gerekiyordu. Buradaki farkın sebebi PRD'nin kendisi; iki
       * modülün farklı davranması bilinçli, kopyalama hatası değil.
       */
      forbidden: "Bu sipariş size ait değil.",
      tooLate: "Hazırlık başladığı için bu sipariş artık iptal edilemez.",
      notCancellable: "Bu sipariş iptal edilemez.",
      alreadyCancelled: "Bu sipariş zaten iptal edilmiş.",
      invalidRequest: "İstek geçersiz. Sayfayı yenileyip tekrar deneyin.",
      tooManyAttempts:
        "Çok fazla iptal denemesi yapıldı. Güvenliğiniz için lütfen biraz sonra tekrar deneyin.",
    },
  },

  notifications: {
    pageTitle: "Bildirimler",
    title: "Bildirimler",
    /**
     * ADIM 13'TE GENELLEŞTİRİLDİ: metin yalnızca siparişten bahsediyordu ama
     * bu ekrana artık üyelik ve destek talebi bildirimleri de düşüyor. Ekranda
     * yazan söz, ekranın gerçekte yaptığı işi anlatmalı.
     */
    description: "Sipariş, üyelik ve destek talebi durumlarınız değiştikçe buraya bildirim düşer.",
    markAllRead: "Tümünü okundu işaretle",
    markingAllRead: "İşaretleniyor…",
    unreadBadge: (count: number) => `${count} okunmamış bildirim`,
    unreadLabel: "Okunmadı",
    empty: {
      title: "Bildiriminiz yok",
      description:
        "Sipariş verdiğinizde, üyelik başlattığınızda veya destek talebi açtığınızda burada görünür.",
    },

    /**
     * Sipariş bildirimlerinin metinleri.
     *
     * Gövdede MODÜL ADI ve KISA SİPARİŞ KODU geçiyor: kullanıcının iki
     * siparişi aynı anda ilerliyor olabilir ve "Siparişiniz yola çıktı"
     * tek başına hangisinden bahsettiğini söylemez.
     */
    order: {
      createdTitle: "Siparişiniz alındı",
      createdBody: (module: string, code: string) =>
        `${module} siparişiniz alındı. Sipariş kodu: ${code}`,
      statusTitle: (status: string) => `Siparişiniz: ${status}`,
      statusBody: (module: string, code: string, status: string) =>
        `${module} siparişinizin durumu “${status}” olarak güncellendi. Sipariş kodu: ${code}`,
      cancelledTitle: "Siparişiniz iptal edildi",
      cancelledBody: (module: string, code: string) =>
        `${module} siparişiniz iptal edildi ve iade kaydı oluşturuldu. Sipariş kodu: ${code}`,
    },

    /**
     * Koltuk süresi dolduğunda (PRD §5.2: "süre dolarsa koltuk sepetten
     * otomatik düşer ve kullanıcıya bildirim gösterilir").
     *
     * Gövdede KOLTUĞUN TAM ADRESİ geçiyor: kullanıcı üç koltuk tuttuysa
     * hangisini kaybettiğini bilmeli, yoksa planı baştan gözden geçirmesi
     * gerekirdi.
     */
    seatHold: {
      expiredTitle: "Koltuk süreniz doldu",
      expiredBody: (event: string, seat: string) =>
        `${event} etkinliğinde ${seat} için ayırdığınız süre doldu ve koltuk sepetinizden düştü. Dilerseniz yeniden seçebilirsiniz.`,
    },

    /**
     * Spor salonu üyeliği bildirimleri (PRD §5.6).
     *
     * İkisi de TARİH VE TUTAR taşıyor: "yenileme yaklaşıyor" tek başına
     * kullanıcıya ne zaman ve ne kadar çekileceğini söylemez, dolayısıyla
     * hazırlık yapma imkânı vermez — bildirimin tek amacı da bu.
     */
    membership: {
      reminderTitle: "Üyelik yenilemeniz yaklaşıyor",
      reminderBody: (date: string, amount: string) =>
        `Spor salonu üyeliğiniz ${date} tarihinde yenilenecek ve kayıtlı kartınızdan ${amount} tahsil edilecek.`,
      paymentFailedTitle: "Üyelik tahsilatı yapılamadı",
      paymentFailedBody: (date: string) =>
        `Spor salonu üyelik tahsilatınız gerçekleştirilemedi. ${date} tarihine kadar ödeme yapılmazsa üyeliğiniz pasifleşir.`,
    },

    /**
     * Destek talebi bildirimleri (PRD §5.7).
     *
     * Gövdede TALEP KODU ve BAŞLIK geçiyor: kullanıcının birden çok açık
     * talebi olabilir ve "Talebiniz inceleniyor" tek başına hangisinden
     * bahsettiğini söylemez (sipariş bildirimindeki aynı gerekçe).
     */
    supportTicket: {
      createdTitle: "Destek talebiniz alındı",
      createdBody: (code: string, subject: string) =>
        `“${subject}” başlıklı destek talebiniz alındı. Talep kodu: ${code}`,
      statusTitle: (status: string) => `Destek talebiniz: ${status}`,
      statusBody: (code: string, subject: string, status: string) =>
        `“${subject}” başlıklı ${code} numaralı destek talebinizin durumu “${status}” olarak güncellendi.`,
      closedTitle: "Destek talebiniz kapatıldı",
      closedBody: (code: string, subject: string) =>
        `“${subject}” başlıklı ${code} numaralı destek talebiniz kapatıldı.`,
    },

    errors: {
      invalidRequest: "İstek geçersiz. Sayfayı yenileyip tekrar deneyin.",
    },
  },

  /** Destek talebi (PRD §5.7 · adım 13). */
  support: {
    pageTitle: "Destek talepleri",
    title: "Destek talepleri",
    description:
      "Sorun ve önerilerinizi buradan iletin, talebinizin durumunu aynı sayfadan takip edin.",

    /**
     * Şemadaki `SupportTicketStatus` enum'ıyla BİREBİR aynı anahtarlar
     * (siparişteki kural). Eksik bir anahtar derleme hatasına dönüşsün diye
     * tip tarafından da bekleniyor.
     */
    statuses: {
      open: "Açık",
      in_review: "İnceleniyor",
      resolved: "Çözüldü",
      closed: "Kapandı",
    },

    /** Liste bölümünün başlığı — sayfa başlığından FARKLI olmak zorunda:
        aynı metni iki başlıkta kullanmak hem ekran okuyucuyu hem testi
        belirsiz bırakıyor. */
    listHeading: "Talepleriniz",

    ticketCode: (code: string) => `Talep kodu: ${code}`,
    createdAt: (date: string) => `Oluşturma tarihi: ${date}`,
    closedAt: (date: string) => `Kapatıldı: ${date}`,

    /** Bir sonraki aşamanın tahmini zamanı — SÖZ DEĞİL, tahmin olduğu yazıyor. */
    nextStageAt: (time: string) => `Tahmini bir sonraki güncelleme: ${time}`,

    detailAction: "Talebi görüntüle",
    backToList: "Destek taleplerine dön",
    attachmentsHeading: "Ekler",
    attachmentCount: (count: number) => `${count} ek`,
    noAttachments: "Bu talebe ek dosya eklenmemiş.",
    attachmentAlt: (fileName: string) => `Ek görsel: ${fileName}`,

    /**
     * SİMÜLASYON AÇIKÇA YAZILIYOR. Yönetici paneli yok (teknik borç #4) ve
     * durum talebin yaşından türetiliyor (ADR-013); kullanıcının gerçek bir
     * görevlinin baktığını sanması yanıltıcı olurdu.
     */
    simulationNotice:
      "Bu bir gösterim projesidir: talebinize gerçek bir görevli bakmaz, durum zamanla otomatik ilerler.",

    form: {
      heading: "Yeni destek talebi",
      subjectLabel: "Konu",
      subjectHint: "Sorunu tek cümleyle özetleyin.",
      descriptionLabel: "Açıklama",
      descriptionHint: "Ne olduğunu, ne beklediğinizi ve hangi ekranda karşılaştığınızı yazın.",
      attachmentsLabel: "Ekran görüntüsü (isteğe bağlı)",
      attachmentsHint: (maxCount: number, maxSize: string) =>
        `En fazla ${maxCount} görsel, dosya başına ${maxSize}. PNG, JPEG veya WebP.`,
      selectedCount: (count: number) => `${count} dosya seçildi`,
      removeAttachment: (fileName: string) => `${fileName} dosyasını kaldır`,
      submit: "Talebi gönder",
      submitting: "Gönderiliyor…",
      success: "Destek talebiniz oluşturuldu.",
    },

    close: {
      action: "Talebi kapat",
      pending: "Kapatılıyor…",
      /** Geri alınamaz işlem: onay istenir (sipariş iptaliyle aynı desen). */
      confirmTitle: "Talebi kapatmak istiyor musunuz?",
      confirmBody: "Kapatılan talep yeniden açılamaz; gerekirse yeni bir talep oluşturabilirsiniz.",
      confirmAction: "Evet, kapat",
      confirmDismiss: "Vazgeç",
      success: "Talebiniz kapatıldı.",
      alreadyClosedNotice: "Bu talep kapatıldı.",
    },

    empty: {
      title: "Henüz destek talebiniz yok",
      description: "Bir sorun yaşadığınızda yukarıdaki formu doldurarak talep oluşturabilirsiniz.",
    },

    errors: {
      notFound: "Destek talebi bulunamadı.",
      attachmentNotFound: "Ek dosya bulunamadı.",
      alreadyClosed: "Bu talep zaten kapatılmış.",
      invalidRequest: "Lütfen konu ve açıklama alanlarını kontrol edin.",
      subjectLength: (min: number, max: number) =>
        `Konu en az ${min}, en fazla ${max} karakter olmalı.`,
      descriptionLength: (min: number, max: number) =>
        `Açıklama en az ${min}, en fazla ${max} karakter olmalı.`,
      tooManyAttachments: (max: number) => `En fazla ${max} dosya ekleyebilirsiniz.`,
      attachmentTooLarge: (maxSize: string) => `Her dosya en fazla ${maxSize} olabilir.`,
      attachmentEmpty: "Boş dosya yüklenemez.",
      /**
       * Tür reddi: kullanıcının ne yapması gerektiğini söylüyor, dosyanın
       * adını yankılamıyor. "İçeriği doğrulanamadı" ifadesi kasıtlı — uzantı
       * doğru olsa bile içerik farklıysa aynı mesaj çıkar.
       */
      attachmentType: "Yalnızca PNG, JPEG veya WebP görsel yükleyebilirsiniz.",
      tooManyAttempts:
        "Çok fazla talep oluşturdunuz. Güvenliğiniz için lütfen biraz sonra tekrar deneyin.",
      botCheckFailed: "Doğrulama tamamlanamadı. Sayfayı yenileyip tekrar deneyin.",
      botCheckUnavailable:
        "Doğrulama servisine şu anda ulaşılamıyor. Lütfen birazdan tekrar deneyin.",
    },
  },
} as const;
