import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

/**
 * Yanıt sözleşmesi çalışma anı kontrolü (borç #107 · adım 107a).
 *
 * ⭐ BU DOSYANIN ASIL SORUSU: "TypeScript zaten tip kontrolü yapmıyor mu?"
 * Yapıyor — ama JSON'a hayatta kalmıyor. Aşağıdaki `Date` testi tam olarak
 * bunu gösteriyor: derlemenin doğru bulduğu bir gövde, telde şemayı ihlal
 * ediyor. Kontrolün var olma sebebi o test.
 */

import { assertResponseContract, ResponseContractError } from "@/lib/api-response-contract";

const schema = z.object({ id: z.string(), createdAt: z.iso.datetime() });

/**
 * Bayrak `vi.stubEnv` ile veriliyor, `vi.mock("@/config/env")` ile DEĞİL.
 *
 * Kontrol bilerek `process.env`'i doğrudan okuyor: `serverEnv` tarayıcı
 * tarafında istisna fırlatıyor ve bu modül her yerden içe aktarılabiliyor
 * (gerekçe `api-response-contract.ts` içinde yazılı, ölçülerek bulundu).
 */
beforeEach(() => {
  vi.stubEnv("API_RESPONSE_CONTRACT_CHECK", "true");
});

describe("yanıt sözleşmesi kontrolü", () => {
  it("gövde şemaya uyuyorsa sessizce geçer", () => {
    expect(() =>
      assertResponseContract(schema, { id: "a1", createdAt: "2026-08-13T00:00:00.000Z" }),
    ).not.toThrow();
  });

  it("eksik alanı yakalar ve hangi alan olduğunu söyler", () => {
    expect(() => assertResponseContract(schema, { id: "a1" })).toThrow(ResponseContractError);

    try {
      assertResponseContract(schema, { id: "a1" });
    } catch (error) {
      expect((error as Error).message).toContain("createdAt");
    }
  });

  /**
   * ⭐ KONTROLÜN VAROLUŞ SEBEBİ — DERLEMENİN GÖREMEDİĞİ HATA.
   *
   * `createdAt: new Date()` TypeScript'te `Date`; şemanın beklediği ISO metin
   * DEĞİL. Yalnızca tip bağına güvenilseydi bu gövde derlemeden geçer, belgede
   * "metin" yazarken telde nesne giderdi ve mobil istemci (adım 19) çözemezdi.
   *
   * ⚠️ Burada `Date` telde ISO METNE dönüşüyor (`toJSON`), yani bu ÖZEL durum
   * aslında sorunsuz. Asıl tuzağı bir sonraki test gösteriyor.
   */
  it("Date alanını telde ISO metne çevirerek doğrular", () => {
    expect(() =>
      assertResponseContract(schema, { id: "a1", createdAt: new Date("2026-08-13T00:00:00Z") }),
    ).not.toThrow();
  });

  /**
   * ⛔ DERLEMENİN GÖREMEDİĞİ GERÇEK TUZAK: `toJSON()` TAŞIMAYAN NESNE.
   *
   * Tipi `string` sanılan ama aslında bir nesne olan alan (Prisma `Decimal`,
   * `Map`, sınıf örneği) telde `{}` veya beklenmedik bir biçim olarak gider.
   * Tip bağı bunu göremez; bu kontrol görüyor.
   */
  it("telde nesneye dönüşen alanı yakalar", () => {
    const body = { id: "a1", createdAt: { nested: "value" } };

    expect(() => assertResponseContract(schema, body)).toThrow(ResponseContractError);
  });

  it("undefined alanın telde HİÇ OLMADIĞINI görür", () => {
    // Derlemede alan "var, değeri undefined"; JSON'da alan yok.
    const body = { id: "a1", createdAt: undefined };

    expect(() => assertResponseContract(schema, body)).toThrow(ResponseContractError);
  });

  it("bayrak kapalıyken hiçbir şey doğrulamaz", () => {
    vi.stubEnv("API_RESPONSE_CONTRACT_CHECK", "false");

    expect(() => assertResponseContract(schema, { hepsi: "yanlış" })).not.toThrow();
  });

  /**
   * ⚠️ `"false"` DİZESİ `Boolean()` İLE `true` OLUR — bu testin varlık sebebi.
   * Karşılaştırma `=== "true"` yerine `Boolean(...)` yazılsaydı bayrak, değeri
   * ne olursa olsun her ortamda açık kalırdı; production'da bile.
   */
  it("bayrak metni 'true' değilse kapalı sayılır", () => {
    for (const value of ["false", "1", "yes", "TRUE", ""]) {
      vi.stubEnv("API_RESPONSE_CONTRACT_CHECK", value);

      expect(() => assertResponseContract(schema, { hepsi: "yanlış" })).not.toThrow();
    }
  });

  it("şema verilmemişse sessizce geçer", () => {
    expect(() => assertResponseContract(undefined, { hepsi: "yanlış" })).not.toThrow();
  });

  /**
   * Sözleşmeye UYMAYAN fazladan alan hata DEĞİL.
   *
   * `03-api-guidelines.md` "yanıta yeni alan eklemek kırıcı değildir" diyor ve
   * kural istemcinin tanımadığı alanları yok saymasına dayanıyor. Kontrol
   * `.strict()` olsaydı, kırıcı olmayan bir değişiklik testleri kırardı.
   */
  /**
   * ⛔ BAYRAĞIN ADI İKİ AYRI YERDE GEÇİYOR — ikisi ayrışırsa hata SESSİZDİR.
   *
   * Kontrol adı `api-response-contract.ts` içinde okuyor; doğrulaması ve
   * production yasağı `config/env.ts` şemasında duruyor. Biri yeniden
   * adlandırılıp diğeri unutulsaydı yasak var olmayan bir değişkeni korur,
   * kontrol de hiçbir yerde açılamazdı — ve hiçbir test kırmızıya dönmezdi.
   *
   * Aynı sebeple E2E ve vitest yapılandırmaları da kontrol ediliyor: bayrağı
   * oralardan biri kaybederse kapı o ortamda sessizce kapanır.
   */
  it("bayrağın adı doğrulama, E2E ve test yapılandırmasında da aynı", () => {
    const readSource = (relativePath: string) =>
      readFileSync(join(process.cwd(), relativePath), "utf8");

    const missing = [
      "src/config/env.ts",
      "playwright.config.ts",
      "vitest.config.ts",
      ".env.example",
    ].filter((file) => !readSource(file).includes("API_RESPONSE_CONTRACT_CHECK"));

    expect(missing, "bayrak bu dosyalarda geçmiyor — adı ayrışmış olabilir").toEqual([]);
  });

  it("fazladan alan kırıcı sayılmaz", () => {
    expect(() =>
      assertResponseContract(schema, {
        id: "a1",
        createdAt: "2026-08-13T00:00:00.000Z",
        yeniAlan: 1,
      }),
    ).not.toThrow();
  });
});
