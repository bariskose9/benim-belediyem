import { APP_VERSION, BUILD_COMMIT, HEALTH_DB_TIMEOUT_MS } from "@/config/constants";
import { envLabel } from "@/config/env";
import { messages } from "@/config/messages";
import {
  healthResponseSchema,
  type HealthResponse,
} from "@/features/platform/schemas/health.schema";
import { prisma } from "@/lib/db";
import { ServiceUnavailableError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { logger } from "@/lib/logger";

/**
 * `GET /api/health` — uygulama + veritabanı sağlık ucu (CLAUDE.md §5.9).
 *
 * Yayın sonrası duman testinin ilk adımı budur: "yeni sürüm ayakta mı, hangi
 * commit çalışıyor, veritabanına ulaşabiliyor mu?" sorularını tek istekle cevaplar.
 */

// Önbelleğe alınırsa "sağlıklı" cevabı donar ve uç anlamını kaybeder.
export const dynamic = "force-dynamic";

/**
 * ⭐ TİP ARTIK ŞEMADAN GELİYOR (borç #107 · adım 107a).
 *
 * Elle yazılmış bir tipti; belge onu okuyamadığı için yanıt gövdesi belgede
 * yalnızca "şu alanlar var" diye Türkçe anlatılıyordu. Artık tek kaynak
 * `healthResponseSchema` ve aynı nesne hem burada hem kütükte kullanılıyor.
 */
export type HealthPayload = HealthResponse;

/**
 * Veritabanına en basit sorguyu atar.
 *
 * Zaman aşımı zorunlu: cevap vermeyen bir veritabanı sağlık ucunu askıda
 * bırakırsa izleme aracı "yavaş" ile "çökmüş" arasındaki farkı göremez
 * (docs/standards CLAUDE.md §5.9 → "dış çağrılarda timeout zorunlu").
 */
async function isDatabaseReachable(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("health db timeout")), HEALTH_DB_TIMEOUT_MS);
      }),
    ]);

    return true;
  } catch (error) {
    // Sessizce yutulmuyor: sunucu log'una yazılıyor, istemciye detay gitmiyor.
    logger.error("health_db_unreachable", { error });

    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const databaseReachable = await isDatabaseReachable();

  const common = {
    env: envLabel,
    version: APP_VERSION,
    commit: BUILD_COMMIT,
    timestamp: new Date().toISOString(),
  };

  if (!databaseReachable) {
    // Uygulama ayakta ama bağımlılığı düşük → 503.
    // `details` hangi parçanın düştüğünü söyler; iç detay (host, şifre) içermez.
    return fail(new ServiceUnavailableError(messages.errors.databaseUnavailable), {
      app: "ok",
      db: "down",
      ...common,
    });
  }

  const payload: HealthPayload = { status: "ok", app: "ok", db: "ok", ...common };

  return ok(payload, { noStore: true, schema: healthResponseSchema });
}
