import { envLabel } from "@/config/env";
import { APP_VERSION, BUILD_COMMIT } from "@/config/constants";
import { ok } from "@/lib/http";

/**
 * `GET /api/health` — uygulama sağlık ucu (docs/standards CLAUDE.md §5.9).
 *
 * Yayın sonrası duman testinin ilk adımı budur: "yeni sürüm gerçekten ayakta mı
 * ve hangi commit çalışıyor?" sorusuna tek istekle cevap verir.
 *
 * Veritabanı kontrolü adım 2'de (Prisma kurulunca) buraya eklenecek.
 */

// Önbelleğe alınırsa "sağlıklı" cevabı donar ve uç anlamını kaybeder.
export const dynamic = "force-dynamic";

export type HealthPayload = {
  status: "ok";
  env: string;
  version: string;
  commit: string;
  timestamp: string;
};

export function GET() {
  const payload: HealthPayload = {
    status: "ok",
    env: envLabel,
    version: APP_VERSION,
    commit: BUILD_COMMIT,
    timestamp: new Date().toISOString(),
  };

  return ok(payload, { noStore: true });
}
