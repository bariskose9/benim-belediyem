import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Testler birbirinden bağımsız olmalı (docs/standards/06-testing.md):
// her testten sonra DOM ve ortam değişkeni taklitleri temizlenir.
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
});
