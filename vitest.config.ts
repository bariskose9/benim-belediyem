import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // tsconfig.json'daki "@/*" takma adını Vite kendisi çözer;
  // ayrı bir eklenti (vite-tsconfig-paths) gerekmiyor.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    // E2E ayrı araçla (Playwright) çalışır, buraya karışmaz.
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
    // src/config/env.ts içe aktarıldığı anda doğrulama yaptığı için
    // testlerin de geçerli bir ortam görmesi gerekiyor.
    env: {
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_ENV_LABEL: "local",
      // Unit/entegrasyon testleri gerçek veritabanına bağlanmaz (Prisma taklit
      // ediliyor), ama env doğrulaması bu değişkenleri zorunlu kıldığı için
      // geçerli biçimde bir değer bulunmalı.
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      DIRECT_URL: "postgresql://test:test@localhost:5432/test",
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/components/ui/**"],
    },
  },
});
