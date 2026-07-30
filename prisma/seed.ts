/**
 * Sahte veri tohumlama — ÇALIŞTIRICI
 * (docs/standards/04-database.md · docs/project/fake-data-guide.md).
 *
 * Bu dosya yalnızca bağlantıyı kurar ve `seedAll()` çağırır. Asıl iş
 * `prisma/seed/` altındadır; böylece aynı fonksiyonu testler de çağırabilir
 * (tests/db/seed-idempotency.test.ts) ve tek dosya 300 satırı geçmez.
 *
 * KURAL: idempotent — tekrar çalıştırıldığında veri katlanmaz.
 * Tüm örnek veri açıkça sahtedir: uydurma isimler, test aralığında kart
 * numaraları, sentetik kimlik numaraları. Tek istisna, ortam değişkenlerinden
 * okunan proje sahibi kaydıdır (PRD §5.0) — o değerler depoya hiç yazılmaz.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.js";
import { seedAll } from "./seed/index.js";

// Tohumlama toplu yazma yapar; havuzlayıcı üzerinden değil doğrudan bağlanır
// (ADR-008). Prisma 7'de istemci adapter olmadan oluşturulamaz.
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Tohumlama için DIRECT_URL (veya DATABASE_URL) gerekli.\n" +
      "Yapılacak: .env.example dosyasını .env olarak kopyalayıp değeri doldurun.",
  );
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main(): Promise<void> {
  const startedAt = Date.now();
  // `console.warn`: proje `console.log`'u yasaklıyor (hata ayıklama çıktısı
  // bırakılmasın diye), ama tohumlamanın ne yaptığını görmek gerekiyor.
  const summary = await seedAll(prisma, { log: (message) => console.warn(`  · ${message}`) });

  console.warn("\nTohumlama özeti:");
  for (const [table, value] of Object.entries(summary)) {
    console.warn(`  ${table.padEnd(20)} ${value}`);
  }
  console.warn(`\nTamamlandı (${((Date.now() - startedAt) / 1000).toFixed(1)} sn).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    // Hata sessizce yutulmuyor: çıkış kodu 1 olmalı ki `npm run setup` kırmızı olsun.
    console.error("Seed başarısız:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
