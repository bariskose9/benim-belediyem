import { formatIstanbulDate } from "@/lib/datetime";

/**
 * Teslimat zaman aralığı seçenekleri (PRD §5.3 "adres ve zaman aralığı seçilir").
 *
 * ARALIK SERBEST METİN olarak saklanıyor (`orders.delivery_slot`) — şemadaki
 * yorumun dediği gibi bu fazda üzerinden zaman sorgusu yapılmıyor. Bu yüzden
 * burada üretilen etiket doğrudan kullanıcıya gösterilen metnin kendisi.
 *
 * Seçenekler SUNUCUDA üretiliyor: istemcinin ürettiği bir liste, tarayıcının
 * saatine bağlı olurdu ve saati geri alınmış bir cihaz geçmiş bir aralık
 * gönderebilirdi.
 */

/** Günün teslimat pencereleri. Sabit ve az sayıda — seçim kolay olmalı. */
const WINDOWS = ["10:00-12:00", "12:00-14:00", "14:00-16:00", "16:00-18:00"] as const;

/** Kaç günlük seçenek gösterilir. */
const DAYS_AHEAD = 3;

/**
 * Yarından başlayarak üç günlük aralık listesi üretir.
 *
 * BUGÜN YOK ve bu bilinçli: sipariş verilen saate göre bugünün pencerelerinin
 * bir kısmı çoktan geçmiş olur; "geçmiş bir teslimat saati" seçtirmek yerine
 * en erken yarın deniyor. Aynı gün teslimat gerçek bir ihtiyaç olursa
 * pencereler saate göre süzülür.
 */
export function buildDeliverySlots(now: Date): string[] {
  const slots: string[] = [];

  for (let dayOffset = 1; dayOffset <= DAYS_AHEAD; dayOffset += 1) {
    const day = new Date(now.getTime() + dayOffset * 24 * 60 * 60_000);
    const label = formatIstanbulDate(day);

    for (const window of WINDOWS) {
      slots.push(`${label} ${window}`);
    }
  }

  return slots;
}
