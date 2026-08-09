import { z } from "zod";

/**
 * Widget verisinin UYGULAMA İÇİ şekli — sağlayıcının ham yanıtı DEĞİL.
 *
 * NEDEN AYRI BİR ŞEKİL: önbelleğe ham gövde yazılsaydı sağlayıcının şeması
 * değiştiğinde hata ekran çizilirken ortaya çıkardı. Sadeleştirilmiş şekilde
 * hata, ayrıştırma anında ve tek bir yerde görülür (ADR-015).
 *
 * BU ŞEMALAR İKİ İŞ YAPIYOR:
 *   1. `external_data_cache.payload`'dan okunan JSON'u doğrular (satır önceki
 *      bir sürümün yazdığı şekilde olabilir)
 *   2. TypeScript tiplerini üretir — tek kaynak, ikisi ayrışamaz
 *
 * TARİHLER METİN: JSON'da `Date` nesnesi taşınmaz; veritabanına yazılıp geri
 * okunduğunda metne dönerdi ve şema bunu yakalayamazdı.
 */

/** Hava durumu (Open-Meteo) — güncel durum + bugünden sonraki üç gün. */
export const weatherSnapshotSchema = z.object({
  current: z.object({
    temperatureC: z.number(),
    humidityPercent: z.number(),
    windKmh: z.number(),
    /** WMO hava kodu; Türkçe karşılığı `weather-codes.ts` içinde. */
    code: z.number().int(),
  }),
  days: z.array(
    z.object({
      /** `YYYY-MM-DD` */
      date: z.string().min(1),
      code: z.number().int(),
      maxC: z.number(),
      minC: z.number(),
    }),
  ),
});

/** Döviz (Frankfurter / ECB) — 1 birim yabancı para kaç TL. */
export const exchangeRateSnapshotSchema = z.object({
  /** ECB'nin yayın günü; hafta sonu bir önceki iş gününün kuru gelir. */
  date: z.string().min(1),
  rates: z.array(
    z.object({
      code: z.string().min(1),
      tryPerUnit: z.number().positive(),
    }),
  ),
});

/** Kripto (CoinGecko) — TL fiyatı ve 24 saatlik değişim yüzdesi. */
export const cryptoSnapshotSchema = z.object({
  coins: z.array(
    z.object({
      id: z.string().min(1),
      tryPrice: z.number().positive(),
      changePercent24h: z.number(),
    }),
  ),
});

/** Haber (anahtarsız RSS — ADR-016). */
export const newsSnapshotSchema = z.object({
  items: z.array(
    z.object({
      title: z.string().min(1),
      /**
       * `https` şartı burada da tekrarlanıyor.
       *
       * Neden iki kere: `rss.ts` akıştan gelen bağlantıyı zaten süzüyor, ama
       * bu şema ÖNBELLEKTEN okunan satırı da doğruluyor. Kural yalnızca
       * ayrıştırıcıda olsaydı, eski bir satır süzgeçten geçmeden ekrana çıkabilirdi.
       */
      link: z.url({ protocol: /^https$/ }),
      /** ISO 8601 metin veya `null`. */
      publishedAt: z.string().min(1).nullable(),
    }),
  ),
});

export type WeatherSnapshot = z.infer<typeof weatherSnapshotSchema>;
export type ExchangeRateSnapshot = z.infer<typeof exchangeRateSnapshotSchema>;
export type CryptoSnapshot = z.infer<typeof cryptoSnapshotSchema>;
export type NewsSnapshot = z.infer<typeof newsSnapshotSchema>;
