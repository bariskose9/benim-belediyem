/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
  detectCardBrand,
  isExpired,
  isValidCvv,
  isValidLuhn,
  lastFourDigits,
  normalizeCardNumber,
} from "@/features/payment/services/card-rules";

/**
 * Kart doğrulamasının saf kuralları (PRD §6.2 adım 3).
 *
 * Test kartları `docs/project/fake-data-guide.md`'den; hepsi sektörde bilinen
 * SAHTE numaralar, hiçbiri gerçek bir karta ait değil.
 */

const VISA_OK = "4111111111111111";
const MASTERCARD_OK = "5555555555554444";
const VISA_DECLINED = "4000000000000002";
const VISA_INSUFFICIENT = "4000000000009995";

describe("normalizeCardNumber", () => {
  it("boşluk ve tireleri atar — kullanıcı gruplayarak yazabilir", () => {
    expect(normalizeCardNumber("4111 1111 1111 1111")).toBe(VISA_OK);
    expect(normalizeCardNumber("4111-1111-1111-1111")).toBe(VISA_OK);
  });
});

describe("isValidLuhn", () => {
  it("rehberdeki dört test kartının hepsi geçerlidir", () => {
    for (const card of [VISA_OK, MASTERCARD_OK, VISA_DECLINED, VISA_INSUFFICIENT]) {
      expect(isValidLuhn(card)).toBe(true);
    }
  });

  it("boşluklu yazımı da kabul eder", () => {
    expect(isValidLuhn("4111 1111 1111 1111")).toBe(true);
  });

  /** Tek rakam değişince kontrol tutmamalı — algoritmanın asıl işi bu. */
  it("tek hanesi değişmiş numarayı reddeder", () => {
    expect(isValidLuhn("4111111111111112")).toBe(false);
  });

  it("rakam olmayan karakter içeren numarayı reddeder", () => {
    expect(isValidLuhn("4111abcd11111111")).toBe(false);
    expect(isValidLuhn("")).toBe(false);
  });

  it("çok kısa ve çok uzun numarayı reddeder", () => {
    expect(isValidLuhn("411111111111")).toBe(false); // 12 hane
    expect(isValidLuhn("41111111111111111111")).toBe(false); // 20 hane
  });
});

describe("detectCardBrand", () => {
  it("bilinen ön ekleri doğru markaya eşler", () => {
    expect(detectCardBrand(VISA_OK)).toBe("visa");
    expect(detectCardBrand(MASTERCARD_OK)).toBe("mastercard");
    expect(detectCardBrand("2221000000000009")).toBe("mastercard");
  });

  /**
   * Tanınmayan numara VARSAYILAN BİR MARKAYA DÜŞMEZ. Düşseydi kullanıcı
   * kayıtlı kartını yanlış etiketle görürdü ("Visa" yazan bir Troy kartı).
   */
  it("tanımadığı ön ekte null döner", () => {
    expect(detectCardBrand("6011000000000004")).toBeNull(); // Discover
    expect(detectCardBrand("371449635398431")).toBeNull(); // Amex — şemada yok
    expect(detectCardBrand("9792000000000001")).toBeNull(); // Troy — şemada yok
    expect(detectCardBrand("1234567812345670")).toBeNull();
  });
});

describe("lastFourDigits", () => {
  it("son 4 haneyi verir — veritabanına yazılan tek numara parçası", () => {
    expect(lastFourDigits(VISA_OK)).toBe("1111");
    expect(lastFourDigits("5555 5555 5555 4444")).toBe("4444");
  });
});

/**
 * KART SON KULLANMA AYININ SONUNA KADAR GEÇERLİDİR.
 * Ayın ilkinde geçersiz saymak kullanıcıyı bir ay erken reddederdi.
 */
describe("isExpired", () => {
  it("son kullanma ayının İÇİNDE kart hâlâ geçerlidir", () => {
    expect(isExpired(12, 2030, new Date("2030-12-01T00:00:00.000Z"))).toBe(false);
    expect(isExpired(12, 2030, new Date("2030-12-31T23:59:59.999Z"))).toBe(false);
  });

  it("bir sonraki ayın ilk anında süresi dolar", () => {
    expect(isExpired(12, 2030, new Date("2031-01-01T00:00:00.000Z"))).toBe(true);
  });

  it("geçmiş tarihi süresi dolmuş sayar", () => {
    expect(isExpired(1, 2020, new Date("2026-08-03T00:00:00.000Z"))).toBe(true);
  });

  it("geçersiz ay ve yılı süresi dolmuş sayar — sıkı taraf", () => {
    const now = new Date("2026-08-03T00:00:00.000Z");

    expect(isExpired(0, 2030, now)).toBe(true);
    expect(isExpired(13, 2030, now)).toBe(true);
    expect(isExpired(6.5, 2030, now)).toBe(true);
    expect(isExpired(12, 1900, now)).toBe(true);
  });
});

describe("isValidCvv", () => {
  it("3 ve 4 haneli kodu kabul eder", () => {
    expect(isValidCvv("123")).toBe(true);
    expect(isValidCvv("1234")).toBe(true);
  });

  it("kısa, uzun ve rakam olmayan kodu reddeder", () => {
    expect(isValidCvv("12")).toBe(false);
    expect(isValidCvv("12345")).toBe(false);
    expect(isValidCvv("12a")).toBe(false);
    expect(isValidCvv("")).toBe(false);
  });
});
