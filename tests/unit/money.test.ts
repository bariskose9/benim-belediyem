/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { formatTry, lineTotalKurus, sumKurus, toDecimalInput, toKurus } from "@/lib/money";

/**
 * Para hesabı — float hatasının GERÇEKTEN yakalandığını kanıtlar.
 *
 * Bu dosyanın en önemli testi "0.1 + 0.2" olanı: kayan noktayla yazılmış bir
 * uygulama orada kırmızıya döner. Geri kalanı sınır durumları (kuruşsuz tutar,
 * tek haneli kuruş, negatif, büyük tutar).
 */

describe("toKurus", () => {
  it("Prisma Decimal değerini tam sayı kuruşa çevirir", () => {
    expect(toKurus(new Prisma.Decimal("1234.56"))).toBe(123456);
    expect(toKurus(new Prisma.Decimal("0.05"))).toBe(5);
    expect(toKurus(new Prisma.Decimal("59.00"))).toBe(5900);
  });

  it("metin ve sayı girdiyi de kabul eder", () => {
    expect(toKurus("99.90")).toBe(9990);
    expect(toKurus(59)).toBe(5900);
  });

  it("tek haneli kuruşu doğru okur — `.5` elli kuruştur, beş değil", () => {
    expect(toKurus("10.5")).toBe(1050);
  });

  it("negatif tutarı korur (indirim satırları için)", () => {
    expect(toKurus(new Prisma.Decimal("-25.50"))).toBe(-2550);
  });
});

describe("toDecimalInput", () => {
  it("kuruşu veritabanına yazılabilir metne çevirir", () => {
    expect(toDecimalInput(123456)).toBe("1234.56");
    expect(toDecimalInput(5)).toBe("0.05");
    expect(toDecimalInput(5900)).toBe("59.00");
    expect(toDecimalInput(0)).toBe("0.00");
  });

  it("negatif tutarı korur", () => {
    expect(toDecimalInput(-2550)).toBe("-25.50");
  });

  /** Gidiş-dönüş kayıpsız olmalı; aksi hâlde her okuma-yazma turunda kuruş erir. */
  it("toKurus ile gidiş-dönüş değeri değiştirmez", () => {
    for (const value of ["0.00", "0.01", "9.99", "750.00", "12345.67"]) {
      expect(toDecimalInput(toKurus(value))).toBe(value);
    }
  });
});

describe("float hatası", () => {
  /**
   * ═══ BU DOSYANIN VAR OLMA SEBEBİ ═══
   * Kayan noktada 0.1 + 0.2 = 0.30000000000000004'tür. Tam sayı kuruşta
   * böyle bir şey yok. Test bunu hem doğrulayıp hem de neden önemli
   * olduğunu belgeliyor.
   */
  it("0.10 + 0.20 tam olarak 0.30 eder", () => {
    expect(0.1 + 0.2).not.toBe(0.3); // JavaScript'in kendi davranışı
    expect(sumKurus([toKurus("0.10"), toKurus("0.20")])).toBe(30);
    expect(toDecimalInput(sumKurus([toKurus("0.10"), toKurus("0.20")]))).toBe("0.30");
  });

  it("yüz kalemlik sepette kuruş kaymaz", () => {
    const lines = Array.from({ length: 100 }, () => toKurus("19.99"));

    expect(sumKurus(lines)).toBe(199900);
    expect(toDecimalInput(sumKurus(lines))).toBe("1999.00");
  });
});

describe("lineTotalKurus", () => {
  it("birim fiyatı adetle çarpar", () => {
    expect(lineTotalKurus(toKurus("24.90"), 3)).toBe(7470);
  });

  it("sıfır adette sıfır döner", () => {
    expect(lineTotalKurus(toKurus("24.90"), 0)).toBe(0);
  });
});

describe("formatTry", () => {
  it("Türk lirası biçiminde gösterir", () => {
    // Boşluk karakteri yerel ayara göre değişebiliyor; sayı ve simge kontrol edilir.
    expect(formatTry(123456)).toContain("1.234,56");
    expect(formatTry(123456)).toContain("₺");
  });

  it("kuruşu her zaman iki hane gösterir", () => {
    expect(formatTry(5900)).toContain("59,00");
    expect(formatTry(5)).toContain("0,05");
  });
});
