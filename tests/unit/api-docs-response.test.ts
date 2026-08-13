import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { z, type ZodType } from "zod";

import { apiOperations, RESPONSE_BODY_PENDING } from "@/features/api-docs/registry";
import { toOpenApiPath } from "@/features/api-docs/services/openapi.service";
import type { ApiOperation, SuccessResponse } from "@/features/api-docs/types";

/**
 * ⭐ YANIT SÖZLEŞMESİNİN KAPISI (borç #107 · adım 107a).
 *
 * `api-docs-registry.test.ts` ucun VAR OLDUĞUNU ve kapısını gerçeğe bağlıyor.
 * Bu dosya bir adım ötesini bağlıyor: ucun DÖNDÜRDÜĞÜ GÖVDEYİ.
 *
 * Bağ tek değil, üç ayrı yerde ve her biri farklı bir hatayı yakalıyor:
 *
 *  1. DERLEME ANI — `ok(data, { schema })` içindeki `ZodType<T>`. Ucun
 *     döndürdüğü tip ile şemanın ürettiği tip aynı olmak zorunda.
 *     Yakaladığı hata: yanıta alan eklenip şemanın unutulması.
 *  2. ÇALIŞMA ANI — `api-response-contract.ts`, `API_RESPONSE_CONTRACT_CHECK`
 *     açıkken telden geçen gövdeyi şemadan geçiriyor.
 *     Yakaladığı hata: `Date` alanının telde METİN olması gibi, derlemenin
 *     GÖREMEYECEĞİ biçim farkları.
 *  3. BU DOSYA — kütükteki şema ile route'un kullandığı şema AYNI MI.
 *     Yakaladığı hata: belge A şemasını gösterirken ucun B ile doğrulaması.
 *
 * ⚠️ 3. KAPININ SINIRI YAZILI: karşılaştırma kaynak METNİ üzerinden, nesne
 * kimliği üzerinden değil. Aynı adı taşıyan iki farklı şema import edilirse
 * kapı bunu göremez. Nesne kimliğiyle ölçmek route modülünü içeri almayı
 * gerektirirdi — o da `prisma` ve ortam doğrulamasını testin içine çekerdi.
 */

const API_ROOT = join(process.cwd(), "src/app/api");

const key = ({ path, method }: Pick<ApiOperation, "path" | "method">) =>
  `${method.toUpperCase()} ${path}`;

const withBody = apiOperations.filter((operation) => operation.success.status < 204);
const withoutBody = apiOperations.filter((operation) => operation.success.status >= 204);

/** Bir ucun TÜM başarı yanıtları — asıl olan ve varsa diğerleri (107b). */
const allSuccesses = (operation: ApiOperation): SuccessResponse[] => [
  operation.success,
  ...(operation.alternateSuccess ?? []),
];

function walkRouteFiles(dir: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) found.push(...walkRouteFiles(full));
    else if (entry === "route.ts") found.push(full);
  }

  return found;
}

function toApiPath(routeFile: string): string {
  const relative = routeFile.slice(routeFile.indexOf("/src/app/api")).replace("/src/app", "");

  return toOpenApiPath(relative.replace(/\/route\.ts$/, ""));
}

/**
 * Route dosyasındaki her metodun `ok`/`created` çağrılarına verdiği şema
 * adlarını okur.
 *
 * `api-docs-registry.test.ts`'teki `readGuards` ile aynı teknik: dosya
 * `export async function METHOD(` sınırlarından bölünüyor, çünkü aynı dosyada
 * farklı gövdeler döndüren metotlar var ve dosyanın tamamında arama yapmak
 * onları birbirine karıştırırdı.
 */
function readResponseSchemaNames(routeFile: string): Map<string, Set<string>> {
  const source = readFileSync(routeFile, "utf8");
  const byMethod = new Map<string, Set<string>>();

  const boundaries = [
    ...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g),
  ];

  boundaries.forEach((match, index) => {
    const start = match.index ?? 0;
    const end = boundaries[index + 1]?.index ?? source.length;
    const body = source.slice(start, end);
    const names = new Set<string>();

    // Yalnızca `ok(` / `created(` çağrılarının İÇİNDEKİ `schema:` sayılıyor;
    // route'lardaki `xSchema.safeParse(...)` çağrıları girdi tarafına ait.
    for (const call of body.matchAll(/\b(?:ok|created)\(/g)) {
      const window = body.slice(call.index ?? 0, (call.index ?? 0) + 400);
      const schema = window.match(/schema:\s*(\w+)/);

      if (schema) names.add(schema[1]);
    }

    byMethod.set(match[1].toLowerCase(), names);
  });

  return byMethod;
}

/** Kütük dosyalarından her ucun `body: { schema: X }` içindeki adı okur. */
function readRegistrySchemaNames(): Map<string, string> {
  const dir = join(process.cwd(), "src/features/api-docs/registry");
  const names = new Map<string, string>();

  for (const file of readdirSync(dir)) {
    if (file === "index.ts") continue;

    const source = readFileSync(join(dir, file), "utf8");
    const entries = [...source.matchAll(/^\s{4}path:\s*"([^"]+)"/gm)];

    entries.forEach((match, index) => {
      const start = match.index ?? 0;
      const end = entries[index + 1]?.index ?? source.length;
      const block = source.slice(start, end);
      const method = block.match(/method:\s*"(\w+)"/)?.[1];
      const schema = block.match(/body:\s*\{\s*schema:\s*(\w+)/);

      if (method && schema) names.set(`${method.toUpperCase()} ${match[1]}`, schema[1]);
    });
  }

  return names;
}

/** Kütükte `schema` beyan eden yanıtlar (dış sözleşmeye bırakılanlar hariç). */
function declaredSchemas(): { operation: ApiOperation; schema: ZodType }[] {
  return apiOperations.flatMap((operation) =>
    allSuccesses(operation).flatMap((success) => {
      const body = success.body;

      return body && "schema" in body ? [{ operation, schema: body.schema }] : [];
    }),
  );
}

/**
 * Şemayı karşılaştırılabilir hâle getirir — `additionalProperties` çıkarılır.
 *
 * ⭐ BU AYIKLAMA ÖLÇÜLEREK EKLENDİ, TAHMİNLE DEĞİL. Kapı ilk yazıldığında iki
 * şemayı ham hâlleriyle karşılaştırıyordu ve sağlıklı iki şemayı "dönüştürme
 * taşıyor" diye işaretledi. Tek fark şuydu: Zod `io: "output"` modunda
 * `additionalProperties: false` ekliyor, `io: "input"` modunda eklemiyor.
 *
 * ⚠️ BU FARK BAŞLI BAŞINA ÖNEMLİ ve `io: "input"` seçiminin ikinci gerekçesi:
 * `io: "output"` ile basılsaydı belge "yanıta fazladan alan KONULAMAZ" derdi.
 * Oysa `03-api-guidelines.md` yanıta alan eklemeyi açıkça KIRICI OLMAYAN
 * değişiklik sayıyor. Yani çıktı modu, projenin kendi uyumluluk kuralıyla
 * çelişen bir belge üretirdi.
 */
function comparableShape(schema: ZodType, io: "input" | "output"): unknown {
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);

    if (node === null || typeof node !== "object") return node;

    return Object.fromEntries(
      Object.entries(node as Record<string, unknown>)
        .filter(([field]) => field !== "additionalProperties")
        .map(([field, value]) => [field, strip(value)]),
    );
  };

  return strip(z.toJSONSchema(schema, { io }));
}

describe("yanıt gövdesinin şeması belgeleniyor", () => {
  it("gövdeli her uç ya şema beyan ediyor ya da kalan iş listesinde", () => {
    const pending = new Set(RESPONSE_BODY_PENDING);

    const undocumented = withBody
      .filter((operation) => !operation.success.body && !pending.has(key(operation)))
      .map(key)
      .sort();

    expect(
      undocumented,
      "gövdesi belgelenmemiş uç — `success.body` yazın (kalan iş listesine EKLEME YAPILAMAZ)",
    ).toEqual([]);
  });

  /**
   * ⛔ LİSTENİN YALNIZCA KÜÇÜLMESİNİ SAĞLAYAN TEST.
   *
   * Bu test olmasaydı liste bir kaçış kapısına dönüşürdü: yeni bir uç eklerken
   * şema yazmak yerine adı listeye eklemek yeterli olurdu ve borç hiç
   * kapanmazdı. Listede duran bir uç şema beyan ettiği anda adının listeden
   * DÜŞMESİ de zorunlu — yoksa sayaç gerçeği söylemez.
   */
  it("kalan iş listesi ne büyüyebilir ne de eskiyebilir", () => {
    const documented = new Set(apiOperations.map(key));
    const bodyless = new Set(withoutBody.map(key));
    const solved = new Set(withBody.filter((operation) => operation.success.body).map(key));

    const stale = RESPONSE_BODY_PENDING.filter((entry) => !documented.has(entry));
    const wrongKind = RESPONSE_BODY_PENDING.filter((entry) => bodyless.has(entry));
    const alreadyDone = RESPONSE_BODY_PENDING.filter((entry) => solved.has(entry));

    expect(stale, "listede artık var olmayan uç yazılı").toEqual([]);
    expect(wrongKind, "gövdesiz uç kalan iş listesinde — oraya girmemeli").toEqual([]);
    expect(alreadyDone, "şeması yazılmış uç hâlâ listede — listeden düşürün").toEqual([]);
  });

  it("gövdesiz uçlar (204/302/303) gövde şeması beyan etmiyor", () => {
    const wrong = withoutBody
      .filter((operation) => operation.success.body !== undefined)
      .map(key)
      .sort();

    expect(wrong, "gövdesiz yanıt için şema yazılmış — istemciyi yanıltır").toEqual([]);
  });

  /**
   * ⛔ `alternateSuccess` KOLAY BİR KAÇIŞ KAPISI OLAMAZ.
   *
   * İkinci bir başarı yanıtı eklemek, belgeleme yükümlülüğünü azaltmıyor:
   * gövdeli her yanıt şema beyan etmek zorunda ve iki yanıt aynı durum kodunu
   * taşıyamaz — taşısaydı OpenAPI'de biri diğerini sessizce ezerdi.
   */
  it("ikinci başarı yanıtları da şema beyan ediyor ve durum kodları benzersiz", () => {
    const missingSchema: string[] = [];
    const duplicateStatus: string[] = [];

    for (const operation of apiOperations) {
      const statuses = allSuccesses(operation).map((success) => success.status);

      if (new Set(statuses).size !== statuses.length) duplicateStatus.push(key(operation));

      for (const success of operation.alternateSuccess ?? []) {
        if (success.status < 204 && !success.body) {
          missingSchema.push(`${key(operation)} → ${success.status}`);
        }
      }
    }

    expect(missingSchema, "ikinci başarı yanıtı şemasız bırakılmış").toEqual([]);
    expect(duplicateStatus, "aynı durum kodu iki kez yazılmış — biri diğerini ezer").toEqual([]);
  });

  it("dış sözleşmeye bırakılan gövdenin gerekçesi yazılı", () => {
    const empty = withBody
      .filter((operation) => {
        const body = operation.success.body;

        return body && "externalContract" in body && body.externalContract.trim() === "";
      })
      .map(key);

    expect(empty, "dış sözleşme gerekçesiz bırakılmış").toEqual([]);
  });

  /**
   * ⚠️ YANIT ŞEMASI `.transform()` TAŞIYAMAZ.
   *
   * Belge şemayı `io: "input"` ile basıyor (`openapi.service.ts`) ve çalışma
   * anı kontrolü de gövdeyi şemanın GİRDİSİ olarak doğruluyor. Şemada bir
   * dönüştürme olsaydı girdi ile çıktı ayrışırdı; belge birini, tip diğerini
   * gösterirdi ve fark hiçbir yerde görünmezdi.
   */
  it("yanıt şemalarında dönüştürme yok — girdi ve çıktı biçimi aynı", () => {
    const transforming = declaredSchemas()
      .filter(({ schema }) => {
        const asInput = JSON.stringify(comparableShape(schema, "input"));
        const asOutput = JSON.stringify(comparableShape(schema, "output"));

        return asInput !== asOutput;
      })
      .map(({ operation }) => key(operation));

    expect(transforming, "yanıt şeması `.transform()` taşıyor — girdi ve çıktı ayrışıyor").toEqual(
      [],
    );
  });

  /**
   * ⭐ ASIL KAPI: BELGENİN GÖSTERDİĞİ ŞEMA, UCUN KULLANDIĞI ŞEMA MI.
   *
   * Kütüğe doğru şemayı yazıp route'ta başkasını kullanmak (ya da hiç
   * kullanmamak) mümkün olsaydı, çalışma anı kontrolü yeşil kalırken belge
   * yanlış olurdu — ADR-019'un "sapan ikinci kaynak" endişesinin tam kendisi.
   */
  it("route, kütükte yazan şemanın AYNISINI kullanıyor", () => {
    const registry = readRegistrySchemaNames();
    const mismatches: string[] = [];

    for (const file of walkRouteFiles(API_ROOT)) {
      const path = toApiPath(file);

      for (const [method, used] of readResponseSchemaNames(file)) {
        const signature = `${method.toUpperCase()} ${path}`;
        const documented = registry.get(signature);

        if (documented === undefined) continue;

        if (!used.has(documented)) {
          mismatches.push(
            `${signature}: belge "${documented}" · route ${
              used.size === 0 ? "hiç şema vermiyor" : `"${[...used].join(", ")}"`
            }`,
          );
        }
      }
    }

    expect(mismatches.sort(), "kütükteki şema ile route'un kullandığı şema farklı").toEqual([]);
  });

  it("şema beyan eden her uç kütükte gerçekten okunabiliyor", () => {
    /**
     * Yukarıdaki metin tabanlı kapı, bir uç kütükte okunamazsa SESSİZCE
     * atlardı. Bu test okunabilirliği ayrıca ölçüyor: kütük biçimi değişip
     * düzenli ifade tutmaz olursa kapı çalışmıyor demektir ve bunu bilmek
     * gerekir (kapısız kapı, kapısızlıktan kötüdür).
     */
    const registry = readRegistrySchemaNames();
    const unreadable = declaredSchemas()
      .map(({ operation }) => key(operation))
      .filter((signature) => !registry.has(signature));

    expect(unreadable, "kütükten şema adı okunamadı — kapı bu uçta çalışmıyor").toEqual([]);
  });
});
