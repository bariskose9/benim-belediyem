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
      // docs/standards/05-auth-security.md: hata ayıklama çıktısı bırakılmaz.
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
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
