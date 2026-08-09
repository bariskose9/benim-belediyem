import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/**
 * `external_data_cache` tablosuna erişen katman (ADR-015).
 *
 * ⛔ BU DOSYADA İŞ KURALI YOKTUR. "Kayıt taze mi", "bayat gösterilebilir mi"
 * sorularının cevabı `cached-external-data.ts` içinde; burada yalnızca sorgular
 * var.
 *
 * KİŞİSEL VERİ TUTULMAZ: buradaki her satır herkese açık, kişiselleştirilmemiş
 * bir sağlayıcı yanıtıdır (hava, kur, kripto, haber). Bu yüzden okuma yolunda
 * sahiplik kontrolü yok — ve olmamalı da.
 */

export type ExternalCacheEntry = {
  payload: unknown;
  fetchedAt: Date;
  expiresAt: Date;
};

export async function readCacheEntry(key: string): Promise<ExternalCacheEntry | null> {
  return prisma.externalDataCache.findUnique({
    where: { key },
    select: { payload: true, fetchedAt: true, expiresAt: true },
  });
}

/**
 * Kaydı yazar veya üzerine yazar.
 *
 * `upsert` TEK ATOMİK YAZMADIR ve bu bilinçli: "önce oku, yoksa yaz" iki adımdır
 * ve iki istek aynı anda ıskaladığında ikinci `create` benzersizlik ihlaliyle
 * patlardı. Burada kaybeden istek sessizce üzerine yazar — iki istek de aynı
 * sağlayıcıdan aynı veriyi getirdiği için hangisinin kazandığı önemsiz.
 */
export async function writeCacheEntry(entry: {
  key: string;
  payload: Prisma.InputJsonValue;
  fetchedAt: Date;
  expiresAt: Date;
}): Promise<void> {
  await prisma.externalDataCache.upsert({
    where: { key: entry.key },
    create: entry,
    update: { payload: entry.payload, fetchedAt: entry.fetchedAt, expiresAt: entry.expiresAt },
    select: { id: true },
  });
}

/**
 * Uzun süredir okunmayan satırları siler (data-model.md saklama süresi).
 * Kişisel veri olmadığı için bu bir gizlilik değil, çöp toplama işidir.
 */
export async function deleteExpiredCacheEntries(before: Date): Promise<number> {
  const result = await prisma.externalDataCache.deleteMany({
    where: { fetchedAt: { lt: before } },
  });

  return result.count;
}
