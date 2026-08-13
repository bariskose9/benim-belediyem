import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";

import { REDACTED } from "@/lib/log-redact";
import { SENTRY_DATA_COLLECTION, scrubEvent } from "@/lib/sentry-options";

/**
 * Sentry ÜÇÜNCÜ BİR SERVİS. Buraya giden her alan, Türkiye dışındaki bir
 * sunucuya kişisel veri aktarımı anlamına gelebilir (KVKK m.9 ·
 * 14-privacy-and-compliance.md). Bu dosya o sınırı test ediyor.
 */

function eventWith(partial: Partial<ErrorEvent>): ErrorEvent {
  return { ...partial } as ErrorEvent;
}

describe("SENTRY_DATA_COLLECTION — SDK varsayılanları kapatıldı mı", () => {
  /**
   * ⭐ BU TEST BİR GERİLEME KAPISI. Sentry'nin kendi varsayılanları bu proje
   * için tehlikeli: istek gövdesi kayıt formunun tamamını (şifre + kimlik
   * numarası), `stackFrameVariables` yığındaki yerel değişkenleri,
   * `databaseQueryData` ise Prisma sorgusunun parametre DEĞERLERİNİ topluyor.
   * Biri sessizce açılırsa burası kırmızıya döner.
   */
  it("istek gövdesi HİÇ toplanmaz", () => {
    expect(SENTRY_DATA_COLLECTION.httpBodies).toEqual([]);
  });

  it("çerez, başlık ve adres parametresi toplanmaz", () => {
    expect(SENTRY_DATA_COLLECTION.cookies).toBe(false);
    expect(SENTRY_DATA_COLLECTION.httpHeaders).toEqual({ request: false, response: false });
    expect(SENTRY_DATA_COLLECTION.urlQueryParams).toBe(false);
  });

  it("veritabanı parametreleri ve yığın değişkenleri toplanmaz", () => {
    expect(SENTRY_DATA_COLLECTION.databaseQueryData).toBe(false);
    expect(SENTRY_DATA_COLLECTION.stackFrameVariables).toBe(false);
  });

  it("kullanıcı bilgisi kendiliğinden doldurulmaz", () => {
    expect(SENTRY_DATA_COLLECTION.userInfo).toBe(false);
  });
});

describe("scrubEvent", () => {
  it("hata metnindeki kişisel veriyi gizler (teknik borç #79)", () => {
    const event = eventWith({
      exception: {
        values: [
          {
            type: "PrismaClientValidationError",
            value: "Invalid invocation: { nationalId: '91234567832', email: 'ayse@ornek.test' }",
          },
        ],
      },
    });

    const value = scrubEvent(event).exception?.values?.[0]?.value ?? "";

    expect(value).not.toContain("91234567832");
    expect(value).not.toContain("ayse@ornek.test");
    expect(value).toContain("Invalid invocation");
  });

  it("YIĞIN İZİNİ BOZMAZ", () => {
    /**
     * ⛔ Olayın tamamına `redact()` uygulamak cazipti ama yığın izini yok
     * ederdi: `redact` derinliği 5'te kesiyor, çerçeveler daha derinde.
     * Hatayı bulunamaz hale getiren bir "gizlilik" önlemi, gözlemlenebilirliği
     * kazanmak yerine kaybettirirdi. Bu test o dengeyi koruyor.
     */
    const event = eventWith({
      exception: {
        values: [
          {
            type: "Error",
            value: "patladı",
            stacktrace: {
              frames: [
                { filename: "src/features/orders/services/order.service.ts", lineno: 42 },
                { filename: "src/app/api/v1/orders/route.ts", lineno: 17 },
              ],
            },
          },
        ],
      },
    });

    const frames = scrubEvent(event).exception?.values?.[0]?.stacktrace?.frames ?? [];

    expect(frames).toHaveLength(2);
    expect(frames[0]?.filename).toBe("src/features/orders/services/order.service.ts");
    expect(frames[0]?.lineno).toBe(42);
  });

  it("istek gövdesini, çerezleri ve başlıkları olaydan siler", () => {
    const event = eventWith({
      request: {
        url: "https://benim-belediyem.vercel.app/api/v1/sessions",
        data: { email: "ayse@ornek.test", password: "Test1234!" },
        cookies: { bb_session: "ham-jeton" },
        headers: { authorization: "Bearer abc123def456" },
        query_string: "token=gizli",
      },
    });

    const request = scrubEvent(event).request ?? {};

    expect(request.data).toBeUndefined();
    expect(request.cookies).toBeUndefined();
    expect(request.headers).toBeUndefined();
    expect(request.query_string).toBeUndefined();
    // Hangi ucun patladığı teşhis için şart, adres kalmalı.
    expect(request.url).toContain("/api/v1/sessions");
  });

  it("kullanıcıdan yalnızca kimliği bırakır", () => {
    const event = eventWith({
      user: { id: "usr_1", email: "ayse@ornek.test", ip_address: "203.0.113.9", username: "ayse" },
    });

    expect(scrubEvent(event).user).toEqual({ id: "usr_1" });
  });

  it("kimliği olmayan kullanıcıyı tamamen gizler", () => {
    const event = eventWith({ user: { email: "ayse@ornek.test" } });

    expect(scrubEvent(event).user).toEqual({ id: REDACTED });
  });

  it("extra ve breadcrumb alanlarını süzer", () => {
    const event = eventWith({
      extra: { cardNumber: "4111111111111111", orderId: "ord_1" },
      breadcrumbs: [{ message: "kullanıcı 91234567832 arandı", data: { password: "Test1234!" } }],
    });

    const scrubbed = scrubEvent(event);

    expect(scrubbed.extra?.cardNumber).toBe(REDACTED);
    expect(scrubbed.extra?.orderId).toBe("ord_1");
    expect(scrubbed.breadcrumbs?.[0]?.message).toBe(`kullanıcı ${REDACTED} arandı`);
    expect(scrubbed.breadcrumbs?.[0]?.data?.password).toBe(REDACTED);
  });

  it("boş olayda patlamaz", () => {
    expect(() => scrubEvent(eventWith({}))).not.toThrow();
  });
});
