import {
  MEMBERSHIP_BILLING_PERIOD_MONTHS,
  MEMBERSHIP_PAYMENT_GRACE_DAYS,
} from "@/config/constants";
import {
  advanceBillingPeriod,
  createMembershipPayment,
  markPaymentPending,
} from "@/features/gym/repositories/membership.repository";
import { findMembershipPlan } from "@/features/gym/repositories/membership-plan.repository";
import { addCalendarMonths, addDays } from "@/features/gym/services/billing-period";
import type { MembershipRow } from "@/features/gym/types";
import { notifyMembershipPaymentFailed } from "@/features/notifications/services/membership-notification.service";
import { attemptPayment } from "@/features/payment/providers/mock-payment-provider";
import { findOwnedSavedCard } from "@/features/profile/repositories/saved-card.repository";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

/**
 * BİR DÖNEMİ TAHSİL EDEN ÇEKİRDEK (PRD §5.6 "Otomatik tahsilat zamanı").
 *
 * ═══ NEDEN AYRI DOSYA VE NEDEN "ÇAĞIRILABİLİR" ═══
 *
 * Adım 12 yalnızca ilk ayı tahsil ediyor; ikinci ve sonraki aylar adım
 * 16'daki planlı görevin işi. O görev yazılırken bu mantığın kopyalanması
 * gerekmemeli — kopya, iki yerden birinin düzeltilip diğerinin unutulmasının
 * en kısa yolu. Bu fonksiyon HTTP, oturum ve ekran bilmiyor: üyelik satırını,
 * saati ve bir idempotency anahtarını alıyor, sonucu döndürüyor. Görev de,
 * test de aynı kapıdan giriyor.
 *
 * ═══ İKİ KEZ ÇALIŞIRSA NE OLUR ═══
 *
 * Hiçbir şey. İki kalkan var ve ikisi de VERİTABANINDA:
 *  1. `unique(membership_id, period_start)` → aynı dönem ikinci kez yazılamaz
 *  2. `advanceBillingPeriod` koşulu (`WHERE next_billing_at = <beklenen>`)
 *     → dönem ikinci kez ilerletilemez
 * PRD §5.6 kabul kriteri tam olarak bunu istiyor: "Yenileme işi iki kez
 * çalışırsa kullanıcıdan iki kez tahsilat yapılmaz."
 *
 * ⛔ TUTAR PAKET SATIRINDAN OKUNUR, çağırandan alınmaz.
 */

export type RenewalOutcome =
  | { status: "charged"; amountKurus: number; nextBillingAt: Date }
  | { status: "declined"; reason: "declined" | "insufficient_funds" }
  /** Dönem zaten işlenmiş ya da üyelik bu arada değişmiş — sessizce atlanır. */
  | { status: "skipped" };

export type RenewMembershipInput = {
  membership: MembershipRow;
  /** Aynı dönem için tekrar çağrıldığında AYNI değer verilmeli. */
  idempotencyKey: string;
  now: Date;
  /**
   * Denetim kaydına yazılacak IP özeti (`hashActorIp()` çıktısı).
   *
   * Planlı görevde (adım 16) gerçek bir istemci IP'si yoktur; orada
   * `hashActorIp("system")` gibi sabit bir değer verilir. Düz IP ASLA
   * geçirilmez — `lib/audit.ts` zaten yalnızca özet kabul ediyor.
   */
  actorIpHash: string;
};

/**
 * Üyeliğin vadesi gelmiş dönemini tahsil eder.
 *
 * BEKLEYEN PAKET DEĞİŞİMİ BURADA YÜRÜRLÜĞE GİRER (PRD §5.6: "paket değişimi
 * bir sonraki tahsilat tarihinde yürürlüğe girer"). Yani tahsil edilen tutar
 * yeni paketin tutarıdır ve taahhüt süresi de o tarihten başlar — kural tek
 * bir yerde, tahsilatın kendisinde yaşıyor.
 */
export async function renewMembershipPeriod(input: RenewMembershipInput): Promise<RenewalOutcome> {
  const { membership, now } = input;
  const periodStart = membership.nextBillingAt;

  if (periodStart === null || membership.storedStatus === "expired") return { status: "skipped" };

  const planId = membership.pendingPlanId ?? membership.planId;
  const plan = await findMembershipPlan(planId);

  if (!plan) return { status: "skipped" };

  const periodEnd = addCalendarMonths(periodStart, MEMBERSHIP_BILLING_PERIOD_MONTHS);

  /**
   * KART OLMADAN TAHSİLAT DENENMEZ. Kayıtlı kart silinmişse (yumuşak silme,
   * teknik borç #41) sahte sağlayıcıya boş bir istek göndermek yerine doğrudan
   * "reddedildi" yoluna giriliyor: kullanıcı bildirim alır ve kart günceller.
   */
  const card = membership.savedCardId
    ? await findOwnedSavedCard({ savedCardId: membership.savedCardId, userId: membership.userId })
    : null;

  const result = card
    ? await attemptPayment({
        cardNumber: "",
        cardLast4: card.last4,
        amountKurus: plan.monthlyPriceKurus,
      })
    : ({ status: "declined", transactionId: "" } as const);

  if (result.status !== "success") {
    await recordFailedRenewal({
      input,
      periodStart,
      periodEnd,
      amountKurus: plan.monthlyPriceKurus,
    });

    return {
      status: "declined",
      reason: result.status === "insufficient_funds" ? "insufficient_funds" : "declined",
    };
  }

  const nextBillingAt = periodEnd;

  const advanced = await prisma.$transaction(async (tx) => {
    /**
     * Önce DÖNEM İLERLETİLİYOR, sonra tahsilat yazılıyor.
     *
     * Sıra önemli: koşullu güncelleme tutmazsa (başka biri aynı dönemi zaten
     * işlemiş) hiç yazma yapılmadan çıkılıyor. Ters sırada, ikinci çağrı
     * benzersizlik ihlaline çarpar ve PostgreSQL transaction'ı KOMPLE abort
     * eder — hatayı yakalayıp "zaten yapılmış" demek mümkün olmazdı
     * (adım 11'in dersi).
     */
    const ok = await advanceBillingPeriod(
      {
        membershipId: membership.id,
        fromBillingAt: periodStart,
        nextBillingAt,
        newPlanId: membership.pendingPlanId,
        newCommitmentEndsAt:
          membership.pendingPlanId === null
            ? null
            : plan.commitmentMonths === 0
              ? null
              : addCalendarMonths(periodStart, plan.commitmentMonths),
      },
      tx,
    );

    if (!ok) return false;

    await createMembershipPayment(
      {
        membershipId: membership.id,
        periodStart,
        periodEnd,
        amountKurus: plan.monthlyPriceKurus,
        kind: "renewal",
        status: "success",
        attemptedAt: now,
        idempotencyKey: input.idempotencyKey,
      },
      tx,
    );

    return true;
  });

  if (!advanced) return { status: "skipped" };

  await recordAuditLog({
    userId: membership.userId,
    action: "membership_payment",
    entityType: "membership",
    entityId: membership.id,
    ipHash: input.actorIpHash,
  });

  return { status: "charged", amountKurus: plan.monthlyPriceKurus, nextBillingAt };
}

/**
 * Başarısız denemeyi yazar, üyeliği "ödeme bekliyor"a alır ve bildirimi düşer.
 *
 * ÜÇÜ DE TEK TRANSACTION'DA: durum değişip bildirim yazılmadan çökme olursa
 * kullanıcı ekranda "ödeme bekliyor" görür ama sebebini hiç öğrenemezdi.
 */
async function recordFailedRenewal(context: {
  input: RenewMembershipInput;
  periodStart: Date;
  periodEnd: Date;
  amountKurus: number;
}): Promise<void> {
  const { input, periodStart, periodEnd, amountKurus } = context;
  const membership = input.membership;

  await prisma.$transaction(async (tx) => {
    const marked = await markPaymentPending(
      { membershipId: membership.id, billingAt: periodStart },
      tx,
    );

    // Zaten "ödeme bekliyor"a alınmış: ikinci bir bildirim yazılmaz.
    if (!marked) return;

    await createMembershipPayment(
      {
        membershipId: membership.id,
        periodStart,
        periodEnd,
        amountKurus,
        kind: "renewal",
        status: "failed",
        attemptedAt: input.now,
        idempotencyKey: input.idempotencyKey,
      },
      tx,
    );

    await notifyMembershipPaymentFailed(
      {
        userId: membership.userId,
        membershipId: membership.id,
        paymentDueBy: addDays(periodStart, MEMBERSHIP_PAYMENT_GRACE_DAYS),
      },
      tx,
    );
  });

  await recordAuditLog({
    userId: membership.userId,
    action: "membership_payment",
    entityType: "membership",
    entityId: membership.id,
    ipHash: input.actorIpHash,
  });
}
