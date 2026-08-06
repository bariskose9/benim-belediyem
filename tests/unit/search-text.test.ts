/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { normalizeSearchQuery } from "@/lib/search-text";

/**
 * Arama metninin Türkçe'ye göre hazırlanması.
 *
 * BU TEST GERÇEK BİR HATADAN DOĞDU. Yerel veritabanında denendiğinde
 * "KAĞIT" yazan kullanıcı "Kağıt Havlu"yu bulamıyordu: veritabanının
 * büyük/küçük harf dönüşümü `I` harfini `i`'ye çeviriyor, oysa Türkçe'de
 * karşılığı `ı`.
 *
 * Aşağıdaki `I → ı` beklentileri o hatanın nöbetçisi: biri kırmızıya
 * dönerse büyük harfle arama yeniden bozulmuş demektir.
 */
describe("normalizeSearchQuery", () => {
  it("büyük I harfini Türkçe kuralıyla ı yapar", () => {
    // "SIVI" veritabanında "Sıvı El Sabunu" ile eşleşmeli.
    expect(normalizeSearchQuery("SIVI")).toBe("sıvı");
    expect(normalizeSearchQuery("KAĞIT")).toBe("kağıt");
    expect(normalizeSearchQuery("YAĞI")).toBe("yağı");
  });

  it("büyük İ harfini i yapar", () => {
    expect(normalizeSearchQuery("İÇECEK")).toBe("içecek");
    expect(normalizeSearchQuery("AYÇİÇEK")).toBe("ayçiçek");
  });

  it("diğer Türkçe harfleri bozmaz", () => {
    expect(normalizeSearchQuery("SÜT ÜRÜNLERİ")).toBe("süt ürünleri");
    expect(normalizeSearchQuery("ÇAMAŞIR")).toBe("çamaşır");
    expect(normalizeSearchQuery("ÖĞLE")).toBe("öğle");
  });

  it("zaten küçük harfli metni değiştirmez", () => {
    expect(normalizeSearchQuery("kağıt havlu")).toBe("kağıt havlu");
  });

  it("baştaki ve sondaki boşlukları atar", () => {
    expect(normalizeSearchQuery("  süt  ")).toBe("süt");
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
