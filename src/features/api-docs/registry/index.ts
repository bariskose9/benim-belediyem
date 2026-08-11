import { accountOperations } from "@/features/api-docs/registry/account";
import { authOperations } from "@/features/api-docs/registry/auth";
import { commerceOperations } from "@/features/api-docs/registry/commerce";
import { platformOperations } from "@/features/api-docs/registry/platform";
import { profileOperations } from "@/features/api-docs/registry/profile";
import { serviceOperations } from "@/features/api-docs/registry/services";
import type { ApiOperation } from "@/features/api-docs/types";

/**
 * Belgelenen tüm uçlar (adım 18b · ADR-019).
 *
 * Kütük özellik başına ayrı dosyalara bölündü: tek dosyada 46 uç 300 satır
 * sınırını aşardı (01-architecture.md).
 *
 * ⛔ BELGELENMEYEN TEK UÇ AİLESİ `/api/mock-kps/*` — taklit edilen dış kurum
 * servisi (ADR-009). Bu istisna `03-api-guidelines.md` içinde yazılı ve
 * yalnızca dış kurum taklidi için geçerli; uygulamanın kendi uçlarına
 * genişletilemez. Sapma testi bu tek istisnayı tanıyor.
 */
export const apiOperations: ApiOperation[] = [
  ...platformOperations,
  ...authOperations,
  ...accountOperations,
  ...profileOperations,
  ...commerceOperations,
  ...serviceOperations,
];

/** Belgelenmeyen uç önekleri — sapma testi bunları dışarıda bırakır. */
export const UNDOCUMENTED_PATH_PREFIXES = ["/api/mock-kps"] as const;
