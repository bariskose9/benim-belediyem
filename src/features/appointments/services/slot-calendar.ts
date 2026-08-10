/**
 * Doktor takviminin ŞEKLİ — hangi günde hangi saatlerde muayene saati açılır.
 *
 * ═══ NEDEN AYRI VE NEDEN `src/` İÇİNDE ═══
 *
 * Bu takvim iki yerden üretiliyor: tohumlama (`prisma/seed/steps/health.ts`)
 * ilk 14 günü yazıyor, adım 16'daki planlı görev her gün ufku bir gün ileri
 * kaydırıyor (teknik borç #38). İkisi AYNI saatleri üretmek zorunda — yoksa
 * 15. günün saatleri diğerlerinden farklı olur ve kimse fark etmez.
 *
 * Bu yüzden saatler ne tohumda ne görevde; ikisinin de içe aktardığı tek
 * yerde. Tohum `src/` içinden zaten okuyor (`seed-helpers.ts` → `crypto.js`),
 * yani yön doğru: kural uygulamada, tohum onu tüketiyor.
 *
 * ⛔ SAF FONKSİYONLAR — veritabanı, HTTP ve `new Date()` yok. Referans an her
 * zaman dışarıdan veriliyor ki test sahte saatle çalışabilsin (ADR-007'nin
 * "süre dolumu testi zorunlu" kuralı).
 */

/** Bir muayene saatinin uzunluğu (fake-data-guide.md "Hastane randevu"). */
export const SLOT_DURATION_MINUTES = 20;

/** Sabah bloğu: 09:00–12:00 (Türkiye saati), son slot 11:40'ta başlar. */
const MORNING_BLOCK = { startHour: 9, startMinute: 0, endHour: 12, endMinute: 0 } as const;

/** Öğleden sonra bloğu: 13:30–16:30, son slot 16:10'da başlar. */
const AFTERNOON_BLOCK = { startHour: 13, startMinute: 30, endHour: 16, endMinute: 30 } as const;

/**
 * Türkiye'nin UTC farkı — SABİT +3.
 *
 * Türkiye 2016'dan beri yaz saati uygulamıyor; yıl boyunca tek bir fark
 * geçerli. Bu yüzden `Intl` ile her çağrıda fark hesaplamak yerine sabit
 * kullanılıyor — ama varsayım TEST EDİLİYOR: `slot-calendar.test.ts`
 * üretilen anları `formatIstanbulTime()` ile geri okuyup beklenen duvar
 * saatini görüyor. Kural bir gün değişirse test kırmızıya döner, kod sessizce
 * yanlış saat üretmez.
 */
const ISTANBUL_UTC_OFFSET_HOURS = 3;

/** Verilen anın UTC gününün gece yarısı. */
export function startOfUtcDay(instant: Date): Date {
  return new Date(Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate()));
}

/** UTC gününe gün ekler (saat/dakika taşımaz). */
export function addUtcDays(day: Date, days: number): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + days));
}

/**
 * "Şu gün, Türkiye saatiyle şu saat" → UTC anı.
 *
 * Veritabanına her zaman UTC yazılıyor (data-model.md); duvar saati yalnızca
 * takvimi TARİF ederken kullanılıyor.
 */
function istanbulWallClockToUtc(day: Date, hour: number, minute: number): Date {
  return new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      hour - ISTANBUL_UTC_OFFSET_HOURS,
      minute,
    ),
  );
}

function blockSlotTimes(
  day: Date,
  block: { startHour: number; startMinute: number; endHour: number; endMinute: number },
): Date[] {
  const times: Date[] = [];
  const end = istanbulWallClockToUtc(day, block.endHour, block.endMinute);
  const stepMs = SLOT_DURATION_MINUTES * 60_000;

  for (
    let cursor = istanbulWallClockToUtc(day, block.startHour, block.startMinute);
    cursor < end;
    cursor = new Date(cursor.getTime() + stepMs)
  ) {
    times.push(cursor);
  }

  return times;
}

/** Bir günün tüm muayene saatleri (sabah + öğleden sonra), artan sırada. */
export function buildDaySlotTimes(day: Date): Date[] {
  return [...blockSlotTimes(day, MORNING_BLOCK), ...blockSlotTimes(day, AFTERNOON_BLOCK)];
}

/**
 * `from` gününden başlayarak `days` günlük takvimin tüm saatleri.
 *
 * `from` GÜN BAŞINA yuvarlanmıyor — çağıran ne verdiyse o günden başlıyor.
 * Planlı görev bunu bilerek `startOfUtcDay(now)` ile çağırıyor: geçmiş saatler
 * de üretilse `createMany({ skipDuplicates: true })` onları zaten atlar, ama
 * boşuna satır üretmenin anlamı yok.
 */
export function buildCalendarSlotTimes(input: { from: Date; days: number }): Date[] {
  const times: Date[] = [];

  for (let dayOffset = 0; dayOffset < input.days; dayOffset += 1) {
    times.push(...buildDaySlotTimes(addUtcDays(input.from, dayOffset)));
  }

  return times;
}
