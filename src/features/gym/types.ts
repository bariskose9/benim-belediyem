import type { MembershipPaymentKind, MembershipPaymentStatus } from "@/generated/prisma/enums";

/**
 * Spor salonu modülünün katmanlar arası ortak tipleri.
 *
 * PARA HER YERDE TAM SAYI KURUŞ (`lib/money.ts`). Prisma'nın `Decimal` tipi
 * bu sınırın gerisinde kalır: repository katmanı okurken `toKurus`, yazarken
 * `toDecimalInput` uygular, servis ve bileşenler `Decimal` hiç görmez.
 */

export type MembershipPlanRow = {
  readonly id: string;
  readonly name: string;
  readonly commitmentMonths: number;
  readonly monthlyPriceKurus: number;
};

/** Ekranda gösterilen paket: fiyatın yanına HESAPLANMIŞ indirim eklenir. */
export type MembershipPlanOffer = MembershipPlanRow & {
  /**
   * Taahhütsüz pakete göre indirim yüzdesi — VERİTABANINDA TUTULMAZ
   * (data-model.md → `MembershipPlan`). Taahhütsüz paketin kendisinde `0`.
   */
  readonly discountPercent: number;
};

export type MembershipPaymentRow = {
  readonly id: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly amountKurus: number;
  readonly kind: MembershipPaymentKind;
  readonly status: MembershipPaymentStatus;
  readonly attemptedAt: Date;
};

/** `memberships` satırının servis katmanına taşınan hâli. */
export type MembershipRow = {
  readonly id: string;
  readonly userId: string;
  readonly planId: string;
  readonly savedCardId: string | null;
  readonly startsAt: Date;
  readonly commitmentEndsAt: Date | null;
  /** ⚠️ EKRANDA GÖRÜNEN DURUM DEĞİL — `deriveMembershipState`'ten geçmeli. */
  readonly storedStatus: "active" | "payment_pending" | "cancelled" | "expired";
  readonly autoRenewEnabled: boolean;
  readonly nextBillingAt: Date | null;
  readonly cancelledAt: Date | null;
  readonly pendingPlanId: string | null;
  readonly pendingPlanEffectiveAt: Date | null;
  readonly renewalReminderForBillingAt: Date | null;
};
