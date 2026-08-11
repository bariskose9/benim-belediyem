import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { errorCatalog } from "@/features/api-docs/error-catalog";

/**
 * Hata kataloğunun kaynak koddan sapmadığını doğrular (adım 18b · ADR-019).
 *
 * ⭐ Katalog elle tutulan bir tablo. Elle tutulan her tablo saparsa yalan
 * söyler; bu test onu kaynağa bağlıyor: yeni bir hata sınıfı eklenip katalogda
 * unutulursa CI kırmızıya döner.
 */

const SRC_ROOT = join(process.cwd(), "src");

function walkErrorFiles(dir: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) found.push(...walkErrorFiles(full));
    else if (entry === "errors.ts") found.push(full);
  }

  return found;
}

/** Kaynaktaki `readonly code = "X"; readonly status = 4NN;` çiftlerini toplar. */
function scanErrorClasses(): Map<string, Set<number>> {
  const found = new Map<string, Set<number>>();

  for (const file of walkErrorFiles(SRC_ROOT)) {
    const source = readFileSync(file, "utf8");
    const pattern =
      /readonly\s+code\s*=\s*"([A-Z_]+)"\s*;\s*\n\s*readonly\s+status\s*=\s*(\d{3})\s*;/g;

    for (const [, code, status] of source.matchAll(pattern)) {
      if (!found.has(code)) found.set(code, new Set());
      found.get(code)?.add(Number(status));
    }
  }

  return found;
}

/**
 * ⛔ BUGÜN AYNI KODU İKİ FARKLI DURUMLA DÖNDÜREN ÜÇ SINIF ÇİFTİ VAR —
 * teknik borç #105.
 *
 * `03-api-guidelines.md` `code`'un "makine için sabit" olmasını istiyor;
 * aynı kodun bir akışta 402, başka bir akışta 409 dönmesi bunu bozuyor.
 * Durumu düzeltmek KIRICI bir değişiklik olduğu için bu adımda yapılmadı
 * (aynı anda tek modül + sözleşme ömrü kuralı).
 *
 * ⭐ LİSTE NEDEN VAR: mevcut üç tutarsızlığı kabul ediyor ama YENİSİNİ
 * engelliyor. Kapı olmadan sayı sessizce büyürdü.
 */
const KNOWN_INCONSISTENT_CODES = ["BOT_CHECK_FAILED", "INSUFFICIENT_FUNDS", "PAYMENT_DECLINED"];

describe("hata kataloğu kaynak koddan sapmıyor", () => {
  const scanned = scanErrorClasses();

  it("kaynaktaki her hata kodu katalogda var", () => {
    const missing = [...scanned.keys()].filter((code) => !(code in errorCatalog)).sort();

    expect(missing, "kaynakta tanımlı ama katalogda olmayan kodlar").toEqual([]);
  });

  it("katalogdaki her kod kaynakta gerçekten tanımlı", () => {
    const phantom = Object.keys(errorCatalog)
      .filter((code) => !scanned.has(code))
      .sort();

    expect(phantom, "katalogda yazılı ama kaynakta olmayan kodlar").toEqual([]);
  });

  it("her kodun durum kodları kaynaktakiyle birebir aynı", () => {
    const mismatched: string[] = [];

    for (const [code, statuses] of scanned) {
      const documented = [...(errorCatalog[code]?.statuses ?? [])].sort();
      const actual = [...statuses].sort();

      if (JSON.stringify(documented) !== JSON.stringify(actual)) {
        mismatched.push(`${code}: belge ${documented.join("/")} · kaynak ${actual.join("/")}`);
      }
    }

    expect(mismatched).toEqual([]);
  });

  it("bilinen üçü dışında hiçbir kod iki farklı durum kodu döndürmüyor", () => {
    const inconsistent = [...scanned.entries()]
      .filter(([code, statuses]) => statuses.size > 1 && !KNOWN_INCONSISTENT_CODES.includes(code))
      .map(([code, statuses]) => `${code}: ${[...statuses].sort().join(" / ")}`)
      .sort();

    expect(
      inconsistent,
      "YENİ bir sözleşme tutarsızlığı: aynı hata kodu iki farklı HTTP durumu dönüyor",
    ).toEqual([]);
  });

  it("her katalog girdisinin Türkçe açıklaması var", () => {
    const empty = Object.entries(errorCatalog)
      .filter(([, entry]) => entry.description.trim() === "")
      .map(([code]) => code);

    expect(empty).toEqual([]);
  });
});
