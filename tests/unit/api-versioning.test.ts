import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { GOOGLE_CALLBACK_PATH } from "@/config/constants";

/**
 * ⭐ BU DOSYA SÜRÜMLEMENİN KAPISI (ADR-020 · borç #103).
 *
 * Karar şu: iş uçları `/api/v1/` altında yaşar, adresi bizim DIŞIMIZDA biri
 * tarafından sabitlenmiş beş uç ise sürümsüz kalır.
 *
 * Kapı olmadan bu karar bir dilekti: yeni bir uç `/api/` altına açıldığında
 * hiçbir şey kırılmaz, kimse fark etmez ve mobil uygulama bir gün sürümsüz bir
 * adrese bağlanır. Asıl bedel o gün ödenir — telefondaki sürümü geri alamayız.
 */

const API_ROOT = join(process.cwd(), "src/app/api");
const PROJECT_ROOT = process.cwd();

/**
 * Sürümsüz kalmasına İZİN VERİLEN uçlar — istisna listesi ADR-020 Karar 2.
 *
 * ⛔ Bu listeye ekleme yapmak bilinçli bir karardır. Ölçüt tek cümle:
 * "adresini bizim dışımızda biri sabitlemiş mi?" Cevap hayırsa uç `/api/v1/`
 * altına gider; buraya "şimdilik" hiçbir şey eklenmez.
 */
const UNVERSIONED_ENDPOINTS = [
  "/api/health",
  "/api/cron/daily",
  "/api/docs",
  "/api/auth/google/callback",
  "/api/mock-kps/identity-queries",
] as const;

function walkRouteFiles(dir: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) found.push(...walkRouteFiles(full));
    else if (entry === "route.ts") found.push(full);
  }

  return found;
}

/** `.../src/app/api/v1/addresses/route.ts` → `/api/v1/addresses` */
function toApiPath(routeFile: string): string {
  return routeFile
    .slice(routeFile.indexOf("/src/app/api"))
    .replace("/src/app", "")
    .replace(/\/route\.ts$/, "");
}

const allRoutePaths = walkRouteFiles(API_ROOT).map(toApiPath).sort();

describe("API sürümleme — iş uçları /api/v1/ altında yaşar", () => {
  it("sürümsüz kalan her uç istisna listesinde yazılıdır", () => {
    const unversioned = allRoutePaths.filter((path) => !path.startsWith("/api/v1/"));

    expect(unversioned).toEqual([...UNVERSIONED_ENDPOINTS].sort());
  });

  it("istisna listesinde HAYALET uç yoktur — her satırın karşılığı diskte var", () => {
    for (const endpoint of UNVERSIONED_ENDPOINTS) {
      expect(allRoutePaths, `${endpoint} istisna listesinde ama böyle bir uç yok`).toContain(
        endpoint,
      );
    }
  });

  it("iş ucu sayısı sürümlü tarafta toplanır", () => {
    const versioned = allRoutePaths.filter((path) => path.startsWith("/api/v1/"));

    // Sayı değil oran önemli: uçların ezici çoğunluğu sözleşmenin parçası.
    expect(versioned.length).toBeGreaterThan(UNVERSIONED_ENDPOINTS.length * 3);
  });
});

/**
 * ⭐ İSTİSNALARIN GEREKÇESİ DIŞ DÜNYADA — testi oraya BAĞLA.
 *
 * "Bu uç sürümsüz çünkü adresi panelde kayıtlı" cümlesi doğrulanmadığı sürece
 * bir iddiadır (11-agent-workflow.md). Aşağıdaki iki test o iddiayı, adresi
 * fiilen sabitleyen kaydın kendisine bağlıyor: biri `vercel.json`'a, diğeri
 * Google'a gönderdiğimiz `redirect_uri`'yi üreten sabite.
 */
describe("API sürümleme — istisnaların gerekçesi dış kayda bağlı", () => {
  it("cron ucunun adresi vercel.json'daki yolla AYNI", () => {
    const vercelConfig: { crons?: { path: string }[] } = JSON.parse(
      readFileSync(join(PROJECT_ROOT, "vercel.json"), "utf8"),
    );
    const cronPaths = (vercelConfig.crons ?? []).map((cron) => cron.path);

    expect(cronPaths).not.toHaveLength(0);

    for (const path of cronPaths) {
      // Yol `/api/v1/` altına taşınırsa görev SESSİZCE hiç çalışmaz — hata üretmez.
      expect(allRoutePaths, `vercel.json ${path} diyor ama böyle bir uç yok`).toContain(path);
      expect(UNVERSIONED_ENDPOINTS).toContain(path);
    }
  });

  it("Google'a bildirilen callback adresi sürümsüz uçlardan biri", () => {
    // Taşınırsa canlı Google girişi `redirect_uri_mismatch` ile kırılır ve
    // düzeltmesi kodda değil Google Cloud panelindedir.
    expect(allRoutePaths).toContain(GOOGLE_CALLBACK_PATH);
    expect(UNVERSIONED_ENDPOINTS).toContain(GOOGLE_CALLBACK_PATH);
  });
});
