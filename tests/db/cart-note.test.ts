import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addItemToCart,
  changeItemNote,
  getCartSummary,
} from "@/features/cart/services/cart.service";
import { rateLimitKey, resetRateLimit } from "@/lib/rate-limit";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ═══ PRD §5.4 — ADİSYON NOTU ═══
 *
 * Adım 9'un tek yeni iş kuralı: bir menü kalemi adisyona ADET VE NOTLA
 * ekleniyor ("az acılı") ve not sonradan değiştirilebiliyor.
 *
 * GERÇEK veritabanına karşı yazıldı çünkü asıl sorulan şey "not gerçekten
 * satıra yazıldı mı ve BAŞKASININ satırına yazılabiliyor mu" — ikisi de
 * sorgunun `where` koşuluna bağlı, taklit bir istemci ikisini de göremezdi.
 */

const NOW = new Date("2026-09-01T09:00:00.000Z");

const USER = testId("user", "diner");
const OTHER_USER = testId("user", "otherdiner");
const MENU_CATEGORY = testId("menucat", "note");
const MENU_ITEM = testId("menu", "kofte-note");

function actor(userId: string) {
  return { owner: { userId }, anonymousId: testId("anon", userId), now: NOW };
}

async function addKofte(userId: string, note?: string) {
  return addItemToCart({
    ...actor(userId),
    itemType: "restaurant",
    refId: MENU_ITEM,
    quantity: 1,
    note,
  });
}

/** Kullanıcının sepetindeki tek restoran satırını getirir. */
async function onlyLine(userId: string) {
  const summary = await getCartSummary({ userId }, NOW);
  const line = summary.sections.flatMap((section) => section.lines)[0];

  if (!line) throw new Error("Sepette satır yok.");

  return line;
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

describe("adisyona notla ekleme", () => {
  it("notu satıra yazar", async () => {
    await addKofte(USER, "az acılı");

    expect((await onlyLine(USER)).note).toBe("az acılı");
  });

  it("not verilmezse satır notsuz kalır", async () => {
    await addKofte(USER);

    expect((await onlyLine(USER)).note).toBeNull();
  });
});

describe("changeItemNote", () => {
  it("var olan notu değiştirir", async () => {
    await addKofte(USER, "az acılı");
    const line = await onlyLine(USER);

    await changeItemNote({ ...actor(USER), itemId: line.id, note: "soğansız" });

    expect((await onlyLine(USER)).note).toBe("soğansız");
  });

  it("notsuz satıra sonradan not ekler", async () => {
    await addKofte(USER);
    const line = await onlyLine(USER);

    await changeItemNote({ ...actor(USER), itemId: line.id, note: "bol soslu" });

    expect((await onlyLine(USER)).note).toBe("bol soslu");
  });

  it("null gönderilince notu temizler", async () => {
    await addKofte(USER, "az acılı");
    const line = await onlyLine(USER);

    await changeItemNote({ ...actor(USER), itemId: line.id, note: null });

    expect((await onlyLine(USER)).note).toBeNull();
  });

  /** Boş metin ile "not yok" aynı şey; iki farklı değer tutmak sapma üretir. */
  it("boş metni null olarak yazar", async () => {
    await addKofte(USER, "az acılı");
    const line = await onlyLine(USER);

    await changeItemNote({ ...actor(USER), itemId: line.id, note: "" });

    expect((await onlyLine(USER)).note).toBeNull();
  });

  it("not değişikliği adedi bozmaz", async () => {
    await addKofte(USER, "az acılı");
    await addKofte(USER);
    const line = await onlyLine(USER);

    expect(line.quantity).toBe(2);

    await changeItemNote({
      ...actor(USER),
      itemId: line.id,
      note: "iki porsiyon ayrı paketlensin",
    });

    expect((await onlyLine(USER)).quantity).toBe(2);
  });

  /**
   * ═══ IDOR — BU DOSYANIN EN ÖNEMLİ TESTİ ═══
   *
   * Satır kimliği tahmin edilse (veya başka bir ekranda görülse) bile
   * başkasının adisyonundaki nota dokunulamamalı. Sahiplik sorgunun `where`
   * koşulunda; koşul kaldırılırsa bu test kırmızıya döner.
   */
  it("BAŞKASININ satırının notu değiştirilemez", async () => {
    await addKofte(OTHER_USER, "kendi notu");
    const victimLine = await onlyLine(OTHER_USER);

    // Saldırganın da bir sepeti var, yoksa "sepet yok" diye erken dönerdi ve
    // test korumayı değil, sepetin yokluğunu ölçmüş olurdu.
    await addKofte(USER);

    await expect(
      changeItemNote({ ...actor(USER), itemId: victimLine.id, note: "ele geçirildi" }),
    ).rejects.toMatchObject({ code: "CART_ITEM_NOT_FOUND", status: 404 });

    expect((await onlyLine(OTHER_USER)).note).toBe("kendi notu");
  });

  it("olmayan satırda 404 döner", async () => {
    await addKofte(USER);

    await expect(
      changeItemNote({ ...actor(USER), itemId: testId("cartitem", "yok"), note: "not" }),
    ).rejects.toMatchObject({ code: "CART_ITEM_NOT_FOUND", status: 404 });
  });
});

async function seedFixtures(): Promise<void> {
  await prisma.user.createMany({
    data: [USER, OTHER_USER].map((id, index) => ({
      id,
      fullName: `Test Müşteri ${index + 1}`,
      email: `${id}@ornek.test`,
      isSeedData: true,
    })),
  });

  await prisma.menuCategory.create({
    data: { id: MENU_CATEGORY, name: testId("menu-not-kategori"), isSeedData: true },
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

/** Sepet yazma bütçesi testler arasında taşınmasın. */
async function resetBudgets(): Promise<void> {
  for (const userId of [USER, OTHER_USER]) {
    await resetRateLimit(rateLimitKey("cart_write", "session", testId("anon", userId)));
  }
}
