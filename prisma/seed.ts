/**
 * Sahte veri tohumlama (docs/standards/04-database.md · docs/project/fake-data-guide.md).
 *
 * KURAL: bu betik idempotent olmalı — tekrar çalıştırıldığında veri katlanmaz.
 * Bunu sağlamanın yolu `create` değil `upsert` kullanmak ve her kaydın sabit,
 * öngörülebilir bir anahtarı olması.
 *
 * Adım 2'de tablo olmadığı için henüz tohumlanacak veri yok. İskelet burada
 * duruyor ki `npm run setup` daha ilk günden eksiksiz çalışsın ve adım 3'te
 * yalnızca içi doldurulsun.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.js";

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
  // Adım 3: data-model.md'deki tablolar buraya, fake-data-guide.md kurallarıyla.
  // Tüm örnek veri açıkça sahtedir: uydurma isimler, test aralığında kart
  // numaraları, gerçek TCKN yok.
  console.warn("Seed: henüz tablo yok (roadmap adım 3'te dolacak).");
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
