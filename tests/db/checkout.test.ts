import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { addItemToCart } from "@/features/cart/services/cart.service";
import { checkout } from "@/features/payment/services/checkout.service";
import { rateLimitKey, resetRateLimit } from "@/lib/rate-limit";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ═══ PRD §6.1'İN İKİ KABUL KRİTERİ ═══
 *  1. "Üç modülden ürün içeren bir sepet tek ödemeyle ÜÇ SİPARİŞ üretir;
 *     biletin durumu doğrudan teslim edilmiş olur"
 *  2. "Ödeme başarısız olursa HİÇBİR sipariş oluşmaz, sepet korunur"
 *
 * GERÇEK PostgreSQL'e karşı yazıldı. Taklit bir istemci ne transaction geri
 * almasını ne de `unique(idempotency_key)` ihlalini taklit edebilirdi;
 * yanlış yazılmış bir taklit testi YANLIŞ YEŞİL gösterirdi.
 */

const ACTOR_IP = "203.0.113.30";
const NOW = new Date("2026-09-01T09:00:00.000Z");

const USER = testId("user", "buyer");
const OTHER_USER = testId("user", "other");
const ADDRESS = testId("address", "home");
const OTHER_ADDRESS = testId("address", "other");

const CATEGORY = testId("category", "temel");
const PRODUCT = testId("product", "pirinc");
const SCARCE_PRODUCT = testId("product", "az");
const MENU_CATEGORY = testId("menu-cat", "ana");
const MENU_ITEM = testId("menu", "kofte");
const VENUE = testId("venue", "salon");
const EVENT = testId("event", "konser");

/** `fake-data-guide.md`'deki test kartları. */
const CARD_OK = "4111111111111111";
const CARD_DECLINED = "4000000000000002";
const CARD_INSUFFICIENT = "4000000000009995";

/** Tohumlanan fiyatlar — beklenen toplamlar bunlardan hesaplanıyor. */
const EVENT_PRICE_KURUS = 300_00;

function card(number: string) {
  return {
    kind: "new" as const,
    number,
    holderName: "Test Kullanici",
    expMonth: 12,
    expYear: 2030,
    cvv: "123",
    save: false,
  };
}

function delivery() {
  return { addressId: ADDRESS, deliverySlot: "3 Eylül 2026 Perşembe 10:00-12:00" };
}

async function fillCart(userId: string, types: readonly ("market" | "restaurant" | "event")[]) {
  const refs = { market: PRODUCT, restaurant: MENU_ITEM, event: EVENT };

  for (const type of types) {
    await addItemToCart({
      owner: { userId },
      anonymousId: testId("anon", userId),
      now: NOW,
      itemType: type,
      refId: refs[type],
      quantity: 1,
    });
  }
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

describe("kabul kriteri: karışık sepet tek ödemeyle üç sipariş üretir", () => {
  it("üç modül → üç sipariş, hepsi AYNI ödemeye bağlı", async () => {
    await fillCart(USER, ["market", "restaurant", "event"]);

    const result = await checkout({
      userId: USER,
      actorIp: ACTOR_IP,
      now: NOW,
      payload: {
        idempotencyKey: testId("idem", "mixed"),
        // 100 + 200 + 300 = 600. Market teslimatı 59 (750 eşiğinin altında),
        // restoran teslimatı 49,90 (400 eşiğinin altında), bilette ücret yok.
        expectedTotalKurus: 600_00 + 59_00 + 49_90,
        card: card(CARD_OK),
        delivery: delivery(),
      },
    });

    expect(result.orderIds).toHaveLength(3);

    const orders = await prisma.order.findMany({
      where: { paymentId: result.paymentId },
      select: { fulfillmentType: true, status: true, deliveryAddressId: true, deliverySlot: true },
      orderBy: { fulfillmentType: "asc" },
    });

    expect(orders).toHaveLength(3);
    expect(orders.map((o) => o.fulfillmentType).sort()).toEqual([
      "market_delivery",
      "restaurant_delivery",
      "ticket",
    ]);

    // Bilet DOĞRUDAN teslim edilmiş; teslimat alanları boş (PRD §6.1).
    const ticket = orders.find((o) => o.fulfillmentType === "ticket");

    expect(ticket?.status).toBe("delivered");
    expect(ticket?.deliveryAddressId).toBeNull();
    expect(ticket?.deliverySlot).toBeNull();

    // Market ve restoran kendi akışlarının başında ve ikisi de ADRES taşıyor.
    for (const order of orders.filter((o) => o.fulfillmentType !== "ticket")) {
      expect(order.status).toBe("received");
      expect(order.deliveryAddressId).toBe(ADDRESS);
    }

    /**
     * ZAMAN ARALIĞI YALNIZCA MARKETTE (PRD §6.1). Restoran siparişi ödemeden
     * hemen sonra hazırlanmaya başlıyor; ona bir teslimat penceresi yazmak
     * kullanıcıya karşılığı olmayan bir söz vermek olurdu. İstemci yine de
     * bir aralık göndermiş olsa bile (bu testte gönderiyor) kayda geçmiyor.
     */
    expect(
      orders.find((o) => o.fulfillmentType === "market_delivery")?.deliverySlot,
    ).not.toBeNull();
    expect(
      orders.find((o) => o.fulfillmentType === "restaurant_delivery")?.deliverySlot,
    ).toBeNull();
  });

  it("ödeme kaydı TEK, tutar sunucunun hesabı", async () => {
    await fillCart(USER, ["market", "event"]);

    await checkout({
      userId: USER,
      actorIp: ACTOR_IP,
      now: NOW,
      payload: {
        idempotencyKey: testId("idem", "two"),
        expectedTotalKurus: 400_00 + 59_00,
        card: card(CARD_OK),
        delivery: delivery(),
      },
    });

    const payments = await prisma.payment.findMany({ where: { userId: USER } });

    expect(payments).toHaveLength(1);
    expect(payments[0]?.status).toBe("success");
    expect(payments[0]?.amount.toFixed(2)).toBe("459.00");
    // ⛔ TAM KART NUMARASI HİÇBİR ALANDA GEÇMEMELİ.
    expect(JSON.stringify(payments[0])).not.toContain(CARD_OK);
    expect(payments[0]?.cardLast4).toBe("1111");
  });

  it("sepet kapanır ve stok düşer", async () => {
    await fillCart(USER, ["market"]);

    await checkout({
      userId: USER,
      actorIp: ACTOR_IP,
      now: NOW,
      payload: {
        idempotencyKey: testId("idem", "stock"),
        expectedTotalKurus: 100_00 + 59_00,
        card: card(CARD_OK),
        delivery: delivery(),
      },
    });

    const cart = await prisma.cart.findFirst({ where: { userId: USER } });
    const product = await prisma.product.findUnique({ where: { id: PRODUCT } });

    expect(cart?.status).toBe("converted");
    expect(product?.stock).toBe(9);
  });
});

describe("kabul kriteri: ödeme başarısızsa hiçbir sipariş oluşmaz, sepet korunur", () => {
  for (const [label, number, code] of [
    ["reddedilen kart", CARD_DECLINED, "PAYMENT_DECLINED"],
    ["yetersiz bakiye", CARD_INSUFFICIENT, "INSUFFICIENT_FUNDS"],
  ] as const) {
    it(`${label} → sipariş yok, stok düşmedi, sepet aktif`, async () => {
      await fillCart(USER, ["market", "restaurant"]);

      await expect(
        checkout({
          userId: USER,
          actorIp: ACTOR_IP,
          now: NOW,
          payload: {
            idempotencyKey: testId("idem", label),
            // Market 100 + restoran 200; teslimat ücretleri 59 ve 49,90.
            expectedTotalKurus: 300_00 + 59_00 + 49_90,
            card: card(number),
            delivery: delivery(),
          },
        }),
      ).rejects.toMatchObject({ code, status: 409 });

      const orders = await prisma.order.findMany({ where: { userId: USER } });
      const cart = await prisma.cart.findFirst({ where: { userId: USER } });
      const product = await prisma.product.findUnique({ where: { id: PRODUCT } });

      expect(orders).toHaveLength(0);
      expect(cart?.status).toBe("active");
      expect(product?.stock).toBe(10);

      // Başarısız deneme yine de DENETİM kaydı bırakır (data-model.md).
      const payment = await prisma.payment.findFirst({ where: { userId: USER } });

      expect(payment?.status).toBe(code === "PAYMENT_DECLINED" ? "declined" : "insufficient_funds");
    });
  }

  /**
   * Bu test sepetin ÖZET kontrolüne takılıyor (`hasBlockedLines`), koşullu
   * stok düşümüne değil — kod açıkça yazılıyor ki test yanlış sebeple yeşil
   * kalmasın. Koşullu düşümün kendisi aşağıdaki yarış testinde sınanıyor.
   */
  it("sepetteki ürünün stoğu tükendiyse ödeme başlamadan durur", async () => {
    await addItemToCart({
      owner: { userId: USER },
      anonymousId: testId("anon", USER),
      now: NOW,
      itemType: "market",
      refId: SCARCE_PRODUCT,
      quantity: 1,
    });

    // Sepete girdikten SONRA stok tükeniyor (başkası aldı).
    await prisma.product.update({ where: { id: SCARCE_PRODUCT }, data: { stock: 0 } });

    await expect(
      checkout({
        userId: USER,
        actorIp: ACTOR_IP,
        now: NOW,
        payload: {
          idempotencyKey: testId("idem", "scarce"),
          expectedTotalKurus: 100_00 + 59_00,
          card: card(CARD_OK),
          delivery: delivery(),
        },
      }),
    ).rejects.toMatchObject({ code: "ITEM_UNAVAILABLE", status: 409 });

    expect(await prisma.order.count({ where: { userId: USER } })).toBe(0);
    expect(await prisma.payment.count({ where: { userId: USER } })).toBe(0);
  });

  /**
   * ═══ KOŞULLU STOK DÜŞÜMÜNÜN ASIL TESTİ ═══
   *
   * İki kullanıcı SON BİR ADETİ aynı anda satın almaya çalışıyor. İkisi de
   * sepet özetinde stoğu "yeterli" görüyor — kontrol o anda doğru. Farkı
   * yaratan şey `UPDATE ... WHERE stock >= 1`: PostgreSQL ikinci işlemi
   * bekletiyor, birinci commit edince koşulu yeniden değerlendiriyor ve
   * satır artık uymadığı için atlıyor → sipariş transaction'ı geri alınıyor.
   *
   * Koşul kaldırılırsa bu test KIRMIZIYA döner: stok -1'e iner ve iki sipariş
   * birden yazılır.
   */
  it("son adedi aynı anda isteyen iki kullanıcıdan yalnızca biri alır", async () => {
    for (const userId of [USER, OTHER_USER]) {
      await addItemToCart({
        owner: { userId },
        anonymousId: testId("anon", userId),
        now: NOW,
        itemType: "market",
        refId: SCARCE_PRODUCT,
        quantity: 1,
      });
    }

    const attempts = await Promise.allSettled(
      [USER, OTHER_USER].map((userId) =>
        checkout({
          userId,
          actorIp: ACTOR_IP,
          now: NOW,
          payload: {
            idempotencyKey: testId("idem", "stock-race", userId),
            expectedTotalKurus: 100_00 + 59_00,
            card: card(CARD_OK),
            // OTHER_USER'ın adresi yok; ikisi de bilet almıyor diye market
            // adresi gerekiyor. Bu yüzden her ikisine de USER'ın adresi
            // verilemez — aşağıda her kullanıcı kendi adresini kullanıyor.
            delivery: {
              addressId: userId === USER ? ADDRESS : OTHER_ADDRESS,
              deliverySlot: "3 Eylül 2026 Perşembe 10:00-12:00",
            },
          },
        }),
      ),
    );

    const product = await prisma.product.findUnique({ where: { id: SCARCE_PRODUCT } });

    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    // ASIL KANIT: stok eksiye inmedi ve tek sipariş yazıldı.
    expect(product?.stock).toBe(0);
    /**
     * Sayım TEST KULLANICILARIYLA SINIRLI. Filtresiz `count()` tablodaki her
     * siparişi sayıyordu — elle yapılan tarayıcı doğrulamasının tohumlanmış
     * hesaplara bıraktığı kayıtlar dahil. Test tek başına yeşil, tüm sette
     * kırmızı oluyordu; testin kendi kusuruydu, kodun değil.
     */
    expect(await prisma.order.count({ where: { userId: { in: [USER, OTHER_USER] } } })).toBe(1);
  });
});

describe("çift tahsilat koruması", () => {
  it("aynı idempotency anahtarıyla ikinci ödeme 409 alır ve TEK kayıt kalır", async () => {
    await fillCart(USER, ["event"]);

    const payload = {
      idempotencyKey: testId("idem", "double"),
      expectedTotalKurus: EVENT_PRICE_KURUS,
      card: card(CARD_OK),
      delivery: {},
    };

    await checkout({ userId: USER, actorIp: ACTOR_IP, now: NOW, payload });

    /**
     * SEPET YENİDEN DOLDURULUYOR — ve bu testin can alıcı noktası.
     *
     * Başarılı ödemeden sonra sepet `converted` oluyor, dolayısıyla aynı
     * anahtarla gelen ikinci istek idempotency kontrolüne VARMADAN "sepet
     * boş" diye duruyor. Bu davranış doğru ama korumanın kendisini sınamıyor.
     * Sepeti yeniden doldurmak isteği ödeme katmanına kadar taşıyor: orada
     * `unique(idempotency_key)` devreye giriyor ve ikinci tahsilat
     * veritabanı seviyesinde reddediliyor.
     */
    await fillCart(USER, ["event"]);

    await expect(
      checkout({ userId: USER, actorIp: ACTOR_IP, now: NOW, payload }),
    ).rejects.toMatchObject({ code: "DUPLICATE_PAYMENT", status: 409 });

    expect(await prisma.payment.count({ where: { userId: USER } })).toBe(1);
    // İkinci sipariş de oluşmamalı: transaction geri alındı.
    expect(await prisma.order.count({ where: { userId: USER } })).toBe(1);
  });

  it("EŞZAMANLI iki istek: yalnızca biri tahsil eder", async () => {
    await fillCart(USER, ["event"]);

    const payload = {
      idempotencyKey: testId("idem", "race"),
      expectedTotalKurus: EVENT_PRICE_KURUS,
      card: card(CARD_OK),
      delivery: {},
    };

    const results = await Promise.allSettled([
      checkout({ userId: USER, actorIp: ACTOR_IP, now: NOW, payload }),
      checkout({ userId: USER, actorIp: ACTOR_IP, now: NOW, payload }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    // ASIL KANIT: tabloda tek ödeme, tek sipariş.
    expect(await prisma.payment.count({ where: { userId: USER } })).toBe(1);
    expect(await prisma.order.count({ where: { userId: USER } })).toBe(1);
  });
});

describe("tutar ve yetki kontrolleri", () => {
  it("ekrandaki tutar sunucununkiyle tutmuyorsa ödeme durur", async () => {
    await fillCart(USER, ["event"]);

    await expect(
      checkout({
        userId: USER,
        actorIp: ACTOR_IP,
        now: NOW,
        payload: {
          idempotencyKey: testId("idem", "mismatch"),
          expectedTotalKurus: 1_00, // kullanıcı 1 TL sanıyor
          card: card(CARD_OK),
          delivery: {},
        },
      }),
    ).rejects.toMatchObject({ code: "CART_CHANGED", status: 409 });

    expect(await prisma.payment.count({ where: { userId: USER } })).toBe(0);
  });

  it("boş sepetle ödeme başlatılamaz", async () => {
    await expect(
      checkout({
        userId: USER,
        actorIp: ACTOR_IP,
        now: NOW,
        payload: {
          idempotencyKey: testId("idem", "empty"),
          expectedTotalKurus: 0,
          card: card(CARD_OK),
          delivery: {},
        },
      }),
    ).rejects.toMatchObject({ code: "CART_EMPTY", status: 409 });
  });

  it("market siparişinde adres zorunlu", async () => {
    await fillCart(USER, ["market"]);

    await expect(
      checkout({
        userId: USER,
        actorIp: ACTOR_IP,
        now: NOW,
        payload: {
          idempotencyKey: testId("idem", "noaddr"),
          expectedTotalKurus: 100_00 + 59_00,
          card: card(CARD_OK),
          delivery: {},
        },
      }),
    ).rejects.toMatchObject({ code: "DELIVERY_ADDRESS_REQUIRED", status: 422 });
  });

  /** IDOR: başkasının adresiyle sipariş verilemez. */
  it("BAŞKASININ adresi kullanılamaz", async () => {
    await fillCart(OTHER_USER, ["market"]);

    await expect(
      checkout({
        userId: OTHER_USER,
        actorIp: ACTOR_IP,
        now: NOW,
        payload: {
          idempotencyKey: testId("idem", "idor"),
          expectedTotalKurus: 100_00 + 59_00,
          card: card(CARD_OK),
          // ADRESİN SAHİBİ USER, isteği atan OTHER_USER.
          delivery: delivery(),
        },
      }),
    ).rejects.toMatchObject({ code: "DELIVERY_ADDRESS_REQUIRED", status: 422 });

    expect(await prisma.order.count({ where: { userId: OTHER_USER } })).toBe(0);
  });

  /**
   * ═══ PRD §6.1 — İKİ TESLİMAT AYRI ═══
   *
   * Market "adres + zaman aralığı", restoran "adres + tahmini hazırlık
   * süresi" istiyor. Restoran siparişinden de aralık istemek, kullanıcıya
   * karşılığı olmayan bir söz verdirmek olurdu.
   *
   * Bu iki test kontrolün SUNUCUDA olduğunu da gösteriyor: ekranın alanı
   * gösterip göstermemesi hiç işin içine girmiyor.
   */
  it("restoran siparişinde zaman aralığı istenmez", async () => {
    await fillCart(USER, ["restaurant"]);

    await expect(
      checkout({
        userId: USER,
        actorIp: ACTOR_IP,
        now: NOW,
        payload: {
          idempotencyKey: testId("idem", "restoslot"),
          expectedTotalKurus: 200_00 + 49_90,
          card: card(CARD_OK),
          // Aralık YOK, yalnızca adres var.
          delivery: { addressId: ADDRESS },
        },
      }),
    ).resolves.toMatchObject({ orderIds: [expect.any(String)] });
  });

  it("restoran siparişinde adres yine de zorunlu", async () => {
    await fillCart(USER, ["restaurant"]);

    await expect(
      checkout({
        userId: USER,
        actorIp: ACTOR_IP,
        now: NOW,
        payload: {
          idempotencyKey: testId("idem", "restonoaddr"),
          expectedTotalKurus: 200_00 + 49_90,
          card: card(CARD_OK),
          delivery: {},
        },
      }),
    ).rejects.toMatchObject({ code: "DELIVERY_ADDRESS_REQUIRED", status: 422 });
  });

  /**
   * Market sepette olduğu anda aralık YİNE ZORUNLU: restoran için gevşetilen
   * kural marketi de gevşetmiş olmamalı.
   */
  it("sepette market varken zaman aralığı zorunlu kalır", async () => {
    await fillCart(USER, ["market", "restaurant"]);

    await expect(
      checkout({
        userId: USER,
        actorIp: ACTOR_IP,
        now: NOW,
        payload: {
          idempotencyKey: testId("idem", "mixedslot"),
          expectedTotalKurus: 300_00 + 59_00 + 49_90,
          card: card(CARD_OK),
          delivery: { addressId: ADDRESS },
        },
      }),
    ).rejects.toMatchObject({ code: "DELIVERY_SLOT_REQUIRED", status: 422 });
  });

  it("yalnızca bilet varsa adres istenmez", async () => {
    await fillCart(USER, ["event"]);

    await expect(
      checkout({
        userId: USER,
        actorIp: ACTOR_IP,
        now: NOW,
        payload: {
          idempotencyKey: testId("idem", "ticketonly"),
          expectedTotalKurus: EVENT_PRICE_KURUS,
          card: card(CARD_OK),
          delivery: {},
        },
      }),
    ).resolves.toMatchObject({ orderIds: [expect.any(String)] });
  });
});

describe("kart kaydetme", () => {
  it("işaretlenirse kart kaydedilir — SON 4 HANE ile, numara olmadan", async () => {
    await fillCart(USER, ["event"]);

    await checkout({
      userId: USER,
      actorIp: ACTOR_IP,
      now: NOW,
      payload: {
        idempotencyKey: testId("idem", "savecard"),
        expectedTotalKurus: EVENT_PRICE_KURUS,
        card: { ...card(CARD_OK), save: true },
        delivery: {},
      },
    });

    const cards = await prisma.savedCard.findMany({ where: { userId: USER } });

    expect(cards).toHaveLength(1);
    expect(cards[0]?.last4).toBe("1111");
    expect(cards[0]?.brand).toBe("visa");
    expect(JSON.stringify(cards[0])).not.toContain(CARD_OK);
  });
});

async function seedFixtures(): Promise<void> {
  await prisma.user.createMany({
    data: [USER, OTHER_USER].map((id, index) => ({
      id,
      fullName: `Test Alıcı ${index + 1}`,
      email: `${id}@ornek.test`,
      isSeedData: true,
    })),
  });

  await prisma.address.createMany({
    data: [
      { id: ADDRESS, userId: USER },
      { id: OTHER_ADDRESS, userId: OTHER_USER },
    ].map((row) => ({
      ...row,
      title: "Ev",
      fullAddress: "Test Mahallesi 1. Sokak No 1",
      district: "Test İlçe",
      isSeedData: true,
    })),
  });

  await prisma.productCategory.create({
    data: { id: CATEGORY, name: testId("kategori"), isSeedData: true },
  });
  await prisma.product.createMany({
    data: [
      {
        id: PRODUCT,
        categoryId: CATEGORY,
        name: "Test Pirinç",
        description: "Test ürünü",
        imageUrl: "/images/test.svg",
        price: "100.00",
        stock: 10,
      },
      {
        id: SCARCE_PRODUCT,
        categoryId: CATEGORY,
        name: "Test Az",
        description: "Test ürünü",
        imageUrl: "/images/test.svg",
        price: "100.00",
        stock: 1,
      },
    ].map((row) => ({ ...row, isSeedData: true })),
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

  await prisma.venue.create({
    data: { id: VENUE, name: testId("mekan"), address: "Test Adres", isSeedData: true },
  });
  await prisma.event.create({
    data: {
      id: EVENT,
      venueId: VENUE,
      name: "Test Konser",
      category: "concert",
      performer: "Test Sanatçı",
      startsAt: new Date("2026-10-01T18:00:00.000Z"),
      basePrice: "300.00",
      isSeedData: true,
    },
  });
}

async function resetBudgets(): Promise<void> {
  await Promise.all([
    ...[USER, OTHER_USER].map((id) => resetRateLimit(rateLimitKey("payment_attempt", "user", id))),
    ...[USER, OTHER_USER].map((id) =>
      resetRateLimit(rateLimitKey("cart_write", "session", testId("anon", id))),
    ),
  ]);
}
