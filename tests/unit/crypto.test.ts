import { describe, expect, it } from "vitest";

import {
  computeCheckDigits,
  decryptNationalId,
  encryptNationalId,
  hashNationalId,
  isValidNationalId,
  maskNationalId,
} from "@/lib/crypto";

/** 32 baytlık test anahtarı — yalnızca bu dosyada kullanılır. */
const TEST_KEY = Buffer.alloc(32, 7).toString("base64");
const TEST_SALT = "test-salt";

/** Kontrol basamağı algoritmasıyla üretilmiş, tamamen sentetik bir numara. */
function makeValidId(firstNine: readonly number[]): string {
  return [...firstNine, ...computeCheckDigits(firstNine)].join("");
}

describe("kimlik numarası doğrulama", () => {
  it("kontrol basamağı tutan numarayı kabul eder", () => {
    expect(isValidNationalId(makeValidId([9, 1, 2, 3, 4, 5, 6, 7, 8]))).toBe(true);
  });

  it("son hanesi bozulmuş numarayı reddeder", () => {
    const valid = makeValidId([9, 1, 2, 3, 4, 5, 6, 7, 8]);
    const broken = `${valid.slice(0, 10)}${(Number(valid[10]) + 1) % 10}`;

    expect(isValidNationalId(broken)).toBe(false);
  });

  it("11 haneden kısa veya uzun değeri reddeder", () => {
    expect(isValidNationalId("1234567890")).toBe(false);
    expect(isValidNationalId("123456789012")).toBe(false);
  });

  it("sıfırla başlayan numarayı reddeder", () => {
    expect(isValidNationalId(`0${makeValidId([9, 1, 2, 3, 4, 5, 6, 7, 8]).slice(1)}`)).toBe(false);
  });

  it("harf içeren değeri reddeder", () => {
    expect(isValidNationalId("9123456789a")).toBe(false);
  });

  it("9 haneden farklı girdide kontrol basamağı hesaplamaz", () => {
    expect(() => computeCheckDigits([1, 2, 3])).toThrow();
  });
});

describe("maskeleme", () => {
  it("ilk 3 ve son 2 hane dışında hiçbir rakamı göstermez", () => {
    expect(maskNationalId("91234567890")).toBe("912******90");
  });

  it("maskeli değer orijinalle aynı uzunlukta olur", () => {
    expect(maskNationalId("91234567890")).toHaveLength(11);
  });
});

describe("tuzlanmış özet", () => {
  it("aynı numara için her zaman aynı özeti üretir (unique index bunun üzerine kurulu)", () => {
    expect(hashNationalId("91234567890", TEST_SALT)).toBe(hashNationalId("91234567890", TEST_SALT));
  });

  it("farklı tuzla farklı özet üretir — tuz sızmadan özet tahmin edilemez", () => {
    expect(hashNationalId("91234567890", TEST_SALT)).not.toBe(
      hashNationalId("91234567890", "baska-tuz"),
    );
  });

  it("özet düz numarayı içermez", () => {
    expect(hashNationalId("91234567890", TEST_SALT)).not.toContain("91234567890");
  });

  it("tuz boşsa hata verir — sessizce tuzsuz özet üretmez", () => {
    expect(() => hashNationalId("91234567890", "")).toThrow();
  });
});

describe("şifreleme", () => {
  it("şifrelenen değer geri çözülebilir", () => {
    const encrypted = encryptNationalId("91234567890", TEST_KEY);

    expect(decryptNationalId(encrypted, TEST_KEY)).toBe("91234567890");
  });

  it("şifreli metin düz numarayı içermez", () => {
    expect(encryptNationalId("91234567890", TEST_KEY)).not.toContain("91234567890");
  });

  it("aynı numara her seferinde FARKLI şifreli metin üretir", () => {
    // Bu yüzden şifreli kolon üzerinde unique index kurulamaz; tekilliği özet sağlar.
    expect(encryptNationalId("91234567890", TEST_KEY)).not.toBe(
      encryptNationalId("91234567890", TEST_KEY),
    );
  });

  it("kurcalanmış şifreli metni sessizce çözmez, hata verir", () => {
    const encrypted = encryptNationalId("91234567890", TEST_KEY);
    const [version, iv, tag, payload] = encrypted.split(".");
    const flipped = Buffer.from(payload, "base64");

    flipped[0] ^= 0xff;

    expect(() =>
      decryptNationalId([version, iv, tag, flipped.toString("base64")].join("."), TEST_KEY),
    ).toThrow();
  });

  it("yanlış uzunluktaki anahtarı reddeder", () => {
    expect(() => encryptNationalId("91234567890", Buffer.alloc(16).toString("base64"))).toThrow(
      /32 bayt/,
    );
  });

  it("anahtar boşsa hata verir", () => {
    expect(() => encryptNationalId("91234567890", "")).toThrow();
  });

  it("tanınmayan biçimdeki değeri çözmeye çalışmaz", () => {
    expect(() => decryptNationalId("rastgele-metin", TEST_KEY)).toThrow(/biçimi tanınmıyor/);
  });
});
