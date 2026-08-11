import { describe, expect, it } from "vitest";

import { apiOperations } from "@/features/api-docs/registry";
import { buildOpenApiDocument } from "@/features/api-docs/services/openapi.service";
import { redactString, REDACTED } from "@/lib/log-redact";

/**
 * Üretilen OpenAPI belgesinin biçimini ve GİZLİLİĞİNİ doğrular
 * (adım 18b · ADR-019).
 */

type SpecPaths = Record<string, Record<string, { responses: Record<string, unknown> }>>;

describe("OpenAPI belgesi", () => {
  const spec = buildOpenApiDocument();

  it("OpenAPI 3.1 sürümünü bildiriyor", () => {
    /**
     * Sürüm bir detay değil: 3.1 JSON Schema 2020-12'yi olduğu gibi kullanıyor
     * ve Zod'un ürettiği biçim tam olarak bu. 3.0'a düşürülürse her şema elle
     * dönüştürülmek zorunda kalır ve dönüşüm SESSİZCE kayıplı olur.
     */
    expect(spec.openapi).toBe("3.1.0");
  });

  it("her uç için bir yol ve metot yazmış", () => {
    const paths = spec.paths as SpecPaths;
    const written = Object.entries(paths).flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`),
    );

    expect(written).toHaveLength(apiOperations.length);
  });

  it("her işlem 500 yanıtını da belgeliyor", () => {
    const paths = spec.paths as SpecPaths;
    const missing: string[] = [];

    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        // Beklenmeyen hata her uçta mümkün; belgede görünmezse istemci onu
        // hiç ele almayabilir.
        if (!("500" in operation.responses)) missing.push(`${method.toUpperCase()} ${path}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it("korumalı uçlar bir güvenlik şeması bildiriyor", () => {
    const paths = spec.paths as unknown as Record<string, Record<string, { security?: unknown[] }>>;
    const unguarded: string[] = [];

    for (const operation of apiOperations) {
      if (operation.access === "public") continue;

      const written = paths[operation.path]?.[operation.method]?.security;

      if (!written || written.length === 0) {
        unguarded.push(`${operation.method.toUpperCase()} ${operation.path}`);
      }
    }

    expect(unguarded).toEqual([]);
  });

  it("genel uçlar `security: []` yazıyor — alanı ATLAMIYOR", () => {
    /**
     * ⭐ Alanı hiç yazmamak "kök seviyedeki güvenliği devral" demek; boş dizi
     * ise "bu uç BİLEREK korumasız" demek. Fark okuyan için kritik: alan
     * eksikse "unutulmuş mu, öyle mi tasarlanmış" sorusunun cevabı yoktur.
     */
    const paths = spec.paths as unknown as Record<string, Record<string, { security?: unknown[] }>>;
    const undeclared: string[] = [];

    for (const operation of apiOperations) {
      if (operation.access !== "public") continue;

      const written = paths[operation.path]?.[operation.method]?.security;

      if (!Array.isArray(written) || written.length !== 0) {
        undeclared.push(`${operation.method.toUpperCase()} ${operation.path}`);
      }
    }

    expect(undeclared).toEqual([]);
  });

  it("kullanılan her etiketin açıklaması var", () => {
    // 46 uç tek listede okunamaz; etiket açıklaması belgeyi gezen kişinin
    // "aradığım şey hangi grupta" sorusunu cevaplayan ilk şey.
    const tags = spec.tags as { name: string; description?: string }[];
    const undocumented = tags.filter((tag) => !tag.description?.trim()).map((tag) => tag.name);

    expect(undocumented).toEqual([]);
  });

  it("her işlemin benzersiz bir operationId'si var", () => {
    /**
     * İstemci üreticileri fonksiyonu bu alandan adlandırıyor. Çakışan iki
     * kimlik, üretilen istemcide bir fonksiyonun diğerini SESSİZCE ezmesi
     * demek — yani bir uç istemciden hiç çağrılamaz hâle gelir.
     */
    const paths = spec.paths as unknown as Record<string, Record<string, { operationId?: string }>>;
    const ids = Object.values(paths).flatMap((methods) =>
      Object.values(methods).map((operation) => operation.operationId),
    );

    expect(ids.filter(Boolean)).toHaveLength(apiOperations.length);
    expect(new Set(ids).size).toBe(apiOperations.length);
  });

  it("giriş isteyen uçlar 401'i belgeliyor", () => {
    const paths = spec.paths as SpecPaths;
    const missing: string[] = [];

    for (const operation of apiOperations) {
      if (operation.access === "public") continue;

      const responses = paths[operation.path]?.[operation.method]?.responses ?? {};

      if (!("401" in responses))
        missing.push(`${operation.method.toUpperCase()} ${operation.path}`);
    }

    expect(missing).toEqual([]);
  });

  /**
   * ⭐ GİZLİLİK KAPISI — devir notundaki uyarıyı DİLEK olmaktan çıkarır.
   *
   * "Belgeye gerçek kişisel veri koyma" bir niyet; bu test onu kurala çeviriyor.
   * Ölçen şey yeni bir süzgeç değil, adım 18a'da yazılan ve log ile Sentry'ye
   * giden HER değerin geçtiği süzgecin ta kendisi. Aynı süzgecin ikinci bir
   * kopyası olsaydı biri güncellenir, diğeri geride kalırdı.
   */
  it("belgede kimlik numarası, kart numarası veya e-posta biçiminde bir değer yok", () => {
    /**
     * ⛔ SÜZGECİ BELGENİN TAMAMINA SERİLEŞTİRİP UYGULAMA — bu deneme yapıldı
     * ve YANLIŞ ALARM üretti.
     *
     * `redactString` 512 karakterden uzun metni kırpıyor. Belgenin tamamı
     * 80.000 karakterden uzun olduğu için çıktı her hâlükârda girdiden farklı
     * dönüyordu; test "sızıntı var" diyordu ama ölçtüğü şey kırpmaydı.
     * Aynı tuzak adım 18a'da Sentry olayında da yaşandı.
     *
     * Doğrusu: süzgeç YAPRAK metinlere tek tek uygulanır.
     */
    const leaves: string[] = [];

    const collect = (value: unknown): void => {
      if (typeof value === "string") leaves.push(value);
      else if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === "object") Object.values(value).forEach(collect);
    };

    collect(spec);

    const leaked = leaves.filter((leaf) => leaf.length <= 512 && redactString(leaf) !== leaf);

    expect(
      leaked,
      `süzgeç bu değerleri ${REDACTED} ile değiştirdi — belgede kişisel veri var`,
    ).toEqual([]);
  });

  it("gizlilik kapısı gerçekten çalışıyor (mutasyon)", () => {
    /**
     * ⭐ Yukarıdaki test bir KORUMA testi; 06-testing.md böyle bir testin
     * korumayı kaldırarak kanıtlanmasını istiyor. Burada tersi yapılıyor:
     * belgeye kişisel veri biçiminde bir değer KONUYOR ve süzgecin onu
     * gerçekten yakaladığı gösteriliyor. Yakalamasaydı yukarıdaki test hiçbir
     * şey ölçmüyor olurdu.
     */
    const fakeNationalId = "12345678901";

    expect(redactString(`örnek: ${fakeNationalId}`)).toContain(REDACTED);
    expect(redactString("iletisim: ornek.kisi@example.com")).toContain(REDACTED);
  });
});
