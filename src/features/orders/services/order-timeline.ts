import type { FulfillmentType, OrderStatus } from "@/generated/prisma/enums";

/**
 * SİPARİŞ DURUMU OKUMA ANINDA HESAPLANIR (ADR-013 · PRD §5.5).
 *
 * ═══ NEDEN VERİTABANINDAKİ `status` KOLONUNA BAKILMIYOR ═══
 *
 * PRD durumların "zamanlayıcı ile simüle edileceğini" söylüyor, ama bu projede
 * sık çalışan bir zamanlayıcı YOK (ADR-007 · teknik borç #3: ücretsiz planda
 * günde bir). Durumu bir cron'a yazdırmak, doğruluğu çalışması garanti olmayan
 * bir sürece bağlamak olurdu: görev gecikirse kullanıcı bir gün boyunca
 * "Alındı" görür, iki kez çalışırsa aynı bildirim iki kez düşer.
 *
 * Bunun yerine ADR-007'nin deseni uygulanıyor: kayıt SORULDUĞU AN doğru
 * cevabı verir. `orders.status` yalnızca iki gerçeği tutar — siparişin nasıl
 * DOĞDUĞU (`received`, bilet ise `delivered`) ve İPTAL edilip edilmediği.
 * Aradaki ilerleme siparişin yaşından türetilir ve hiçbir yere yazılmaz.
 *
 * ⛔ BURASI SAF BİR FONKSİYONDUR: veritabanı, `Date.now()` ve rastgelelik
 * yoktur; `now` dışarıdan verilir. Testin zamanı ileri sarabilmesi bu yüzden
 * mümkün — aksi hâlde "45 dakika sonra teslim edildi mi" sorusunu doğrulamak
 * için testin gerçekten 45 dakika beklemesi gerekirdi.
 */

/** Bir siparişin geçtiği aşamalar — `cancelled` bu çizginin dışındadır. */
export const ORDER_TIMELINE_STAGES = ["received", "preparing", "on_the_way", "delivered"] as const;

export type TimelineStage = (typeof ORDER_TIMELINE_STAGES)[number];

/**
 * Aşama eşikleri, sipariş oluşturulduktan kaç DAKİKA sonra geçildiğini söyler.
 *
 * ⚠️ BU SAYILAR BİR VARSAYIMDIR. PRD §5.5 ve `fake-data-guide.md` süre vermiyor;
 * değerler gerçek hayattaki akışa bakılarak seçildi ve proje sahibinin onayına
 * açık. Değiştirmek için TEK YER burasıdır.
 *
 * NEDEN MODÜL BAŞINA TABLO, `if` DALI DEĞİL: teslimat ücretinde aynı karar
 * verilmişti (`cart-pricing.ts` → `DELIVERY_RULES`). Yeni bir teslimatlı modül
 * eklendiğinde buraya bir satır yazılır; kural kodun içine dağılmaz.
 *
 * `ticket` için kural YOK (`null`): bilet teslim edilmez, siparişi zaten
 * `delivered` durumunda doğar (PRD §6.1) ve bir çizgi üzerinde ilerlemez.
 */
export const ORDER_TIMELINE_RULES: Readonly<
  Record<FulfillmentType, Readonly<Record<Exclude<TimelineStage, "received">, number>> | null>
> = {
  /**
   * Restoran hızlı: ekranda vaat edilen hazırlık süresi 30-45 dakika
   * (`fake-data-guide.md`), teslim eşiği de onunla uyumlu tutuldu.
   * İPTAL PENCERESİ = ilk eşik, yani 10 dakika.
   */
  restaurant_delivery: { preparing: 10, on_the_way: 25, delivered: 45 },

  /**
   * Market yavaş: sipariş bir zaman aralığına teslim ediliyor, mutfak gibi
   * hemen başlamıyor. İPTAL PENCERESİ = 20 dakika; kullanıcıya yanlış ürün
   * seçtiğini fark edecek kadar zaman bırakıyor.
   */
  market_delivery: { preparing: 20, on_the_way: 90, delivered: 240 },

  ticket: null,
} as const;

export type DerivedOrderState = {
  /** Kullanıcıya gösterilecek durum. */
  status: OrderStatus;
  /**
   * İptal edilebilir mi — KARARI VEREN TEK YER BURASI.
   *
   * Ekrandaki düğme de, sunucudaki kapı da aynı fonksiyonu çağırır. İki ayrı
   * yerde yazılsaydı biri değişip diğeri unutulduğunda ekran "iptal et" derken
   * sunucu 409 dönerdi (PRD §5.5 kabul kriteri).
   */
  canCancel: boolean;
  /** Bir sonraki aşamaya geçilecek an; teslim edilmiş/iptal edilmişte `null`. */
  nextStageAt: Date | null;
};

export type DeriveOrderStateInput = {
  fulfillmentType: FulfillmentType;
  /** Veritabanındaki kolon: siparişin doğuş durumu veya `cancelled`. */
  storedStatus: OrderStatus;
  createdAt: Date;
  now: Date;
};

/**
 * Siparişin O ANKİ durumunu hesaplar.
 *
 * Sıralama önemli: önce kayda yazılmış KESİN durumlar (`cancelled`,
 * `delivered`) elenir. İptal edilmiş bir sipariş zamanla "yola çıkmış"
 * görünemez — zaman çizgisi yalnızca hâlâ akan siparişler için işler.
 */
export function deriveOrderState(input: DeriveOrderStateInput): DerivedOrderState {
  if (input.storedStatus === "cancelled") {
    return { status: "cancelled", canCancel: false, nextStageAt: null };
  }

  const rule = ORDER_TIMELINE_RULES[input.fulfillmentType];

  // Bilet: kuralı yok, doğduğu durumda kalır ve iptal edilemez (PRD §5.5).
  if (!rule || input.storedStatus === "delivered") {
    return { status: input.storedStatus, canCancel: false, nextStageAt: null };
  }

  const elapsedMinutes = (input.now.getTime() - input.createdAt.getTime()) / 60_000;

  if (elapsedMinutes >= rule.delivered) {
    return { status: "delivered", canCancel: false, nextStageAt: null };
  }

  if (elapsedMinutes >= rule.on_the_way) {
    return {
      status: "on_the_way",
      canCancel: false,
      nextStageAt: stageBoundary(input.createdAt, rule.delivered),
    };
  }

  if (elapsedMinutes >= rule.preparing) {
    return {
      status: "preparing",
      canCancel: false,
      nextStageAt: stageBoundary(input.createdAt, rule.on_the_way),
    };
  }

  // YALNIZCA BURADA iptal açık: PRD §5.5 "yalnızca `Alındı` aşamasında".
  return {
    status: "received",
    canCancel: true,
    nextStageAt: stageBoundary(input.createdAt, rule.preparing),
  };
}

/**
 * Hesaplanan durumun zaman çizgisinde kaçıncı sırada olduğu (0'dan başlar).
 * İptal edilmiş sipariş çizginin üzerinde değildir → `-1`.
 *
 * Bildirim katmanı bunu "hangi aşamalar atlanmış" sorusunu cevaplamak için
 * kullanıyor: kullanıcı uygulamaya 30 dakika sonra girerse `Hazırlanıyor` ve
 * `Yola çıktı` bildirimlerinin ikisi birden yazılır, hiçbiri kaybolmaz.
 */
export function timelineIndex(status: OrderStatus): number {
  return ORDER_TIMELINE_STAGES.indexOf(status as TimelineStage);
}

/**
 * HENÜZ BİLDİRİLMEMİŞ aşamaların listesi (PRD §5.5: "durum değiştikçe bildirim
 * güncellenir").
 *
 * Neden liste, tek bir aşama değil: kullanıcı siparişten yarım saat sonra
 * uygulamayı açarsa `Hazırlanıyor` ve `Yola çıktı` aşamalarının İKİSİ birden
 * geçilmiş olur. Yalnızca son durum bildirilseydi aradaki adım hiç görünmezdi;
 * bildirim listesi de siparişin geçmişi sayılıyor.
 *
 * İptal edilmiş siparişte boş döner: iptal bildirimi iptal anında yazılıyor ve
 * çizgi orada bitiyor.
 */
export function pendingNotificationStages(input: {
  fulfillmentType: FulfillmentType;
  /** En son bildirilen durum; hiç bildirilmemişse `null`. */
  notifiedStatus: OrderStatus | null;
  /** `deriveOrderState` ile hesaplanmış güncel durum. */
  currentStatus: OrderStatus;
}): TimelineStage[] {
  const targetIndex = timelineIndex(input.currentStatus);

  if (targetIndex < 0) return [];

  const rule = ORDER_TIMELINE_RULES[input.fulfillmentType];

  /**
   * Bilet zaman çizgisinde İLERLEMEZ (`delivered` doğar). Ara aşamalar
   * atlanmalı: "biletiniz yola çıktı" diye bir bildirim yazmak kullanıcıya
   * gerçekleşmemiş bir olay anlatmak olurdu. Yalnızca ilk bildirim yazılır.
   */
  if (!rule) return input.notifiedStatus === null ? [input.currentStatus as TimelineStage] : [];

  const fromIndex = input.notifiedStatus === null ? -1 : timelineIndex(input.notifiedStatus);

  if (fromIndex >= targetIndex) return [];

  return [...ORDER_TIMELINE_STAGES].slice(fromIndex + 1, targetIndex + 1);
}

function stageBoundary(createdAt: Date, minutes: number): Date {
  return new Date(createdAt.getTime() + minutes * 60_000);
}
