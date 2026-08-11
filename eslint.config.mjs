import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // docs/standards/02-coding-standards.md: "`any` yasak".
      // next/typescript bunu "warn" veriyor; uyarı commit'i durdurmadığı için error'a çekildi.
      "@typescript-eslint/no-explicit-any": "error",
      // Kullanılmayan kod bırakılmaz; "_" öneki bilinçli göz ardı işaretidir.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      /**
       * docs/standards/12-operations-and-scaling.md: log YAPILANDIRILMIŞ olur.
       *
       * ⛔ ÖNCEDEN `warn` ve `error` SERBESTTİ — ve tam olarak bu yüzden kodda
       * 35 ayrı düz metin `console.error` birikmişti (adım 18a'da ölçüldü).
       * Serbest bırakılan bir istisna, kuralın kendisini geçersiz kılıyordu:
       * o satırlar süzgeçten geçmiyor, JSON değil ve Sentry'ye ulaşmıyordu.
       *
       * Artık tek kapı `@/lib/logger`. Kişisel veri süzgeci (`redact`) ve hata
       * takibine iletim orada; console'a yazan başka bir satır ikisini de
       * atlar. Muafiyet aşağıda, yalnızca logger'ın kendisine verildi.
       */
      "no-console": "error",
    },
  },
  {
    /**
     * Projedeki TEK izinli console kullanımı: stdout'a yazan katmanın kendisi.
     * Dosya içinde ayrıca satır bazlı `eslint-disable` yorumları da var —
     * buradaki muafiyet kaldırılırsa onlar tek tek görünür hale gelir.
     */
    files: ["src/lib/logger.ts"],
    rules: { "no-console": "off" },
  },
  {
    /**
     * Tohumlama betiği ve testler uygulama kodu DEĞİL.
     *
     * `prisma/seed.ts` bir komut satırı aracı: ilerlemeyi terminale yazması
     * beklenen davranış, `logger`'ın JSON satırları orada okunmaz hale gelirdi.
     * Testler ise `console`'u yalnızca CASUSLAMAK için anıyor (`vi.spyOn`) —
     * log katmanının gerçekten yazdığını doğrulamanın tek yolu bu.
     */
    files: ["prisma/**/*.ts", "tests/**/*.ts", "tests/**/*.tsx"],
    rules: { "no-console": "off" },
  },
  // Prettier ile çakışan biçim kurallarını kapatır — en sonda olmalı.
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
