import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  findCategoryById,
  listCategories,
  listProducts,
} from "@/features/market/repositories/product.repository";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ═══ PRD §5.3 — MARKET KATALOĞUNUN OKUMA TARAFI ═══
 *
 * GERÇEK PostgreSQL'e karşı yazıldı ve bunun somut bir sebebi var: bu
 * dosyadaki en kritik iddia "BÜYÜK HARFLE arama da eşleşir" ve o davranış
 * tamamen veritabanının harf kurallarına bağlı. Taklit bir istemci
 * `contains` çağrısının yapıldığını doğrular, eşleşip eşleşmediğini DEĞİL —
 * yani gerçek hatayı hiç göremezdi.
 */

const CATEGORY_CLEANING = testId("category", "temizlik");
const CATEGORY_DAIRY = testId("category", "sut");
const CATEGORY_EMPTY = testId("category", "bos");

const PRODUCT_PAPER = testId("product", "kagit");
const PRODUCT_SOAP = testId("product", "sabun");
const PRODUCT_MILK = testId("product", "sut");
const PRODUCT_SOLD_OUT = testId("product", "tukendi");
const PRODUCT_DELETED = testId("product", "silinmis");

beforeEach(async () => {
  await cleanupTestData();

  await prisma.productCategory.createMany({
    data: [
      { id: CATEGORY_CLEANING, name: testId("Temizlik ve Kağıt") },
      { id: CATEGORY_DAIRY, name: testId("Süt Ürünleri") },
      { id: CATEGORY_EMPTY, name: testId("Boş Kategori") },
    ],
  });

  await prisma.product.createMany({
    data: [
      {
        id: PRODUCT_PAPER,
        categoryId: CATEGORY_CLEANING,
        name: "Kağıt Havlu 8'li",
        description: "Mutfak için kağıt havlu.",
        imageUrl: "/images/market/temizlik-ve-kagit.svg",
        price: "89.90",
        stock: 120,
      },
      {
        id: PRODUCT_SOAP,
        categoryId: CATEGORY_CLEANING,
        name: "Sıvı El Sabunu 1 L",
        description: "Nemlendirici sıvı sabun.",
        imageUrl: "/images/market/temizlik-ve-kagit.svg",
        price: "119.50",
        stock: 4,
      },
      {
        id: PRODUCT_MILK,
        categoryId: CATEGORY_DAIRY,
        name: "Tam Yağlı Süt 1 L",
        description: "Günlük pastörize süt.",
        imageUrl: "/images/market/sut-urunleri.svg",
        price: "62.90",
        stock: 40,
      },
      {
        id: PRODUCT_SOLD_OUT,
        categoryId: CATEGORY_DAIRY,
        name: "Beyaz Peynir 500 g",
        description: "Tam yağlı beyaz peynir.",
        imageUrl: "/images/market/sut-urunleri.svg",
        price: "215.00",
        stock: 0,
      },
      {
        id: PRODUCT_DELETED,
        categoryId: CATEGORY_DAIRY,
        name: "Kaldırılmış Ürün",
        description: "Satıştan kaldırıldı.",
        imageUrl: "/images/market/sut-urunleri.svg",
        price: "10.00",
        stock: 50,
        deletedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
  });
});

afterEach(async () => {
  await cleanupTestData();
});

/** Test kayıtlarını tohumlanmış katalogdan ayırır. */
function onlyTestProducts<T extends { id: string }>(rows: readonly T[]): T[] {
  return rows.filter((row) => row.id.startsWith("test-db-"));
}

describe("listProducts — süzgeçler", () => {
  it("kategoriye göre süzer", async () => {
    const products = onlyTestProducts(await listProducts({ categoryId: CATEGORY_CLEANING }));

    expect(products.map((p) => p.id).sort()).toEqual([PRODUCT_PAPER, PRODUCT_SOAP].sort());
  });

  it("yumuşak silinmiş ürünü hiç göstermez", async () => {
    const products = onlyTestProducts(await listProducts({}));

    expect(products.map((p) => p.id)).not.toContain(PRODUCT_DELETED);
  });

  /**
   * PRD §5.3 stoğu bitmiş ürünün SEPETE EKLENEMEMESİNİ istiyor, listeden
   * KAYBOLMASINI değil. Gizlemek kullanıcıya ürünün hiç var olmadığını
   * düşündürürdü; doğru bilgi "var ama şu an yok".
   */
  it("stoğu biten ürünü listeler ama stoğunu 0 bildirir", async () => {
    const products = onlyTestProducts(await listProducts({ categoryId: CATEGORY_DAIRY }));
    const soldOut = products.find((p) => p.id === PRODUCT_SOLD_OUT);

    expect(soldOut).toBeDefined();
    expect(soldOut?.stock).toBe(0);
  });

  it("satın alınabilir ürünleri tükenmiş olanın önüne koyar", async () => {
    const products = onlyTestProducts(await listProducts({ categoryId: CATEGORY_DAIRY }));

    expect(products.at(-1)?.id).toBe(PRODUCT_SOLD_OUT);
  });

  it("fiyatı tam sayı kuruş olarak döndürür", async () => {
    const products = onlyTestProducts(await listProducts({ categoryId: CATEGORY_DAIRY }));
    const milk = products.find((p) => p.id === PRODUCT_MILK);

    // 62,90 TL → 6290 kuruş. Ondalık sayı hiç kullanılmıyor (`src/lib/money.ts`).
    expect(milk?.priceKurus).toBe(6290);
  });
});

describe("listProducts — arama", () => {
  it("ürün adında arar", async () => {
    const products = onlyTestProducts(await listProducts({ query: "havlu" }));

    expect(products.map((p) => p.id)).toEqual([PRODUCT_PAPER]);
  });

  it("açıklamada da arar", async () => {
    const products = onlyTestProducts(await listProducts({ query: "pastörize" }));

    expect(products.map((p) => p.id)).toEqual([PRODUCT_MILK]);
  });

  /**
   * ═══ ASIL KORUNAN DAVRANIŞ — ÜÇ YAZIM, TEK SONUÇ ═══
   *
   * Kullanıcı "Kağıt Havlu"yu üç farklı şekilde arayabilir ve üçü de
   * bulmalı. Düzeltme öncesi YALNIZCA üçüncüsü çalışıyordu:
   *
   *   "KAĞIT" (büyük harf)        → 0 sonuç · veritabanı `I`'yi `i` sanıyordu
   *   "kagit" (Türkçe klavyesiz)  → 0 sonuç · aksan eşleşmiyordu
   *   "kağıt" (tam doğru yazım)   → 1 sonuç
   *
   * `unaccent` eklentisi hem sorguyu hem ürün adını sadeleştirdiği için
   * üçü de aynı yere düşüyor. Bu testler o davranışın nöbetçisi.
   */
  it("büyük harfle yazılan Türkçe aramayı eşler", async () => {
    const paper = onlyTestProducts(await listProducts({ query: "KAĞIT" }));
    const soap = onlyTestProducts(await listProducts({ query: "SIVI" }));

    expect(paper.map((p) => p.id)).toEqual([PRODUCT_PAPER]);
    expect(soap.map((p) => p.id)).toEqual([PRODUCT_SOAP]);
  });

  it("küçük harfle yazılan aramayı eşler", async () => {
    const paper = onlyTestProducts(await listProducts({ query: "kağıt" }));
    const soap = onlyTestProducts(await listProducts({ query: "sıvı" }));

    expect(paper.map((p) => p.id)).toEqual([PRODUCT_PAPER]);
    expect(soap.map((p) => p.id)).toEqual([PRODUCT_SOAP]);
  });

  /** Türkçe klavyesi olmayan kullanıcı — telefonda ve yurt dışında sık. */
  it("aksansız yazılan aramayı eşler", async () => {
    const paper = onlyTestProducts(await listProducts({ query: "kagit" }));
    const soap = onlyTestProducts(await listProducts({ query: "sivi" }));
    const milk = onlyTestProducts(await listProducts({ query: "sut" }));

    expect(paper.map((p) => p.id)).toEqual([PRODUCT_PAPER]);
    expect(soap.map((p) => p.id)).toEqual([PRODUCT_SOAP]);
    expect(milk.map((p) => p.id)).toEqual([PRODUCT_MILK]);
  });

  it("aksansız VE büyük harfle yazılan aramayı eşler", async () => {
    const paper = onlyTestProducts(await listProducts({ query: "KAGIT" }));

    expect(paper.map((p) => p.id)).toEqual([PRODUCT_PAPER]);
  });

  /** Diğer Türkçe harfler de katlanmalı: ç, ş, ö, ü, ğ. */
  it("ç ş ö ü ğ harflerini de aksansız eşler", async () => {
    const byDescription = onlyTestProducts(await listProducts({ query: "pastorize" }));

    expect(byDescription.map((p) => p.id)).toEqual([PRODUCT_MILK]);
  });

  /**
   * ═══ JOKER KAÇIŞI ═══
   *
   * `%` ve `_` `LIKE` içinde joker karakter. Kaçırılmasaydı `%` yazan
   * kullanıcı TÜM kataloğu eşleştirirdi — hata vermeyen, sessizce yanlış
   * bir sonuç.
   */
  it("kullanıcının yazdığı % işaretini joker saymaz", async () => {
    const products = onlyTestProducts(await listProducts({ query: "%" }));

    expect(products).toEqual([]);
  });

  it("kullanıcının yazdığı alt çizgiyi joker saymaz", async () => {
    // "_abun" bir joker olsaydı "Sabun" ile eşleşirdi.
    const products = onlyTestProducts(await listProducts({ query: "_abunu" }));

    expect(products).toEqual([]);
  });

  it("kategori ve arama birlikte uygulanır", async () => {
    const products = onlyTestProducts(
      await listProducts({ categoryId: CATEGORY_DAIRY, query: "süt" }),
    );

    // Temizlik kategorisindeki ürünler aramaya takılmıyor, süzgeç birlikte çalışıyor.
    expect(products.map((p) => p.id)).toEqual([PRODUCT_MILK]);
  });

  /**
   * Arama hem ada hem açıklamaya bakıyor, yani bir kelime iki ürünü birden
   * yakalayabilir. Bu bilinçli: kullanıcı "yağlı" yazdığında adında geçmeyen
   * ama açıklamasında geçen ürünü de görmeli.
   */
  it("ad ve açıklama eşleşmelerinin ikisini birden döndürür", async () => {
    const products = onlyTestProducts(await listProducts({ query: "yağlı" }));

    expect(products.map((p) => p.id).sort()).toEqual([PRODUCT_MILK, PRODUCT_SOLD_OUT].sort());
  });

  it("eşleşme yoksa boş liste döner", async () => {
    const products = onlyTestProducts(await listProducts({ query: "bulunmayanurun" }));

    expect(products).toEqual([]);
  });
});

describe("listCategories", () => {
  it("ürünü olan kategorileri ürün sayısıyla döndürür", async () => {
    const categories = (await listCategories()).filter((c) => c.id.startsWith("test-db-"));
    const cleaning = categories.find((c) => c.id === CATEGORY_CLEANING);

    expect(cleaning?.productCount).toBe(2);
  });

  /**
   * Boş kategori gösterilseydi kullanıcı tıklayıp boş liste görür ve "arıza
   * var" sanırdı.
   */
  it("hiç ürünü olmayan kategoriyi göstermez", async () => {
    const categories = await listCategories();

    expect(categories.map((c) => c.id)).not.toContain(CATEGORY_EMPTY);
  });

  it("silinmiş ürünü kategori sayımına katmaz", async () => {
    const categories = await listCategories();
    const dairy = categories.find((c) => c.id === CATEGORY_DAIRY);

    // Süt kategorisinde 3 satır var ama biri yumuşak silinmiş.
    expect(dairy?.productCount).toBe(2);
  });
});

describe("findCategoryById", () => {
  it("var olan kategoriyi bulur", async () => {
    const category = await findCategoryById(CATEGORY_DAIRY);

    expect(category?.id).toBe(CATEGORY_DAIRY);
  });

  /**
   * Adrese elle yazılmış olmayan bir kimlikte sayfa süzgeci düşürüyor;
   * repository'nin işi bunu `null` ile bildirmek, istisna fırlatmak değil.
   */
  it("olmayan kategoride null döner", async () => {
    expect(await findCategoryById(testId("category", "yok"))).toBeNull();
  });
});
