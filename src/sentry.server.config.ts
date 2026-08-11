import * as Sentry from "@sentry/nextjs";

import { setLogSink } from "@/lib/logger";
import { SENTRY_DATA_COLLECTION, scrubEvent } from "@/lib/sentry-options";

/**
 * Sentry — Node.js çalışma zamanı (adım 18a).
 *
 * ⛔ DSN `process.env`'den DOĞRUDAN okunuyor, `@/config/env` üzerinden DEĞİL.
 * Gerekçe: `@/config/env` içe aktarıldığı anda tüm sunucu değişkenlerini
 * doğruluyor ve eksik birinde FIRLATIYOR. Bu dosya `instrumentation.ts`
 * tarafından uygulamanın EN BAŞINDA yükleniyor; buradaki bir istisna
 * uygulamayı hiç açtırmazdı. Hata takibi, gözlediği uygulamayı düşürmemeli.
 *
 * DSN yoksa `Sentry.init` sessizce devre dışı kalır ve uygulama normal çalışır
 * (local ve preview'da beklenen durum bu).
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENV_LABEL ?? "local",

  dataCollection: SENTRY_DATA_COLLECTION,
  beforeSend: scrubEvent,

  /**
   * İzleme (tracing) KAPALI ve bu bir kapsam kararı.
   *
   * Adım 18a'nın işi "üretimdeki her istisna görünsün". Performans ölçümü
   * adım 18c'nin işi ve orada Vercel Analytics kullanılacak. Açık bırakmak
   * ücretsiz katmanın kotasını hata dışı olaylarla harcardı.
   */
  tracesSampleRate: 0,

  /**
   * Sentry'nin kendi log toplayıcısı KAPALI: `logger` zaten stdout'a JSON
   * yazıyor ve `error`/`warn` satırlarını sink üzerinden buraya iletiyor.
   * Açık olsaydı aynı olay iki kez sayılırdı.
   */
  enableLogs: false,
});

/**
 * `logger.error` / `logger.warn` çağrıları buradan Sentry'ye bağlanıyor.
 *
 * ⭐ NEDEN GEREKLİ: Sentry kendiliğinden yalnızca YAKALANMAMIŞ istisnaları
 * görüyor. Bu projedeki en önemli arızaların çoğu ise bilinçli olarak
 * yakalanıyor — planlı görevin düşmesi, e-posta gönderilememesi, sepet
 * taşınamaması. Sink olmasaydı tam da izlemek istediğimiz şeyler görünmezdi.
 */
setLogSink(({ level, event, context, error }) => {
  Sentry.withScope((scope) => {
    scope.setLevel(level === "warn" ? "warning" : "error");
    scope.setTag("event", event);
    scope.setContext("log", context);

    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(event);
    }
  });
});
