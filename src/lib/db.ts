import { PrismaPg } from "@prisma/adapter-pg";

import { publicEnv, serverEnv } from "@/config/env";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Uygulamanın TEK Prisma istemcisi.
 *
 * Prisma 7'de bağlantı adresi artık şemada durmuyor; çalışma anı bağlantısı
 * bir "driver adapter" ile veriliyor. `@prisma/adapter-pg` seçildi çünkü hem
 * local Docker Postgres'te hem Neon'da aynı kod yolunu çalıştırıyor
 * (ADR-008 · docs/standards/13-environments.md "aynı yapı her ortamda çalışır").
 *
 * Buradaki adres HAVUZLU olandır. Migration'lar havuzsuz adresi kullanır ve
 * onu `prisma.config.ts` tanımlar — havuzlayıcı DDL çalıştıramaz.
 *
 * Neden global: geliştirme sırasında Next.js modülleri sıcak yeniden yüklüyor;
 * her yeniden yüklemede yeni istemci oluşsa bağlantı havuzu dolar
 * ("too many connections"). Üretimde süreç bir kez başladığı için sorun olmaz.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: serverEnv.DATABASE_URL });

  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (publicEnv.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
