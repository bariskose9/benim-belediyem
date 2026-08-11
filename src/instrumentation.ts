import * as Sentry from "@sentry/nextjs";

/**
 * Next.js'in açılış kancası — sunucu ayağa kalkarken bir kez çalışır.
 *
 * Sentry yapılandırması buradan DİNAMİK olarak yükleniyor: her iki çalışma
 * zamanının kendi SDK'sı var ve yanlış olanı yüklemek derlemeyi bozar.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Sunucu bileşenlerinde ve route handler'larda oluşan hataları yakalar.
 *
 * ⭐ BU SATIR OLMADAN SUNUCU BİLEŞENİ HATALARI SENTRY'YE HİÇ DÜŞMEZ. Next.js
 * onları kendi hata sınırına yönlendirip yutuyor; `onRequestError` framework'ün
 * bunu dışarı bildirdiği tek kanal.
 */
export const onRequestError = Sentry.captureRequestError;
