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
} as const;
