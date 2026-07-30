import type { MetadataRoute } from "next";

import { publicEnv } from "@/config/env";

/**
 * Şu an yalnızca anasayfa var; herkese açık sayfalar eklendikçe burası büyür.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL("/", publicEnv.NEXT_PUBLIC_APP_URL).toString(),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
