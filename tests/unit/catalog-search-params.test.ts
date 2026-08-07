/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { parseCatalogSearchParams } from "@/features/catalog/schemas/catalog-search.schema";

/**
 * `/market` ve `/restoran` adres çubuğu parametrelerinin doğrulanması.
 *
 * ADRES ÇUBUĞU BİR GİRDİ NOKTASIDIR: buradan gelen değerler veritabanı
 * sorgusuna gidiyor. Testin asıl işi "kurcalanmış adres sayfayı düşürmüyor,
 * süzgeci düşürüyor" davranışını sabitlemek.
 */
describe("parseCatalogSearchParams", () => {
  it("kategori ve arama parametrelerini okur", () => {
    expect(parseCatalogSearchParams({ kategori: "cat-1", arama: "süt" })).toEqual({
      categoryId: "cat-1",
      query: "süt",
    });
  });

  it("parametre yoksa süzgeç kurmaz", () => {
    expect(parseCatalogSearchParams({})).toEqual({
      categoryId: undefined,
      query: undefined,
    });
  });

  it("boş arama metnini süzgeç saymaz", () => {
    expect(parseCatalogSearchParams({ arama: "   " }).query).toBeUndefined();
  });

  /**
   * 80 karakterlik sınır bir hizmet dışı bırakma önlemi: sınırsız uzunlukta
   * bir metin her istekte veritabanına taşınırdı. Sınırı aşan değer HATA
   * DEĞİL, yok sayılıyor — kullanıcıya hata ekranı göstermenin bir faydası yok.
   */
  it("aşırı uzun arama metnini yok sayar", () => {
    expect(parseCatalogSearchParams({ arama: "a".repeat(81) }).query).toBeUndefined();
  });

  it("aşırı uzun kategori kimliğini yok sayar", () => {
    expect(parseCatalogSearchParams({ kategori: "x".repeat(129) }).categoryId).toBeUndefined();
  });

  it("tekrarlı parametrede ilk değeri alır", () => {
    const parsed = parseCatalogSearchParams({
      kategori: ["cat-1", "cat-2"],
      arama: ["süt", "ekmek"],
    });

    expect(parsed).toEqual({ categoryId: "cat-1", query: "süt" });
  });

  /**
   * Şemada tanımlı olmayan alanlar sonuca HİÇ GEÇMEZ. Adrese `?stock=999`
   * yazan biri sorguyu etkileyemez.
   */
  it("tanımsız parametreleri sonuca taşımaz", () => {
    const parsed = parseCatalogSearchParams({ stok: "999", fiyat: "0" });

    expect(parsed).toEqual({ categoryId: undefined, query: undefined });
  });
});
