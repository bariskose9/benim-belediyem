import type { MetadataRoute } from "next";

import { publicEnv } from "@/config/env";
import { LEGAL_PAGES } from "@/features/legal/legal-pages";

/**
 * Arama motorlarına verilen herkese açık sayfa listesi.
 *
 * ⛔ YALNIZCA GİRİŞ GEREKTİRMEYEN SAYFALAR: korumalı bir adres buraya
 * yazılsaydı arama motoru onu tarar, giriş ekranına yönlendirilir ve site
 * "kırık bağlantı veren" bir site gibi değerlendirilirdi. Ayrıca korumalı
 * adresleri ilan etmenin hiçbir faydası yok.
 *
 * YASAL SAYFALAR `LEGAL_PAGES` KATALOĞUNDAN GELİYOR (adım 17) — alt bilgi ve
 * belgelerin birbirine verdiği bağlantılarla aynı kaynak, yani yeni bir belge
 * eklendiğinde site haritası kendiliğinden büyüyor.
 *
 * `priority` göreli bir işaret: ana sayfa en yüksek, hizmet sayfaları ortada,
 * yasal metinler düşük — nadiren değişir ve arama sonucunda öne çıkmaları
 * beklenmiyor.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const toEntry = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  ) => ({
    url: new URL(path, publicEnv.NEXT_PUBLIC_APP_URL).toString(),
    lastModified,
    changeFrequency,
    priority,
  });

  return [
    toEntry("/", 1, "weekly"),
    toEntry("/hakkimizda", 0.6, "monthly"),
    ...LEGAL_PAGES.map((page) => toEntry(page.slug, 0.3, "yearly")),
  ];
}
