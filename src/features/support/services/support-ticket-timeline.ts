import {
  SUPPORT_TICKET_IN_REVIEW_AFTER_MINUTES,
  SUPPORT_TICKET_RESOLVED_AFTER_MINUTES,
} from "@/config/constants";
import type { SupportTicketStatus } from "@/generated/prisma/enums";

/**
 * DESTEK TALEBİNİN DURUMU OKUMA ANINDA HESAPLANIR (ADR-013 · PRD §5.7).
 *
 * ═══ NEDEN `support_tickets.status` KOLONUNA BAKILMIYOR ═══
 *
 * PRD §5.7 `Açık → İnceleniyor → Çözüldü` geçişlerinin "zamanlayıcıyla simüle
 * edileceğini" söylüyor. Sipariş modülünde aynı cümle vardı ve orada verilen
 * karar burada da geçerli (ADR-013): bu projede sık çalışan bir zamanlayıcı
 * YOK (teknik borç #3) ve talebi ilerletecek bir yönetici paneli de yok
 * (teknik borç #4). Durumu günde bir çalışan bir görevin yazmasına bağlamak,
 * doğruluğu çalışması garanti olmayan bir sürece bağlamak olurdu.
 *
 * Bu yüzden kolon yalnızca İKİ GERÇEĞİ tutar:
 *  · talebin nasıl DOĞDUĞU (`open`)
 *  · üyenin onu KAPATIP kapatmadığı (`closed`)
 * Aradaki `in_review` ve `resolved` talebin yaşından türetilir.
 *
 * ⛔ BURASI SAF BİR FONKSİYONDUR: veritabanı, `Date.now()` ve rastgelelik
 * yoktur; `now` dışarıdan verilir. Testin zamanı ileri sarabilmesi bu yüzden
 * mümkün — aksi hâlde "3 saat sonra çözüldü mü" sorusunu doğrulamak için
 * testin gerçekten 3 saat beklemesi gerekirdi.
 */

/** Talebin zaman çizgisinde geçtiği aşamalar — `closed` bu çizginin dışındadır. */
export const SUPPORT_TIMELINE_STAGES = ["open", "in_review", "resolved"] as const;

export type SupportTimelineStage = (typeof SUPPORT_TIMELINE_STAGES)[number];

/**
 * Aşama eşikleri: talep oluşturulduktan kaç dakika sonra geçildiği.
 *
 * Sayılar `constants.ts` içinde ve orada gerekçeleri yazılı; burada yalnızca
 * çizginin sırası duruyor. `open` eşiği yok — doğuş aşaması.
 */
const STAGE_THRESHOLD_MINUTES: Readonly<Record<Exclude<SupportTimelineStage, "open">, number>> = {
  in_review: SUPPORT_TICKET_IN_REVIEW_AFTER_MINUTES,
  resolved: SUPPORT_TICKET_RESOLVED_AFTER_MINUTES,
};

export type DerivedTicketState = {
  /** Kullanıcıya gösterilecek durum. */
  status: SupportTicketStatus;
  /**
   * Üye bu talebi kapatabilir mi — KARARI VEREN TEK YER BURASI.
   *
   * Ekrandaki düğme de sunucudaki kapı da aynı fonksiyonu çağırır. İki ayrı
   * yerde yazılsaydı biri değişip diğeri unutulduğunda ekran "kapat" derken
   * sunucu 409 dönerdi (sipariş iptalinde öğrenilen ders).
   *
   * KAPATMA HER AŞAMADA AÇIK: PRD §5.7 "üye kendi taleplerini listeler ve
   * kapatabilir" diyor, bir aşama şartı koymuyor. Talep üyenindir; sorunu
   * kendiliğinden çözüldüyse `Çözüldü` aşamasını beklemek zorunda değildir.
   */
  canClose: boolean;
  /** Bir sonraki aşamaya geçilecek an; çözülmüş/kapanmışta `null`. */
  nextStageAt: Date | null;
};

export type DeriveTicketStateInput = {
  /** Veritabanındaki kolon: talebin doğuş durumu veya `closed`. */
  storedStatus: SupportTicketStatus;
  createdAt: Date;
  now: Date;
};

/**
 * Talebin O ANKİ durumunu hesaplar.
 *
 * Sıralama önemli: önce kayda YAZILMIŞ kesin durum (`closed`) elenir.
 * Kapatılmış bir talep zamanla "çözüldü" görünemez — zaman çizgisi yalnızca
 * hâlâ açık talepler için işler.
 */
export function deriveTicketState(input: DeriveTicketStateInput): DerivedTicketState {
  if (input.storedStatus === "closed") {
    return { status: "closed", canClose: false, nextStageAt: null };
  }

  const elapsedMinutes = (input.now.getTime() - input.createdAt.getTime()) / 60_000;

  if (elapsedMinutes >= STAGE_THRESHOLD_MINUTES.resolved) {
    return { status: "resolved", canClose: true, nextStageAt: null };
  }

  if (elapsedMinutes >= STAGE_THRESHOLD_MINUTES.in_review) {
    return {
      status: "in_review",
      canClose: true,
      nextStageAt: stageBoundary(input.createdAt, STAGE_THRESHOLD_MINUTES.resolved),
    };
  }

  return {
    status: "open",
    canClose: true,
    nextStageAt: stageBoundary(input.createdAt, STAGE_THRESHOLD_MINUTES.in_review),
  };
}

/**
 * Durumun zaman çizgisinde kaçıncı sırada olduğu (0'dan başlar).
 * Kapatılmış talep çizginin üzerinde değildir → `-1`.
 */
export function supportTimelineIndex(status: SupportTicketStatus): number {
  return SUPPORT_TIMELINE_STAGES.indexOf(status as SupportTimelineStage);
}

/**
 * HENÜZ BİLDİRİLMEMİŞ aşamaların listesi.
 *
 * Neden liste, tek bir aşama değil: kullanıcı talebi açtıktan 4 saat sonra
 * uygulamaya girerse `İnceleniyor` ve `Çözüldü` aşamalarının İKİSİ birden
 * geçilmiş olur. Yalnızca son durum bildirilseydi aradaki adım hiç görünmezdi;
 * bildirim listesi talebin geçmişi sayılıyor (ADR-013 ile aynı gerekçe).
 *
 * Kapatılmış talepte boş döner: kapatma bildirimi kapatma anında yazılıyor ve
 * çizgi orada bitiyor.
 */
export function pendingTicketNotificationStages(input: {
  /** En son bildirilen durum; hiç bildirilmemişse `null`. */
  notifiedStatus: SupportTicketStatus | null;
  /** `deriveTicketState` ile hesaplanmış güncel durum. */
  currentStatus: SupportTicketStatus;
}): SupportTimelineStage[] {
  const targetIndex = supportTimelineIndex(input.currentStatus);

  if (targetIndex < 0) return [];

  const fromIndex = input.notifiedStatus === null ? -1 : supportTimelineIndex(input.notifiedStatus);

  if (fromIndex >= targetIndex) return [];

  return [...SUPPORT_TIMELINE_STAGES].slice(fromIndex + 1, targetIndex + 1);
}

function stageBoundary(createdAt: Date, minutes: number): Date {
  return new Date(createdAt.getTime() + minutes * 60_000);
}
