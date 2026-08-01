/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
  passwordResetCompleteSchema,
  passwordResetRequestSchema,
} from "@/features/auth/schemas/password-reset.schema";

/**
 * Şifre sıfırlama girdi şemaları (adım 4b-3).
 *
 * BURADAKİ ASIL SORU biçim doğrulaması değil, HANGİ GİRDİNİN AKIŞA GİRDİĞİ:
 * kontrol basamağı geçersiz bir numara reddedilseydi, "biçimi bozuk" ile
 * "kayıtlı değil" farklı yanıt alır ve saldırgan bu farktan geçerli numara
 * üretebilirdi (PRD §5.0 hesap sayımı koruması).
 */

describe("kod isteme şeması", () => {
  it("11 haneli numarayı kabul eder", () => {
    const parsed = passwordResetRequestSchema.safeParse({
      nationalId: "10000000146",
      turnstileToken: "jeton",
    });

    expect(parsed.success).toBe(true);
  });

  it("kontrol basamağı GEÇERSİZ numarayı da kabul eder", () => {
    // Kasıtlı: geçersiz numara da sahte kod kaydı yoluna girmeli ki yanıt
    // kayıtsız bir numaradan ayırt edilemesin.
    const parsed = passwordResetRequestSchema.safeParse({ nationalId: "12345678901" });

    expect(parsed.success).toBe(true);
  });

  it("11 haneli olmayan numarayı reddeder", () => {
    for (const nationalId of ["123", "100000001460", "abcdefghijk", ""]) {
      expect(passwordResetRequestSchema.safeParse({ nationalId }).success).toBe(false);
    }
  });

  it("bot jetonu verilmezse boş string sayar", () => {
    const parsed = passwordResetRequestSchema.safeParse({ nationalId: "10000000146" });

    // Şema hatası (422) değil, boş jeton → sunucu BOT_CHECK_REQUIRED (403)
    // döndürsün diye. Ekran kutuyu bu koda göre açıyor.
    expect(parsed.success && parsed.data.turnstileToken).toBe("");
  });
});

describe("kod + yeni şifre şeması", () => {
  const valid = {
    code: "123456",
    password: "yesil-orman-88",
    passwordConfirm: "yesil-orman-88",
  };

  it("geçerli girdiyi kabul eder", () => {
    expect(passwordResetCompleteSchema.safeParse(valid).success).toBe(true);
  });

  it("6 haneli olmayan kodu reddeder", () => {
    for (const code of ["12345", "1234567", "12a456", ""]) {
      expect(passwordResetCompleteSchema.safeParse({ ...valid, code }).success).toBe(false);
    }
  });

  it("baştaki sıfırlı kodu kabul eder", () => {
    // `000123` geçerli bir koddur; sayıya çevrilirse kaybolur.
    expect(passwordResetCompleteSchema.safeParse({ ...valid, code: "000123" }).success).toBe(true);
  });

  it("8 karakterden kısa şifreyi reddeder", () => {
    const parsed = passwordResetCompleteSchema.safeParse({
      ...valid,
      password: "kisa12",
      passwordConfirm: "kisa12",
    });

    expect(parsed.success).toBe(false);
  });

  it("şifreler uyuşmazsa reddeder", () => {
    const parsed = passwordResetCompleteSchema.safeParse({
      ...valid,
      passwordConfirm: "baska-bir-sifre",
    });

    expect(parsed.success).toBe(false);
  });

  it("128 karakterden uzun şifreyi reddeder", () => {
    // Üst sınır bir hizmet dışı bırakma koruması: argon2 girdiyi kesmez.
    const password = "a".repeat(129);
    const parsed = passwordResetCompleteSchema.safeParse({
      ...valid,
      password,
      passwordConfirm: password,
    });

    expect(parsed.success).toBe(false);
  });
});
