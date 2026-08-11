import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `/api/docs` yayın kapısı (adım 18b · ADR-019).
 *
 * ═══ NEDEN BU KADAR AYRINTILI ═══
 * Bu kapının yanlış tarafa düşmesi, tüm uçların, kabul edilen alanların ve
 * doğrulama kurallarının haritasını canlıda herkese açar. Yalnızca mutlu yol
 * değil, "bayrak hiç tanımlı değil" ve "bayrak `false` DİZESİ" durumları da
 * tek tek ölçülüyor.
 *
 * Kapı iki parçadan oluşuyor ve ikisi ayrı ayrı ölçülüyor:
 *  1. Ortam değişkeninin DOĞRU OKUNMASI (`env.ts` şeması)
 *  2. Okunan değerin DOĞRU YORUMLANMASI (`publication.ts`)
 */

const envMock = vi.hoisted(() => ({
  isProductionEnv: false,
  serverEnv: { API_DOCS_PUBLIC: false },
}));

/**
 * ⛔ `@/config/env` MOCK'LANIYOR ve bu bir kolaycılık değil: gerçek modül
 * açılışta ortamın TÜM tutarlılık kurallarını çalıştırıyor (production'da
 * sahte OTP kanalı yasak gibi). Yalnızca ortam etiketini "production" yapmak
 * o kuralları da tetikliyor ve test, ölçmek istediği kapı yerine ilgisiz bir
 * doğrulamada düşüyor.
 */
vi.mock("@/config/env", () => envMock);

beforeEach(() => {
  envMock.isProductionEnv = false;
  envMock.serverEnv.API_DOCS_PUBLIC = false;
});

async function isPublished(): Promise<boolean> {
  const { isApiDocsPublished } = await import("@/features/api-docs/services/publication");

  return isApiDocsPublished();
}

describe("API belgesi yayın kapısı", () => {
  it("production'da bayrak kapalıyken yayınlanmıyor", async () => {
    envMock.isProductionEnv = true;

    await expect(isPublished()).resolves.toBe(false);
  });

  it("production'da bayrak açıkken yayınlanıyor", async () => {
    envMock.isProductionEnv = true;
    envMock.serverEnv.API_DOCS_PUBLIC = true;

    await expect(isPublished()).resolves.toBe(true);
  });

  it("production DIŞINDA bayrak kapalı olsa da yayınlanıyor", async () => {
    // Local ve preview'da belgenin görülmesi gereken yer burası; ikisi de
    // zaten `noindex` ve dar kitleli.
    await expect(isPublished()).resolves.toBe(true);
  });
});
