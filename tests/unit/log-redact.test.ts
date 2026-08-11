import { describe, expect, it } from "vitest";

import { REDACTED, isSensitiveKey, redact, redactString } from "@/lib/log-redact";

/**
 * Bu dosyanın işi tek bir soruyu cevaplamak: log'a veya Sentry'ye kişisel veri
 * sızabilir mi? Testler bu yüzden "süzgeç çağrıldı mı" diye bakmıyor, gerçek
 * bir sızıntı senaryosunun ÇIKTISINI okuyor.
 */

describe("redactString — serbest metnin içindeki hassas diziler", () => {
  it("T.C. kimlik numarasını gizler", () => {
    expect(redactString("vatandaş 91234567832 sorgulandı")).toBe(`vatandaş ${REDACTED} sorgulandı`);
  });

  it("sıfırla başlayan 11 haneyi kimlik numarası saymaz", () => {
    // Kimlik numarası sıfırla başlamaz; buradaki dizi bir telefon numarası.
    expect(redactString("05551234567")).toBe(REDACTED);
  });

  it("kart numarasını boşluklu yazıldığında da gizler", () => {
    expect(redactString("kart 4111 1111 1111 1111 reddedildi")).toBe(`kart ${REDACTED} reddedildi`);
  });

  it("kart numarasının ilk 11 hanesini kimlik sanıp gerisini açıkta bırakmaz", () => {
    const output = redactString("4111111111111111");

    expect(output).toBe(REDACTED);
    expect(output).not.toContain("1111");
  });

  it("e-posta adresini gizler", () => {
    expect(redactString("alici: ayse.yilmaz@ornek.test")).toBe(`alici: ${REDACTED}`);
  });

  it("Bearer jetonunu gizler ama şemayı bırakır", () => {
    expect(redactString("Authorization: Bearer abc123def456ghi")).toBe(
      `Authorization: Bearer ${REDACTED}`,
    );
  });

  it("JWT benzeri jetonu gizler", () => {
    expect(redactString("çerez=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdef")).toBe(
      `çerez=${REDACTED}`,
    );
  });

  it("masum sayıları gizlemez — log okunabilir kalmalı", () => {
    expect(redactString("sipariş 42 · tutar 12550 kuruş · 3 kalem")).toBe(
      "sipariş 42 · tutar 12550 kuruş · 3 kalem",
    );
  });

  it("çok uzun metni kırpar", () => {
    const output = redactString("x".repeat(2000));

    expect(output.endsWith("…[kırpıldı]")).toBe(true);
    expect(output.length).toBeLessThan(600);
  });
});

describe("isSensitiveKey — alan adına göre", () => {
  it.each([
    "password",
    "passwordHash",
    "sifre",
    "sessionToken",
    "TURNSTILE_SECRET_KEY",
    "national_id",
    "tcKimlikNo",
    "email",
    "phone",
    "fullName",
    "birthDate",
    "adres",
    "ip",
    "cvv",
  ])("%s hassas sayılır", (key) => {
    expect(isSensitiveKey(key)).toBe(true);
  });

  it.each(["orderId", "addressId", "emailChallengeId", "status", "code", "count", "durationMs"])(
    "%s hassas SAYILMAZ — arıza takibi için gerekli",
    (key) => {
      expect(isSensitiveKey(key)).toBe(false);
    },
  );

  it("kimlik numarası `...Id` muafiyetine girmez", () => {
    // `nationalId` hem "...Id" ile bitiyor hem de kişisel veri; muafiyet
    // kaldırılırsa bu test kırmızıya döner.
    expect(isSensitiveKey("nationalId")).toBe(true);
  });
});

describe("redact — nesne ağacı", () => {
  it("hassas alanları gizler, gerisini bırakır", () => {
    expect(redact({ userId: "usr_1", password: "Test1234!", status: "active" })).toEqual({
      userId: "usr_1",
      password: REDACTED,
      status: "active",
    });
  });

  it("iç içe nesnelerde de çalışır", () => {
    expect(
      redact({ payment: { card: { cardNumber: "4111111111111111", last4: "1111" } } }),
    ).toEqual({ payment: { card: { cardNumber: REDACTED, last4: "1111" } } });
  });

  it("döngüsel referansta patlamaz", () => {
    const node: Record<string, unknown> = { name: "kök" };
    node.self = node;

    expect(() => redact(node)).not.toThrow();
    expect(redact(node)).toEqual({ name: "kök", self: "[döngüsel]" });
  });

  it("uzun diziyi kırpar", () => {
    const output = redact(Array.from({ length: 50 }, (_, index) => index)) as unknown[];

    expect(output).toHaveLength(21);
    expect(output.at(-1)).toBe("…30 kayıt daha");
  });
});

describe("redact — hata nesnesi (teknik borç #79)", () => {
  it("hata metninin İÇİNDEKİ kişisel veriyi gizler", () => {
    /**
     * ⭐ BU TESTİN SEBEBİ: Prisma doğrulama hatası argüman nesnesinin tamamını
     * hata METNİNE düz yazı olarak koyuyor. Alan adına bakan bir süzgeç burada
     * hiçbir şey bulamaz — değerler bir alanın arkasında değil, cümlenin
     * ortasında. Bu test biçime göre süzmeyi koruyor.
     */
    const prismaLikeError = new Error(
      "Invalid `prisma.user.create()` invocation: " +
        "{ data: { fullName: 'Ayşe Yılmaz', nationalId: '91234567832', " +
        "email: 'ayse@ornek.test', birthDate: new Date('1990-01-01') } }",
    );

    const output = redact(prismaLikeError) as { message: string };

    expect(output.message).not.toContain("91234567832");
    expect(output.message).not.toContain("ayse@ornek.test");
    // Hangi çağrının patladığı görünmeye devam etmeli, yoksa log işe yaramaz.
    expect(output.message).toContain("prisma.user.create()");
  });

  it("cause zincirini takip eder — asıl sebep en dipte", () => {
    const root = new Error("bağlantı reddedildi: 91234567832");
    const wrapper = new Error("kayıt oluşturulamadı", { cause: root });

    const output = redact(wrapper) as { cause: { message: string } };

    expect(output.cause.message).toBe(`bağlantı reddedildi: ${REDACTED}`);
  });

  it("Prisma'nın meta alanındaki değerleri de süzer", () => {
    const error = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
      meta: { target: ["email"], email: "ayse@ornek.test" },
    });

    const output = redact(error) as { code: string; meta: Record<string, unknown> };

    expect(output.code).toBe("P2002");
    expect(output.meta.email).toBe(REDACTED);
    // Hangi kısıtın patladığı teşhis için şart.
    expect(output.meta.target).toEqual(["email"]);
  });

  it("stack trace'i korur ama kırpar", () => {
    const output = redact(new Error("patladı")) as { stack: string };

    expect(output.stack).toContain("Error: patladı");
    expect(output.stack.split("\n").length).toBeLessThanOrEqual(12);
  });
});
