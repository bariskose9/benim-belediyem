import { defineConfig } from "vitest/config";

/**
 * GERÇEK veritabanına bağlanan testler (`tests/db`).
 *
 * NEDEN AYRI YAPILANDIRMA: `vitest.config.ts` altındaki unit ve entegrasyon
 * testleri Prisma'yı taklit eder, jsdom içinde koşar ve saniyeler sürer —
 * ayakta bir PostgreSQL istemezler. Benzersiz index'in çalıştığı ise ancak
 * veritabanına sorularak kanıtlanabilir. İkisini aynı komuta koymak, hızlı
 * geri bildirim döngüsünü veritabanı kurulumuna bağımlı kılardı.
 *
 * Çalıştırma: `npm run test:db` (öncesinde `npm run db:up` + `db:migrate`).
 * CI'da e2e iş akışında koşar; oradaki PostgreSQL servisi zaten ayaktadır.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // Node ortamı: tarayıcı taklidi (jsdom) burada yalnızca yavaşlatırdı.
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    // Testler aynı veritabanını paylaşır; paralel dosyalar birbirinin
    // kayıtlarını silerdi. Sıralı koşmak burada doğruluk şartıdır.
    fileParallelism: false,
    // Tohumlama on binlerce satır yazıyor; varsayılan 5 sn yetmez.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
