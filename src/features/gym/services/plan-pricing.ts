import type { MembershipPlanOffer, MembershipPlanRow } from "@/features/gym/types";

/**
 * Paket fiyatlandırmasının SAF kuralları (PRD §5.6).
 *
 * Veritabanı yok, saat yok, oturum yok — girdisi ne ise çıktısı odur.
 * İki iş kuralı burada:
 *   1. İndirim yüzdesi HESAPLANIR, saklanmaz (data-model.md → `MembershipPlan`)
 *   2. Erken çıkış farkı = kullanılan aylar taahhütsüz fiyattan yeniden hesaplanır
 */

/**
 * Referans paket: TAAHHÜTSÜZ olan (`commitmentMonths === 0`).
 *
 * İndirim de erken çıkış farkı da buna göre ölçülüyor. Sabit bir isimle
 * (`"Aylık (Taahhütsüz)"`) aramak, paketin adı değiştiği gün fiyatlandırmayı
 * sessizce bozardı; taahhüt süresi ise iş kuralının kendisi.
 */
export function findBasePlan<T extends MembershipPlanRow>(plans: readonly T[]): T | undefined {
  return plans.find((plan) => plan.commitmentMonths === 0);
}

/**
 * Taahhütsüz fiyata göre indirim yüzdesi.
 *
 * AŞAĞI YUVARLANIYOR: %14,9'u "%15" diye göstermek, kullanıcının kendi
 * hesabıyla tutmayan bir sayı vermek olur. Referans paket yoksa ya da fiyat
 * daha yüksekse indirim yoktur — negatif indirim göstermek yerine 0 döner.
 */
export function calculateDiscountPercent(input: {
  baseMonthlyKurus: number;
  planMonthlyKurus: number;
}): number {
  if (input.baseMonthlyKurus <= 0) return 0;
  if (input.planMonthlyKurus >= input.baseMonthlyKurus) return 0;

  const savedKurus = input.baseMonthlyKurus - input.planMonthlyKurus;

  return Math.floor((savedKurus * 100) / input.baseMonthlyKurus);
}

/** Paket listesini ekranın beklediği hâle getirir: fiyat + hesaplanmış indirim. */
export function toPlanOffers(plans: readonly MembershipPlanRow[]): MembershipPlanOffer[] {
  const basePlan = findBasePlan(plans);
  const baseMonthlyKurus = basePlan?.monthlyPriceKurus ?? 0;

  return plans.map((plan) => ({
    ...plan,
    discountPercent: calculateDiscountPercent({
      baseMonthlyKurus,
      planMonthlyKurus: plan.monthlyPriceKurus,
    }),
  }));
}

/**
 * Erken çıkış farkı (PRD §5.6 "Erken çıkış farkı").
 *
 * ═══ KURAL ═══
 * Taahhütlü paket süresi dolmadan bırakılırsa, O GÜNE KADAR TAHSİL EDİLMİŞ
 * aylar taahhütsüz fiyattan yeniden hesaplanır ve aradaki fark tek seferde
 * tahsil edilir. Geçmiş tahsilatlar DEĞİŞTİRİLMEZ (append-only; data-model.md).
 *
 * ═══ NEDEN "TAHSİL EDİLMİŞ AY SAYISI" ═══
 * Kısmi gün/ay hesabı PRD tarafından açıkça reddediliyor: üyelik aylık
 * tahsil ediliyor, dolayısıyla ölçü birimi de ay. Başarısız tahsilatlar
 * sayılmaz — kullanıcı o ayın parasını ödemedi, indirimini de kullanmadı.
 *
 * Taahhüt süresi dolmuşsa fark YOKTUR: kullanıcı sözünü tuttu.
 */
export function calculateEarlyExitFeeKurus(input: {
  /** Başarıyla tahsil edilmiş ay sayısı (`kind = renewal`, `status = success`). */
  paidMonths: number;
  baseMonthlyKurus: number;
  planMonthlyKurus: number;
  commitmentMonths: number;
  commitmentEndsAt: Date | null;
  now: Date;
}): number {
  if (input.commitmentMonths === 0) return 0;
  if (input.commitmentEndsAt !== null && input.now >= input.commitmentEndsAt) return 0;

  const monthlyGapKurus = input.baseMonthlyKurus - input.planMonthlyKurus;

  // İndirimsiz ya da daha pahalı bir pakette fark doğmaz.
  if (monthlyGapKurus <= 0) return 0;

  return monthlyGapKurus * Math.max(0, input.paidMonths);
}
