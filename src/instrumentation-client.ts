import * as Sentry from "@sentry/nextjs";

import { setLogSink } from "@/lib/logger";
import { SENTRY_DATA_COLLECTION, scrubEvent } from "@/lib/sentry-options";

/**
 * Sentry — tarayıcı tarafı (adım 18a).
 *
 * ⛔⛔ OTURUM TEKRARI (Session Replay) BİLEREK KURULMADI.
 *
 * Sentry'nin en çok öne çıkardığı özellik bu ve kurulum sihirbazı varsayılan
 * olarak açıyor. Kullanıcının ekranını kaydediyor — bu projede o ekranlarda
 * T.C. kimlik numarası, doğum tarihi, kart numarası ve şifre alanları var.
 * Sentry'nin maskeleme seçenekleri VARSAYILANDA açık olsa bile, kaydın kendisi
 * KVKK m.6 anlamında yeni bir işleme faaliyeti ve aydınlatma metnimizde böyle
 * bir işleme yazmıyor (14-privacy-and-compliance.md).
 *
 * Açılacaksa önce aydınlatma metni ve rıza kaydı güncellenir — kodla değil,
 * bir ADR ile başlar.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENV_LABEL ?? "local",

  dataCollection: SENTRY_DATA_COLLECTION,
  beforeSend: scrubEvent,

  // Gerekçe `sentry.server.config.ts` içinde: performans adım 18c'nin işi.
  tracesSampleRate: 0,
  enableLogs: false,

  /**
   * `replayIntegration` listeye HİÇ eklenmedi (yukarıdaki gerekçe); Sentry
   * v10'da oturum tekrarı yalnızca açıkça eklenirse devreye giriyor.
   *
   * ⛔ OTURUM İZLEME (`BrowserSession`) VARSAYILANDAN ÇIKARILDI.
   *
   * Tarayıcıda ÖLÇÜLDÜ (2026-08-11, adım 18a): hiçbir hata olmadan, sadece
   * anasayfa açılışında Sentry'ye İKİ istek gidiyordu. Sebebi bu entegrasyon —
   * her sayfa yüklemesinde bir "oturum" olayı gönderiyor.
   *
   * Kapatılmasının sebebi kota değil, TUTARLILIK: `/cerez-politikasi` sayfası
   * kullanıcıya "Ölçüm ve istatistik" ile "Pazarlama" gruplarının BOŞ olduğunu
   * söylüyor (adım 17). Her sayfa görüntülemesinde üçüncü bir servise ping
   * atmak, yazdığımız o cümleyi ruhen yanlışlardı. Artık Sentry'ye yalnızca
   * GERÇEK bir hata olduğunda istek gidiyor.
   */
  integrations: (defaults) =>
    defaults.filter((integration) => integration.name !== "BrowserSession"),
});

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

/**
 * İstemci tarafı gezinmelerin izlenmesi. `tracesSampleRate: 0` olduğu için
 * bugün veri üretmiyor; kanca yine de bağlı ki adım 18c'de örnekleme
 * açıldığında ayrıca kod değişikliği gerekmesin.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
