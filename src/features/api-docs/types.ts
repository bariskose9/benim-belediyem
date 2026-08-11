import type { ZodType } from "zod";

import type { AccessRequirement } from "@/features/auth/services/access-control";

/**
 * API belgesinin veri modeli (adım 18b · ADR-019).
 *
 * ⭐ BURADA YALNIZCA ŞEMADAN OKUNAMAYAN ŞEYLER DURUR.
 *
 * Bir ucun girdi sözleşmesi (hangi alan, hangi uzunluk, hangi biçim) zaten
 * Zod şemasında yazılı ve belge onu doğrudan oradan türetiyor. Yol, metot,
 * erişim seviyesi ve dönebilecek hata kodları ise koddan çalışma anında
 * okunamaz — bu yüzden tek bir kütükte toplanıyorlar.
 *
 * ⛔ Kütüğün gerçek uçlarla örtüştüğü `tests/unit/api-docs-registry.test.ts`
 * ile kilitli: belgelenmemiş bir uç eklenirse CI kırmızıya döner. Kapısı
 * olmayan bir belge birkaç ay içinde YANLIŞ belgeye dönüşür ve yanlış belge,
 * belgesizlikten kötüdür (03-api-guidelines.md).
 */

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/**
 * Bir ucun kapısı.
 *
 * `AccessRequirement`'ı olduğu gibi kullanmak yerine `"public"` ve `"cron"`
 * eklendi: ikisi de `requireAccess` çağırmıyor ama "korumasız" demek yanlış
 * olurdu — `cron` paylaşılan bir gizli anahtarla korunuyor.
 */
export type OperationAccess = AccessRequirement | "public" | "cron";

export type OperationParam = {
  name: string;
  description: string;
  schema: ZodType;
};

export type ApiOperation = {
  /** Next.js yol biçimi değil, OpenAPI biçimi: `/api/addresses/{addressId}`. */
  path: string;
  method: HttpMethod;
  /** Belgede gruplama başlığı — Türkçe, kullanıcıya görünür. */
  tag: string;
  /** Tek cümle, Türkçe, ne yaptığını söyler. */
  summary: string;
  /** Neden böyle davrandığını anlatan uzun açıklama (isteğe bağlı). */
  description?: string;
  access: OperationAccess;
  /** Yoldaki `{...}` parçaları. Şemaları gerçek doğrulama şemasından gelir. */
  pathParams?: OperationParam[];
  query?: OperationParam[];
  /** İstek gövdesinin GERÇEK doğrulama şeması — belge bundan türetilir. */
  requestBody?: {
    schema: ZodType;
    /** Varsayılan `application/json`; rıza formu `form-data` gönderiyor. */
    contentType?: "application/json" | "multipart/form-data";
  };
  /** Başarılı yanıtın durum kodu ve `data` alanının Türkçe tarifi. */
  success: {
    status: 200 | 201 | 204 | 302 | 303;
    description: string;
  };
  /**
   * Bu ucun dönebileceği hata kodları.
   *
   * `tests/unit/api-docs-registry.test.ts` her kodun kodda gerçekten tanımlı
   * olduğunu doğruluyor — uydurma bir kod belgeye giremiyor.
   */
  errors: string[];
  /** Hız sınırına tabi mi (belgede `429` ve `Retry-After` notu için). */
  rateLimited?: boolean;
};
