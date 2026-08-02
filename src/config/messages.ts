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
    name: "benim-belediyem",
    title: "benim-belediyem",
    description: "İzmir Büyükşehir Belediyesi temalı örnek hizmet portalı. Tüm veriler sahtedir.",
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
    heading: "benim-belediyem",
    intro:
      "Bu proje yapım aşamasındadır. Şu an yalnızca teknik iskelet kuruludur; " +
      "hizmet sayfaları sırayla eklenecektir.",
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
    /** Ekran okuyucular için: menünün ne olduğu söylenmeli (WCAG 2.1 AA). */
    label: "Ana menü",
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
} as const;
