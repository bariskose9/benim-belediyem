/**
 * Kullanıcıya görünen TÜM Türkçe metinler burada (docs/standards/02-coding-standards.md).
 *
 * Neden tek dosya: metin koda dağılırsa hem tutarlılık kaybolur hem de ileride
 * ikinci bir dil eklenecekse her bileşeni tek tek açmak gerekir.
 */
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
          description:
            "E-posta adresinize ve telefonunuza birer kod gönderdik. " +
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
        phoneLabel: "Cep telefonu",
        phoneHelp: "Örnek: 05321234567",
        passwordLabel: "Şifre",
        passwordHelp: "En az 8 karakter.",
        passwordConfirmLabel: "Şifre (tekrar)",
        submit: "Doğrulama kodlarını gönder",
        submitting: "Kodlar gönderiliyor…",
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

        /**
         * Local ve preview'da kod, gönderim yanıtında dönüyor ve sayfa
         * değişince kayboluyor. Test edenin ne yapacağını bilmesi için
         * ekranda açıkça yazıyor. Production'da bu metin GÖSTERİLMEZ.
         */
        simulationHint:
          "Test ortamı: doğrulama kodunu görmek için aşağıdaki “Yeni kod gönder” " +
          "düğmesine basın. Canlı sitede kod yalnızca e-posta ile gelir.",

        codeLabel: "6 haneli kod",
        submit: "Doğrula",
        submitting: "Doğrulanıyor…",
        resend: "Yeni kod gönder",
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
        body:
          "Kaydınız tamamlandı. Giriş ekranı bir sonraki sürümde açılacak; " +
          "o zamana kadar hesabınız hazır bekliyor.",
        cta: "Ana sayfaya dön",
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

        botCheckRequired: "Devam etmek için “Ben robot değilim” doğrulamasını tamamlayın.",
        botCheckFailed: "Doğrulama geçersiz. Sayfayı yenileyip tekrar deneyin.",
        /**
         * ADR-004 bedel 2: Turnstile erişilemezse akış DURUR, atlanmaz.
         * Mesaj bunu kullanıcıya anlaşılır biçimde söylüyor.
         */
        botCheckUnavailable:
          "Güvenlik doğrulaması servisine şu an ulaşılamıyor. Kayıt işlemini biraz sonra tekrar deneyin.",

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
  },
} as const;
