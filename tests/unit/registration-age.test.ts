/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { isAdultOn } from "@/features/auth/services/registration-age.service";

/**
 * 18 yaş kontrolü (PRD §5.0 · kabul kriterleri).
 *
 * PRD iki şeyi ayrı ayrı şart koşuyor:
 *  · 18 yaşını doldurmamış kişinin kaydı SUNUCUDA reddedilir
 *  · "kayıt sırasında 18 yaşını dolduran sınır durum (bugün doğum günü)
 *    KABUL EDİLİR"
 */

/** KPS doğum tarihi Postgres `date` kolonundan geliyor: gece yarısı UTC. */
function birth(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

describe("isAdultOn", () => {
  it("18 yaşını çoktan doldurmuş kişiyi kabul eder", () => {
    expect(isAdultOn(birth("1990-05-15"), new Date("2026-07-31T09:00:00Z"))).toBe(true);
  });

  it("bugün 18 yaşını dolduran kişiyi KABUL EDER — sınır durumu", () => {
    // PRD kabul kriteri: "Kayıt sırasında 18 yaşını dolduran sınır durum
    // (bugün doğum günü) kabul edilir."
    expect(isAdultOn(birth("2008-07-31"), new Date("2026-07-31T09:00:00Z"))).toBe(true);
  });

  it("yarın 18 olacak kişiyi reddeder", () => {
    expect(isAdultOn(birth("2008-08-01"), new Date("2026-07-31T09:00:00Z"))).toBe(false);
  });

  it("dün 18 olmuş kişiyi kabul eder", () => {
    expect(isAdultOn(birth("2008-07-30"), new Date("2026-07-31T09:00:00Z"))).toBe(true);
  });

  it("17 yaşındaki kişiyi reddeder", () => {
    expect(isAdultOn(birth("2009-01-01"), new Date("2026-07-31T09:00:00Z"))).toBe(false);
  });

  it("bebek yaştaki kişiyi reddeder", () => {
    expect(isAdultOn(birth("2025-12-01"), new Date("2026-07-31T09:00:00Z"))).toBe(false);
  });

  /**
   * BU TESTİN VARLIK SEBEBİ: kontrolü UTC'ye göre yapan bir uygulamayı
   * yakalamak. Türkiye UTC+3 olduğu için İstanbul'da gün, UTC'den önce döner.
   */
  describe("saat dilimi sınırı — İstanbul UTC+3", () => {
    it("İstanbul'da doğum günü başlamışken UTC'de hâlâ dün ise KABUL EDER", () => {
      // 2026-07-30T21:30:00Z = İstanbul'da 31 Temmuz 00:30.
      // Kullanıcı için doğum günü BAŞLADI; UTC'ye bakan bir uygulama
      // "hâlâ 30 Temmuz" der ve haksız yere reddederdi.
      const justAfterMidnightInIstanbul = new Date("2026-07-30T21:30:00Z");

      expect(isAdultOn(birth("2008-07-31"), justAfterMidnightInIstanbul)).toBe(true);
    });

    it("İstanbul'da doğum gününe bir saat kala reddeder", () => {
      // 2026-07-30T20:30:00Z = İstanbul'da 30 Temmuz 23:30. Henüz 18 değil.
      const justBeforeMidnightInIstanbul = new Date("2026-07-30T20:30:00Z");

      expect(isAdultOn(birth("2008-07-31"), justBeforeMidnightInIstanbul)).toBe(false);
    });
  });

  describe("29 Şubat doğumlular", () => {
    it("artık olmayan yılda 1 Mart'ta 18 sayılır", () => {
      expect(isAdultOn(birth("2008-02-29"), new Date("2026-03-01T09:00:00Z"))).toBe(true);
    });

    it("artık olmayan yılda 28 Şubat'ta henüz 18 değildir", () => {
      expect(isAdultOn(birth("2008-02-29"), new Date("2026-02-28T09:00:00Z"))).toBe(false);
    });

    it("artık yılda kendi gününde 18 sayılır", () => {
      expect(isAdultOn(birth("2008-02-29"), new Date("2028-02-29T09:00:00Z"))).toBe(true);
    });
  });

  describe("ay ve yıl sınırları", () => {
    it("yılbaşında doğan kişi 1 Ocak'ta kabul edilir", () => {
      expect(isAdultOn(birth("2008-01-01"), new Date("2026-01-01T09:00:00Z"))).toBe(true);
    });

    it("yılbaşından bir gün önce reddedilir", () => {
      expect(isAdultOn(birth("2008-01-01"), new Date("2025-12-31T09:00:00Z"))).toBe(false);
    });

    it("aynı ayın sonraki gününde doğan kişi reddedilir", () => {
      expect(isAdultOn(birth("2008-07-31"), new Date("2026-07-15T09:00:00Z"))).toBe(false);
    });
  });
});
