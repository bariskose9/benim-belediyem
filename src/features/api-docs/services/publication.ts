import { isProductionEnv, serverEnv } from "@/config/env";

/**
 * API belgesinin YAYINLANIP yayınlanmadığına karar verir (adım 18b · ADR-019).
 *
 * ⭐ ÜRETMEK İLE YAYINLAMAK AYRI KARARLAR. Belge her ortamda üretiliyor ve
 * CI'da sapma testinden geçiyor — yani doğruluğu ortamdan bağımsız. Burada
 * karara bağlanan tek şey, ONU HERKESE AÇMAK.
 *
 * Varsayılan davranış:
 *  - local ve preview → **açık.** Geliştiricinin ve proje sahibinin belgeyi
 *    görmesi gereken yer burası; ikisi de zaten `noindex` ve dar kitleli
 *  - production      → **kapalı.** Açılması istenirse `API_DOCS_PUBLIC=true`
 *
 * ⚠️ Bayrak neden var: kapatmayı koda gömseydik, açmak bir dağıtım gerektirirdi.
 * Bir gün belge gerçekten paylaşılmak istendiğinde (iş görüşmesi, portföy)
 * tek değişkenle açılıp kapanabilmesi doğru olan. Varsayılan kapalı olduğu
 * için hiçbir panel işi gerektirmiyor.
 */
export function isApiDocsPublished(): boolean {
  if (!isProductionEnv) return true;

  return serverEnv.API_DOCS_PUBLIC === true;
}
