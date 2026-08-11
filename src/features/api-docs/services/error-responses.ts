import { errorCatalog } from "@/features/api-docs/error-catalog";
import type { ApiOperation, OperationAccess } from "@/features/api-docs/types";

/**
 * Hata yanıtlarının OpenAPI karşılığını üretir (adım 18b · ADR-019).
 *
 * `openapi.service.ts` 300 satır sınırını aştığı için buraya ayrıldı
 * (01-architecture.md). Sınır bir tören değil: hata yanıtı üretimi belgenin en
 * çok kural taşıyan parçası ve tek başına okunabilmesi gerekiyor.
 */

/**
 * Kapının otomatik ürettiği hata kodları.
 *
 * ⭐ NEDEN KÜTÜKTE ELLE YAZILMIYOR: `requireAccess` her korumalı uçta AYNI iki
 * hatayı fırlatıyor. Elle yazılsaydı 40 yerde tekrarlanır ve biri unutulduğunda
 * belge sessizce eksik kalırdı. Kural tek yerde duruyor.
 */
export function accessErrors(access: OperationAccess): string[] {
  switch (access) {
    case "public":
      return [];
    // Cron ucu oturum değil paylaşılan gizli anahtar kullanıyor; eşleşmezse 401.
    case "cron":
      return ["UNAUTHORIZED"];
    case "authenticated":
      return ["UNAUTHORIZED"];
    // Kimlik ve personel kapıları giriş yapmış ama yetkisiz kullanıcıyı 403'le eler.
    case "identity_verified":
    case "staff":
      return ["UNAUTHORIZED", "FORBIDDEN"];
  }
}

export function collectErrorCodes(operation: ApiOperation): string[] {
  const codes = new Set<string>([...accessErrors(operation.access), ...operation.errors]);

  // Girdi alan her uç doğrulama hatası dönebilir; bu da tek yerden ekleniyor.
  if (operation.requestBody || operation.pathParams || operation.query) {
    codes.add("VALIDATION_ERROR");
  }

  if (operation.rateLimited) codes.add("RATE_LIMITED");

  // Beklenmeyen hata her uçta mümkün — belgede görünmezse istemci onu hiç
  // ele almayabilir.
  codes.add("INTERNAL_ERROR");

  return [...codes].sort();
}

/** Tek tip hata gövdesi (`03-api-guidelines.md`) — bir kez tanımlanıp `$ref` ile kullanılıyor. */
export const errorResponseSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: { type: "string", description: "Makine için sabit ve İngilizce." },
        message: { type: "string", description: "Kullanıcıya gösterilecek Türkçe metin." },
        details: {
          description: "İsteğe bağlı ek bilgi. Stack trace, SQL veya dosya yolu ASLA içermez.",
        },
      },
    },
  },
} as const;

export function buildErrorResponses(operation: ApiOperation): Record<string, unknown> {
  const byStatus = new Map<number, string[]>();

  for (const code of collectErrorCodes(operation)) {
    const entry = errorCatalog[code];

    // Katalogda olmayan bir kod belgeye giremez; testte de yakalanıyor ama
    // burada sessizce atlamak, yanlış belge üretmekten iyidir.
    if (!entry) continue;

    for (const status of entry.statuses) {
      byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
    }
  }

  const responses: Record<string, unknown> = {};

  for (const [status, codes] of [...byStatus.entries()].sort(([a], [b]) => a - b)) {
    const lines = codes
      .sort()
      .map((code) => `- \`${code}\` — ${errorCatalog[code]?.description ?? ""}`)
      .join("\n");

    responses[String(status)] = {
      description: lines,
      content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
      ...(status === 429
        ? {
            headers: {
              "Retry-After": {
                description:
                  "Kaç saniye sonra tekrar denenebileceği. ⚠️ BUGÜN GÖNDERİLMİYOR — teknik borç #101.",
                schema: { type: "integer" },
              },
            },
          }
        : {}),
    };
  }

  return responses;
}
