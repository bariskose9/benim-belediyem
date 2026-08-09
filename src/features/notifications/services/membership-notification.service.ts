import { messages } from "@/config/messages";
import {
  claimRenewalReminder,
  findLiveMembership,
} from "@/features/gym/repositories/membership.repository";
import { findMembershipPlan } from "@/features/gym/repositories/membership-plan.repository";
import { isRenewalReminderDue } from "@/features/gym/services/membership-state";
import { createNotification } from "@/features/notifications/repositories/notification.repository";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { formatIstanbulDate } from "@/lib/datetime";
import { formatTry } from "@/lib/money";

/**
 * Spor salonu üyeliğinin bildirimleri (PRD §5.6).
 *
 * ═══ HATIRLATMA NEDEN "TEMBEL" YAZILIYOR ═══
 *
 * PRD "yenilemeden 3 gün önce hatırlatma bildirimi düşer" diyor ve bunu
 * yapacak planlı görev adım 16'da gelecek. O görev yazılana kadar — ve
 * yazıldıktan sonra da, çünkü ücretsiz planda günde bir çalışacak (teknik
 * borç #3) — hatırlatma, kullanıcı ekrana baktığında yazılıyor. Sipariş
 * bildirimlerindeki desenin aynısı (ADR-013).
 *
 * ═══ AYNI HATIRLATMA İKİ KEZ YAZILAMAZ ═══
 *
 * Önce `memberships.renewal_reminder_for_billing_at` KOŞULLU olarak
 * işaretleniyor; bildirim ancak güncelleme tuttuysa yazılıyor. İki sekme aynı
 * anda ekranı açarsa ikincisinin güncellemesi 0 satır etkiler. "Önce bildirim
 * var mı diye bak, yoksa yaz" iki adımdır ve tam da bu yarışı açık bırakırdı
 * (adım 11'in dersi).
 */

type Client = Prisma.TransactionClient | typeof prisma;

const copy = messages.notifications.membership;

/**
 * Yenileme hatırlatmasını (gerekiyorsa) yazar ve yazılan bildirim sayısını döner.
 *
 * Kullanıcının yaşayan üyeliği yoksa hiçbir şey yapmaz — sorgu maliyeti tek
 * bir indeksli okuma.
 */
export async function syncMembershipNotifications(input: {
  userId: string;
  now: Date;
}): Promise<number> {
  const membership = await findLiveMembership(input.userId);

  if (!membership || membership.storedStatus !== "active") return 0;

  const billingAt = membership.nextBillingAt;

  if (
    billingAt === null ||
    !isRenewalReminderDue({
      autoRenewEnabled: membership.autoRenewEnabled,
      nextBillingAt: billingAt,
      now: input.now,
    })
  ) {
    return 0;
  }

  /**
   * Tutar, BEKLEYEN PAKET varsa ondan okunuyor: hatırlatmanın tek işi
   * kullanıcıya "şu tarihte şu kadar çekilecek" demek ve paket değişimi
   * yürürlüğe girmişse çekilecek tutar yeni paketinkidir.
   */
  const plan = await findMembershipPlan(membership.pendingPlanId ?? membership.planId);

  if (!plan) return 0;

  const written = await prisma.$transaction(async (tx) => {
    const claimed = await claimRenewalReminder({ membershipId: membership.id, billingAt }, tx);

    if (!claimed) return 0;

    await createNotification(
      {
        userId: input.userId,
        type: "membership_renewal_reminder",
        title: copy.reminderTitle,
        body: copy.reminderBody(formatIstanbulDate(billingAt), formatTry(plan.monthlyPriceKurus)),
        relatedType: "membership",
        relatedId: membership.id,
      },
      tx,
    );

    return 1;
  });

  return written;
}

/**
 * "Tahsilat yapılamadı" bildirimi.
 *
 * Yenilemenin TRANSACTION'I İÇİNDE çağrılıyor: üyelik `ödeme bekliyor`a
 * geçip bildirim yazılmadan çökme olursa kullanıcı durumu görür ama sebebini
 * hiç öğrenemezdi.
 */
export async function notifyMembershipPaymentFailed(
  input: { userId: string; membershipId: string; paymentDueBy: Date },
  client: Client,
): Promise<void> {
  await createNotification(
    {
      userId: input.userId,
      type: "membership_payment_failed",
      title: copy.paymentFailedTitle,
      body: copy.paymentFailedBody(formatIstanbulDate(input.paymentDueBy)),
      relatedType: "membership",
      relatedId: input.membershipId,
    },
    client,
  );
}

/**
 * ⚠️ İPTAL BİLDİRİMİ BİLEREK YOK.
 *
 * `NotificationType` enum'unda karşılığı olan bir değer bulunmuyor
 * (`membership_renewal_reminder` ve `membership_payment_failed` var).
 * Var olan bir enum değerini "yakın" diye başka bir anlamda kullanmak,
 * bildirim türüne göre dallanacak her kodu yanıltırdı; yeni bir enum değeri
 * eklemek ise PRD §5.6'nın istemediği bir şema değişikliği olurdu.
 *
 * Kullanıcı iptali zaten anında görüyor: ekranda bildirim balonu çıkıyor ve
 * üyelik kartı "iptal edildi, şu tarihe kadar kullanabilirsiniz" diyor.
 */
