import { describe, expect, it } from "vitest";

import { consentInputSchema } from "@/features/legal/schemas/consent.schema";
import { ConsentType } from "@/generated/prisma/enums";

/**
 * Rıza isteği şemasının testleri (adım 17).
 *
 * En kritik iki iddia: (1) özne alanları şemada YOK, yani istemci başkasının
 * adına rıza yazdıramaz; (2) bandın yazabileceği rıza türü SINIRLI, yani
 * kullanıcı hiç görmediği bir metni kabul etmiş görünemez.
 */
describe("rıza isteği şeması", () => {
  it("bandın gönderdiği form değerlerini kabul ediyor", () => {
    const parsed = consentInputSchema.safeParse({
      consentType: ConsentType.necessary_cookies,
      isGranted: "1",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.isGranted).toBe(true);
  });

  it('"0" değerini geri alma olarak okuyor', () => {
    const parsed = consentInputSchema.safeParse({
      consentType: ConsentType.necessary_cookies,
      isGranted: "0",
    });

    /**
     * ⛔ BU TESTİN VARLIK SEBEBİ: `z.coerce.boolean()` kullanılsaydı `"0"`
     * dizesi "boş olmayan metin" olduğu için `true` sayılırdı ve kullanıcı
     * "geri al" düğmesine bastığında tercihi YENİDEN VERİLMİŞ olurdu.
     */
    expect(parsed.success && parsed.data.isGranted).toBe(false);
  });

  it("beklenmeyen bir onay değerini reddediyor", () => {
    for (const value of ["true", "evet", "", "2"]) {
      expect(
        consentInputSchema.safeParse({ consentType: "necessary_cookies", isGranted: value })
          .success,
      ).toBe(false);
    }
  });

  it("banttan yazılamayacak rıza türlerini reddediyor", () => {
    /**
     * `terms_of_use` ve `privacy_notice` kayıtları SUNUCUDA, kayıt akışının
     * sonunda yazılıyor. Uçtan tetiklenebilseydi hiç kayıt olmamış biri
     * "şartları kabul etti" kaydı ürettirebilirdi.
     */
    for (const consentType of [ConsentType.terms_of_use, ConsentType.privacy_notice]) {
      expect(consentInputSchema.safeParse({ consentType, isGranted: "1" }).success).toBe(false);
    }
  });

  it("gövdeye konan özne alanlarını sonuca taşımıyor", () => {
    const parsed = consentInputSchema.safeParse({
      consentType: ConsentType.necessary_cookies,
      isGranted: "1",
      userId: "baskasinin-kullanicisi",
      anonymousId: "baskasinin-ziyaretcisi",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && Object.keys(parsed.data)).not.toContain("userId");
    expect(parsed.success && Object.keys(parsed.data)).not.toContain("anonymousId");
  });

  it("aşırı uzun dönüş adresini reddediyor", () => {
    const parsed = consentInputSchema.safeParse({
      consentType: ConsentType.necessary_cookies,
      isGranted: "1",
      returnTo: `/${"a".repeat(3000)}`,
    });

    expect(parsed.success).toBe(false);
  });
});
