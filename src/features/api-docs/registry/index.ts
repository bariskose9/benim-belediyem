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

/**
 * ⏳ GÖVDE ŞEMASI HENÜZ YAZILMAMIŞ UÇLAR — borç #107'nin KALAN İŞ SAYACI.
 *
 * ⭐ NEDEN BÖYLE BİR LİSTE VAR. Borç #107 gövdeli 29 uca dokunmayı gerektiriyor;
 * hepsini tek adımda yapmak CLAUDE.md §7'nin "aynı anda birden fazla feature'a
 * dokunma" kuralını çiğnerdi. İş 107a-d olarak bölündü ve `main` her adımda
 * yeşil, deploy edilebilir kalıyor (CLAUDE.md §6.1).
 *
 * ⛔ BU LİSTE "SONRA YAPARIZ" NOTU DEĞİL, ÜÇ SEBEPLE:
 *  1. CI onu okuyor: listede olmayan gövdeli bir uç şema beyan etmek ZORUNDA
 *  2. Liste YALNIZCA KÜÇÜLEBİLİR — yeni bir uç buraya eklenemez
 *     (`tests/unit/api-docs-response.test.ts` bunu ölçüyor)
 *  3. Kalan iş belgede de GÖRÜNÜYOR: bu uçların yanıtında "şeması henüz
 *     belgelenmedi" uyarısı basılıyor, sessizce eksik kalmıyor
 *
 * 107d bittiğinde liste boşalır ve bu sabit tamamen silinir.
 */
export const RESPONSE_BODY_PENDING: readonly string[] = [
  // 107b — kimlik doğrulama ve hesap
  "GET /api/v1/account/export",
  "GET /api/v1/registrations/current",
  "PATCH /api/v1/registrations/current",
  "POST /api/v1/identity-verifications",
  "POST /api/v1/password-resets",
  "POST /api/v1/password-resets/current/otp-challenges",
  "POST /api/v1/registrations",
  "POST /api/v1/registrations/current/otp-challenges",
  "POST /api/v1/registrations/current/verifications",
  "POST /api/v1/sessions",
  "POST /api/v1/staff-verifications",
  "POST /api/v1/staff-verifications/confirmations",
  "PUT /api/v1/password-resets/current/password",

  // 107c — sepet, ödeme, üyelik
  "DELETE /api/v1/carts/current/items/{itemId}",
  "DELETE /api/v1/memberships/{membershipId}",
  "PATCH /api/v1/carts/current/items/{itemId}",
  "PATCH /api/v1/memberships/{membershipId}",
  "POST /api/v1/carts/current/items",
  "POST /api/v1/memberships",
  "POST /api/v1/payments",

  // 107d — profil ve hizmetler
  "GET /api/v1/support-tickets/{ticketId}/attachments/{attachmentId}",
  "PATCH /api/v1/notifications",
  "POST /api/v1/addresses",
  "POST /api/v1/appointments",
  "POST /api/v1/events/{eventId}/seat-holds",
  "POST /api/v1/support-tickets",
] as const;
