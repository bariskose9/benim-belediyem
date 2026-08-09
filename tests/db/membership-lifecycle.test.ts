import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MEMBERSHIP_PAYMENT_GRACE_DAYS } from "@/config/constants";
import { NoActiveMembershipError, SamePlanError } from "@/features/gym/errors";
import {
  findLiveMembership,
  findOwnedMembership,
} from "@/features/gym/repositories/membership.repository";
import { addCalendarMonths, addDays } from "@/features/gym/services/billing-period";
import { renewMembershipPeriod } from "@/features/gym/services/membership-billing";
import {
  cancelUserMembership,
  changeMembershipPlan,
} from "@/features/gym/services/membership-change.service";
import { startMembership } from "@/features/gym/services/membership-purchase.service";
import { deriveMembershipState } from "@/features/gym/services/membership-state";
import { getMembershipPageData } from "@/features/gym/services/membership-view";
import { listNotifications } from "@/features/notifications/services/notification.service";
import { hashActorIp, rateLimitKey, resetRateLimit } from "@/lib/rate-limit";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ÜYELİĞİN YAŞAM DÖNGÜSÜ — PRD §5.6'nın iki kabul kriteri burada kanıtlanıyor:
 *
 *  1. "Yenileme işi iki kez çalışırsa kullanıcıdan iki kez tahsilat yapılmaz"
 *  2. "Paket değişimi mevcut ödenmiş dönemi kısaltmaz veya uzatmaz"
 *
 * Ayrıca erken çıkış farkı, durum türetme (ADR-013) ve yenileme hatırlatması.
 *
 * ZAMAN DIŞARIDAN VERİLİYOR: "bir ay sonra ne olur" sorusu gerçekten
 * beklenerek değil `now` ileri sarılarak cevaplanıyor. Bu, kuralların saf
 * fonksiyonlarda durmasının kazandırdığı şey.
 */

const ACTOR_IP = "203.0.113.71";
const IP_HASH_INPUT = "system-test";
const NOW = new Date("2026-09-01T09:00:00.000Z");

const USER = testId("user", "gym-life");
const OTHER_USER = testId("user", "gym-life-other");

const PLAN_MONTHLY = testId("plan", "life-monthly");
const PLAN_YEARLY = testId("plan", "life-yearly");

const MONTHLY_KURUS = 94_990;
const YEARLY_KURUS = 71_240;
/** Aylık fark: 949,90 − 712,40 = 237,50 */
const MONTHLY_GAP_KURUS = MONTHLY_KURUS - YEARLY_KURUS;

const CARD_OK = "4111111111111111";
const CARD_DECLINED = "4000000000000002";

function card(number: string) {
  return {
    kind: "new" as const,
    number,
    holderName: "Test Personel",
    expMonth: 12,
    expYear: 2030,
    cvv: "123",
    save: false,
  };
}

async function startFor(planId: string, userId = USER) {
  return startMembership({
    userId,
    payload: {
      planId,
      idempotencyKey: testId("idem", planId, userId, Math.random().toString(36).slice(2)),
      acceptedTerms: true,
      card: card(CARD_OK),
    },
    actorIp: ACTOR_IP,
    now: NOW,
  });
}

/** Vadesi gelmiş üyeliği tazeleyip yenileme çekirdeğine verir. */
async function renew(idempotencyKey: string, now: Date) {
  const membership = await findLiveMembership(USER);

  if (!membership) throw new Error("üyelik bekleniyordu");

  return renewMembershipPeriod({
    membership,
    idempotencyKey,
    now,
    actorIpHash: hashActorIp(IP_HASH_INPUT),
  });
}

describe("üyelik yaşam döngüsü", () => {
  beforeEach(async () => {
    await cleanupTestData();
    await seedFixtures();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe("durum okuma anında türetilir (ADR-013)", () => {
    it("vadesi geçmiş üyelik ÖDEME BEKLİYOR sayılır — kolon hâlâ active", async () => {
      const started = await startFor(PLAN_MONTHLY);
      const membership = await findLiveMembership(USER);

      expect(membership?.storedStatus).toBe("active");

      const afterDue = addDays(started.nextBillingAt, 1);
      const state = deriveMembershipState({ ...membership!, now: afterDue });

      expect(state.status).toBe("payment_pending");
      // Ödeme süresi dolmadan erişim kesilmiyor (PRD §5.6: 3 gün).
      expect(state.hasAccess).toBe(true);
    });

    it("ödeme süresi de dolduysa üyelik SONA ERMİŞ sayılır", async () => {
      const started = await startFor(PLAN_MONTHLY);
      const membership = await findLiveMembership(USER);

      const afterGrace = addDays(started.nextBillingAt, MEMBERSHIP_PAYMENT_GRACE_DAYS + 1);
      const state = deriveMembershipState({ ...membership!, now: afterGrace });

      expect(state.status).toBe("expired");
      expect(state.hasAccess).toBe(false);
    });

    /**
     * KORUMAYI ÖLÇEN TEST: zaman koşulu kaldırılırsa bu test kırmızıya döner.
     * Ömrü dolmuş üyelik kapanmasaydı kullanıcı bir daha hiç üye olamazdı.
     */
    it("ömrü dolmuş üyelik kapatılır ve kullanıcı YENİDEN üye olabilir", async () => {
      const started = await startFor(PLAN_MONTHLY);
      const afterGrace = addDays(started.nextBillingAt, MEMBERSHIP_PAYMENT_GRACE_DAYS + 1);

      const again = await startMembership({
        userId: USER,
        payload: {
          planId: PLAN_MONTHLY,
          idempotencyKey: testId("idem", "restart"),
          acceptedTerms: true,
          card: card(CARD_OK),
        },
        actorIp: ACTOR_IP,
        now: afterGrace,
      });

      expect(again.membershipId).not.toBe(started.membershipId);

      const old = await prisma.membership.findUniqueOrThrow({
        where: { id: started.membershipId },
      });

      expect(old.status).toBe("expired");
      expect(old.activeUserId).toBeNull();
    });
  });

  describe("yenileme tahsilatı", () => {
    it("vadesi gelen dönem tahsil edilir ve vade bir ay ilerler", async () => {
      const started = await startFor(PLAN_MONTHLY);

      const outcome = await renew(testId("idem", "renew-1"), started.nextBillingAt);

      expect(outcome).toMatchObject({ status: "charged", amountKurus: MONTHLY_KURUS });

      const membership = await findLiveMembership(USER);

      expect(membership?.nextBillingAt?.toISOString()).toBe("2026-11-01T09:00:00.000Z");
    });

    /** PRD §5.6 KABUL KRİTERİ: görev iki kez koşarsa ikinci tahsilat olmaz. */
    it("aynı dönem İKİ KEZ çalıştırılsa da tek tahsilat yazılır", async () => {
      const started = await startFor(PLAN_MONTHLY);
      const membership = await findLiveMembership(USER);

      const first = await renewMembershipPeriod({
        membership: membership!,
        idempotencyKey: testId("idem", "double-1"),
        now: started.nextBillingAt,
        actorIpHash: hashActorIp(IP_HASH_INPUT),
      });

      // İkinci çağrı AYNI (bayat) üyelik satırıyla geliyor — görev iki kez
      // koştuğunda tam olarak bu olur.
      const second = await renewMembershipPeriod({
        membership: membership!,
        idempotencyKey: testId("idem", "double-2"),
        now: started.nextBillingAt,
        actorIpHash: hashActorIp(IP_HASH_INPUT),
      });

      expect(first.status).toBe("charged");
      expect(second.status).toBe("skipped");

      const renewals = await prisma.membershipPayment.count({
        where: { membershipId: started.membershipId, kind: "renewal", status: "success" },
      });

      // İlk ay + bir yenileme = 2. Üçüncü bir satır yazılmadı.
      expect(renewals).toBe(2);
    });

    /**
     * PRD §5.6: kart reddedilirse üyelik `ödeme bekliyor`a geçer ve bildirim gider.
     *
     * ═══ KART NASIL "REDDEDİLİR" HÂLE GETİRİLİYOR ═══
     * Yenileme her zaman KAYITLI karttan çekiliyor ve kayıtlı kartın numarası
     * hiç saklanmıyor; sahte sağlayıcı bu yüzden sonucu SON 4 HANEDEN okuyor
     * (`mock-payment-provider.ts`). Üyelik reddedilen kartla hiç
     * başlatılamayacağı için ilk ay geçerli kartla ödeniyor, sonra kaydın son
     * 4 hanesi reddedilen kartınkine çevriliyor — gerçek hayatta kartın
     * bloke olmasının karşılığı.
     */
    it("kart reddedilirse üyelik ÖDEME BEKLİYOR olur ve bildirim yazılır", async () => {
      const started = await startFor(PLAN_MONTHLY);

      await prisma.savedCard.updateMany({
        where: { userId: USER },
        data: { last4: CARD_DECLINED.slice(-4) },
      });

      const outcome = await renew(testId("idem", "declined"), started.nextBillingAt);

      expect(outcome).toMatchObject({ status: "declined" });

      const membership = await findLiveMembership(USER);

      expect(membership?.storedStatus).toBe("payment_pending");

      const failed = await prisma.membershipPayment.findFirst({
        where: { membershipId: started.membershipId, status: "failed" },
      });

      expect(failed).not.toBeNull();

      const notifications = await listNotifications({ userId: USER, now: started.nextBillingAt });

      expect(notifications.some((row) => row.type === "membership_payment_failed")).toBe(true);
    });
  });

  describe("yenileme hatırlatması", () => {
    it("vadeden 3 gün önce YAZILIR ve ikinci kez yazılmaz", async () => {
      const started = await startFor(PLAN_MONTHLY);
      const threeDaysBefore = addDays(started.nextBillingAt, -2);

      const first = await listNotifications({ userId: USER, now: threeDaysBefore });
      const second = await listNotifications({ userId: USER, now: threeDaysBefore });

      const reminders = second.filter((row) => row.type === "membership_renewal_reminder");

      expect(first.some((row) => row.type === "membership_renewal_reminder")).toBe(true);
      // İki okumada da tek satır: koşullu güncelleme ikinciyi engelledi.
      expect(reminders).toHaveLength(1);
    });

    it("vade uzaksa hatırlatma YAZILMAZ", async () => {
      await startFor(PLAN_MONTHLY);

      const notifications = await listNotifications({ userId: USER, now: NOW });

      expect(notifications.some((row) => row.type === "membership_renewal_reminder")).toBe(false);
    });
  });

  describe("paket değişimi", () => {
    /** PRD §5.6 KABUL KRİTERİ: ödenmiş dönem kısalmaz veya uzamaz. */
    it("değişim SIRAYA alınır; vade ve mevcut paket DEĞİŞMEZ", async () => {
      const started = await startFor(PLAN_MONTHLY);
      const membership = await findLiveMembership(USER);

      const result = await changeMembershipPlan({
        userId: USER,
        membershipId: membership!.id,
        payload: { pendingPlanId: PLAN_YEARLY, idempotencyKey: testId("idem", "change-1") },
        actorIp: ACTOR_IP,
        now: NOW,
      });

      expect(result.pendingPlanId).toBe(PLAN_YEARLY);
      expect(result.effectiveAt?.toISOString()).toBe(started.nextBillingAt.toISOString());

      const after = await findLiveMembership(USER);

      expect(after?.planId).toBe(PLAN_MONTHLY);
      expect(after?.nextBillingAt?.toISOString()).toBe(started.nextBillingAt.toISOString());
    });

    it("değişim BİR SONRAKİ tahsilatta yürürlüğe girer ve yeni tutar çekilir", async () => {
      const started = await startFor(PLAN_MONTHLY);
      const membership = await findLiveMembership(USER);

      await changeMembershipPlan({
        userId: USER,
        membershipId: membership!.id,
        payload: { pendingPlanId: PLAN_YEARLY, idempotencyKey: testId("idem", "change-2") },
        actorIp: ACTOR_IP,
        now: NOW,
      });

      const outcome = await renew(testId("idem", "renew-after-change"), started.nextBillingAt);

      expect(outcome).toMatchObject({ status: "charged", amountKurus: YEARLY_KURUS });

      const after = await findLiveMembership(USER);

      expect(after?.planId).toBe(PLAN_YEARLY);
      expect(after?.pendingPlanId).toBeNull();
      // Taahhüt, değişimin yürürlüğe girdiği tarihten başlar (PRD §5.6).
      expect(after?.commitmentEndsAt?.toISOString()).toBe(
        addCalendarMonths(started.nextBillingAt, 12).toISOString(),
      );
    });

    it("sıradaki değişim iptal edilebilir", async () => {
      await startFor(PLAN_MONTHLY);
      const membership = await findLiveMembership(USER);

      await changeMembershipPlan({
        userId: USER,
        membershipId: membership!.id,
        payload: { pendingPlanId: PLAN_YEARLY, idempotencyKey: testId("idem", "change-3") },
        actorIp: ACTOR_IP,
        now: NOW,
      });

      await changeMembershipPlan({
        userId: USER,
        membershipId: membership!.id,
        payload: { pendingPlanId: null, idempotencyKey: testId("idem", "change-4") },
        actorIp: ACTOR_IP,
        now: NOW,
      });

      const after = await findLiveMembership(USER);

      expect(after?.pendingPlanId).toBeNull();
    });

    it("aynı pakete geçilemez", async () => {
      await startFor(PLAN_MONTHLY);
      const membership = await findLiveMembership(USER);

      await expect(
        changeMembershipPlan({
          userId: USER,
          membershipId: membership!.id,
          payload: { pendingPlanId: PLAN_MONTHLY, idempotencyKey: testId("idem", "same") },
          actorIp: ACTOR_IP,
          now: NOW,
        }),
      ).rejects.toBeInstanceOf(SamePlanError);
    });
  });

  describe("iptal ve erken çıkış farkı", () => {
    it("taahhütsüz pakette fark YOKTUR; erişim dönem sonuna kadar sürer", async () => {
      const started = await startFor(PLAN_MONTHLY);
      const membership = await findLiveMembership(USER);

      const result = await cancelUserMembership({
        userId: USER,
        membershipId: membership!.id,
        payload: { acknowledgedFeeKurus: 0, idempotencyKey: testId("idem", "cancel-1") },
        actorIp: ACTOR_IP,
        now: NOW,
      });

      expect(result.feeKurus).toBe(0);
      expect(result.accessEndsAt?.toISOString()).toBe(started.nextBillingAt.toISOString());

      const after = await findLiveMembership(USER);
      const state = deriveMembershipState({ ...after!, now: NOW });

      expect(after?.storedStatus).toBe("cancelled");
      expect(state.status).toBe("cancelled");
      expect(state.hasAccess).toBe(true);
    });

    /**
     * PRD §5.6: "o güne kadar kullanılan aylar TAAHHÜTSÜZ FİYATTAN yeniden
     * hesaplanır ve fark tahsil edilir."
     *
     * İlk ay + bir yenileme = 2 ödenmiş ay → 2 × 237,50 = 475,00
     */
    it("taahhütlü pakette ödenen aylar taahhütsüz fiyattan yeniden hesaplanır", async () => {
      const started = await startFor(PLAN_YEARLY);

      await renew(testId("idem", "renew-yearly"), started.nextBillingAt);

      const membership = await findLiveMembership(USER);
      const cancelAt = addDays(started.nextBillingAt, 5);

      const result = await cancelUserMembership({
        userId: USER,
        membershipId: membership!.id,
        payload: {
          acknowledgedFeeKurus: MONTHLY_GAP_KURUS * 2,
          idempotencyKey: testId("idem", "cancel-fee"),
        },
        actorIp: ACTOR_IP,
        now: cancelAt,
      });

      expect(result.feeKurus).toBe(MONTHLY_GAP_KURUS * 2);
      expect(result.feeCharged).toBe(true);

      const fee = await prisma.membershipPayment.findFirst({
        where: { membershipId: started.membershipId, kind: "early_exit_fee" },
      });

      expect(fee?.status).toBe("success");
      expect(fee?.amount.toFixed(2)).toBe("475.00");
    });

    /**
     * KORUMAYI ÖLÇEN TEST: koşullu güncelleme kaldırılırsa ikinci iptal de
     * geçer ve fark İKİ KEZ tahsil edilir.
     */
    it("ikinci iptal isteği hiçbir şey değiştirmez ve fark iki kez alınmaz", async () => {
      const started = await startFor(PLAN_YEARLY);
      const membership = await findLiveMembership(USER);
      const cancelAt = addDays(NOW, 5);

      await cancelUserMembership({
        userId: USER,
        membershipId: membership!.id,
        payload: {
          acknowledgedFeeKurus: MONTHLY_GAP_KURUS,
          idempotencyKey: testId("idem", "cancel-a"),
        },
        actorIp: ACTOR_IP,
        now: cancelAt,
      });

      await expect(
        cancelUserMembership({
          userId: USER,
          membershipId: membership!.id,
          payload: {
            acknowledgedFeeKurus: MONTHLY_GAP_KURUS,
            idempotencyKey: testId("idem", "cancel-b"),
          },
          actorIp: ACTOR_IP,
          now: cancelAt,
        }),
      ).rejects.toBeTruthy();

      const fees = await prisma.membershipPayment.count({
        where: { membershipId: started.membershipId, kind: "early_exit_fee" },
      });

      expect(fees).toBe(1);
    });

    /**
     * PRD §5.6: "Taahhüt bitince üyelik taahhütsüz aylık pakete döner" —
     * yani sözünü tutan kullanıcıdan fark alınmaz.
     *
     * Üyelik 12 ay boyunca GERÇEKTEN yenileniyor. Kestirme yapıp saati
     * doğrudan 13 ay ileri almak, aradaki tahsilatlar hiç yapılmadığı için
     * üyeliği pasifleştirirdi (ilk denemede tam olarak bu oldu) — ve o
     * senaryo, taahhüdünü tamamlamış bir üyeyi değil, ödemeyi bırakmış birini
     * ölçerdi.
     */
    it("taahhüt bittikten sonra iptalde fark alınmaz", async () => {
      const started = await startFor(PLAN_YEARLY);

      for (let month = 1; month <= 12; month += 1) {
        const current = await findLiveMembership(USER);

        const outcome = await renewMembershipPeriod({
          membership: current!,
          idempotencyKey: testId("idem", "full-term", month),
          now: current!.nextBillingAt!,
          actorIpHash: hashActorIp(IP_HASH_INPUT),
        });

        expect(outcome.status).toBe("charged");
      }

      const membership = await findLiveMembership(USER);
      const afterCommitment = addDays(addCalendarMonths(NOW, 12), 1);

      expect(started.commitmentEndsAt?.toISOString()).toBe(
        addCalendarMonths(NOW, 12).toISOString(),
      );

      const result = await cancelUserMembership({
        userId: USER,
        membershipId: membership!.id,
        payload: { acknowledgedFeeKurus: 0, idempotencyKey: testId("idem", "cancel-late") },
        actorIp: ACTOR_IP,
        now: afterCommitment,
      });

      expect(result.feeKurus).toBe(0);

      const fees = await prisma.membershipPayment.count({
        where: { membershipId: started.membershipId, kind: "early_exit_fee" },
      });

      expect(fees).toBe(0);
    });

    /** BAŞKASININ ÜYELİĞİ: kaydın varlığı sızdırılmadan reddedilir (IDOR). */
    it("başkasının üyeliği iptal edilemez", async () => {
      const started = await startFor(PLAN_MONTHLY);

      await expect(
        cancelUserMembership({
          userId: OTHER_USER,
          membershipId: started.membershipId,
          payload: { acknowledgedFeeKurus: 0, idempotencyKey: testId("idem", "idor") },
          actorIp: ACTOR_IP,
          now: NOW,
        }),
      ).rejects.toBeInstanceOf(NoActiveMembershipError);

      const still = await findOwnedMembership({
        membershipId: started.membershipId,
        userId: USER,
      });

      expect(still?.storedStatus).toBe("active");
    });

    it("üyelik ekranı ödeme geçmişini ve erken çıkış tutarını verir", async () => {
      await startFor(PLAN_YEARLY);

      const page = await getMembershipPageData({ userId: USER, now: addDays(NOW, 1) });

      expect(page.payments).toHaveLength(1);
      // Tek ay ödendi → fark bir aylık.
      expect(page.active?.earlyExit.feeKurus).toBe(MONTHLY_GAP_KURUS);
      expect(page.active?.state.isUnderCommitment).toBe(true);
    });
  });
});

async function seedFixtures(): Promise<void> {
  await resetRateLimit(rateLimitKey("membership_write", "user", USER));
  await resetRateLimit(rateLimitKey("membership_write", "user", OTHER_USER));

  await prisma.user.createMany({
    data: [USER, OTHER_USER].map((id, index) => ({
      id,
      fullName: `Test Personel ${index + 1}`,
      email: `${id}@ornek.test`,
      isStaff: true,
      isSeedData: true,
    })),
  });

  await prisma.membershipPlan.createMany({
    data: [
      {
        id: PLAN_MONTHLY,
        name: testId("Aylık (Taahhütsüz)"),
        commitmentMonths: 0,
        monthlyPrice: "949.90",
        isSeedData: true,
      },
      {
        id: PLAN_YEARLY,
        name: testId("Yıllık"),
        commitmentMonths: 12,
        monthlyPrice: "712.40",
        isSeedData: true,
      },
    ],
  });
}
