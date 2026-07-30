import { computeCheckDigits } from "../../../src/lib/crypto.js";
import type { Rng } from "./rng.js";

/**
 * Tohumlama ortak yardımcıları: sabit kimlikler, para biçimi, tarih hesabı.
 */

/**
 * Sahte kaydın SABİT kimliği.
 *
 * İdempotentliğin temeli budur: `createMany({ skipDuplicates: true })` çağrısı,
 * birincil anahtarı çakışan satırı sessizce atlar. Kimlik her çalıştırmada aynı
 * olduğu için ikinci tohumlama veriyi katlamaz (04-database.md "Seed").
 * Ayrıca sahte veri her zaman ayırt edilebilir olur (fake-data-guide.md).
 */
export function seedId(prefix: string, ...parts: readonly (string | number)[]): string {
  const suffix = parts
    .map((part) => (typeof part === "number" ? String(part).padStart(4, "0") : part))
    .join("-");

  return `seed-${prefix}-${suffix}`;
}

/**
 * Toplu yazmayı parçalara bölerek çalıştırır.
 *
 * NEDEN ZORUNLU: PostgreSQL tek sorguda en fazla 65535 parametre kabul eder.
 * Doktor slotları gibi on binlerce satırlık tablolarda tek `createMany` bu
 * sınırı aşar ve "bind message has N parameter formats" hatası verir.
 */
export async function insertInChunks<T>(
  rows: readonly T[],
  chunkSize: number,
  insert: (chunk: T[]) => Promise<unknown>,
): Promise<number> {
  for (let start = 0; start < rows.length; start += chunkSize) {
    await insert(rows.slice(start, start + chunkSize));
  }

  return rows.length;
}

/**
 * Türkiye saatinin UTC farkı. Türkiye 2016'dan beri yıl boyu UTC+3 kullanır,
 * yaz saati uygulaması yoktur — bu yüzden sabit değer güvenlidir.
 * Veritabanına her zaman UTC yazılır (docs/standards/02-coding-standards.md).
 */
export const TURKEY_UTC_OFFSET_HOURS = 3;

/** Verilen günün, Türkiye saatiyle `hour:minute` anına karşılık gelen UTC zamanı. */
export function turkeyTimeToUtc(day: Date, hour: number, minute: number): Date {
  return new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      hour - TURKEY_UTC_OFFSET_HOURS,
      minute,
    ),
  );
}

/**
 * Tohumlamanın referans anı: BUGÜNÜN UTC gece yarısı.
 *
 * Neden `new Date()` doğrudan kullanılmıyor: aynı gün içinde iki kez çalıştırılan
 * tohumlama birebir aynı tarihleri üretmeli, yoksa "kayıt sayıları değişmedi"
 * kanıtı saatlere göre bozulurdu.
 */
export function startOfUtcDay(reference: Date = new Date()): Date {
  return new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()),
  );
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Fiyat bandı içinde GERÇEKÇİ KURUŞLA biten bir tutar üretir (fake-data-guide.md:
 * "Fiyatlar `.90` / `.50` gibi gerçekçi kuruşlarla biter").
 *
 * String döner: Decimal kolona float göndermek kuruş kaybına yol açar,
 * `Decimal(10,2)` string'i tam olarak kabul eder.
 */
export function priceInBand(rng: Rng, minLira: number, maxLira: number): string {
  const lira = rng.int(minLira, Math.max(minLira, maxLira - 1));
  const kurus = rng.pick(["90", "50", "40"] as const);

  return `${lira}.${kurus}`;
}

/**
 * Kontrol basamağı doğru, 9 ile BAŞLAYAN sahte kimlik numarası üretir.
 *
 * Neden 9: fake-data-guide.md gereği. Gerçekte kullanımdaki numaralarla çakışma
 * ihtimalini azaltır. Üretilen numaralar tamamen sentetiktir ve hiçbir gerçek
 * kişiyi temsil etmez.
 */
export function generateFakeNationalId(rng: Rng): string {
  const firstNine = [9, ...Array.from({ length: 8 }, () => rng.int(0, 9))];
  const [tenth, eleventh] = computeCheckDigits(firstNine);

  return [...firstNine, tenth, eleventh].join("");
}

/**
 * Sahte telefon numarası: `0555 0XX XX XX` bloğundan sırayla (fake-data-guide.md).
 * Sıralı üretim, aynı numaranın iki kişiye verilmesini imkânsız kılar.
 */
export function fakePhone(index: number): string {
  return `05550${String(index).padStart(6, "0")}`;
}

/** Sahte e-posta: `.test` alan adı RFC 2606 ile ayrılmıştır, gerçek adrese posta gidemez. */
export function fakeEmail(firstName: string, lastName: string, index: number): string {
  return `${slugify(firstName)}.${slugify(lastName)}${index}@ornek.test`;
}

/** Türkçe karakterleri ASCII'ye indirger; e-posta ve dosya adlarında kullanılır. */
export function slugify(value: string): string {
  const turkish: Record<string, string> = {
    ç: "c",
    ğ: "g",
    ı: "i",
    ö: "o",
    ş: "s",
    ü: "u",
    Ç: "c",
    Ğ: "g",
    İ: "i",
    Ö: "o",
    Ş: "s",
    Ü: "u",
  };

  return [...value.toLocaleLowerCase("tr-TR")]
    .map((char) => turkish[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
