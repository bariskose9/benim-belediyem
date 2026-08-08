/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
  MARKET_DELIVERY_FEE_KURUS,
  MARKET_FREE_DELIVERY_THRESHOLD_KURUS,
  RESTAURANT_DELIVERY_FEE_KURUS,
  RESTAURANT_FREE_DELIVERY_THRESHOLD_KURUS,
} from "@/config/constants";
import { deliveryFeeKurus, summarizeCart } from "@/features/cart/services/cart-pricing";
import type { CartLine } from "@/features/cart/types";
import type { CartItemType } from "@/generated/prisma/enums";

/**
 * Sepet tutarları (PRD §6.1 · `fake-data-guide.md`).
 *
 * En kritik test "eşik yalnızca kendi modülüne bakar" olanı: sepetin
 * tamamına bakan bir uygulama orada kırmızıya döner, çünkü restoran ürünü
 * ekleyerek market teslimatını bedavaya getirmek mümkün olurdu.
 */

let counter = 0;

function line(itemType: CartItemType, unitPriceKurus: number, quantity = 1): CartLine {
  counter += 1;

  return {
    id: `line-${counter}`,
    itemType,
    refId: `ref-${counter}`,
    quantity,
    unitPriceKurus,
    note: null,
    name: `Ürün ${counter}`,
    imageUrl: null,
    isPurchasable: true,
    availableStock: null,
    holdExpiresAt: null,
  };
}

describe("deliveryFeeKurus", () => {
  it("market eşiğin altında ücret alır", () => {
    expect(deliveryFeeKurus("market", MARKET_FREE_DELIVERY_THRESHOLD_KURUS - 1)).toBe(
      MARKET_DELIVERY_FEE_KURUS,
    );
  });

  /** Eşik DAHİL: "750 TL üzeri ücretsiz" ifadesinin doğal okunuşu 750 dahildir. */
  it("market tam eşikte ücretsizdir", () => {
    expect(deliveryFeeKurus("market", MARKET_FREE_DELIVERY_THRESHOLD_KURUS)).toBe(0);
  });

  it("restoran eşiğin altında ücret alır", () => {
    expect(deliveryFeeKurus("restaurant", RESTAURANT_FREE_DELIVERY_THRESHOLD_KURUS - 1)).toBe(
      RESTAURANT_DELIVERY_FEE_KURUS,
    );
  });

  it("restoran tam eşikte ücretsizdir", () => {
    expect(deliveryFeeKurus("restaurant", RESTAURANT_FREE_DELIVERY_THRESHOLD_KURUS)).toBe(0);
  });

  /**
   * İki modülün eşikleri FARKLI ve karışmamalı: restoranın eşiği marketinkinden
   * düşük (bir öğün, bir alışverişten küçük). Tek bir eşik kullanılsaydı
   * restoran teslimatı pratikte hiç ücretsiz olmazdı.
   */
  it("market ve restoran eşikleri birbirinden bağımsızdır", () => {
    const between = RESTAURANT_FREE_DELIVERY_THRESHOLD_KURUS;

    expect(deliveryFeeKurus("restaurant", between)).toBe(0);
    expect(deliveryFeeKurus("market", between)).toBe(MARKET_DELIVERY_FEE_KURUS);
  });

  it("bilet teslim edilmediği için ücretsizdir", () => {
    expect(deliveryFeeKurus("event", 500_00)).toBe(0);
  });

  it("boş modülde ücret çıkmaz", () => {
    expect(deliveryFeeKurus("market", 0)).toBe(0);
  });
});

describe("summarizeCart", () => {
  it("boş sepette sıfır döner", () => {
    const summary = summarizeCart("cart-1", []);

    expect(summary.sections).toEqual([]);
    expect(summary.totalKurus).toBe(0);
    expect(summary.lineCount).toBe(0);
  });

  it("satırları modüllere böler ve sırayı korur", () => {
    const summary = summarizeCart("cart-1", [
      line("event", 250_00),
      line("market", 100_00),
      line("restaurant", 180_00),
    ]);

    expect(summary.sections.map((s) => s.itemType)).toEqual(["market", "restaurant", "event"]);
  });

  it("boş modül için bölüm üretmez", () => {
    const summary = summarizeCart("cart-1", [line("market", 100_00)]);

    expect(summary.sections).toHaveLength(1);
  });

  it("adetleri çarpıp ara toplamı doğru bulur", () => {
    const summary = summarizeCart("cart-1", [line("market", 24_90, 3), line("market", 19_90, 2)]);

    // 24,90×3 + 19,90×2 = 74,70 + 39,80 = 114,50
    expect(summary.subtotalKurus).toBe(114_50);
    expect(summary.deliveryFeeKurus).toBe(MARKET_DELIVERY_FEE_KURUS);
    expect(summary.totalKurus).toBe(114_50 + MARKET_DELIVERY_FEE_KURUS);
  });

  /**
   * ═══ BU DOSYANIN EN ÖNEMLİ TESTİ ═══
   * Market 700 TL (eşiğin altında), restoran 200 TL. Toplam 900 TL, yani
   * sepetin tamamına bakan bir hesap market teslimatını ücretsiz sayardı.
   * Doğru davranış: market kendi tutarına bakar ve ücret ALINIR.
   */
  it("ücretsiz teslimat eşiği YALNIZCA kendi modülüne bakar", () => {
    const summary = summarizeCart("cart-1", [line("market", 700_00), line("restaurant", 200_00)]);

    const market = summary.sections.find((s) => s.itemType === "market");

    expect(summary.subtotalKurus).toBe(900_00);
    expect(market?.deliveryFeeKurus).toBe(MARKET_DELIVERY_FEE_KURUS);
  });

  it("market tek başına eşiği aşarsa teslimat ücretsiz olur", () => {
    const summary = summarizeCart("cart-1", [line("market", 800_00)]);

    expect(summary.deliveryFeeKurus).toBe(0);
    expect(summary.totalKurus).toBe(800_00);
  });

  it("ücretsiz teslimata kalan tutarı hesaplar", () => {
    const summary = summarizeCart("cart-1", [line("market", 700_00)]);
    const market = summary.sections.find((s) => s.itemType === "market");

    expect(market?.freeDeliveryRemainingKurus).toBe(50_00);
  });

  it("eşik aşıldığında kalan tutar bildirilmez", () => {
    const summary = summarizeCart("cart-1", [line("market", 800_00)]);

    expect(summary.sections[0]?.freeDeliveryRemainingKurus).toBeNull();
  });

  it("eşiği olmayan modülde kalan tutar bildirilmez", () => {
    const summary = summarizeCart("cart-1", [line("event", 100_00)]);

    expect(summary.sections[0]?.freeDeliveryRemainingKurus).toBeNull();
  });

  it("satın alınamayan satırı bayrakla bildirir", () => {
    const blocked = { ...line("market", 50_00), isPurchasable: false };
    const summary = summarizeCart("cart-1", [blocked]);

    expect(summary.hasBlockedLines).toBe(true);
  });

  it("hepsi satın alınabilirse bayrak düşer", () => {
    expect(summarizeCart("cart-1", [line("market", 50_00)]).hasBlockedLines).toBe(false);
  });
});
