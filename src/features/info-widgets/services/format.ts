import { LOCALE } from "@/config/constants";

/**
 * Widget sayılarının GÖSTERİM biçimi.
 *
 * ⛔ BURADAKİ HİÇBİR SAYI PARA HESABI DEĞİLDİR. Para tutarları tam sayı kuruş
 * olarak tutulur ve `src/lib/money.ts` ile biçimlendirilir; buradaki değerler
 * bilgi amaçlı gösterilen ölçümler (sıcaklık, kur, yüzde). Hiçbir tahsilat,
 * sipariş veya bakiye bu fonksiyonlardan geçmez.
 *
 * Saf fonksiyonlar: ağ, veritabanı ve React bilmiyorlar, doğrudan test ediliyorlar.
 */

/** `37,2` gibi — Türkçe ondalık ayıracı virgüldür. */
export function formatDecimal(value: number, fractionDigits: number): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Sıcaklık tam sayıya yuvarlanır: `37°`. Yarım derece kimseye bir şey söylemez. */
export function formatTemperature(celsius: number): string {
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(celsius)}°`;
}

/**
 * Döviz kuru dört haneli: `47,7099 ₺`.
 *
 * Kur küçük değişimlerle anlam kazanıyor; iki hane gösterip "değişmedi" izlenimi
 * vermek yanıltıcı olurdu.
 */
export function formatRate(tryPerUnit: number): string {
  return `${formatDecimal(tryPerUnit, 4)} ₺`;
}

/**
 * Kripto fiyatı tam sayı: `3.096.909 ₺`.
 *
 * Milyonluk bir sayının kuruşunu göstermek gürültüden başka bir şey değil.
 */
export function formatCoinPrice(tryPrice: number): string {
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(tryPrice)} ₺`;
}

/** Yüzde değişimin İŞARETSİZ hâli — yön metinle ayrıca söyleniyor. */
export function formatPercent(value: number): string {
  return formatDecimal(Math.abs(value), 2);
}

/** `YYYY-MM-DD` metnini `12 Ağu Çar` gibi kısa bir gün etiketine çevirir. */
export function formatForecastDay(isoDate: string): string {
  // Gün ortasına sabitleniyor: saat 00:00 UTC olarak okunduğunda İstanbul'da
  // hâlâ bir önceki gündür ve etiket bir gün geriye kayar.
  const instant = new Date(`${isoDate}T12:00:00Z`);

  if (Number.isNaN(instant.getTime())) return isoDate;

  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(instant);
}

/** ECB kur tarihi: `7 Ağustos 2026`. */
export function formatRateDate(isoDate: string): string {
  const instant = new Date(`${isoDate}T12:00:00Z`);

  if (Number.isNaN(instant.getTime())) return isoDate;

  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(instant);
}
