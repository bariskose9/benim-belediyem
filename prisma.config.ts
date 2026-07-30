// Prisma 7 yapılandırması. Prisma 7'de `package.json` içindeki "prisma" anahtarı
// artık okunmuyor; şema yolu ve seed komutu buradan tanımlanır.
// https://www.prisma.io/docs/orm/reference/prisma-config-reference
//
// `dotenv/config` gerekli: Prisma 7 CLI `.env` dosyasını kendiliğinden yüklemiyor.
// (Next.js kendi çalışma anında `.env`'i zaten yüklüyor; bu satır yalnızca CLI için.)
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Buradaki adres YALNIZCA Prisma CLI'ın (migrate, db push, studio) kullandığı
    // adrestir; uygulamanın çalışma anı bağlantısı `src/lib/db.ts` içindeki
    // driver adapter üzerinden kurulur (ADR-008).
    //
    // Bilerek DIRECT_URL: havuzlayıcı (Neon pooler / PgBouncer) migration
    // çalıştıramaz — DDL için havuzsuz doğrudan bağlantı gerekir.
    //
    // Bilerek `env()` DEĞİL, doğrudan `process.env`: Prisma'nın `env()` yardımcısı
    // değişkeni yapılandırma yüklenirken zorunlu kılıyor ve `prisma generate`
    // (veritabanına hiç bağlanmayan bir komut) bu yüzden başarısız oluyor.
    // Bu, Docker imajı derlenirken ve Vercel'in postinstall adımında patlıyordu.
    // Eksik değişken zaten `src/config/env.ts` tarafından açılışta yakalanıyor.
    url: process.env.DIRECT_URL,
  },
});
