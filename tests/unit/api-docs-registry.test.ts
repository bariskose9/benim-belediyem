import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { errorCatalog } from "@/features/api-docs/error-catalog";
import { apiOperations, UNDOCUMENTED_PATH_PREFIXES } from "@/features/api-docs/registry";
import { toOpenApiPath } from "@/features/api-docs/services/openapi.service";

/**
 * ⭐ BU DOSYA BELGENİN KAPISI (adım 18b · ADR-019).
 *
 * Belgeyi üretmek kolay; ONU DOĞRU TUTMAK zor. Kapısı olmayan bir belge birkaç
 * ay içinde yanlış belgeye dönüşür — ve yanlış belge, belgesizlikten kötüdür:
 * okuyan kişi ona güvenip üzerine karar kurar.
 *
 * Buradaki testler kütüğü gerçek dosya sistemine bağlıyor. Yeni bir uç eklenip
 * belgelenmezse CI kırmızıya döner.
 */

const API_ROOT = join(process.cwd(), "src/app/api");

type RouteSignature = { path: string; method: string };

function walkRouteFiles(dir: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) found.push(...walkRouteFiles(full));
    else if (entry === "route.ts") found.push(full);
  }

  return found;
}

/** Dosya yolundan uç adresini çıkarır: `.../api/addresses/[addressId]/route.ts` → `/api/addresses/{addressId}`. */
function toApiPath(routeFile: string): string {
  const relative = routeFile.slice(routeFile.indexOf("/src/app/api")).replace("/src/app", "");

  return toOpenApiPath(relative.replace(/\/route\.ts$/, ""));
}

/** Dosyadaki `export async function GET` gibi satırlardan metotları okur. */
function readMethods(routeFile: string): string[] {
  const source = readFileSync(routeFile, "utf8");

  return [...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g)].map(
    (match) => match[1].toLowerCase(),
  );
}

/**
 * Route dosyasındaki her metodun GERÇEK kapısını okur.
 *
 * Dosya `export async function METHOD(` sınırlarından bölünüyor: aynı dosyada
 * farklı kapıları olan metotlar var (`PATCH` personel, `DELETE` herkes gibi),
 * dosyanın tamamında arama yapmak onları birbirine karıştırırdı.
 */
function readGuards(routeFile: string): Map<string, string | undefined> {
  const source = readFileSync(routeFile, "utf8");
  const guards = new Map<string, string | undefined>();

  const boundaries = [
    ...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g),
  ];

  boundaries.forEach((match, index) => {
    const start = match.index ?? 0;
    const end = boundaries[index + 1]?.index ?? source.length;
    const body = source.slice(start, end);
    const guard = body.match(/requireAccess\(\s*"(\w+)"\s*\)/);

    guards.set(match[1].toLowerCase(), guard?.[1]);
  });

  return guards;
}

function realSignatures(): RouteSignature[] {
  return walkRouteFiles(API_ROOT)
    .flatMap((file) => readMethods(file).map((method) => ({ path: toApiPath(file), method })))
    .filter(({ path }) => !UNDOCUMENTED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix)));
}

const key = ({ path, method }: RouteSignature) => `${method.toUpperCase()} ${path}`;

describe("API belgesi kütüğü gerçek uçlarla örtüşüyor", () => {
  it("var olan HER uç ve metot belgelenmiş", () => {
    const documented = new Set(apiOperations.map(key));
    const missing = realSignatures()
      .filter((signature) => !documented.has(key(signature)))
      .map(key)
      .sort();

    expect(missing, "belgelenmemiş uçlar — kütüğe ekleyin veya istisnayı yazın").toEqual([]);
  });

  it("kütükte var olmayan bir uç yazılı değil", () => {
    const real = new Set(realSignatures().map(key));
    const phantom = apiOperations
      .map(key)
      .filter((signature) => !real.has(signature))
      .sort();

    expect(
      phantom,
      "gerçekte olmayan uçlar belgelenmiş — silinen uç kütükte kalmış olabilir",
    ).toEqual([]);
  });

  it("aynı yol + metot ikilisi iki kez belgelenmemiş", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const operation of apiOperations) {
      const signature = key(operation);

      if (seen.has(signature)) duplicates.push(signature);
      seen.add(signature);
    }

    expect(duplicates).toEqual([]);
  });

  it("belgelenen her hata kodu kodda gerçekten tanımlı", () => {
    const unknown = apiOperations
      .flatMap((operation) => operation.errors)
      .filter((code) => !(code in errorCatalog))
      .sort();

    expect([...new Set(unknown)], "katalogda olmayan hata kodu belgelenmiş").toEqual([]);
  });

  /**
   * ⭐ BU TEST BİR MUTASYON DENEYİNDEN DOĞDU.
   *
   * Önce yalnızca "kütükte korumalı yazan uç, belgede de korumalı görünüyor mu"
   * ölçülüyordu. `/api/addresses` POST'unun erişim seviyesi deneme amaçlı
   * `authenticated` → `public` yapıldı ve **testlerin hepsi yeşil kaldı**:
   * testler kütüğün kendisiyle tutarlıydı ama GERÇEKLE bağı yoktu. Yani
   * yanlış etiketlenmiş bir uç, belgede "giriş gerekmez" diye görünebilirdi.
   *
   * Bu test etiketi route dosyasındaki gerçek `requireAccess` çağrısına
   * bağlıyor. 06-testing.md'nin dediği gibi: koruma testi, koruma bozularak
   * kanıtlanır.
   */
  it("belgelenen erişim seviyesi route dosyasındaki gerçek kapıyla aynı", () => {
    const mismatches: string[] = [];

    for (const file of walkRouteFiles(API_ROOT)) {
      const path = toApiPath(file);

      if (UNDOCUMENTED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) continue;

      for (const [method, actual] of readGuards(file)) {
        const documented = apiOperations.find(
          (o) => o.path === path && o.method === method,
        )?.access;

        if (documented === undefined) continue;

        /**
         * Cron ucu `requireAccess` çağırmıyor — oturum değil paylaşılan gizli
         * anahtar kullanıyor. Kapısız DEĞİL, farklı kapılı; bu yüzden
         * "kapı bulunamadı" ile eşleşmesi meşru.
         */
        const acceptable = actual ?? (documented === "cron" ? "cron" : "public");

        if (documented !== acceptable) {
          mismatches.push(
            `${method.toUpperCase()} ${path}: belge "${documented}" · kod "${acceptable}"`,
          );
        }
      }
    }

    expect(mismatches, "belgelenen erişim seviyesi koddaki kapıyla uyuşmuyor").toEqual([]);
  });

  it("her ucun Türkçe özeti ve başarı tarifi var", () => {
    const incomplete = apiOperations
      .filter(
        (operation) =>
          operation.summary.trim() === "" || operation.success.description.trim() === "",
      )
      .map(key);

    expect(incomplete).toEqual([]);
  });
});
