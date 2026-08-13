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

/**
 * Başarılı yanıtın gövdesi (borç #107 · adım 107a).
 *
 * ⭐ NEDEN BURAYA ELLE BİR ŞEMA YAZILMIYOR DA GERÇEK ŞEMA İSTENİYOR.
 *
 * İstek tarafı sapmıyor çünkü belgenin okuduğu şema, ucun FİİLEN doğrulama
 * yaptığı şemanın ta kendisi. Yanıt tarafına elle bir tarif yazsaydık, ADR-019'un
 * yasakladığı şeyi yapmış olurduk: gerçeğe bağlı olmayan, sessizce sapan ikinci
 * bir kaynak. Bu yüzden alan bir şema İSTİYOR ve o şema route'un kendisinde
 * kullanılıyor — üç ayrı kapı ikisinin aynı kaldığını sınıyor
 * (`tests/unit/api-docs-response.test.ts`).
 */
export type SuccessBody =
  | {
      /** Gövdenin GERÇEK şeması. Route da `ok`/`created` çağrısında bunu verir. */
      schema: ZodType;
      /**
       * `data` (varsayılan): gövde `{ data: <şema> }` zarfına sarılır.
       * `raw`: zarf yok — şema gövdenin tamamını tarif eder.
       */
      envelope?: "data" | "raw";
    }
  | {
      /**
       * Gövdenin sözleşmesi bu projede DEĞİL, bir dış standartta tanımlı.
       *
       * Kaçış kapısı değil, dürüst bir sınır: `/api/docs` bir OpenAPI 3.1
       * belgesi döner ve o belgenin sözleşmesi standardın kendisidir. Ona Zod
       * şeması yazmak, standardın eksik bir kopyasını üretmek olurdu — ve o
       * kopya sapardı. Bağ zaten var ve daha güçlü: belge her doğrulamada
       * bağımsız bir OpenAPI doğrulayıcısından (`@redocly/cli lint`) geçiyor.
       *
       * Gerekçe metni ZORUNLU — kapı boş dizeyi kabul etmiyor.
       */
      externalContract: string;
    };

export type ApiOperation = {
  /** Next.js yol biçimi değil, OpenAPI biçimi: `/api/v1/addresses/{addressId}`. */
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
  /** Başarılı yanıtın durum kodu, Türkçe tarifi ve gövdesinin şeması. */
  success: {
    status: 200 | 201 | 204 | 302 | 303;
    description: string;
    /**
     * Gövdeli yanıtlarda (200/201) ZORUNLU, gövdesizlerde (204/302/303) yasak.
     * İkisi de `tests/unit/api-docs-response.test.ts` ile kilitli.
     */
    body?: SuccessBody;
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
