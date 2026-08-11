import { z } from "zod";

import { CRYPTO_API_URL, CRYPTO_COIN_IDS } from "@/config/constants";
import { type ExternalFetchResult, fetchExternalJson } from "@/lib/external-fetch";
import { logger } from "@/lib/logger";

import type { CryptoSnapshot } from "../schemas/snapshots";

/**
 * Kripto sağlayıcısı — **CoinGecko** genel (public) ucu, anahtar gerektirmiyor.
 *
 * Yanıt biçimi 2026-08-09'da canlı uçtan doğrulandı.
 *
 * ⚠️ HIZ SINIRI BEKLENEN BİR DURUM: anahtarsız uç dakikada sınırlı ve Vercel'in
 * çıkış IP'leri paylaşımlı. Bu yüzden önbellek süresi 5 dakika ve `429`
 * `external-fetch.ts` içinde TEKRARLANMIYOR — sınıra takılmışken yeniden sormak
 * sınırı derinleştirir. O turda bayat veri gösterilir (ADR-015).
 */

/**
 * Yanıt biçimi: `{ "bitcoin": { "try": 3096909, "try_24h_change": -0.07 } }`
 *
 * Değişim alanı OPSİYONEL: sağlayıcı bazı jetonlarda değişim döndürmüyor ve
 * eksik olması fiyatın kullanılamaz olduğu anlamına gelmez.
 */
const coinGeckoResponseSchema = z.record(
  z.string(),
  z.object({
    try: z.number(),
    try_24h_change: z.number().optional(),
  }),
);

export async function fetchCryptoPrices(): Promise<ExternalFetchResult<CryptoSnapshot>> {
  const result = await fetchExternalJson({
    name: "coingecko",
    url: buildUrl(),
    schema: coinGeckoResponseSchema,
  });

  if (!result.ok) return { ok: false };

  const coins = [];

  for (const id of CRYPTO_COIN_IDS) {
    const entry = result.data[id];

    if (!entry || !Number.isFinite(entry.try) || entry.try <= 0) continue;

    coins.push({
      id,
      tryPrice: entry.try,
      changePercent24h: entry.try_24h_change ?? 0,
    });
  }

  if (coins.length === 0) {
    logger.error("external_payload_unusable", { provider: "coingecko" });

    return { ok: false };
  }

  return { ok: true, data: { coins } };
}

function buildUrl(): string {
  const url = new URL(CRYPTO_API_URL);

  url.searchParams.set("ids", CRYPTO_COIN_IDS.join(","));
  url.searchParams.set("vs_currencies", "try");
  url.searchParams.set("include_24hr_change", "true");

  return url.toString();
}
