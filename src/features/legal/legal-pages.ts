import { messages } from "@/config/messages";

/**
 * Yasal sayfaların kataloğu — adres, bağlantı adı ve arama motoru bilgisi
 * TEK YERDE (adım 17).
 *
 * NEDEN: aynı liste dört yerde lazım — alt bilgideki bağlantılar, belgelerin
 * birbirine verdiği bağlantılar, `sitemap.xml` ve testler. Dört kopya olsaydı
 * yeni bir belge eklendiğinde biri mutlaka unutulur ve o belge arama motoruna
 * hiç düşmezdi.
 */
export const LEGAL_PAGES = [
  {
    slug: "/gizlilik",
    linkLabel: messages.legal.links.privacy,
  },
  {
    slug: "/cerez-politikasi",
    linkLabel: messages.legal.links.cookies,
  },
  {
    slug: "/kullanim-sartlari",
    linkLabel: messages.legal.links.terms,
  },
  {
    slug: "/iletisim",
    linkLabel: messages.legal.links.contact,
  },
] as const;

export type LegalSlug = (typeof LEGAL_PAGES)[number]["slug"];
