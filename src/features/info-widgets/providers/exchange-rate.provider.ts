import { z } from "zod";

import { EXCHANGE_RATE_API_URL, EXCHANGE_RATE_SYMBOLS } from "@/config/constants";
import { type ExternalFetchResult, fetchExternalJson } from "@/lib/external-fetch";

import type { ExchangeRateSnapshot } from "../schemas/snapshots";

/**
 * Döviz kuru sağlayıcısı — **Frankfurter**, anahtar gerektirmiyor ve Avrupa
 * Merkez Bankası'nın günlük referans kurlarını yayınlıyor (`integrations.md`).
 *
 * Yanıt biçimi 2026-08-09'da canlı uçtan doğrulandı.
 *
 * ⚠️ VERİ GÜNLÜKTÜR, ANLIK DEĞİL. ECB kuru iş günlerinde bir kez yayınlanıyor;
 * hafta sonu son iş gününün kuru gelir. Bu yüzden ekranda kurun **yayın tarihi**
 * gösteriliyor — kullanıcının "bu kur ne zamanki" sorusu cevapsız kalmasın.
 */

const frankfurterResponseSchema = z.object({
  base: z.string(),
  date: z.string().min(1),
  rates: z.record(z.string(), z.number()),
});

export async function fetchExchangeRates(): Promise<ExternalFetchResult<ExchangeRateSnapshot>> {
  const result = await fetchExternalJson({
    name: "frankfurter",
    url: buildUrl(),
    schema: frankfurterResponseSchema,
  });

  if (!result.ok) return { ok: false };

  const snapshot = toSnapshot(result.data);

  // Tek bir kur bile çıkarılamadıysa bu bir başarı değil: boş bir kart
  // göstermektense bayat veriye veya hata durumuna düşmek daha doğru.
  if (snapshot.rates.length === 0) {
    console.error("[EXTERNAL:frankfurter] beklenen kurların hiçbiri yanıtta yok");

    return { ok: false };
  }

  return { ok: true, data: snapshot };
}

function buildUrl(): string {
  const url = new URL(EXCHANGE_RATE_API_URL);

  // TABAN TL: tek çağrıyla üç kur geliyor. Yanıt "1 TL kaç dolar" biçiminde,
  // yani ekranda gösterilecek olanın TERSİ — çevirme aşağıda.
  url.searchParams.set("base", "TRY");
  url.searchParams.set("symbols", EXCHANGE_RATE_SYMBOLS.join(","));

  return url.toString();
}

/**
 * "1 TL = 0,0209 USD" değerini "1 USD = 47,71 TL" hâline çevirir.
 *
 * NEDEN `money.ts` KULLANILMIYOR: o modül PARA TUTARLARI için ve tam sayı kuruş
 * saklıyor. Buradaki değer bir tutar değil, iki para birimi arasındaki ORAN —
 * kuruşa yuvarlanırsa bilgi kaybeder. Hiçbir tahsilat, sipariş veya bakiye bu
 * sayıdan hesaplanmıyor; yalnızca bilgi amaçlı gösteriliyor.
 */
function toSnapshot(raw: z.infer<typeof frankfurterResponseSchema>): ExchangeRateSnapshot {
  const rates = [];

  for (const code of EXCHANGE_RATE_SYMBOLS) {
    const perTry = raw.rates[code];

    // Sıfır veya negatif bir kur bölmede sonsuz/negatif üretirdi.
    if (typeof perTry !== "number" || !Number.isFinite(perTry) || perTry <= 0) continue;

    rates.push({ code, tryPerUnit: 1 / perTry });
  }

  return { date: raw.date, rates };
}
