/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CartSummary } from "@/features/cart/types";

/**
 * Sepet uçlarının yanıt sözleşmesi — `POST /api/v1/carts/current/items`,
 * `PATCH` ve `DELETE /api/v1/carts/current/items/{itemId}` (borç #107 · 107c).
 *
 * NEREDEN : src/features/cart/services/cart.service.ts (TAKLİT) → `Date` taşıyan bir `CartSummary`
 * NE      : Üç route gerçek çalışıyor; gövde tel biçimine çevrilip belgedeki şemadan geçiriliyor
 * NEREYE  : — (test; üretim çıktısı yok)
 * SONUÇ   : Üç kanıt — gövde tel biçiminde (tarih metin) · çalışma anı kapısı BU UÇLARA bağlı
 *           (sözleşme dışı gövde 500'e düşüyor) · girdi ve hata zarfı bozulmadı
 * KAYNAK  : ADR-021 · docs/standards/06-testing.md → "Kurallar"
 * NEDEN   : İş kuralları (stok, adet sınırı, yarış) gerçek PostgreSQL'e karşı `tests/db/` içinde
 *           kanıtlı; burada yalnızca ucun kendi işi ölçülüyor. Sepet ekleme/adet akışı E2E'de de var,
 *           ama "kapı bağlı mı" sorusu ancak bozuk gövdeyle sorulabilir ve E2E onu üretemez
 * DİKKAT  : Route'lardan `schema:` kaldırılırsa "kapı bağlı" testleri kırmızıya döner — bilerek
 *
 * ⭐ NEDEN "BOZUK GÖVDE → 500" TESTİ VAR. Şemayı kütüğe yazıp route'a
 * vermeyi unutmak mümkün; CI'daki metin kapısı bunu yakalıyor ama o kapı
 * kaynak metnine bakıyor, davranışa değil. Burada davranış ölçülüyor: servis
 * sözleşmeye uymayan bir gövde döndürdüğünde uç sessizce geçmemeli.
 */

const context = vi.hoisted(() => ({
  owner: { anonymousId: "anon-1" },
  anonymousId: "anon-1",
  userId: null,
}));

vi.mock("@/features/cart/services/cart-context", () => ({
  getCartContext: async () => context,
}));

const service = vi.hoisted(() => ({
  addItemToCart: vi.fn(),
  changeItemQuantity: vi.fn(),
  changeItemNote: vi.fn(),
  removeItemFromCart: vi.fn(),
}));

vi.mock("@/features/cart/services/cart.service", () => service);

const { POST } = await import("@/app/api/v1/carts/current/items/route");
const { PATCH, DELETE } = await import("@/app/api/v1/carts/current/items/[itemId]/route");

/** Hata sınıfı uç modülüyle AYNI aşamada içe aktarılıyor — `instanceof` tutsun diye. */
const { CartItemNotFoundError } = await import("@/features/cart/errors");

const HOLD_EXPIRES_AT = new Date("2026-09-21T02:10:00.000Z");
const ITEM_ID = "line-market";

/** Uygulama içi özet — bilet satırındaki `holdExpiresAt` bir `Date`, metin değil. */
function summaryFixture(): CartSummary {
  return {
    cartId: "cart-1",
    sections: [
      {
        itemType: "market",
        lines: [
          {
            id: ITEM_ID,
            itemType: "market",
            refId: "product-1",
            quantity: 2,
            unitPriceKurus: 15300,
            note: null,
            name: "Zeytinyağı 1 L",
            imageUrl: "/images/market/zeytinyagi.jpg",
            isPurchasable: true,
            availableStock: 12,
            holdExpiresAt: null,
          },
        ],
        subtotalKurus: 30600,
        deliveryFeeKurus: 1500,
        freeDeliveryRemainingKurus: 19400,
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
    subtotalKurus: 55600,
    deliveryFeeKurus: 1500,
    totalKurus: 57100,
    lineCount: 2,
    hasBlockedLines: false,
  };
}

/** Sözleşmeye UYMAYAN özet: toplam para değil metin. Derleme bunu göremez, kapı görmeli. */
function brokenSummary(): CartSummary {
  return { ...summaryFixture(), totalKurus: "elli yedi lira" as unknown as number };
}

function request(method: string, body?: unknown): Request {
  return new Request("http://localhost:3000/api/v1/carts/current/items", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const itemContext = { params: Promise.resolve({ itemId: ITEM_ID }) };

beforeEach(() => {
  for (const fn of Object.values(service)) fn.mockReset();

  service.addItemToCart.mockResolvedValue(summaryFixture());
  service.changeItemQuantity.mockResolvedValue(summaryFixture());
  service.changeItemNote.mockResolvedValue(summaryFixture());
  service.removeItemFromCart.mockResolvedValue(summaryFixture());
});

describe("yanıt gövdesi tel biçiminde", () => {
  it("sepete ekleme 201 döner; kilit anı ISO METİN, olmayan kilit null", async () => {
    const response = await POST(
      request("POST", { itemType: "market", refId: "product-1", quantity: 2 }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body.data.totalKurus).toBe(57100);
    expect(body.data.sections[0].lines[0].holdExpiresAt).toBeNull();
    expect(body.data.sections[1].lines[0].holdExpiresAt).toBe(HOLD_EXPIRES_AT.toISOString());
  });

  it("adet değişikliği 200 döner ve adet servisini çağırır", async () => {
    const response = await PATCH(request("PATCH", { quantity: 3 }), itemContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body.data.cartId).toBe("cart-1");
    expect(service.changeItemQuantity).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: ITEM_ID, quantity: 3 }),
    );
    expect(service.changeItemNote).not.toHaveBeenCalled();
  });

  it("not değişikliği not servisini çağırır, adet servisini değil", async () => {
    const response = await PATCH(request("PATCH", { note: "acısız olsun" }), itemContext);

    expect(response.status).toBe(200);
    expect(service.changeItemNote).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: ITEM_ID, note: "acısız olsun" }),
    );
    expect(service.changeItemQuantity).not.toHaveBeenCalled();
  });

  it("satır çıkarma 204 DEĞİL 200 döner ve güncel özeti taşır", async () => {
    const response = await DELETE(request("DELETE"), itemContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.lineCount).toBe(2);
    expect(service.removeItemFromCart).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: ITEM_ID }),
    );
  });
});

describe("çalışma anı kapısı bu uçlara bağlı", () => {
  it.each([
    {
      name: "POST /carts/current/items",
      arrange: () => service.addItemToCart.mockResolvedValue(brokenSummary()),
      act: () => POST(request("POST", { itemType: "market", refId: "product-1", quantity: 1 })),
    },
    {
      name: "PATCH /carts/current/items/{itemId}",
      arrange: () => service.changeItemQuantity.mockResolvedValue(brokenSummary()),
      act: () => PATCH(request("PATCH", { quantity: 1 }), itemContext),
    },
    {
      name: "DELETE /carts/current/items/{itemId}",
      arrange: () => service.removeItemFromCart.mockResolvedValue(brokenSummary()),
      act: () => DELETE(request("DELETE"), itemContext),
    },
  ])("$name: sözleşme dışı gövde sessizce geçmiyor, 500'e düşüyor", async ({ arrange, act }) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    arrange();

    const response = await act();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");

    // Log, hangi alanın tutmadığını söylüyor — teşhis için yeterli, iç detay yok.
    const logged = consoleError.mock.calls.map((call) => JSON.stringify(call)).join(" ");

    expect(logged).toContain("Yanıt sözleşmesi ihlali");
    expect(logged).toContain("totalKurus");

    consoleError.mockRestore();
  });
});

describe("girdi ve hata zarfı", () => {
  it("bozuk gövdede 422 döner ve servis çağrılmaz", async () => {
    const response = await POST(request("POST", { itemType: "event", refId: "x", quantity: 1 }));

    expect(response.status).toBe(422);
    expect(service.addItemToCart).not.toHaveBeenCalled();
  });

  it("ne adet ne not gönderilmişse 422 döner", async () => {
    const response = await PATCH(request("PATCH", {}), itemContext);

    expect(response.status).toBe(422);
    expect(service.changeItemQuantity).not.toHaveBeenCalled();
    expect(service.changeItemNote).not.toHaveBeenCalled();
  });

  it("başkasının satırı 'bulunamadı' alır — 404 CART_ITEM_NOT_FOUND", async () => {
    service.removeItemFromCart.mockRejectedValue(new CartItemNotFoundError());

    const response = await DELETE(request("DELETE"), itemContext);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("CART_ITEM_NOT_FOUND");
  });
});
