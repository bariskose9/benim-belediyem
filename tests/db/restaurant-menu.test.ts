import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  findMenuCategoryById,
  listMenuCategories,
  listMenuItems,
} from "@/features/restaurant/repositories/menu.repository";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ═══ PRD §5.4 — RESTORAN MENÜSÜNÜN OKUMA TARAFI ═══
 *
 * GERÇEK PostgreSQL'e karşı yazıldı: bu dosyanın en kritik iddiası
 * "aksansız ve büyük harfle yazılan Türkçe arama da eşleşir" ve o davranış
 * tamamen veritabanının harf kurallarına ve `unaccent` eklentisine bağlı.
 * Taklit bir istemci sorgunun yapıldığını doğrular, EŞLEŞTİĞİNİ değil.
 *
 * Arama market ile AYNI ortak katmandan geçiyor (`features/catalog`), ama
 * ayrı tablo demek ayrı sorgu demek: menü tablosunun kendi testi olmasaydı
 * ortak katmandaki bir daldan yalnızca biri sınanmış olurdu.
 */

const CATEGORY_MAIN = testId("menucat", "ana-yemek");
const CATEGORY_DESSERT = testId("menucat", "tatli");
const CATEGORY_EMPTY = testId("menucat", "bos");

const ITEM_KOFTE = testId("menu", "kofte");
const ITEM_GUVEC = testId("menu", "guvec");
const ITEM_KUNEFE = testId("menu", "kunefe");
const ITEM_UNAVAILABLE = testId("menu", "tukendi");
const ITEM_DELETED = testId("menu", "silinmis");

beforeEach(async () => {
  await cleanupTestData();

  await prisma.menuCategory.createMany({
    data: [
      { id: CATEGORY_MAIN, name: testId("Ana Yemek") },
      { id: CATEGORY_DESSERT, name: testId("Tatlı") },
      { id: CATEGORY_EMPTY, name: testId("Boş Kategori") },
    ],
  });

  await prisma.menuItem.createMany({
    data: [
      {
        id: ITEM_KOFTE,
        categoryId: CATEGORY_MAIN,
        name: "Izgara Köfte",
        description: "Dana kıymadan, ızgarada pişirilir.",
        imageUrl: "/images/restaurant/ana-yemek.svg",
        price: "245.90",
        isAvailable: true,
      },
      {
        id: ITEM_GUVEC,
        categoryId: CATEGORY_MAIN,
        name: "Sebzeli Güveç",
        description: "Fırında, mevsim sebzeleriyle.",
        imageUrl: "/images/restaurant/ana-yemek.svg",
        price: "198.50",
        isAvailable: true,
      },
      {
        id: ITEM_KUNEFE,
        categoryId: CATEGORY_DESSERT,
        name: "Künefe",
        description: "Sıcak servis edilir, üzeri fıstıklı.",
        imageUrl: "/images/restaurant/tatli.svg",
        price: "155.00",
        isAvailable: true,
      },
      {
        id: ITEM_UNAVAILABLE,
        categoryId: CATEGORY_DESSERT,
        name: "Fırın Sütlaç",
        description: "Bugün mutfakta yok.",
        imageUrl: "/images/restaurant/tatli.svg",
        price: "112.90",
        isAvailable: false,
      },
      {
        id: ITEM_DELETED,
        categoryId: CATEGORY_DESSERT,
        name: "Kaldırılmış Tatlı",
        description: "Menüden kaldırıldı.",
        imageUrl: "/images/restaurant/tatli.svg",
        price: "90.00",
        isAvailable: true,
        deletedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
  });
});

afterEach(async () => {
  await cleanupTestData();
});

/** Test kayıtlarını tohumlanmış menüden ayırır. */
function onlyTestItems<T extends { id: string }>(rows: readonly T[]): T[] {
  return rows.filter((row) => row.id.startsWith("test-db-"));
}

describe("listMenuItems — süzgeçler", () => {
  it("kategoriye göre süzer", async () => {
    const items = onlyTestItems(await listMenuItems({ categoryId: CATEGORY_MAIN }));

    expect(items.map((item) => item.id).sort()).toEqual([ITEM_KOFTE, ITEM_GUVEC].sort());
  });

  it("yumuşak silinmiş kalemi hiç göstermez", async () => {
    const items = onlyTestItems(await listMenuItems({}));

    expect(items.map((item) => item.id)).not.toContain(ITEM_DELETED);
  });

  /**
   * PRD §5.4 tükenmiş kalemin ADİSYONA EKLENEMEMESİNİ istiyor, listeden
   * kaybolmasını değil — marketteki kararın aynısı. Gizlemek kullanıcıya
   * kalemin hiç var olmadığını düşündürürdü.
   */
  it("tükenmiş kalemi listeler ama satılamaz işaretler", async () => {
    const items = onlyTestItems(await listMenuItems({ categoryId: CATEGORY_DESSERT }));
    const unavailable = items.find((item) => item.id === ITEM_UNAVAILABLE);

    expect(unavailable).toBeDefined();
    expect(unavailable?.isAvailable).toBe(false);
  });

  it("satılabilir kalemleri tükenmiş olanın önüne koyar", async () => {
    const items = onlyTestItems(await listMenuItems({ categoryId: CATEGORY_DESSERT }));

    expect(items.at(-1)?.id).toBe(ITEM_UNAVAILABLE);
  });

  it("fiyatı tam sayı kuruş olarak döndürür", async () => {
    const items = onlyTestItems(await listMenuItems({ categoryId: CATEGORY_MAIN }));
    const kofte = items.find((item) => item.id === ITEM_KOFTE);

    // 245,90 TL → 24590 kuruş. Ondalık sayı hiç kullanılmıyor (`src/lib/money.ts`).
    expect(kofte?.priceKurus).toBe(24590);
  });
});

describe("listMenuItems — arama", () => {
  it("kalem adında arar", async () => {
    const items = onlyTestItems(await listMenuItems({ query: "köfte" }));

    expect(items.map((item) => item.id)).toEqual([ITEM_KOFTE]);
  });

  it("açıklamada da arar", async () => {
    const items = onlyTestItems(await listMenuItems({ query: "fıstıklı" }));

    expect(items.map((item) => item.id)).toEqual([ITEM_KUNEFE]);
  });

  /**
   * ═══ ASIL KORUNAN DAVRANIŞ — ÜÇ YAZIM, TEK SONUÇ ═══
   *
   * "Güveç" üç farklı şekilde aranabilir ve üçü de bulmalı:
   *   "GÜVEÇ"  → veritabanının kendi büyük/küçük harf kuralı Türkçe bilmez
   *   "guvec"  → Türkçe klavyesi olmayan kullanıcı (telefonda sık)
   *   "güveç"  → tam doğru yazım
   */
  it("büyük harfle yazılan Türkçe aramayı eşler", async () => {
    const items = onlyTestItems(await listMenuItems({ query: "GÜVEÇ" }));

    expect(items.map((item) => item.id)).toEqual([ITEM_GUVEC]);
  });

  it("aksansız yazılan aramayı eşler", async () => {
    const guvec = onlyTestItems(await listMenuItems({ query: "guvec" }));
    const kunefe = onlyTestItems(await listMenuItems({ query: "kunefe" }));

    expect(guvec.map((item) => item.id)).toEqual([ITEM_GUVEC]);
    expect(kunefe.map((item) => item.id)).toEqual([ITEM_KUNEFE]);
  });

  it("aksansız VE büyük harfle yazılan aramayı eşler", async () => {
    const items = onlyTestItems(await listMenuItems({ query: "GUVEC" }));

    expect(items.map((item) => item.id)).toEqual([ITEM_GUVEC]);
  });

  /**
   * ═══ JOKER KAÇIŞI ═══
   * `%` ve `_` `LIKE` içinde joker. Kaçırılmasaydı tek karakter yazan
   * kullanıcı tüm menüyü eşleştirirdi — hata vermeyen, sessizce yanlış sonuç.
   */
  it("kullanıcının yazdığı % işaretini joker saymaz", async () => {
    const items = onlyTestItems(await listMenuItems({ query: "%" }));

    expect(items).toEqual([]);
  });

  it("kullanıcının yazdığı alt çizgiyi joker saymaz", async () => {
    // "_ünefe" bir joker olsaydı "Künefe" ile eşleşirdi.
    const items = onlyTestItems(await listMenuItems({ query: "_ünefe" }));

    expect(items).toEqual([]);
  });

  it("kategori ve arama birlikte uygulanır", async () => {
    const items = onlyTestItems(
      await listMenuItems({ categoryId: CATEGORY_MAIN, query: "sebzeli" }),
    );

    expect(items.map((item) => item.id)).toEqual([ITEM_GUVEC]);
  });

  it("eşleşme yoksa boş liste döner", async () => {
    const items = onlyTestItems(await listMenuItems({ query: "bulunmayanyemek" }));

    expect(items).toEqual([]);
  });
});

describe("listMenuCategories", () => {
  /**
   * Rozetteki sayı TÜKENMİŞ KALEMLERİ DE sayıyor: kategori "2 kalem" derken
   * listede 2 kart görünmeli. Yalnızca satılabilirleri saysaydı rozetle
   * liste birbirini tutmazdı.
   */
  it("kalemi olan kategorileri kalem sayısıyla döndürür", async () => {
    const categories = await listMenuCategories();
    const dessert = categories.find((category) => category.id === CATEGORY_DESSERT);

    // Tatlıda 3 satır var: künefe + tükenmiş sütlaç + yumuşak silinmiş olan.
    expect(dessert?.itemCount).toBe(2);
  });

  it("hiç kalemi olmayan kategoriyi göstermez", async () => {
    const categories = await listMenuCategories();

    expect(categories.map((category) => category.id)).not.toContain(CATEGORY_EMPTY);
  });
});

describe("findMenuCategoryById", () => {
  it("var olan kategoriyi bulur", async () => {
    const category = await findMenuCategoryById(CATEGORY_MAIN);

    expect(category?.id).toBe(CATEGORY_MAIN);
  });

  /**
   * Adres çubuğuna elle yazılmış bir kimlik hata değil, YOK SAYILIR: sayfa
   * süzgeci düşürüp tüm menüyü gösteriyor.
   */
  it("olmayan kategoride null döner", async () => {
    expect(await findMenuCategoryById(testId("menucat", "yok"))).toBeNull();
  });
});
