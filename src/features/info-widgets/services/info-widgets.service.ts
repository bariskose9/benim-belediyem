import {
  CRYPTO_CACHE_KEY,
  CRYPTO_CACHE_TTL_MS,
  EXCHANGE_RATE_CACHE_KEY,
  EXCHANGE_RATE_CACHE_TTL_MS,
  NEWS_CACHE_KEY,
  NEWS_CACHE_TTL_MS,
  WEATHER_CACHE_KEY,
  WEATHER_CACHE_TTL_MS,
} from "@/config/constants";

import { fetchCryptoPrices } from "../providers/crypto.provider";
import { fetchExchangeRates } from "../providers/exchange-rate.provider";
import { fetchNews } from "../providers/news.provider";
import { fetchWeather } from "../providers/weather.provider";
import {
  cryptoSnapshotSchema,
  exchangeRateSnapshotSchema,
  newsSnapshotSchema,
  weatherSnapshotSchema,
  type CryptoSnapshot,
  type ExchangeRateSnapshot,
  type NewsSnapshot,
  type WeatherSnapshot,
} from "../schemas/snapshots";
import type { WidgetResult } from "../types";
import { loadCachedExternalData } from "./cached-external-data";

/**
 * Ekranın konuştuğu TEK katman (PRD §5.8).
 *
 * Her fonksiyon aynı üç şeyi birleştiriyor: önbellek anahtarı + süresi
 * (`constants.ts`), doğrulayan şema (`snapshots.ts`) ve sağlayıcı
 * (`providers/`). Bileşenler ne HTTP ne de veritabanı görür.
 *
 * `now` parametresi testler için: süreye bağlı davranış sahte saatle
 * doğrulanabilsin diye (06-testing.md).
 */

export function getWeather(now?: Date): Promise<WidgetResult<WeatherSnapshot>> {
  return loadCachedExternalData({
    cacheKey: WEATHER_CACHE_KEY,
    ttlMs: WEATHER_CACHE_TTL_MS,
    schema: weatherSnapshotSchema,
    load: fetchWeather,
    now,
  });
}

export function getExchangeRates(now?: Date): Promise<WidgetResult<ExchangeRateSnapshot>> {
  return loadCachedExternalData({
    cacheKey: EXCHANGE_RATE_CACHE_KEY,
    ttlMs: EXCHANGE_RATE_CACHE_TTL_MS,
    schema: exchangeRateSnapshotSchema,
    load: fetchExchangeRates,
    now,
  });
}

export function getCryptoPrices(now?: Date): Promise<WidgetResult<CryptoSnapshot>> {
  return loadCachedExternalData({
    cacheKey: CRYPTO_CACHE_KEY,
    ttlMs: CRYPTO_CACHE_TTL_MS,
    schema: cryptoSnapshotSchema,
    load: fetchCryptoPrices,
    now,
  });
}

export function getNews(now?: Date): Promise<WidgetResult<NewsSnapshot>> {
  return loadCachedExternalData({
    cacheKey: NEWS_CACHE_KEY,
    ttlMs: NEWS_CACHE_TTL_MS,
    schema: newsSnapshotSchema,
    load: fetchNews,
    now,
  });
}
