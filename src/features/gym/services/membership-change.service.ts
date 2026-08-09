import {
  MembershipAlreadyProcessedError,
  MembershipNotFoundError,
  MembershipPlanNotFoundError,
  NoActiveMembershipError,
  SamePlanError,
} from "@/features/gym/errors";
import {
  cancelMembership,
  expireLapsedMemberships,
  findLiveMembership,
  schedulePlanChange,
} from "@/features/gym/repositories/membership.repository";
import { findMembershipPlan } from "@/features/gym/repositories/membership-plan.repository";
import type {
  CancelMembershipPayload,
  UpdateMembershipPayload,
} from "@/features/gym/schemas/membership.schema";
import {
  assertAcknowledgedFee,
  chargeEarlyExitFee,
  quoteEarlyExitFee,
} from "@/features/gym/services/early-exit.service";
import { deriveMembershipState } from "@/features/gym/services/membership-state";
import { enforceMembershipWriteBudget } from "@/features/gym/services/membership-purchase.service";
import { recordAuditLog } from "@/lib/audit";
import { hashActorIp } from "@/lib/rate-limit";

/**
 * ÜYELİĞİ DEĞİŞTİRME VE İPTAL ETME (PRD §5.6).
 *
 * ═══ İKİ İŞLEM, TEK ORTAK KURAL ═══
 *
 * Hem iptal hem de taahhütsüz pakete düşme, taahhüt sürerken yapılırsa erken
 * çıkış farkı doğuruyor. Fark hesabı ve tahsilatı `early-exit.service.ts`'te,
 * tek yerde; burada yalnızca "hangi sırayla" sorusu cevaplanıyor.
 *
 * ═══ SIRA NEDEN İKİ İŞLEMDE FARKLI ═══
 *
 * · İPTAL: önce KOŞULLU GÜNCELLEME ile iptal üstlenilir, sonra fark çekilir.
 *   Böylece iki eşzamanlı iptal isteğinden yalnızca biri geçer ve fark bir
 *   kez tahsil edilir. Ters sırada ikisi de tahsilat yapar, sonra biri
 *   güncellemeyi kaybederdi — yani kullanıcıdan iki kez para çekilirdi.
 *
 * · PAKET DÜŞÜRME: önce fark çekilir, sonra değişim sıraya alınır. Burada
 *   geri alınacak bir şey yok: tahsilat başarısızsa değişim hiç yazılmaz.
 */

export type MembershipActionInput<TPayload> = {
  userId: string;
  membershipId: string;
  payload: TPayload;
  actorIp: string;
  now: Date;
};

export type CancelMembershipResult = {
  feeKurus: number;
  feeCharged: boolean;
  accessEndsAt: Date | null;
};

/**
 * Üyeliği iptal eder.
 *
 * ERİŞİM ÖDENMİŞ DÖNEM SONUNA KADAR SÜRER (PRD §5.6): kullanıcı o ayın
 * parasını ödedi. `active_user_id` de bu yüzden burada boşaltılmıyor — üyelik
 * hâlâ yaşıyor ve o süre boyunca ikinci bir üyelik açılmamalı.
 *
 * ⚠️ TAHSİLAT BAŞARISIZ OLURSA İPTAL GERİ ALINMAZ. PRD §5.6 bu durumda
 * üyeliğin "ödeme bekliyor" olmasını istiyor; iptal edilmiş bir üyeliği
 * `payment_pending`e çevirmek kullanıcının açıkça istediği iptali silmek
 * olurdu. Bunun yerine başarısız deneme `membership_payments`'a yazılıyor
 * (append-only denetim kaydı) ve borç görünür kalıyor. Bilinçli sapma —
 * `roadmap.md` teknik borcunda da yazılı.
 */
export async function cancelUserMembership(
  input: MembershipActionInput<CancelMembershipPayload>,
): Promise<CancelMembershipResult> {
  await enforceMembershipWriteBudget(input.userId, input.now);

  const membership = await requireOwnedLiveMembership(input);
  const quote = await quoteEarlyExitFee({ membership, now: input.now });

  assertAcknowledgedFee({
    quotedKurus: quote.feeKurus,
    acknowledgedKurus: input.payload.acknowledgedFeeKurus,
  });

  // İPTALİ ÜSTLEN: kazanan tek bir istek olur, fark bir kez çekilir.
  const claimed = await cancelMembership({
    membershipId: membership.id,
    userId: input.userId,
    now: input.now,
  });

  if (!claimed) throw new MembershipAlreadyProcessedError();

  const ipHash = hashActorIp(input.actorIp);

  const outcome = await chargeEarlyExitFee({
    membership,
    feeKurus: quote.feeKurus,
    idempotencyKey: input.payload.idempotencyKey,
    actorIpHash: ipHash,
    now: input.now,
    throwOnFailure: false,
  });

  await recordAuditLog({
    userId: input.userId,
    action: "membership_cancel",
    entityType: "membership",
    entityId: membership.id,
    ipHash,
  });

  return {
    feeKurus: quote.feeKurus,
    feeCharged: outcome === "charged",
    accessEndsAt: membership.nextBillingAt,
  };
}

export type ChangePlanResult = {
  pendingPlanId: string | null;
  effectiveAt: Date | null;
  feeKurus: number;
};

/**
 * Paketi değiştirir — BİR SONRAKİ TAHSİLAT TARİHİNDE yürürlüğe girmek üzere.
 *
 * PRD §5.6: "Kısmi gün/ay hesabı yapılmaz. Paket değişimi bir sonraki
 * tahsilat tarihinde yürürlüğe girer; ödenmiş ay sonuna kadar eski paket
 * geçerli kalır." Yani bugün hiçbir tutar değişmiyor, hiçbir iade doğmuyor
 * ve kabul kriteri kendiliğinden sağlanıyor: "paket değişimi mevcut ödenmiş
 * dönemi kısaltmaz veya uzatmaz".
 *
 * `pendingPlanId: null` gönderilirse sıradaki değişim iptal edilir (PRD:
 * "değişim yürürlüğe girene kadar iptal edilebilir").
 */
export async function changeMembershipPlan(
  input: MembershipActionInput<UpdateMembershipPayload>,
): Promise<ChangePlanResult> {
  await enforceMembershipWriteBudget(input.userId, input.now);

  const membership = await requireOwnedLiveMembership(input);
  const requestedPlanId = input.payload.pendingPlanId;

  /**
   * Şema `pendingPlanId` alanının gönderilmesini şart koşuyor (`refine`), ama
   * tip düzeyinde hâlâ `undefined` olabiliyor. Kontrol burada tekrar ediliyor
   * çünkü servisi şemadan geçmeden çağıran bir kod (test, ileride planlı
   * görev) sessizce "değişiklik yok" davranışına düşmemeli.
   */
  if (requestedPlanId === undefined) throw new MembershipAlreadyProcessedError();

  if (requestedPlanId === null) {
    const cleared = await schedulePlanChange({
      membershipId: membership.id,
      userId: input.userId,
      pendingPlanId: null,
      effectiveAt: null,
    });

    if (!cleared) throw new MembershipAlreadyProcessedError();

    return { pendingPlanId: null, effectiveAt: null, feeKurus: 0 };
  }

  const targetPlan = await findMembershipPlan(requestedPlanId);

  if (!targetPlan) throw new MembershipPlanNotFoundError();
  if (targetPlan.id === membership.planId) throw new SamePlanError();

  const currentPlan = await findMembershipPlan(membership.planId);
  const state = deriveMembershipState({ ...membership, now: input.now });

  /**
   * TAAHHÜTSÜZE (ya da daha kısa taahhüde) DÜŞME, taahhüt sürerken erken
   * çıkış kuralına tabidir (PRD §5.6). Daha uzun taahhüde geçmek fark
   * doğurmaz: kullanıcı sözünü kısaltmıyor, uzatıyor.
   */
  const isDowngrade =
    currentPlan !== null && targetPlan.commitmentMonths < currentPlan.commitmentMonths;

  const quote =
    isDowngrade && state.isUnderCommitment
      ? await quoteEarlyExitFee({ membership, now: input.now })
      : { feeKurus: 0 };

  assertAcknowledgedFee({
    quotedKurus: quote.feeKurus,
    acknowledgedKurus: input.payload.acknowledgedFeeKurus,
  });

  const ipHash = hashActorIp(input.actorIp);

  // Tahsilat başarısızsa istisna fırlar ve değişim HİÇ yazılmaz.
  await chargeEarlyExitFee({
    membership,
    feeKurus: quote.feeKurus,
    idempotencyKey: input.payload.idempotencyKey,
    actorIpHash: ipHash,
    now: input.now,
    throwOnFailure: true,
  });

  const scheduled = await schedulePlanChange({
    membershipId: membership.id,
    userId: input.userId,
    pendingPlanId: targetPlan.id,
    effectiveAt: membership.nextBillingAt,
  });

  if (!scheduled) throw new MembershipAlreadyProcessedError();

  return {
    pendingPlanId: targetPlan.id,
    effectiveAt: membership.nextBillingAt,
    feeKurus: quote.feeKurus,
  };
}

/**
 * Kullanıcının yaşayan üyeliğini getirir ve istenen kimlikle EŞLEŞTİĞİNİ doğrular.
 *
 * İki ayrı kontrol, iki ayrı gerekçe:
 *  · Ömrü dolmuş üyelikler önce kapatılıyor — kolonun kurala yetişmesi için
 *    (ADR-007 tembel temizlik).
 *  · Adresteki kimlik kullanıcının üyeliğiyle aynı değilse 404 dönüyor,
 *    403 değil: "böyle bir üyelik var ama senin değil" demek kaydın varlığını
 *    sızdırırdı (05-auth-security.md → IDOR).
 */
async function requireOwnedLiveMembership(input: {
  userId: string;
  membershipId: string;
  now: Date;
}) {
  await expireLapsedMemberships({ userId: input.userId, now: input.now });

  const membership = await findLiveMembership(input.userId);

  if (!membership) throw new NoActiveMembershipError();
  if (membership.id !== input.membershipId) throw new MembershipNotFoundError();

  return membership;
}
