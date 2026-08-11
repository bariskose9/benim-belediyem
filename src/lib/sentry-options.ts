import type { ErrorEvent } from "@sentry/nextjs";

import { REDACTED, redact, redactString } from "@/lib/log-redact";

/**
 * Sentry'nin ORTAK yapılandırması — sunucu, edge ve tarayıcı üçü de buradan
 * okur (docs/standards/12-operations-and-scaling.md · CLAUDE.md §5.11).
 *
 * ⛔ NEDEN TEK DOSYA: üç ayrı `Sentry.init()` çağrısı var. Gizlilik ayarı üç
 * yerde tekrarlansaydı biri unutulur ve o çalışma zamanı sessizce kişisel veri
 * göndermeye devam ederdi — hem de kimse fark etmeden.
 */

/**
 * ⛔⛔ SENTRY'NİN VARSAYILANLARI BU PROJE İÇİN TEHLİKELİ.
 *
 * SDK'nın kendi tip tanımından (v10 `DataCollection`) okunan varsayılanlar ve
 * bu projede ne anlama geldikleri:
 *
 * | Ayar | Sentry varsayılanı | Bizde ne olurdu |
 * |---|---|---|
 * | `httpBodies` | HEPSİ toplanır | Kayıt isteğinin gövdesi = şifre + T.C. kimlik numarası |
 * | `cookies` | toplanır | `bb_session` oturum çerezi üçüncü bir servise gider |
 * | `httpHeaders` | istek+yanıt | `Authorization` ve `Cookie` başlıkları |
 * | `databaseQueryData` | toplanır | Prisma sorgusunun PARAMETRE DEĞERLERİ |
 * | `stackFrameVariables` | toplanır | Yığındaki yerel değişkenler: `password`, `nationalId` |
 * | `urlQueryParams` | toplanır | Adresteki tek kullanımlık jetonlar |
 *
 * Hepsi bilerek kapatıldı. Elimizde kalan — hata sınıfı, mesaj, yığın izi ve
 * bizim AÇIKÇA eklediğimiz bağlam — bir arızayı teşhis etmeye yetiyor.
 */
/**
 * ⚠️ `as const` KULLANILAMIYOR: Sentry `httpBodies` alanını DEĞİŞTİRİLEBİLİR
 * bir dizi olarak tiplemiş, `readonly []` kabul etmiyor. `DataCollection`
 * tipi de paketten dışa aktarılmadığı için açıkça yazılamıyor. Alanların
 * gerçekten kapalı kaldığını `tests/unit/sentry-options.test.ts` koruyor.
 */
export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: false, response: false },
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  stackFrameVariables: false,
};

/**
 * Olayın metin taşıyan alanlarını süzer.
 *
 * ⛔ NEDEN OLAYIN TAMAMINA `redact()` UYGULANMIYOR: `redact` derinliği 5'te
 * kesiyor ve uzun metinleri kırpıyor. Sentry olayı bundan çok daha derin
 * (`event.exception.values[].stacktrace.frames[]`), yani toptan uygulamak
 * YIĞIN İZİNİ YOK EDERDİ — hatayı bulunamaz hale getirip gözlemlenebilirliği
 * kazanmak yerine kaybederdik. Bu yüzden yalnızca kişisel veri TAŞIYABİLEN
 * alanlar hedefleniyor.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.message) {
    event.message = redactString(event.message);
  }

  /**
   * ⭐ ASIL VEKTÖR BURASI: `exception.values[].value` hatanın METNİ ve teknik
   * borç #79'un kaynağı — Prisma argüman nesnesinin tamamını oraya yazıyor.
   */
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) {
      exception.value = redactString(exception.value);
    }
  }

  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (breadcrumb.message) {
      breadcrumb.message = redactString(breadcrumb.message);
    }

    if (breadcrumb.data) {
      breadcrumb.data = redact(breadcrumb.data) as Record<string, unknown>;
    }
  }

  if (event.extra) {
    event.extra = redact(event.extra) as Record<string, unknown>;
  }

  if (event.contexts) {
    event.contexts = redact(event.contexts) as NonNullable<ErrorEvent["contexts"]>;
  }

  /**
   * İstek gövdesi ve başlıkları `dataCollection` ile zaten kapalı; bu satır
   * ikinci kilit. Bir sonraki SDK sürümü varsayılanı değiştirirse veya bir
   * entegrasyon gövdeyi elle eklerse burada durur.
   */
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.headers;
    event.request.query_string = undefined;
  }

  /**
   * Kullanıcıdan yalnızca KİMLİK kalır: "hangi hesapta oldu" sorusu için
   * gerekli, "kim olduğu" için değil. E-posta ve IP hiç gitmez.
   */
  if (event.user) {
    event.user = event.user.id ? { id: String(event.user.id) } : { id: REDACTED };
  }

  return event;
}
