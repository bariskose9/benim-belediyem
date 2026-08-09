/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { INFO_WIDGET_MAX_STALE_MS } from "@/config/constants";
import { deleteExpiredCacheEntries } from "@/features/info-widgets/repositories/external-cache.repository";
import { loadCachedExternalData } from "@/features/info-widgets/services/cached-external-data";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ═══ ADR-015'İN OKUMA YOLU ═══
 *  1. Taze kayıt varsa dış çağrı HİÇ yapılmaz
 *  2. Kayıt yoksa veya süresi geçmişse çağrılır ve yazılır
 *  3. Çağrı düşerse elde kalan eski kayıt BAYAT olarak sunulur
 *  4. Eski kayıt da çok eskiyse dürüstçe hata durumu döner
 *
 * GERÇEK PostgreSQL'e karşı yazıldı: `upsert`in gerçekten tek satır bıraktığı
 * ve JSON kolonuna yazılan şeklin aynen geri okunduğu ancak veritabanına
 * sorularak kanıtlanabilir. Taklit bir istemci ikisini de "evet" derdi.
 *
 * SAHTE SAAT: `now` dışarıdan veriliyor, bekleyerek test edilmiyor. `fetchedAt`
 * ve `expiresAt` kolonları da bizim yazdığımız değerler — veritabanının kendi
 * varsayılanına (`created_at`) bağlı değiller.
 */

const CACHE_KEY = testId("cache", "ornek");
const schema = z.object({ value: z.number() });

const NOW = new Date("2026-08-09T12:00:00.000Z");
const TTL_MS = 30 * 60_000;

/** Sağlayıcı yerine geçen, çağrılıp çağrılmadığı sayılabilen yükleyici. */
function loaderReturning(value: number) {
  return vi.fn(async () => ({ ok: true as const, data: { value } }));
}

const failingLoader = vi.fn(async () => ({ ok: false as const }));

async function seedEntry(options: {
  payload: unknown;
  fetchedAt: Date;
  expiresAt: Date;
}): Promise<void> {
  await prisma.externalDataCache.create({
    data: {
      id: testId("cache-row"),
      key: CACHE_KEY,
      payload: options.payload as never,
      fetchedAt: options.fetchedAt,
      expiresAt: options.expiresAt,
    },
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  await cleanupTestData();
});

afterEach(async () => {
  await cleanupTestData();
});

describe("dış veri önbelleği", () => {
  it("önbellek boşken sağlayıcıyı çağırır ve sonucu YAZAR", async () => {
    const load = loaderReturning(1);

    const result = await loadCachedExternalData({
      cacheKey: CACHE_KEY,
      ttlMs: TTL_MS,
      schema,
      load,
      now: NOW,
    });

    expect(result).toEqual({
      status: "ok",
      data: { value: 1 },
      fetchedAt: NOW,
      isStale: false,
    });
    expect(load).toHaveBeenCalledOnce();

    const row = await prisma.externalDataCache.findUnique({ where: { key: CACHE_KEY } });

    expect(row?.payload).toEqual({ value: 1 });
    expect(row?.expiresAt.toISOString()).toBe(new Date(NOW.getTime() + TTL_MS).toISOString());
  });

  it("TAZE KAYIT VARKEN SAĞLAYICIYI HİÇ ÇAĞIRMAZ", async () => {
    // Önbelleğin tek işi bu. Çağrı yine yapılsaydı ücretsiz servislerin
    // limitleri her ziyarette tüketilirdi (`integrations.md`).
    await seedEntry({
      payload: { value: 99 },
      fetchedAt: new Date(NOW.getTime() - 60_000),
      expiresAt: new Date(NOW.getTime() + 60_000),
    });

    const load = loaderReturning(1);

    const result = await loadCachedExternalData({
      cacheKey: CACHE_KEY,
      ttlMs: TTL_MS,
      schema,
      load,
      now: NOW,
    });

    expect(result.status === "ok" && result.data).toEqual({ value: 99 });
    expect(result.status === "ok" && result.isStale).toBe(false);
    expect(load).not.toHaveBeenCalled();
  });

  it("süresi geçmiş kaydı yeniler ve İKİNCİ SATIR AÇMAZ", async () => {
    await seedEntry({
      payload: { value: 99 },
      fetchedAt: new Date(NOW.getTime() - 2 * TTL_MS),
      expiresAt: new Date(NOW.getTime() - TTL_MS),
    });

    const result = await loadCachedExternalData({
      cacheKey: CACHE_KEY,
      ttlMs: TTL_MS,
      schema,
      load: loaderReturning(5),
      now: NOW,
    });

    expect(result.status === "ok" && result.data).toEqual({ value: 5 });

    // `upsert` tek atomik yazma: aynı anahtar için ikinci satır oluşmamalı.
    const rows = await prisma.externalDataCache.findMany({ where: { key: CACHE_KEY } });

    expect(rows).toHaveLength(1);
    expect(rows[0].payload).toEqual({ value: 5 });
  });

  it("SAĞLAYICI ÇÖKÜNCE ESKİ KAYDI BAYAT OLARAK SUNAR", async () => {
    const fetchedAt = new Date(NOW.getTime() - 2 * 60 * 60_000);

    await seedEntry({
      payload: { value: 42 },
      fetchedAt,
      expiresAt: new Date(NOW.getTime() - 60_000),
    });

    const result = await loadCachedExternalData({
      cacheKey: CACHE_KEY,
      ttlMs: TTL_MS,
      schema,
      load: failingLoader,
      now: NOW,
    });

    expect(result).toEqual({ status: "ok", data: { value: 42 }, fetchedAt, isStale: true });
    expect(failingLoader).toHaveBeenCalledOnce();

    // Bayat kayıt SİLİNMEZ: bir sonraki denemede de elde bir şey kalmalı.
    expect(await prisma.externalDataCache.count({ where: { key: CACHE_KEY } })).toBe(1);
  });

  it("çok eski kaydı bayat bile saymaz — dürüstçe hata döner", async () => {
    // Bir günden eski bir döviz kurunu "güncel" bölümünde göstermek yanıltıcı
    // olurdu (ADR-015 bedel 2).
    await seedEntry({
      payload: { value: 42 },
      fetchedAt: new Date(NOW.getTime() - INFO_WIDGET_MAX_STALE_MS - 60_000),
      expiresAt: new Date(NOW.getTime() - INFO_WIDGET_MAX_STALE_MS),
    });

    const result = await loadCachedExternalData({
      cacheKey: CACHE_KEY,
      ttlMs: TTL_MS,
      schema,
      load: failingLoader,
      now: NOW,
    });

    expect(result).toEqual({ status: "error" });
  });

  it("hiç kayıt yokken sağlayıcı çökerse hata durumu döner", async () => {
    const result = await loadCachedExternalData({
      cacheKey: CACHE_KEY,
      ttlMs: TTL_MS,
      schema,
      load: failingLoader,
      now: NOW,
    });

    expect(result).toEqual({ status: "error" });
  });

  it("ÖNCEKİ SÜRÜMÜN yazdığı geçersiz şekli yok sayıp yeniden çeker", async () => {
    /**
     * Satır bir önceki dağıtımın şekliyle kalmış olabilir. Doğrulanmadan
     * geçirilseydi ekran çizilirken patlardı; doğrulanınca kayıt yok sayılıyor.
     */
    await seedEntry({
      payload: { eskiAlan: "artık yok" },
      fetchedAt: new Date(NOW.getTime() - 60_000),
      expiresAt: new Date(NOW.getTime() + 60_000),
    });

    const load = loaderReturning(3);

    const result = await loadCachedExternalData({
      cacheKey: CACHE_KEY,
      ttlMs: TTL_MS,
      schema,
      load,
      now: NOW,
    });

    expect(result.status === "ok" && result.data).toEqual({ value: 3 });
    expect(load).toHaveBeenCalledOnce();
  });

  it("saklama süresi dolan satırları siler", async () => {
    await seedEntry({
      payload: { value: 1 },
      fetchedAt: new Date(NOW.getTime() - 8 * 24 * 60 * 60_000),
      expiresAt: new Date(NOW.getTime() - 7 * 24 * 60 * 60_000),
    });

    const deleted = await deleteExpiredCacheEntries(new Date(NOW.getTime() - 7 * 24 * 60 * 60_000));

    expect(deleted).toBe(1);
    expect(await prisma.externalDataCache.count({ where: { key: CACHE_KEY } })).toBe(0);
  });
});
