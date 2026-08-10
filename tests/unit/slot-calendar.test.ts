/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
  addUtcDays,
  buildCalendarSlotTimes,
  buildDaySlotTimes,
  SLOT_DURATION_MINUTES,
  startOfUtcDay,
} from "@/features/appointments/services/slot-calendar";
import { formatIstanbulTime } from "@/lib/datetime";

/**
 * Doktor takviminin ŞEKLİ (adım 16 · teknik borç #38).
 *
 * Bu dosya "takvim doğru saatleri üretiyor mu" sorusunu cevaplıyor; "planlı
 * görev bu saatleri gerçekten yazıyor mu" sorusu `tests/db/scheduled-tasks.
 * test.ts` içinde gerçek veritabanına karşı kanıtlanıyor.
 */

const DAY = new Date(Date.UTC(2026, 8, 1));

describe("bir günün muayene saatleri", () => {
  const times = buildDaySlotTimes(DAY);

  it("sabah 09:00'da başlar", () => {
    expect(formatIstanbulTime(times[0]!)).toBe("09:00");
  });

  /**
   * ⚠️ BU TEST SABİT UTC FARKI VARSAYIMINI ÖLÇÜYOR.
   *
   * `slot-calendar.ts` Türkiye'nin farkını +3 olarak sabitliyor (2016'dan beri
   * yaz saati yok). `formatIstanbulTime` ise gerçek IANA veritabanını
   * kullanıyor. İkisi ayrıştığı gün — kural değişirse veya yaz saati geri
   * gelirse — bu test kırmızıya döner ve kod sessizce yanlış saat üretmez.
   */
  it("üretilen her saat İstanbul duvar saatinde beklenen dakikaya düşer", () => {
    const wallClock = times.map(formatIstanbulTime);

    expect(wallClock).toEqual([
      "09:00",
      "09:20",
      "09:40",
      "10:00",
      "10:20",
      "10:40",
      "11:00",
      "11:20",
      "11:40",
      "13:30",
      "13:50",
      "14:10",
      "14:30",
      "14:50",
      "15:10",
      "15:30",
      "15:50",
      "16:10",
    ]);
  });

  it("son slot bitiş saatinde DEĞİL, bir slot öncesinde başlar", () => {
    // 16:30 bitiş; son başlangıç 16:10. Bitiş anına slot açmak, saat 16:30-16:50
    // arası bir muayene sözü vermek olurdu.
    expect(formatIstanbulTime(times.at(-1)!)).toBe("16:10");
  });

  it("saatler artan sırada ve aralarında tam bir slot kadar boşluk var", () => {
    const morning = times.slice(0, 9);

    for (let index = 1; index < morning.length; index += 1) {
      const gapMinutes = (morning[index]!.getTime() - morning[index - 1]!.getTime()) / 60_000;

      expect(gapMinutes).toBe(SLOT_DURATION_MINUTES);
    }
  });
});

describe("çok günlü takvim", () => {
  it("her gün için aynı sayıda saat üretir", () => {
    const oneDay = buildDaySlotTimes(DAY).length;

    expect(buildCalendarSlotTimes({ from: DAY, days: 14 })).toHaveLength(oneDay * 14);
  });

  it("verilen günden başlar, geçmişe yazmaz", () => {
    const times = buildCalendarSlotTimes({ from: DAY, days: 3 });

    expect(times[0]!.getTime()).toBeGreaterThanOrEqual(DAY.getTime());
    expect(times.at(-1)!.getTime()).toBeLessThan(addUtcDays(DAY, 3).getTime());
  });

  it("gün sayısı sıfırsa hiç saat üretmez", () => {
    expect(buildCalendarSlotTimes({ from: DAY, days: 0 })).toHaveLength(0);
  });
});

describe("gün başlangıcı", () => {
  it("günün ortasındaki bir anı UTC gece yarısına indirir", () => {
    const noon = new Date(Date.UTC(2026, 8, 1, 12, 34, 56, 789));

    expect(startOfUtcDay(noon).toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("ay ve yıl sınırını doğru geçer", () => {
    expect(addUtcDays(new Date(Date.UTC(2026, 11, 31)), 1).toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
  });
});
