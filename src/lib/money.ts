import { CURRENCY, LOCALE } from "@/config/constants";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Para hesabının tek yeri (CLAUDE.md §5.4 · data-model.md "Para alanları
 * Decimal(10,2) — float kullanılmaz").
 *
 * ═══ UYGULAMA İÇİNDE PARA TAM SAYI KURUŞTUR ═══
 *
 * Veritabanı `Decimal(10,2)` tutuyor, ekran "1.234,56 ₺" gösteriyor, ama
 * ARADAKİ TÜM HESAP tam sayı kuruşla yapılıyor. Sebebi klasik: `0.1 + 0.2`
 * ondalık kayan noktada `0.30000000000000004` eder ve bu fark bir sepette
 * on kalem sonra kuruş kaymasına dönüşür. Tam sayıda böyle bir hata yok —
 * 10 kuruş + 20 kuruş her zaman tam 30 kuruştur.
 *
 * Dönüşüm YALNIZCA sınırlarda yapılır: veritabanından okurken `toKurus`,
 * yazarken `toDecimalInput`, ekrana basarken `formatTry`. Servis ve bileşen
 * katmanları hiç `Decimal` görmez.
 */

/** Prisma'nın `Decimal` alanlarından okunabilecek tipler. */
type DecimalLike = Prisma.Decimal | string | number;

/**
 * `Decimal(10,2)` değerini tam sayı kuruşa çevirir.
 *
 * Metin üzerinden gidiliyor, `Number(decimal)` ile DEĞİL: `Decimal`'ı önce
 * float'a çevirmek tam olarak kaçınmaya çalıştığımız hatayı geri getirirdi.
 * `toFixed(2)` ondalık kütüphanesinin kendi yuvarlamasını kullanıyor, sonra
 * noktayı atıp tam sayıya geçiyoruz.
 */
export function toKurus(value: DecimalLike): number {
  const text = typeof value === "object" ? value.toFixed(2) : Number(value).toFixed(2);
  const negative = text.startsWith("-");
  const [whole = "0", fraction = "00"] = text.replace("-", "").split(".");
  const kurus = Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));

  return negative ? -kurus : kurus;
}

/**
 * Tam sayı kuruşu Prisma'ya yazılabilir metne çevirir (`"1234.56"`).
 *
 * Metin döndürülüyor çünkü Prisma `Decimal` alanına sayı vermek değeri önce
 * float'a sokar — tam da engellemeye çalıştığımız yol. Metin, ondalık
 * kütüphanesine tam olarak kastettiğimiz değeri verir.
 */
export function toDecimalInput(kurus: number): string {
  const negative = kurus < 0;
  const absolute = Math.abs(Math.round(kurus));

  return `${negative ? "-" : ""}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

/** Ekranda gösterilecek tutar: `1.234,56 ₺`. */
export function formatTry(kurus: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
  }).format(kurus / 100);
}

/**
 * Birim fiyat × adet.
 *
 * Ayrı bir fonksiyon çünkü çarpımın SIRASI önemli: tam sayı kuruşu tam sayı
 * adetle çarpmak her zaman tam sayı verir. Önce liraya çevirip çarpmak
 * yuvarlama hatası doğururdu.
 */
export function lineTotalKurus(unitPriceKurus: number, quantity: number): number {
  return unitPriceKurus * quantity;
}

/** Tutarları toplar. Boş listede 0 döner. */
export function sumKurus(amounts: readonly number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}
