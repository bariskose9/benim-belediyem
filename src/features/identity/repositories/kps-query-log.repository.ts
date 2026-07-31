import type { KpsQueryResult } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * KPS sorgu denetim kaydı (05-auth-security.md → "her sorgu denetim kaydına
 * yazılır — SORGULANAN NUMARA YAZILMADAN").
 *
 * Bu dosyanın girdisinde kimlik numarası ALANI YOKTUR ve olmamalıdır. Tablonun
 * kendisinde de böyle bir kolon yok (data-model.md): olmayan kolona yanlışlıkla
 * yazılamaz. İki katman aynı kuralı iki farklı yerde zorluyor — biri unutulsa
 * diğeri tutar.
 */

export type RecordKpsQueryInput = {
  /** IP'nin geri döndürülemez özeti — düz IP hiçbir yerde saklanmaz (ADR-006). */
  actorIpHash: string;
  /** Oturum kimliği; oturum katmanı adım 4b'de gelene kadar boş kalır. */
  sessionId?: string;
  result: KpsQueryResult;
  /**
   * Dış servise gidip gelmenin GERÇEK süresi — numara taraması koruması için
   * eklenen sabitleme dolgusu hariç. Amaç KPS'in ne kadar yavaşladığını
   * görebilmek; dolgu dahil edilseydi her kayıt aynı sayıyı gösterir ve
   * ölçüm değerini tamamen yitirirdi (12-operations-and-scaling.md: önce ölç).
   */
  durationMs: number;
};

export async function recordKpsQuery(input: RecordKpsQueryInput): Promise<void> {
  await prisma.kpsQueryLog.create({
    data: {
      actorIpHash: input.actorIpHash,
      sessionId: input.sessionId ?? null,
      result: input.result,
      durationMs: input.durationMs,
    },
  });
}
