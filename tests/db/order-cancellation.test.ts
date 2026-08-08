import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { addItemToCart } from "@/features/cart/services/cart.service";
import { listNotifications } from "@/features/notifications/services/notification.service";
import { cancelOrder, listOrders } from "@/features/orders/services/order.service";
import { ORDER_TIMELINE_RULES } from "@/features/orders/services/order-timeline";
import { checkout } from "@/features/payment/services/checkout.service";
import { rateLimitKey, resetRateLimit } from "@/lib/rate-limit";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ═══ PRD §5.5'İN DÖRT KABUL KRİTERİ ═══
 *  1. Kullanıcı sipariş sonrası bildirimi ve durumu ekranda görebilmeli
 *  2. `Hazırlanıyor` durumundaki siparişe gönderilen iptal isteği 409 döner
 *  3. Başkasının siparişini iptal etme isteği 403 döner
 *  4. İptal sonrası ürün stoğu sipariş öncesi değerine döner
 *
 * GERÇEK PostgreSQL'e karşı yazıldı. Taklit bir istemci ne transaction geri
 * almasını, ne koşullu UPDATE'in 0 satır etkilemesini, ne de `unique(order_id)`
 * ihlalini taklit edebilirdi — yanlış yazılmış bir taklit YANLIŞ YEŞİL gösterirdi.
 *
 * ZAMAN DIŞARIDAN VERİLİYOR: "45 dakika sonra ne olur" sorusu testin gerçekten
 * beklemesiyle değil, `now` ileri sarılarak cevaplanıyor (ADR-013 bunu mümkün
 * kılmak için durumu saf bir fonksiyona koydu).
 */

const ACTOR_IP = "203.0.113.55";
const NOW = new Date("2026-09-01T09:00:00.000Z");

const USER = testId("user", "orders-buyer");
const OTHER_USER = testId("user", "orders-other");
const ADDRESS = testId("address", "orders-home");

const CATEGORY = testId("category", "orders-temel");
const PRODUCT = testId("product", "orders-pirinc");
const MENU_CATEGORY = testId("menu-cat", "orders-ana");
const MENU_ITEM = testId("menu", "orders-kofte");

const CARD_OK = "4111111111111111";

const PRODUCT_STOCK = 10;
const MARKET_RULE = ORDER_TIMELINE_RULES.market_delivery;

if (!MARKET_RULE) throw new Error("market kuralı bekleniyordu");

function minutesAfter(minutes: number): Date {
  return new Date(NOW.getTime() + minutes * 60_000);
}

function card() {
  return {
    kind: "new" as const,
    number: CARD_OK,
    holderName: "Test Kullanici",
    expMonth: 12,
    expYear: 2030,
    cvv: "123",
    save: false,
  };
}

/**
 * Bir market siparişi oluşturur ve kimliğini döner.
 *
 * Sipariş UYGULAMANIN KENDİ AKIŞIYLA yaratılıyor (sepet → ödeme), elle
 * `order.create` ile değil: iptal akışının gerçek bir siparişte çalıştığını
 * kanıtlamak istiyoruz, testin kurduğu yapay bir satırda değil.
 */
async function placeMarketOrder(
  userId: string,
  quantity: number,
  idempotencySuffix: string,
): Promise<string> {
  await addItemToCart({
    owner: { userId },
    anonymousId: testId("anon", userId),
    now: NOW,
    itemType: "market",
    refId: PRODUCT,
    quantity,
  });

  const result = await checkout({
    userId,
    actorIp: ACTOR_IP,
    now: NOW,
    payload: {
      idempotencyKey: testId("idem", idempotencySuffix),
      expectedTotalKurus: 100_00 * quantity + 59_00,
      card: card(),
      delivery: { addressId: ADDRESS, deliverySlot: "3 Eylül 2026 Perşembe 10:00-12:00" },
    },
  });

  const orderId = result.orderIds[0];

  if (!orderId) throw new Error("sipariş oluşturulamadı");

  await pinCreatedAt(orderId);

  return orderId;
}

/**
 * Siparişin oluşturulma anını testin sahte saatine sabitler.
 *
 * NEDEN GEREKLİ: `orders.created_at` veritabanının varsayılanından geliyor,
 * yani GERÇEK şimdi. Durum ise siparişin yaşından hesaplanıyor (ADR-013).
 * İkisi sabitlenmezse test "ileri sarılmış" bir sipariş görür ve daha
 * doğduğu anda teslim edilmiş sayılır — testin ölçmek istediği şey değil.
 *
 * Uygulamada böyle bir uyumsuzluk YOK: orada `now` da `created_at` de aynı
 * gerçek saatten geliyor.
 */
async function pinCreatedAt(orderId: string): Promise<void> {
  await prisma.order.update({ where: { id: orderId }, data: { createdAt: NOW } });
}

async function stockOf(productId: string): Promise<number> {
  const product = await prisma.product.findUnique({ where: { id: productId } });

  return product?.stock ?? -1;
}

beforeEach(async () => {
  await cleanupTestData();
  await seedFixtures();
  await resetBudgets();
});

afterEach(async () => {
  await cleanupTestData();
  await resetBudgets();
});

describe("kabul kriteri 1: sipariş sonrası bildirim ve durum görünür", () => {
  it("ödeme biter bitmez 'Siparişiniz alındı' bildirimi düşer", async () => {
    const orderId = await placeMarketOrder(USER, 1, "notify");

    const notifications = await listNotifications({ userId: USER, now: NOW });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe("order_status");
    expect(notifications[0]?.relatedType).toBe("order");
    expect(notifications[0]?.relatedId).toBe(orderId);
    expect(notifications[0]?.isRead).toBe(false);
  });

  it("durum zamanla İLERLER ve her aşama için bildirim yazılır", async () => {
    await placeMarketOrder(USER, 1, "progress");

    // Hazırlanıyor eşiğinin ötesi.
    const [order] = await listOrders({ userId: USER, now: minutesAfter(MARKET_RULE.preparing) });

    expect(order?.status).toBe("preparing");

    const afterPreparing = await listNotifications({
      userId: USER,
      now: minutesAfter(MARKET_RULE.preparing),
    });

    expect(afterPreparing.map((n) => n.title)).toContain("Siparişiniz: Hazırlanıyor");
  });

  it("ATLANAN AŞAMALAR KAYBOLMAZ: geç bakan kullanıcı hepsini görür", async () => {
    await placeMarketOrder(USER, 1, "skipped");

    // Kullanıcı teslimattan sonra bakıyor: aradaki üç aşama da yazılmalı.
    const notifications = await listNotifications({
      userId: USER,
      now: minutesAfter(MARKET_RULE.delivered),
    });

    const titles = notifications.map((n) => n.title);

    expect(titles).toContain("Siparişiniz alındı");
    expect(titles).toContain("Siparişiniz: Hazırlanıyor");
    expect(titles).toContain("Siparişiniz: Yola çıktı");
    expect(titles).toContain("Siparişiniz: Teslim edildi");
  });

  it("AYNI BİLDİRİM İKİ KEZ YAZILMAZ — liste tekrar tekrar okunsa bile", async () => {
    await placeMarketOrder(USER, 1, "idempotent");

    await listOrders({ userId: USER, now: minutesAfter(MARKET_RULE.preparing) });
    await listOrders({ userId: USER, now: minutesAfter(MARKET_RULE.preparing) });
    await listOrders({ userId: USER, now: minutesAfter(MARKET_RULE.preparing) });

    const notifications = await listNotifications({
      userId: USER,
      now: minutesAfter(MARKET_RULE.preparing),
    });

    // "alındı" + "hazırlanıyor" — üç okuma fazladan bildirim üretmemeli.
    expect(notifications).toHaveLength(2);
  });
});

describe("kabul kriteri 2: hazırlık başlamış siparişe iptal isteği 409", () => {
  it("`Hazırlanıyor` durumunda iptal REDDEDİLİR", async () => {
    const orderId = await placeMarketOrder(USER, 1, "too-late");

    await expect(
      cancelOrder({
        userId: USER,
        orderId,
        actorIp: ACTOR_IP,
        // Eşiği bir dakika geçmiş: ekran düğmeyi göstermez, ama istek yine de
        // gelebilir. Kararı SUNUCU veriyor (PRD §5.5).
        now: minutesAfter(MARKET_RULE.preparing + 1),
      }),
    ).rejects.toMatchObject({ code: "ORDER_NOT_CANCELLABLE", status: 409 });

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    expect(order?.status).toBe("received");
    expect(order?.cancelledAt).toBeNull();
    // Reddedilen iptal HİÇBİR yan etki bırakmamalı.
    expect(await prisma.refund.count({ where: { orderId } })).toBe(0);
    expect(await stockOf(PRODUCT)).toBe(PRODUCT_STOCK - 1);
  });

  it("`Alındı` durumunda aynı istek KABUL edilir", async () => {
    const orderId = await placeMarketOrder(USER, 1, "in-time");

    await cancelOrder({
      userId: USER,
      orderId,
      actorIp: ACTOR_IP,
      now: minutesAfter(MARKET_RULE.preparing - 1),
    });

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    expect(order?.status).toBe("cancelled");
  });

  it("ZATEN İPTAL EDİLMİŞ sipariş ikinci kez iptal edilemez", async () => {
    const orderId = await placeMarketOrder(USER, 1, "twice");

    await cancelOrder({ userId: USER, orderId, actorIp: ACTOR_IP, now: NOW });

    await expect(
      cancelOrder({ userId: USER, orderId, actorIp: ACTOR_IP, now: NOW }),
    ).rejects.toMatchObject({ code: "ORDER_ALREADY_CANCELLED", status: 409 });

    // İade kaydı da tek: `unique(order_id)` ikinci kaydı zaten reddederdi.
    expect(await prisma.refund.count({ where: { orderId } })).toBe(1);
    // ⛔ EN ÖNEMLİSİ: stok İKİ KEZ geri yüklenmemiş olmalı.
    expect(await stockOf(PRODUCT)).toBe(PRODUCT_STOCK);
  });
});

describe("kabul kriteri 3: başkasının siparişini iptal 403", () => {
  it("sipariş sahibi olmayan kullanıcı 403 alır", async () => {
    const orderId = await placeMarketOrder(USER, 1, "idor");

    await expect(
      cancelOrder({ userId: OTHER_USER, orderId, actorIp: ACTOR_IP, now: NOW }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    expect(order?.status).toBe("received");
  });

  it("olmayan sipariş 404 alır — 403'ten AYRI (PRD §5.5)", async () => {
    await expect(
      cancelOrder({
        userId: USER,
        orderId: testId("order", "yok"),
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND", status: 404 });
  });

  it("başkasının siparişi kendi listesinde GÖRÜNMEZ", async () => {
    await placeMarketOrder(USER, 1, "list-idor");

    const otherList = await listOrders({ userId: OTHER_USER, now: NOW });

    expect(otherList).toHaveLength(0);
  });
});

describe("kabul kriteri 4: iptal sonrası stok geri döner", () => {
  it("stok sipariş ÖNCESİ değerine döner", async () => {
    expect(await stockOf(PRODUCT)).toBe(PRODUCT_STOCK);

    const orderId = await placeMarketOrder(USER, 3, "restore");

    expect(await stockOf(PRODUCT)).toBe(PRODUCT_STOCK - 3);

    await cancelOrder({ userId: USER, orderId, actorIp: ACTOR_IP, now: NOW });

    expect(await stockOf(PRODUCT)).toBe(PRODUCT_STOCK);
  });

  it("iptal TEK TRANSACTION: iade kaydı, bildirim ve denetim kaydı birlikte oluşur", async () => {
    const orderId = await placeMarketOrder(USER, 1, "atomic");

    await cancelOrder({ userId: USER, orderId, actorIp: ACTOR_IP, now: NOW });

    const refund = await prisma.refund.findUnique({ where: { orderId } });
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    const audit = await prisma.auditLog.findMany({
      where: { userId: USER, action: "order_cancel", entityId: orderId },
    });
    const notifications = await listNotifications({ userId: USER, now: NOW });

    // İade tutarı siparişin TOPLAMI (teslimat ücreti dahil).
    expect(refund?.amount.toFixed(2)).toBe("159.00");
    expect(refund?.fakeRefundId).toMatch(/^RFN-/);
    expect(order?.cancelledAt).not.toBeNull();
    expect(order?.cancelReason).toBe("user_requested");
    expect(audit).toHaveLength(1);
    expect(notifications.map((n) => n.title)).toContain("Siparişiniz iptal edildi");
  });

  it("İPTAL EDİLEN SİPARİŞ ZAMANLA İLERLEMEZ", async () => {
    const orderId = await placeMarketOrder(USER, 1, "frozen");

    await cancelOrder({ userId: USER, orderId, actorIp: ACTOR_IP, now: NOW });

    const [order] = await listOrders({ userId: USER, now: minutesAfter(MARKET_RULE.delivered) });

    expect(order?.status).toBe("cancelled");
    expect(order?.canCancel).toBe(false);
    expect(order?.refundKurus).toBe(159_00);
  });
});

describe("restoran siparişi", () => {
  it("stoğu olmayan modülde iptal yine çalışır, iade kaydı oluşur", async () => {
    await addItemToCart({
      owner: { userId: USER },
      anonymousId: testId("anon", USER),
      now: NOW,
      itemType: "restaurant",
      refId: MENU_ITEM,
      quantity: 1,
    });

    const result = await checkout({
      userId: USER,
      actorIp: ACTOR_IP,
      now: NOW,
      payload: {
        idempotencyKey: testId("idem", "restaurant-cancel"),
        expectedTotalKurus: 200_00 + 49_90,
        card: card(),
        // Restoran siparişi ZAMAN ARALIĞI İSTEMEZ (PRD §6.1).
        delivery: { addressId: ADDRESS },
      },
    });

    const orderId = result.orderIds[0];

    if (!orderId) throw new Error("sipariş oluşturulamadı");

    await pinCreatedAt(orderId);

    await cancelOrder({ userId: USER, orderId, actorIp: ACTOR_IP, now: NOW });

    const refund = await prisma.refund.findUnique({ where: { orderId } });

    expect(refund?.amount.toFixed(2)).toBe("249.90");
  });
});

async function seedFixtures(): Promise<void> {
  await prisma.user.createMany({
    data: [USER, OTHER_USER].map((id, index) => ({
      id,
      fullName: `Test Sipariş ${index + 1}`,
      email: `${id}@ornek.test`,
      isSeedData: true,
    })),
  });

  await prisma.address.create({
    data: {
      id: ADDRESS,
      userId: USER,
      title: "Ev",
      fullAddress: "Test Mahallesi 1. Sokak No 1",
      district: "Test İlçe",
      isSeedData: true,
    },
  });

  await prisma.productCategory.create({
    data: { id: CATEGORY, name: testId("kategori"), isSeedData: true },
  });
  await prisma.product.create({
    data: {
      id: PRODUCT,
      categoryId: CATEGORY,
      name: "Test Pirinç",
      description: "Test ürünü",
      imageUrl: "/images/test.svg",
      price: "100.00",
      stock: PRODUCT_STOCK,
      isSeedData: true,
    },
  });

  await prisma.menuCategory.create({
    data: { id: MENU_CATEGORY, name: testId("menu-kategori"), isSeedData: true },
  });
  await prisma.menuItem.create({
    data: {
      id: MENU_ITEM,
      categoryId: MENU_CATEGORY,
      name: "Test Köfte",
      description: "Test menü kalemi",
      imageUrl: "/images/test.svg",
      price: "200.00",
      isAvailable: true,
      isSeedData: true,
    },
  });
}

async function resetBudgets(): Promise<void> {
  await Promise.all([
    ...[USER, OTHER_USER].map((id) => resetRateLimit(rateLimitKey("payment_attempt", "user", id))),
    ...[USER, OTHER_USER].map((id) => resetRateLimit(rateLimitKey("order_cancel", "user", id))),
    ...[USER, OTHER_USER].map((id) =>
      resetRateLimit(rateLimitKey("cart_write", "session", testId("anon", id))),
    ),
  ]);
}
