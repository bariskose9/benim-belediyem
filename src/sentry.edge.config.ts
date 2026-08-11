import * as Sentry from "@sentry/nextjs";

import { SENTRY_DATA_COLLECTION, scrubEvent } from "@/lib/sentry-options";

/**
 * Sentry — Edge çalışma zamanı (adım 18a).
 *
 * ⚠️ BU PROJEDE BUGÜN EDGE'DE ÇALIŞAN BİR ŞEY YOK: ara katman (middleware)
 * yazılmadı ve tüm route'lar Node çalışma zamanında. Dosya yine de duruyor —
 * ileride bir ara katman eklenirse Sentry'siz kalmasın diye. Boş bırakmak,
 * o günü sessiz bir kör noktaya çevirirdi.
 *
 * Gizlilik ayarları sunucu tarafıyla AYNI dosyadan geliyor; edge'e ayrı bir
 * kural yazmak iki kopya demek olurdu.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENV_LABEL ?? "local",

  dataCollection: SENTRY_DATA_COLLECTION,
  beforeSend: scrubEvent,

  tracesSampleRate: 0,
  enableLogs: false,
});
