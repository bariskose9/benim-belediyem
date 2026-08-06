/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { normalizeSearchQuery, toLikePattern } from "@/lib/search-text";

/**
 * Arama metninin sorguya hazırlanması.
 *
 * TÜRKÇE HARF KATLAMASI BURADA TEST EDİLMİYOR çünkü burada YAPILMIYOR:
 * `unaccent` eklentisi hem sorguyu hem ürün adını veritabanı tarafında
 * sadeleştiriyor. O davranışın testi gerçek PostgreSQL'e karşı
 * `tests/db/market-catalog.test.ts` içinde — taklitle kanıtlanamaz.
 */
describe("normalizeSearchQuery", () => {
  it("baştaki ve sondaki boşlukları atar", () => {
    expect(normalizeSearchQuery("  süt  ")).toBe("süt");
  });

  it("metni olduğu gibi bırakır", () => {
    expect(normalizeSearchQuery("Kağıt Havlu")).toBe("Kağıt Havlu");
  });

  /**
   * Boş metin süzgeç KURMAMALI. `""` döndürseydi "boş metni içeren ürünler"
   * diye anlamsız ama zararsız görünen bir sorgu kurulurdu; `undefined`
   * süzgecin hiç uygulanmadığını söylüyor.
   */
  it("boş veya yalnızca boşluktan oluşan metinde undefined döner", () => {
    expect(normalizeSearchQuery("")).toBeUndefined();
    expect(normalizeSearchQuery("   ")).toBeUndefined();
    expect(normalizeSearchQuery(undefined)).toBeUndefined();
  });
});

/**
 * ═══ JOKER KAÇIŞI — SESSİZ BİR SORUNUN NÖBETÇİSİ ═══
 *
 * `%` ve `_` `LIKE` içinde joker karakterdir. Kaçırılmasaydı tek bir `%`
 * yazan kullanıcı TÜM kataloğu eşleştirirdi. Hata vermez, çökmez — sadece
 * yanlış sonuç verir; bu yüzden testle sabitleniyor.
 */
describe("toLikePattern", () => {
  it("metni her iki yanından joker ile sarar", () => {
    expect(toLikePattern("süt")).toBe("%süt%");
  });

  it("kullanıcının yazdığı yüzde işaretini etkisizleştirir", () => {
    expect(toLikePattern("50%")).toBe("%50\\%%");
  });

  it("kullanıcının yazdığı alt çizgiyi etkisizleştirir", () => {
    expect(toLikePattern("a_b")).toBe("%a\\_b%");
  });

  /**
   * Ters eğik çizgi ÖNCE kaçırılmalı: sonra kaçırılsaydı kendi eklediğimiz
   * kaçış karakterleri de ikinci kez kaçırılır ve desen bozulurdu.
   */
  it("ters eğik çizgiyi kendi kaçış karakterimizi bozmadan kaçırır", () => {
    expect(toLikePattern("a\\b")).toBe("%a\\\\b%");
    expect(toLikePattern("\\%")).toBe("%\\\\\\%%");
  });

  it("Türkçe harflere dokunmaz", () => {
    expect(toLikePattern("Kağıt")).toBe("%Kağıt%");
  });
});
