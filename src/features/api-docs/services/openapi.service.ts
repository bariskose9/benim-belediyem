import { z, type ZodType } from "zod";

import { APP_VERSION } from "@/config/constants";
import { publicEnv } from "@/config/env";
import { apiOperations } from "@/features/api-docs/registry";
import {
  buildErrorResponses,
  errorResponseSchema,
} from "@/features/api-docs/services/error-responses";
import { TAG_DESCRIPTIONS } from "@/features/api-docs/tags";
import type { ApiOperation, OperationAccess, OperationParam } from "@/features/api-docs/types";

/**
 * OpenAPI belgesini üretir (adım 18b · ADR-019).
 *
 * ⭐ SÜRÜM 3.1 SEÇİLDİ VE BU TEKNİK BİR ZORUNLULUK: OpenAPI 3.1, JSON Schema
 * 2020-12'yi olduğu gibi kullanıyor — Zod'un ürettiği biçim tam olarak bu.
 * 3.0 seçilseydi her şemayı elle dönüştürmek gerekirdi (`exclusiveMinimum`
 * sayı değil boolean, `nullable` ayrı bir alan, `$ref` yanına başka anahtar
 * konamıyor). Dönüştürme kayıplı olurdu ve kayıp SESSİZ olurdu.
 */

const OPENAPI_VERSION = "3.1.0";

/** Zod → JSON Schema. Tek geçiş noktası: seçenekler her yerde aynı kalsın. */
function toSchemaObject(schema: ZodType): Record<string, unknown> {
  /**
   * `io: "input"` şart: istemcinin GÖNDERDİĞİ biçim belgeleniyor, sunucunun
   * dönüştürdükten sonraki hâli değil. `.transform()` taşıyan bir şemada ikisi
   * farklıdır ve çıktı biçimini belgelemek istemciyi yanlış yönlendirir.
   */
  const json = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;

  // `$schema` bilgisi belgenin kendi sürümünden zaten belli; her şemaya
  // tekrar yazmak çıktıyı şişiriyor.
  delete json.$schema;

  return json;
}

function buildParameters(operation: ApiOperation): unknown[] {
  const asParameter = (param: OperationParam, location: "path" | "query") => ({
    name: param.name,
    in: location,
    required: location === "path",
    description: param.description,
    schema: toSchemaObject(param.schema),
  });

  return [
    ...(operation.pathParams ?? []).map((p) => asParameter(p, "path")),
    ...(operation.query ?? []).map((p) => asParameter(p, "query")),
  ];
}

const ACCESS_LABEL: Record<OperationAccess, string> = {
  public: "Herkese açık — giriş gerekmez.",
  authenticated: "Giriş yapmış kullanıcı (oturum çerezi).",
  identity_verified: "Giriş yapmış **ve kimliği doğrulanmış** kullanıcı.",
  staff: "Giriş yapmış **ve kurum personeli** olan kullanıcı.",
  cron: "Yalnızca planlı görev — paylaşılan gizli anahtarla (`Authorization: Bearer`).",
};

function buildOperationObject(operation: ApiOperation): Record<string, unknown> {
  const parameters = buildParameters(operation);

  const successResponse: Record<string, unknown> = {
    description: operation.success.description,
  };

  // 204 ve yönlendirmelerin gövdesi yoktur; boş bir `content` yazmak belgeyi yanlış yapar.
  if (operation.success.status < 204) {
    successResponse.content = {
      "application/json": {
        schema: {
          type: "object",
          properties: { data: { description: operation.success.description } },
        },
      },
    };
  }

  return {
    operationId: toOperationId(operation),
    tags: [operation.tag],
    summary: operation.summary,
    description: [`**Erişim:** ${ACCESS_LABEL[operation.access]}`, operation.description]
      .filter(Boolean)
      .join("\n\n"),
    security: securityFor(operation.access),
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(operation.requestBody
      ? {
          requestBody: {
            required: true,
            content: {
              [operation.requestBody.contentType ?? "application/json"]: {
                schema: toSchemaObject(operation.requestBody.schema),
              },
            },
          },
        }
      : {}),
    responses: {
      [String(operation.success.status)]: successResponse,
      ...buildErrorResponses(operation),
    },
  };
}

/**
 * ⭐ GENEL UÇLAR `security: []` YAZIYOR — atlanmıyor.
 *
 * OpenAPI'de alanı hiç yazmamak "kök seviyedeki güvenliği devral" demektir;
 * boş dizi ise "bu uç BİLEREK korumasız" demektir. İkisi aynı şey değil ve
 * fark okuyan için kritik: alan eksikse "unutulmuş mu, öyle mi tasarlanmış"
 * sorusunun cevabı yoktur.
 *
 * Bağımsız bir OpenAPI doğrulayıcısı (`@redocly/cli`) ilk üretimde tam olarak
 * bunu 19 hata olarak bildirdi.
 */
function securityFor(access: OperationAccess): unknown[] {
  if (access === "public") return [];

  return access === "cron" ? [{ cronSecret: [] }] : [{ sessionCookie: [] }];
}

/**
 * `POST /api/addresses/{addressId}` → `postApiAddressesByAddressId`.
 *
 * İstemci üreticileri (`openapi-generator`, `orval`, `kubb`) ürettikleri
 * fonksiyonu bu alandan adlandırıyor. Yazılmazsa üretici kendi uydurduğu,
 * yol değişince sessizce DEĞİŞEN bir ad kullanır — mobil istemci geldiğinde
 * (adım 19) bu, derlemenin bir gün nedensiz kırılması demektir.
 */
export function toOperationId({ method, path }: Pick<ApiOperation, "method" | "path">): string {
  const segments = path
    .replace(/^\/api\//, "")
    .split("/")
    .flatMap((segment) =>
      segment.startsWith("{") ? ["by", segment.slice(1, -1)] : segment.split("-"),
    )
    .filter(Boolean);

  return [method, ...segments]
    .map((part, index) => (index === 0 ? part : part[0].toUpperCase() + part.slice(1)))
    .join("");
}

/** Next.js yol biçimini (`[addressId]`) OpenAPI biçimine (`{addressId}`) çevirir. */
export function toOpenApiPath(nextPath: string): string {
  return nextPath.replace(/\[(\w+)\]/g, "{$1}");
}

export function buildOpenApiDocument(): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const operation of apiOperations) {
    paths[operation.path] ??= {};
    paths[operation.path][operation.method] = buildOperationObject(operation);
  }

  const tags = [...new Set(apiOperations.map((o) => o.tag))]
    .sort()
    .map((name) => ({ name, description: TAG_DESCRIPTIONS[name] }));

  return {
    openapi: OPENAPI_VERSION,
    info: {
      title: "benim-belediyem API",
      version: APP_VERSION,
      /**
       * Lisans belgede de bildiriliyor: belgeyi bir istemci üreticisine veren
       * kişi, deponun `LICENSE` dosyasını görmeden yalnızca bu dosyayla
       * çalışıyor olabilir. Lisanssız bir sözleşme "her hakkı saklı"dır.
       */
      license: { name: "MIT", identifier: "MIT" },
      description: [
        "Bu API, benim-belediyem web arayüzünün kendi arka ucudur (BFF) — üçüncü taraflara",
        "sunulan bir ürün API'si değildir.",
        "",
        "⚠️ **Bu gerçek bir belediye uygulaması değildir.** Kimlik sorgulama ve ödeme",
        "sağlayıcıları taklit edilmiştir (ADR-003, ADR-009).",
        "",
        "**Yanıt biçimi tek tiptir:** başarılıda `{ data, meta? }`, hatalıda `{ error: { code, message } }`.",
        "`code` makine için sabittir ve İngilizce; `message` kullanıcıya gösterilecek Türkçe metindir.",
        "",
        "**Oturum** `httpOnly` çerezle taşınır; hiçbir uçta jeton gövdede veya adres satırında gitmez.",
      ].join("\n"),
    },
    servers: [{ url: publicEnv.NEXT_PUBLIC_APP_URL }],
    tags,
    paths,
    components: {
      schemas: { ApiError: errorResponseSchema },
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "bb_session",
          description: "Girişte kurulan `httpOnly` oturum çerezi (ADR-002, ADR-005).",
        },
        cronSecret: {
          type: "http",
          scheme: "bearer",
          description: "Planlı görev uçları için paylaşılan gizli anahtar (`CRON_SECRET`).",
        },
      },
    },
  };
}
