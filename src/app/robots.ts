import type { MetadataRoute } from "next";

import { isProductionEnv, publicEnv } from "@/config/env";

/**
 * Preview ve local ortamlar arama motoruna kapalıdır
 * (docs/standards/13-environments.md kontrol listesi + 07-ui-design-system.md).
 */
export default function robots(): MetadataRoute.Robots {
  if (!isProductionEnv) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    // `/api/mock-kps` zaten gizli anahtar olmadan 401 döner (ADR-009); buradaki
    // satır korumanın kendisi DEĞİL, ikinci bir katman: uç arama sonuçlarında
    // görünüp meraklı bir gözü üstüne çekmesin diye. robots.txt bir güvenlik
    // aracı değildir, saldırgan zaten okur — koruma anahtardan gelir.
    // `/api/docs` production'da varsayılan olarak 404 döner (ADR-019); bayrakla
    // açıldığı gün de arama sonuçlarına girmesin diye burada listeleniyor.
    // Ucun kendisi ayrıca `X-Robots-Tag: noindex` gönderiyor — robots.txt
    // sadece taramayı engeller, indekslemeyi garanti etmez.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/mock-kps", "/api/docs"] }],
    sitemap: new URL("/sitemap.xml", publicEnv.NEXT_PUBLIC_APP_URL).toString(),
  };
}
