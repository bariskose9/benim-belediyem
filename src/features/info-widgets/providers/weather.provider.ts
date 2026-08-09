import { z } from "zod";

import { WEATHER_API_URL, WEATHER_FORECAST_DAYS } from "@/config/constants";
import { serverEnv } from "@/config/env";
import { type ExternalFetchResult, fetchExternalJson } from "@/lib/external-fetch";

import type { WeatherSnapshot } from "../schemas/snapshots";

/**
 * Hava durumu sağlayıcısı — **Open-Meteo**, anahtar gerektirmiyor
 * (`integrations.md`; ücretsiz kullanım ticari olmayan projeler için serbest).
 *
 * Yanıt biçimi 2026-08-09'da canlı uçtan doğrulandı; ezberden yazılmadı
 * (`source-driven-development`).
 *
 * Dayanıklılık (zaman aşımı, yeniden deneme, devre kesici) bu dosyada DEĞİL,
 * `external-fetch.ts` içinde — üç sağlayıcı da aynı yoldan geçiyor.
 */

/** Sağlayıcının HAM yanıt şeması. Uygulama içi şekil `snapshots.ts` içinde. */
const openMeteoResponseSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    relative_humidity_2m: z.number(),
    weather_code: z.number().int(),
    wind_speed_10m: z.number(),
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(z.number().int()),
    temperature_2m_max: z.array(z.number()),
    temperature_2m_min: z.array(z.number()),
  }),
});

export async function fetchWeather(): Promise<ExternalFetchResult<WeatherSnapshot>> {
  const result = await fetchExternalJson({
    name: "open-meteo",
    url: buildUrl(),
    schema: openMeteoResponseSchema,
  });

  if (!result.ok) return { ok: false };

  return { ok: true, data: toSnapshot(result.data) };
}

function buildUrl(): string {
  const url = new URL(WEATHER_API_URL);

  // Koordinat ortam değişkeninden geliyor (`integrations.md`): şehir değişirse
  // kod değil yapılandırma değişir. Varsayılan İzmir.
  url.searchParams.set("latitude", String(serverEnv.WEATHER_DEFAULT_LAT));
  url.searchParams.set("longitude", String(serverEnv.WEATHER_DEFAULT_LON));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
  );
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
  // Günleri sağlayıcı İstanbul takvimine göre bölsün; aksi hâlde "yarın" UTC'ye
  // göre hesaplanır ve gece yarısı civarında bir gün kayar.
  url.searchParams.set("timezone", "Europe/Istanbul");
  url.searchParams.set("forecast_days", String(WEATHER_FORECAST_DAYS));

  return url.toString();
}

/**
 * Ham yanıtı uygulama şekline çevirir.
 *
 * Open-Meteo günlük veriyi PARALEL DİZİLER hâlinde döndürüyor (`time[i]`,
 * `weather_code[i]`, …). Diziler beklenmedik şekilde farklı uzunlukta gelirse
 * en kısasına göre kesiliyor — `undefined` bir değerin ekrana `NaN°` olarak
 * çıkması yerine o gün hiç gösterilmiyor.
 *
 * İlk gün ATLANIYOR: o bugün ve "güncel durum" bölümünde zaten var.
 * PRD §5.8 bugüne ek olarak **3 günlük tahmin** istiyor.
 */
function toSnapshot(raw: z.infer<typeof openMeteoResponseSchema>): WeatherSnapshot {
  const { daily } = raw;
  const dayCount = Math.min(
    daily.time.length,
    daily.weather_code.length,
    daily.temperature_2m_max.length,
    daily.temperature_2m_min.length,
  );

  const days = [];

  for (let index = 1; index < dayCount; index += 1) {
    days.push({
      date: daily.time[index],
      code: daily.weather_code[index],
      maxC: daily.temperature_2m_max[index],
      minC: daily.temperature_2m_min[index],
    });
  }

  return {
    current: {
      temperatureC: raw.current.temperature_2m,
      humidityPercent: raw.current.relative_humidity_2m,
      windKmh: raw.current.wind_speed_10m,
      code: raw.current.weather_code,
    },
    days,
  };
}
