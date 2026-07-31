/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
  ARGON2_MEMORY_COST_KIB,
  ARGON2_PARALLELISM,
  ARGON2_TIME_COST,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/config/constants";
import { checkPasswordPolicy } from "@/features/auth/services/password-policy.service";
import { hashPassword, verifyPassword } from "@/features/auth/services/password.service";

/**
 * Şifre özetleme ve politikası (ADR-011 · 05-auth-security.md).
 *
 * argon2 KASITLI OLARAK YAVAŞ (parametreler 64 MiB / 3 tur), o yüzden bu
 * dosyadaki özet testleri birkaç yüz milisaniye sürer. Bu bir sorun değil,
 * özelliğin kendisidir.
 */

describe("hashPassword — argon2id", () => {
  it("argon2id özeti üretir ve parametreleri sabitlerden alır", async () => {
    const hash = await hashPassword("gecerli-sifre-123");

    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).toContain(`m=${ARGON2_MEMORY_COST_KIB}`);
    expect(hash).toContain(`t=${ARGON2_TIME_COST}`);
    expect(hash).toContain(`p=${ARGON2_PARALLELISM}`);
  });

  it("aynı şifre için her seferinde FARKLI özet üretir — tuz", async () => {
    // Aynı özet çıksaydı, iki kullanıcının aynı şifreyi kullandığı
    // veritabanına bakan biri tarafından görülebilirdi.
    const [first, second] = await Promise.all([
      hashPassword("aynisifre1"),
      hashPassword("aynisifre1"),
    ]);

    expect(first).not.toBe(second);
  });

  it("özet, düz şifreyi İÇERMEZ", async () => {
    const hash = await hashPassword("cok-ozel-sifre-42");

    expect(hash).not.toContain("cok-ozel-sifre-42");
  });
});

describe("verifyPassword", () => {
  it("doğru şifreyi kabul eder", async () => {
    const hash = await hashPassword("dogru-sifre-123");

    await expect(verifyPassword(hash, "dogru-sifre-123")).resolves.toBe(true);
  });

  it("yanlış şifreyi reddeder", async () => {
    const hash = await hashPassword("dogru-sifre-123");

    await expect(verifyPassword(hash, "yanlis-sifre-123")).resolves.toBe(false);
  });

  it("bozuk özette HATA FIRLATMAZ, sadece false döner", async () => {
    // İstisna fırlatsaydı, bozuk özetli bir hesap 500 hatasıyla "bu hesap var"
    // bilgisini sızdırırdı.
    await expect(verifyPassword("bu-bir-argon2-ozeti-degil", "herhangi")).resolves.toBe(false);
    await expect(verifyPassword("", "herhangi")).resolves.toBe(false);
  });
});

describe("checkPasswordPolicy", () => {
  it("geçerli şifreyi kabul eder", () => {
    expect(checkPasswordPolicy("kirmizi-fener-42")).toEqual({ outcome: "ok" });
  });

  it("8 karakterden kısa şifreyi reddeder", () => {
    expect(checkPasswordPolicy("a".repeat(PASSWORD_MIN_LENGTH - 1))).toEqual({
      outcome: "too_short",
    });
  });

  it("tam 8 karakteri kabul eder — sınır durumu", () => {
    expect(checkPasswordPolicy("kFj9mQ2x")).toEqual({ outcome: "ok" });
  });

  it("aşırı uzun şifreyi reddeder — hizmet dışı bırakma koruması", () => {
    // argon2 girdiyi kesmez; sınırsız uzun şifre sınırsız CPU demektir.
    expect(checkPasswordPolicy("a1B2c3D4".repeat(100))).toEqual({ outcome: "too_long" });
  });

  it("tam üst sınırı kabul eder — sınır durumu", () => {
    expect(checkPasswordPolicy("x".repeat(PASSWORD_MAX_LENGTH - 1) + "9")).toEqual({
      outcome: "ok",
    });
  });

  it("yaygın şifreleri reddeder", () => {
    for (const password of ["password123", "12345678", "sifre123", "galatasaray", "qwertyui"]) {
      expect(checkPasswordPolicy(password)).toEqual({ outcome: "leaked" });
    }
  });

  it("yaygın şifreyi büyük harfle yazarak da geçilemez", () => {
    expect(checkPasswordPolicy("PaSsWoRd123")).toEqual({ outcome: "leaked" });
  });

  it("kimlik numarasını içeren şifreyi reddeder", () => {
    expect(checkPasswordPolicy("sifrem12345678901", { nationalId: "12345678901" })).toEqual({
      outcome: "contains_personal_data",
    });
  });

  it("e-posta kullanıcı adını içeren şifreyi reddeder", () => {
    expect(checkPasswordPolicy("ayseyilmaz2026", { email: "ayseyilmaz@ornek.com" })).toEqual({
      outcome: "contains_personal_data",
    });
  });

  it("ad veya soyadı içeren şifreyi reddeder", () => {
    expect(checkPasswordPolicy("ayse-guclu-42", { fullName: "Ayşe Yılmaz" })).toEqual({
      outcome: "contains_personal_data",
    });
  });

  it("soyadı ASCII ile yazılsa da yakalar", () => {
    // Türkiye'de şifreye Türkçe karakter yazmak yaygın değil: "Yılmaz"
    // soyadlı biri şifresini `yilmaz2026` diye yazar. Harf katlaması olmasaydı
    // "yılmaz" ile "yilmaz" eşleşmez ve kontrol tamamen atlanırdı.
    expect(checkPasswordPolicy("yilmaz-guclu-42", { fullName: "Ayşe Yılmaz" })).toEqual({
      outcome: "contains_personal_data",
    });
  });

  it("Türkçe harflerin hepsini katlar", () => {
    for (const [name, password] of [
      ["Gülşah Çetin", "gulsah-mavi-42"],
      ["Oğuz Öztürk", "oguz-yesil-42"],
      ["Çiğdem Şahin", "cigdem-kirmizi-1"],
    ] as const) {
      expect(checkPasswordPolicy(password, { fullName: name })).toEqual({
        outcome: "contains_personal_data",
      });
    }
  });

  it("kısa soyadı yüzünden ilgisiz şifreleri reddetmez", () => {
    // "Ali Öz" gibi kısa bir soyadı, içinde "öz" geçen her şifreyi haksız
    // yere reddederdi.
    expect(checkPasswordPolicy("ozgurluk-mavi-42", { fullName: "Ali Öz" })).toEqual({
      outcome: "ok",
    });
  });

  it("Türkçe büyük/küçük harf farkını doğru ele alır", () => {
    // `toLowerCase()` "İ" harfini beklenmedik biçimde çeviriyor; Türkçe yerel
    // ayarla karşılaştırma yapılmazsa "İNCİ" ile "inci" eşleşmezdi.
    expect(checkPasswordPolicy("İNCİDENIZ-42", { fullName: "İnci Deniz" })).toEqual({
      outcome: "contains_personal_data",
    });
  });
});
