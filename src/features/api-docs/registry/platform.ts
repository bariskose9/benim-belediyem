import type { ApiOperation } from "@/features/api-docs/types";
import { healthResponseSchema } from "@/features/platform/schemas/health.schema";
import { scheduledRunResponseSchema } from "@/features/scheduled-tasks/schemas/scheduled-run.schema";

/** Sağlık ucu ve planlı görev (adım 18b). */

const TAG_PLATFORM = "Platform";

export const platformOperations: ApiOperation[] = [
  {
    path: "/api/health",
    method: "get",
    tag: TAG_PLATFORM,
    summary: "Uygulama ve veritabanı sağlık durumunu döner.",
    description:
      "Yayın sonrası duman testinin ilk adımı: 'yeni sürüm ayakta mı, hangi commit çalışıyor, " +
      "veritabanına ulaşabiliyor mu'. Veritabanı sorgusunda zaman aşımı zorunludur — cevap vermeyen " +
      "bir veritabanı ucu askıda bırakırsa izleme aracı 'yavaş' ile 'çökmüş' arasındaki farkı göremez. " +
      "⚠️ Yanıt `Cache-Control: no-store` taşır; aksi hâlde araya giren bir CDN 'sağlıklı' cevabını dondurur.",
    access: "public",
    success: {
      status: 200,
      description: "Uygulamanın ve veritabanının o anki durumu.",
      body: { schema: healthResponseSchema },
    },
    errors: ["SERVICE_UNAVAILABLE"],
  },
  {
    path: "/api/docs",
    method: "get",
    tag: TAG_PLATFORM,
    summary: "Bu OpenAPI belgesinin kendisini döner.",
    description:
      "⛔ **PRODUCTION'DA VARSAYILAN OLARAK KAPALI** ve kapalıyken `404` döner (ADR-019). " +
      "Bu API üçüncü taraflara sunulan bir ürün değil, kendi arayüzümüzün arka ucu (BFF); " +
      "belgesi hiçbir dış tüketiciye hizmet etmezken tüm uçları ve doğrulama kurallarını " +
      "taranabilir biçimde sunar. `API_DOCS_PUBLIC=true` ile açılır. " +
      "⚠️ `403` değil `404` dönmesi bilinçli: `403` ucun var olduğunu doğrulardı. " +
      "⚠️ Yanıt `{ data }` zarfına SARILMAZ — OpenAPI araçları belgeyi kökte arar.",
    access: "public",
    success: {
      status: 200,
      description: "OpenAPI 3.1 belgesinin tamamı (zarfsız, ham).",
      body: {
        externalContract:
          "Gövde bir **OpenAPI 3.1** belgesidir; sözleşmesi bu projede değil, " +
          "[standardın kendisinde](https://spec.openapis.org/oas/v3.1.0) tanımlıdır. " +
          "Buraya Zod şeması yazmak standardın eksik bir kopyasını üretirdi ve o kopya " +
          "sapardı. Bağ zaten var ve daha güçlü: belge her doğrulamada bağımsız bir " +
          "OpenAPI doğrulayıcısından (`@redocly/cli lint`) geçiyor.",
      },
    },
    errors: ["NOT_FOUND"],
  },
  {
    path: "/api/cron/daily",
    method: "get",
    tag: TAG_PLATFORM,
    summary: "Günlük planlı görevleri çalıştırır.",
    description:
      "⛔ Paylaşılan gizli anahtarla korunur (`Authorization: Bearer $CRON_SECRET`); anahtar " +
      "eşleşmezse `401` döner. Görev **idempotent**tir: iki kez çalışırsa veri bozulmaz. " +
      "⚠️ Ücretsiz planda günde bir kez çalışır ve saati garanti DEĞİLDİR. " +
      "⚠️ Sentry cron izleyicisi kurulamadı (teknik borç #96) — 'bugün çalıştı mı' sorusunun " +
      "tek cevabı hâlâ `audit_logs` tablosu.",
    access: "cron",
    success: {
      status: 200,
      description: "Her alt görevin ne kadar kayıt işlediği özeti.",
      body: { schema: scheduledRunResponseSchema },
    },
    errors: [],
  },
];
