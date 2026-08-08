/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
  deriveOrderState,
  ORDER_TIMELINE_RULES,
  pendingNotificationStages,
} from "@/features/orders/services/order-timeline";
import type { FulfillmentType } from "@/generated/prisma/enums";

/**
 * Sipariş durumunun ZAMAN ÇİZGİSİ (ADR-013 · PRD §5.5).
 *
 * Kural saf bir fonksiyonda olduğu için tablonun tamamı burada, veritabanı ve
 * tarayıcı olmadan kanıtlanabiliyor. Kuralın SUNUCUDA GERÇEKTEN UYGULANDIĞI
 * ise `tests/db/order-cancellation.test.ts` içinde gerçek veritabanına karşı
 * doğrulanıyor — bu dosya "kural doğru mu", o dosya "kural işliyor mu" sorusunu
 * cevaplıyor.
 */

const CREATED_AT = new Date("2026-09-01T09:00:00.000Z");

function minutesLater(minutes: number): Date {
  return new Date(CREATED_AT.getTime() + minutes * 60_000);
}

function stateAt(fulfillmentType: FulfillmentType, minutes: number) {
  return deriveOrderState({
    fulfillmentType,
    storedStatus: "received",
    createdAt: CREATED_AT,
    now: minutesLater(minutes),
  });
}

describe("durum siparişin yaşından hesaplanır", () => {
  /**
   * Tablo testi: her modülün her eşiği tek tek yazılmak yerine kural
   * tablosundan türetiliyor. Eşikler değiştiğinde test de kendiliğinden yeni
   * sayılara göre koşar — sabitleri iki yere yazmak, birini güncelleyip
   * diğerini unutmanın en kısa yolu olurdu.
   */
  for (const fulfillmentType of ["market_delivery", "restaurant_delivery"] as const) {
    const rule = ORDER_TIMELINE_RULES[fulfillmentType];

    if (!rule) throw new Error(`${fulfillmentType} için kural bekleniyordu`);

    describe(fulfillmentType, () => {
      it("sipariş verilir verilmez Alındı", () => {
        expect(stateAt(fulfillmentType, 0).status).toBe("received");
      });

      it("ilk eşiğin bir dakika öncesi hâlâ Alındı", () => {
        expect(stateAt(fulfillmentType, rule.preparing - 1).status).toBe("received");
      });

      it("ilk eşikte Hazırlanıyor", () => {
        expect(stateAt(fulfillmentType, rule.preparing).status).toBe("preparing");
      });

      it("ikinci eşikte Yola çıktı", () => {
        expect(stateAt(fulfillmentType, rule.on_the_way).status).toBe("on_the_way");
      });

      it("üçüncü eşikte Teslim edildi", () => {
        expect(stateAt(fulfillmentType, rule.delivered).status).toBe("delivered");
      });

      it("çok sonra da Teslim edildi olarak kalır", () => {
        expect(stateAt(fulfillmentType, rule.delivered * 10).status).toBe("delivered");
      });
    });
  }
});

describe("iptal penceresi", () => {
  it("YALNIZCA Alındı aşamasında açık (PRD §5.5)", () => {
    const rule = ORDER_TIMELINE_RULES.restaurant_delivery;

    if (!rule) throw new Error("restoran kuralı bekleniyordu");

    expect(stateAt("restaurant_delivery", 0).canCancel).toBe(true);
    expect(stateAt("restaurant_delivery", rule.preparing - 1).canCancel).toBe(true);
    // Hazırlık başladı: kapı kapanır ve bir daha açılmaz.
    expect(stateAt("restaurant_delivery", rule.preparing).canCancel).toBe(false);
    expect(stateAt("restaurant_delivery", rule.on_the_way).canCancel).toBe(false);
    expect(stateAt("restaurant_delivery", rule.delivered).canCancel).toBe(false);
  });

  it("bilet HİÇ iptal edilemez — zaman çizgisine hiç girmez", () => {
    const state = deriveOrderState({
      fulfillmentType: "ticket",
      storedStatus: "delivered",
      createdAt: CREATED_AT,
      now: CREATED_AT,
    });

    expect(state.status).toBe("delivered");
    expect(state.canCancel).toBe(false);
    expect(state.nextStageAt).toBeNull();
  });

  it("iptal edilmiş sipariş zamanla İLERLEMEZ", () => {
    const state = deriveOrderState({
      fulfillmentType: "market_delivery",
      storedStatus: "cancelled",
      createdAt: CREATED_AT,
      // Teslim eşiğinin çok ötesi: yine de "iptal edildi" kalmalı.
      now: minutesLater(10_000),
    });

    expect(state.status).toBe("cancelled");
    expect(state.canCancel).toBe(false);
  });
});

describe("bildirilecek aşamalar", () => {
  it("hiç bildirilmemiş yeni sipariş → yalnızca Alındı", () => {
    expect(
      pendingNotificationStages({
        fulfillmentType: "market_delivery",
        notifiedStatus: null,
        currentStatus: "received",
      }),
    ).toEqual(["received"]);
  });

  it("ATLANAN AŞAMALAR KAYBOLMAZ: kullanıcı geç bakarsa hepsi yazılır", () => {
    expect(
      pendingNotificationStages({
        fulfillmentType: "market_delivery",
        notifiedStatus: "received",
        currentStatus: "on_the_way",
      }),
    ).toEqual(["preparing", "on_the_way"]);
  });

  it("aynı durum ikinci kez bildirilmez", () => {
    expect(
      pendingNotificationStages({
        fulfillmentType: "market_delivery",
        notifiedStatus: "on_the_way",
        currentStatus: "on_the_way",
      }),
    ).toEqual([]);
  });

  it("iptal edilmiş siparişte hiçbir aşama bildirilmez", () => {
    expect(
      pendingNotificationStages({
        fulfillmentType: "market_delivery",
        notifiedStatus: "received",
        currentStatus: "cancelled",
      }),
    ).toEqual([]);
  });

  it("bilet için ARA AŞAMALAR ATLANIR — tek bildirim yazılır", () => {
    expect(
      pendingNotificationStages({
        fulfillmentType: "ticket",
        notifiedStatus: null,
        currentStatus: "delivered",
      }),
    ).toEqual(["delivered"]);

    expect(
      pendingNotificationStages({
        fulfillmentType: "ticket",
        notifiedStatus: "delivered",
        currentStatus: "delivered",
      }),
    ).toEqual([]);
  });
});
