import { describe, expect, it } from "vitest";

import {
  cartSummaryResponseSchema,
  toCartSummaryResponse,
} from "@/features/cart/schemas/cart-summary.schema";
import type { CartSummary } from "@/features/cart/types";

/**
 * Sepet özetinin TEL biçimine çevrilmesi (borç #107 · adım 107c · ADR-021).
 *
 * NEREDEN : src/features/cart/types.ts → elle kurulmuş bir `CartSummary` (market satırı + kilitli bilet satırı)
 * NE      : `toCartSummaryResponse` çevirmeni ve `cartSummaryResponseSchema` birlikte sınanıyor
 * NEREYE  : — (test; üretim çıktısı yok)
 * SONUÇ   : Dört kanıt — tarih ISO metne dönüyor · telden geçen gövde şemadan geçiyor · tutarlar
 *           değişmiyor · belgede olmayan iç alan API'ye sızmıyor
 * KAYNAK  : ADR-021 · docs/standards/06-testing.md
 * NEDEN   : Çevirmen yeni mantık taşıyor (tek dönüşüm + alan alan kopya); yorumdaki iddia testle tutuluyor
 * DİKKAT  : Çevirmen `...spread`'e çevrilirse son test kırmızıya döner — bu bilerek, mutasyonla ölçüldü
 *
 * Sepet özeti uygulama içinde `Date` taşıyor (`holdExpiresAt`); telde ise
 * yalnızca metin gider. Çevirmen bu sınırı AÇIKÇA geçiyor ve alanları tek tek
 * sayıyor — `...spread` ile değil. Bu dosya o iki kararı ölçüyor: tarih
 * metne dönüyor mu, `null` korunuyor mu ve iç kullanım için eklenen bir alan
 * belgede yazmadığı hâlde API'ye SIZIYOR mu.
 */

const HOLD_EXPIRES_AT = new Date("2026-09-21T02:10:00.000Z");

function summaryFixture(): CartSummary {
  return {
    cartId: "cart-1",
    sections: [
      {
        itemType: "market",
        lines: [
          {
            id: "line-market",
            itemType: "market",
            refId: "product-1",
            quantity: 3,
            unitPriceKurus: 15300,
            note: null,
            name: "Zeytinyağı 1 L",
            imageUrl: "/images/market/zeytinyagi.jpg",
            isPurchasable: true,
            availableStock: 12,
            holdExpiresAt: null,
          },
        ],
        subtotalKurus: 45900,
        deliveryFeeKurus: 0,
        freeDeliveryRemainingKurus: null,
      },
      {
        itemType: "event",
        lines: [
          {
            id: "line-event",
            itemType: "event",
            refId: "reservation-1",
            quantity: 1,
            unitPriceKurus: 25000,
            note: null,
            name: "Şehir Tiyatrosu — A12",
            imageUrl: null,
            isPurchasable: true,
            availableStock: 1,
            holdExpiresAt: HOLD_EXPIRES_AT,
          },
        ],
        subtotalKurus: 25000,
        deliveryFeeKurus: 0,
        freeDeliveryRemainingKurus: null,
      },
    ],
    subtotalKurus: 70900,
    deliveryFeeKurus: 0,
    totalKurus: 70900,
    lineCount: 2,
    hasBlockedLines: false,
  };
}

/** `NextResponse.json`'ın yapacağı dönüşümün aynısı — telde ne gidiyorsa o. */
const asTransmitted = (body: unknown): unknown => JSON.parse(JSON.stringify(body));

describe("sepet özetinin tel biçimi", () => {
  it("koltuk kilidinin bitiş anı ISO metne dönüyor, olmayan kilit null kalıyor", () => {
    const response = toCartSummaryResponse(summaryFixture());

    expect(response.sections[0]?.lines[0]?.holdExpiresAt).toBeNull();
    expect(response.sections[1]?.lines[0]?.holdExpiresAt).toBe(HOLD_EXPIRES_AT.toISOString());
  });

  it("çevrilen özet, belgedeki şemadan TELDEN geçmiş hâliyle geçiyor", () => {
    const wire = asTransmitted(toCartSummaryResponse(summaryFixture()));

    const result = cartSummaryResponseSchema.safeParse(wire);

    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });

  it("tutarlar ve adetler olduğu gibi taşınıyor — kuruş çevrilmiyor", () => {
    const response = toCartSummaryResponse(summaryFixture());

    expect(response.totalKurus).toBe(70900);
    expect(response.sections[0]?.lines[0]?.unitPriceKurus).toBe(15300);
    expect(response.sections[0]?.lines[0]?.quantity).toBe(3);
    expect(response.lineCount).toBe(2);
  });

  /**
   * ⛔ ÇEVİRMEN `...spread` KULLANMIYOR ve bu test onu koruyor.
   *
   * Sepet satırına ileride iç kullanım için bir alan eklenirse (maliyet,
   * tedarikçi kodu…) spread onu belgeye yazılmadan API'ye taşırdı; belge
   * "yok" derken telde "var" olurdu. Alanlar tek tek sayıldığı için yeni
   * alan ancak biri bilerek şemaya ve çevirmene yazınca dışarı çıkar.
   */
  it("belgede olmayan bir iç alan API'ye sızmıyor", () => {
    const summary = summaryFixture();
    const leakyLine = { ...summary.sections[0]!.lines[0]!, costPriceKurus: 9900 };
    // Bilerek "yanlış" bir nesne: tip sistemi bu fazlalıkları kabul etmez, deney için aşılıyor.
    const leakySummary = {
      ...summary,
      internalNote: "sadece sunucu için",
      sections: [{ ...summary.sections[0]!, lines: [leakyLine], warehouse: "A" }],
    } as unknown as CartSummary;

    const wire = asTransmitted(toCartSummaryResponse(leakySummary)) as Record<string, unknown>;
    const section = (wire.sections as Record<string, unknown>[])[0]!;
    const line = (section.lines as Record<string, unknown>[])[0]!;

    expect(wire).not.toHaveProperty("internalNote");
    expect(section).not.toHaveProperty("warehouse");
    expect(line).not.toHaveProperty("costPriceKurus");
  });
});
