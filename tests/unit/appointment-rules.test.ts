/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { APPOINTMENT_CANCEL_CUTOFF_MS } from "@/config/constants";
import {
  canCancelAt,
  cancellationDeadline,
  groupSlotsByIstanbulDay,
  isSlotInPast,
} from "@/features/appointments/services/appointment-rules";
import { istanbulDayKey } from "@/lib/datetime";

/**
 * PRD §5.1'in zaman kuralları.
 *
 * Bu dosya ÖZELLİKLE SINIRLARI test ediyor. Randevu kurallarının tamamı
 * "şundan önce / sonra" biçiminde ve böyle kurallarda hata neredeyse her zaman
 * tam sınırda çıkar: bir saniye öncesi ile sonrası değil, tam o an.
 */

const SLOT = new Date("2026-08-10T06:00:00.000Z"); // İstanbul'da 09:00

describe("isSlotInPast", () => {
  it("gelecekteki saati geçmiş saymaz", () => {
    expect(isSlotInPast(SLOT, new Date(SLOT.getTime() - 1))).toBe(false);
  });

  it("tam randevu anını GEÇMİŞ sayar — başlamakta olan randevuya kayıt açılmaz", () => {
    expect(isSlotInPast(SLOT, SLOT)).toBe(true);
  });

  it("geçmiş saati reddeder", () => {
    expect(isSlotInPast(SLOT, new Date(SLOT.getTime() + 1))).toBe(true);
  });

  /**
   * Ölçütün GÜN değil AN olduğunun kanıtı: aynı gün, ama saat geçmiş.
   * Gün karşılaştırması yapan bir uygulama bu testte kırmızıya döner.
   */
  it("aynı gün içinde geçmiş kalan saati reddeder", () => {
    const sameDayLater = new Date("2026-08-10T12:00:00.000Z"); // İstanbul 15:00

    expect(isSlotInPast(SLOT, sameDayLater)).toBe(true);
  });
});

describe("cancellationDeadline / canCancelAt", () => {
  it("son iptal anı randevudan tam 2 saat öncedir", () => {
    expect(cancellationDeadline(SLOT).getTime()).toBe(SLOT.getTime() - 2 * 60 * 60_000);
    expect(APPOINTMENT_CANCEL_CUTOFF_MS).toBe(2 * 60 * 60_000);
  });

  it("2 saatten fazla varken iptal edilebilir", () => {
    const now = new Date(SLOT.getTime() - APPOINTMENT_CANCEL_CUTOFF_MS - 60_000);

    expect(canCancelAt(SLOT, now)).toBe(true);
  });

  /** Sınır DAHİL: "en geç 2 saat önce" ifadesinin doğal okunuşu. */
  it("tam 2 saat kala iptal HÂLÂ edilebilir", () => {
    const now = new Date(SLOT.getTime() - APPOINTMENT_CANCEL_CUTOFF_MS);

    expect(canCancelAt(SLOT, now)).toBe(true);
  });

  it("2 saatten bir milisaniye az kaldığında iptal kapanır", () => {
    const now = new Date(SLOT.getTime() - APPOINTMENT_CANCEL_CUTOFF_MS + 1);

    expect(canCancelAt(SLOT, now)).toBe(false);
  });

  it("randevu saati geçtikten sonra iptal edilemez", () => {
    expect(canCancelAt(SLOT, new Date(SLOT.getTime() + 60_000))).toBe(false);
  });
});

/**
 * Gün hesabı UTC'ye göre yapılırsa bu testler kırmızıya döner.
 * İstanbul UTC+3 olduğu için UTC 21:00–23:59 aralığı ERTESİ güne aittir.
 */
describe("İstanbul gün sınırı", () => {
  it("UTC'de önceki güne düşen geç saati doğru güne yazar", () => {
    // UTC 2026-08-09 21:30 = İstanbul 2026-08-10 00:30
    expect(istanbulDayKey(new Date("2026-08-09T21:30:00.000Z"))).toBe("2026-08-10");
  });

  it("UTC gün başını hâlâ önceki güne yazar", () => {
    // UTC 2026-08-10 00:30 = İstanbul 2026-08-10 03:30 — aynı gün
    expect(istanbulDayKey(new Date("2026-08-10T00:30:00.000Z"))).toBe("2026-08-10");
  });

  it("günün son anı ile ertesi günün ilk anı farklı günlere düşer", () => {
    const lastMoment = new Date("2026-08-10T20:59:59.999Z");
    const firstMoment = new Date("2026-08-10T21:00:00.000Z");

    expect(istanbulDayKey(lastMoment)).toBe("2026-08-10");
    expect(istanbulDayKey(firstMoment)).toBe("2026-08-11");
  });
});

describe("groupSlotsByIstanbulDay", () => {
  it("saatleri İstanbul gününe göre gruplar ve sırayı korur", () => {
    const slots = [
      { startsAt: new Date("2026-08-09T21:00:00.000Z") }, // İst. 10 Ağu 00:00
      { startsAt: new Date("2026-08-10T06:00:00.000Z") }, // İst. 10 Ağu 09:00
      { startsAt: new Date("2026-08-10T21:00:00.000Z") }, // İst. 11 Ağu 00:00
    ];

    const days = groupSlotsByIstanbulDay(slots);

    expect(days.map((day) => day.dayKey)).toEqual(["2026-08-10", "2026-08-11"]);
    expect(days[0]?.slots).toHaveLength(2);
    expect(days[1]?.slots).toHaveLength(1);
  });

  it("boş listede boş dizi döner", () => {
    expect(groupSlotsByIstanbulDay([])).toEqual([]);
  });
});
