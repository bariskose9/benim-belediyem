import {
  findLiveMembership,
  listMembershipPayments,
} from "@/features/gym/repositories/membership.repository";
import {
  findMembershipPlan,
  listMembershipPlans,
} from "@/features/gym/repositories/membership-plan.repository";
import { quoteEarlyExitFee, type EarlyExitQuote } from "@/features/gym/services/early-exit.service";
import {
  deriveMembershipState,
  type MembershipState,
} from "@/features/gym/services/membership-state";
import { toPlanOffers } from "@/features/gym/services/plan-pricing";
import type {
  MembershipPaymentRow,
  MembershipPlanOffer,
  MembershipPlanRow,
  MembershipRow,
} from "@/features/gym/types";
import { syncMembershipNotifications } from "@/features/notifications/services/membership-notification.service";
import { listSavedCards } from "@/features/profile/repositories/saved-card.repository";

/**
 * Ekranların OKUMA yolu — sayfalar repository'ye doğrudan inmiyor.
 *
 * ═══ DURUM HER ZAMAN TÜRETİLEREK VERİLİYOR ═══
 * Hiçbir sayfa `memberships.status` kolonunu görmüyor; bu dosya kolonu
 * `deriveMembershipState`'ten geçirip `MembershipState` olarak veriyor
 * (ADR-013 deseni). Kolona doğrudan bakan bir ekran, vadesi geçmiş üyeliği
 * "aktif" gösterirdi.
 *
 * ═══ BİLDİRİM SENKRONU BURADA ═══
 * Yenileme hatırlatması tembel yazılıyor; kullanıcı spor salonu sayfasına
 * baktığında da, bildirim ekranına baktığında da yazılabilmeli. Sipariş
 * bildirimlerindeki desenle aynı: ÖNCE YAZ, SONRA OKU.
 */

export type ActiveMembershipView = {
  readonly membership: MembershipRow;
  readonly state: MembershipState;
  readonly plan: MembershipPlanRow;
  readonly pendingPlan: MembershipPlanRow | null;
  readonly nextAmountKurus: number;
  readonly earlyExit: EarlyExitQuote;
};

export type GymPageData = {
  readonly plans: MembershipPlanOffer[];
  readonly active: ActiveMembershipView | null;
};

export async function getGymPageData(input: { userId: string; now: Date }): Promise<GymPageData> {
  await syncMembershipNotifications({ userId: input.userId, now: input.now });

  const [plans, active] = await Promise.all([listMembershipPlans(), loadActiveMembership(input)]);

  return { plans: toPlanOffers(plans), active };
}

export type MembershipPageData = GymPageData & {
  readonly payments: MembershipPaymentRow[];
};

export async function getMembershipPageData(input: {
  userId: string;
  now: Date;
}): Promise<MembershipPageData> {
  const page = await getGymPageData(input);
  const payments = page.active ? await listMembershipPayments(page.active.membership.id) : [];

  return { ...page, payments };
}

/** Satın alma ekranının ihtiyacı: seçilen paket, kayıtlı kartlar ve mevcut üyelik. */
export async function getPurchasePageData(input: { userId: string; planId: string; now: Date }) {
  const [plans, plan, savedCards, active] = await Promise.all([
    listMembershipPlans(),
    findMembershipPlan(input.planId),
    listSavedCards(input.userId),
    loadActiveMembership(input),
  ]);

  const offers = toPlanOffers(plans);

  return {
    plan: offers.find((offer) => offer.id === plan?.id) ?? null,
    basePlanMonthlyKurus:
      offers.find((offer) => offer.commitmentMonths === 0)?.monthlyPriceKurus ?? 0,
    savedCards,
    active,
  };
}

async function loadActiveMembership(input: {
  userId: string;
  now: Date;
}): Promise<ActiveMembershipView | null> {
  const membership = await findLiveMembership(input.userId);

  if (!membership) return null;

  const [plan, pendingPlan] = await Promise.all([
    findMembershipPlan(membership.planId),
    membership.pendingPlanId ? findMembershipPlan(membership.pendingPlanId) : Promise.resolve(null),
  ]);

  // Paket silinmişse (olmaması gereken durum) üyeliği hiç göstermemek, yarım
  // bir kart çizmekten dürüst: ekran "aktif üyeliğiniz yok" der.
  if (!plan) return null;

  return {
    membership,
    state: deriveMembershipState({ ...membership, now: input.now }),
    plan,
    pendingPlan,
    /** Bir sonraki tahsilatta çekilecek tutar: bekleyen paket varsa onunki. */
    nextAmountKurus: (pendingPlan ?? plan).monthlyPriceKurus,
    earlyExit: await quoteEarlyExitFee({ membership, now: input.now }),
  };
}
