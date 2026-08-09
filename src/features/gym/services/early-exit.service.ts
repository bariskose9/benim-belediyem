import {
  EarlyExitFeeChangedError,
  MembershipInsufficientFundsError,
  MembershipPaymentDeclinedError,
} from "@/features/gym/errors";
import {
  countPaidMonths,
  createMembershipPayment,
  hasSettledEarlyExitFee,
} from "@/features/gym/repositories/membership.repository";
import { listMembershipPlans } from "@/features/gym/repositories/membership-plan.repository";
import { calculateEarlyExitFeeKurus, findBasePlan } from "@/features/gym/services/plan-pricing";
import type { MembershipPlanRow, MembershipRow } from "@/features/gym/types";
import { attemptPayment } from "@/features/payment/providers/mock-payment-provider";
import { findOwnedSavedCard } from "@/features/payment/repositories/payment.repository";
import { recordAuditLog } from "@/lib/audit";

/**
 * ERKEN ÇIKIŞ FARKI — hesabı ve tahsilatı (PRD §5.6).
 *
 * ═══ TEK DOSYA, İKİ ÇAĞIRAN ═══
 *
 * Fark iki işlemde doğuyor: üyeliği iptal etmek ve taahhütsüz pakete düşmek.
 * İkisi de aynı hesabı ve aynı tahsilatı kullanıyor; ayrı ayrı yazılsalardı
 * biri düzeltildiğinde diğerinin unutulması an meselesiydi.
 *
 * ⛔ TUTAR SUNUCUDA HESAPLANIR. İstemcinin gönderdiği `acknowledgedFeeKurus`
 * tahsil edilmez; yalnızca "kullanıcının baktığı ekran güncel miydi" diye
 * karşılaştırılır (sepetteki `expectedTotalKurus` ile aynı desen).
 */

export type EarlyExitQuote = {
  readonly feeKurus: number;
  /** Farkın çarpanı — ekranda "ödediğiniz N ay" diye geçiyor. */
  readonly paidMonths: number;
  readonly currentPlan: MembershipPlanRow | undefined;
  readonly basePlan: MembershipPlanRow | undefined;
  /** Taahhütsüz paketle aradaki aylık fark — satın alma ekranı bunu gösteriyor. */
  readonly monthlyGapKurus: number;
};

/**
 * Kullanıcı şimdi çıksa ne öderdi.
 *
 * Sayfa da servis de aynı fonksiyonu çağırıyor: ekranda gösterilen tutar ile
 * tahsil edilen tutarın aynı hesaptan gelmesi, "onayladığım rakam bu değildi"
 * durumunun tek gerçek panzehiri.
 */
export async function quoteEarlyExitFee(input: {
  membership: MembershipRow;
  now: Date;
}): Promise<EarlyExitQuote> {
  const plans = await listMembershipPlans();
  const currentPlan = plans.find((plan) => plan.id === input.membership.planId);
  const basePlan = findBasePlan(plans);

  const monthlyGapKurus =
    basePlan && currentPlan
      ? Math.max(0, basePlan.monthlyPriceKurus - currentPlan.monthlyPriceKurus)
      : 0;

  if (!currentPlan || !basePlan) {
    return { feeKurus: 0, paidMonths: 0, currentPlan, basePlan, monthlyGapKurus };
  }

  // Fark bir kez alınır: daha önce tahsil edildiyse yeniden hesaplanmaz.
  if (await hasSettledEarlyExitFee(input.membership.id)) {
    return { feeKurus: 0, paidMonths: 0, currentPlan, basePlan, monthlyGapKurus };
  }

  const paidMonths = await countPaidMonths(input.membership.id);

  const feeKurus = calculateEarlyExitFeeKurus({
    paidMonths,
    baseMonthlyKurus: basePlan.monthlyPriceKurus,
    planMonthlyKurus: currentPlan.monthlyPriceKurus,
    commitmentMonths: currentPlan.commitmentMonths,
    commitmentEndsAt: input.membership.commitmentEndsAt,
    now: input.now,
  });

  return { feeKurus, paidMonths, currentPlan, basePlan, monthlyGapKurus };
}

/** Kullanıcının onayladığı tutar ile sunucunun hesabı tutuyor mu. */
export function assertAcknowledgedFee(input: {
  quotedKurus: number;
  acknowledgedKurus: number | undefined;
}): void {
  if (input.quotedKurus === 0) return;
  if (input.acknowledgedKurus !== input.quotedKurus) throw new EarlyExitFeeChangedError();
}

export type EarlyExitChargeOutcome = "charged" | "not_required" | "failed";

/**
 * Farkı kayıtlı karttan TEK SEFERDE tahsil eder ve kaydını yazar.
 *
 * `throwOnFailure` iki çağıranın farkını taşıyor:
 *  · Paket düşürme → tahsilat başarısızsa DEĞİŞİM YAPILMAZ, istisna fırlar.
 *    Değişim henüz gerçekleşmediği için geri alınacak bir şey yok.
 *  · İptal        → iptal ZATEN gerçekleşti (koşullu güncelleme onu üstlendi);
 *    burada istisna fırlatmak kullanıcının istediği iptali geri almazdı ama
 *    ona "işlem başarısız" derdi. Onun yerine başarısız deneme kaydediliyor.
 *
 * `period_start` olarak İŞLEM ANI yazılıyor: bu bir aylık dönem değil, tek
 * seferlik bir düzeltme. `unique(membership_id, period_start)` ile çakışması
 * için tahsilatın milisaniyesi bir yenileme vadesiyle birebir aynı olmalıydı.
 */
export async function chargeEarlyExitFee(input: {
  membership: MembershipRow;
  feeKurus: number;
  idempotencyKey: string;
  actorIpHash: string;
  now: Date;
  throwOnFailure: boolean;
}): Promise<EarlyExitChargeOutcome> {
  if (input.feeKurus <= 0) return "not_required";

  const card = input.membership.savedCardId
    ? await findOwnedSavedCard({
        savedCardId: input.membership.savedCardId,
        userId: input.membership.userId,
      })
    : null;

  const result = card
    ? await attemptPayment({
        cardNumber: "",
        cardLast4: card.last4,
        amountKurus: input.feeKurus,
      })
    : ({ status: "declined" } as const);

  await createMembershipPayment({
    membershipId: input.membership.id,
    periodStart: input.now,
    periodEnd: input.now,
    amountKurus: input.feeKurus,
    kind: "early_exit_fee",
    status: result.status === "success" ? "success" : "failed",
    attemptedAt: input.now,
    idempotencyKey: input.idempotencyKey,
  }).catch((error: unknown) => {
    // Aynı anahtarla ikinci deneme: kayıt zaten var, yeni bir şey yazılmaz.
    if ((error as { code?: string }).code !== "P2002") throw error;

    return null;
  });

  await recordAuditLog({
    userId: input.membership.userId,
    action: "membership_payment",
    entityType: "membership",
    entityId: input.membership.id,
    ipHash: input.actorIpHash,
  });

  if (result.status === "success") return "charged";

  if (!input.throwOnFailure) return "failed";

  throw result.status === "insufficient_funds"
    ? new MembershipInsufficientFundsError()
    : new MembershipPaymentDeclinedError();
}
