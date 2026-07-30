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

  home: {
    heading: "benim-belediyem",
    intro:
      "Bu proje yapım aşamasındadır. Şu an yalnızca teknik iskelet kuruludur; " +
      "hizmet sayfaları sırayla eklenecektir.",
  },
} as const;
