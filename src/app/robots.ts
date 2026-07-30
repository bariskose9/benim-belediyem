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
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: new URL("/sitemap.xml", publicEnv.NEXT_PUBLIC_APP_URL).toString(),
  };
}
