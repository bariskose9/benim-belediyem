import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  AlreadyMemberError,
  MembershipInsufficientFundsError,
  MembershipPaymentDeclinedError,
  MembershipPlanNotFoundError,
  MembershipTermsNotAcceptedError,
} from "@/features/gym/errors";
import { findLiveMembership } from "@/features/gym/repositories/membership.repository";
import { startMembership } from "@/features/gym/services/membership-purchase.service";
import { getGymPageData } from "@/features/gym/services/membership-view";
import { rateLimitKey, resetRateLimit } from "@/lib/rate-limit";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ÜYELİK BAŞLATMA — PRD §5.6'nın satın alma kuralları.
 *
 * GERÇEK PostgreSQL'e karşı yazıldı ve bu şart: "aynı anda tek üyelik"
 * kuralını `active_user_id` üzerindeki benzersiz indeks zorluyor, "aynı dönem
 * iki kez tahsil edilemez" kuralını `unique(membership_id, period_start)`
 * zorluyor. Taklit bir istemci ikisini de taklit edemez — yanlış yazılmış bir
 * taklit YANLIŞ YEŞİL gösterirdi.
 *
 * ZAMAN DIŞARIDAN VERİLİYOR: tarihler `now` ileri sarılarak sınanıyor.
 */

const ACTOR_IP = "203.0.113.70";
const NOW = new Date("2026-09-01T09:00:00.000Z");

const USER = testId("user", "gym-buyer");
const OTHER_USER = testId("user", "gym-other");

const PLAN_MONTHLY = testId("plan", "gym-monthly");
const PLAN_YEARLY = testId("plan", "gym-yearly");

const MONTHLY_KURUS = 94_990;
const YEARLY_KURUS = 71_240;

/** `fake-data-guide.md` test kartları: sonuç numaradan belirleniyor. */
const CARD_OK = "4111111111111111";
const CARD_DECLINED = "4000000000000002";
const CARD_NO_FUNDS = "4000000000009995";

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

function payload(overrides: Partial<Parameters<typeof startMembership>[0]["payload"]> = {}) {
  return {
    planId: PLAN_MONTHLY,
    idempotencyKey: testId("idem", Math.random().toString(36).slice(2)),
    acceptedTerms: true as const,
    card: card(CARD_OK),
    ...overrides,
  };
}

async function start(
  overrides: Partial<Parameters<typeof startMembership>[0]["payload"]> = {},
  userId = USER,
) {
  return startMembership({ userId, payload: payload(overrides), actorIp: ACTOR_IP, now: NOW });
}

describe("üyelik başlatma", () => {
  beforeEach(async () => {
    await cleanupTestData();
    await seedFixtures();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("ilk ay TAHSİL EDİLİR ve sonraki vade bir ay sonrasıdır", async () => {
    const result = await start();

    expect(result.chargedKurus).toBe(MONTHLY_KURUS);
    // 1 Eylül + 1 takvim ayı = 1 Ekim (30 gün eklemek 1 Ekim vermezdi).
    expect(result.nextBillingAt.toISOString()).toBe("2026-10-01T09:00:00.000Z");

    const payments = await prisma.membershipPayment.findMany({
      where: { membershipId: result.membershipId },
    });

    expect(payments).toHaveLength(1);
    expect(payments[0]?.kind).toBe("renewal");
    expect(payments[0]?.status).toBe("success");
    expect(payments[0]?.amount.toFixed(2)).toBe("949.90");
  });

  it("taahhütlü pakette taahhüt bitişi paket süresi kadar sonradır", async () => {
    const result = await start({ planId: PLAN_YEARLY });

    expect(result.chargedKurus).toBe(YEARLY_KURUS);
    expect(result.commitmentEndsAt?.toISOString()).toBe("2027-09-01T09:00:00.000Z");
  });

  it("taahhütsüz pakette taahhüt bitişi YOKTUR", async () => {
    const result = await start();

    expect(result.commitmentEndsAt).toBeNull();
  });

  /** PRD §5.6: "Aktif üyelik varken ikinci üyelik alınamaz." */
  it("aktif üyelik varken ikinci üyelik alınamaz", async () => {
    await start();

    await expect(start({ planId: PLAN_YEARLY })).rejects.toBeInstanceOf(AlreadyMemberError);

    const memberships = await prisma.membership.findMany({ where: { userId: USER } });

    expect(memberships).toHaveLength(1);
  });

  /**
   * KURALI VERİTABANI ZORLUYOR — uygulamanın önden yaptığı kontrol değil.
   *
   * İkinci satır doğrudan yazılmaya çalışılıyor: `active_user_id` benzersiz
   * indeksi olmasaydı bu yazma GEÇERDİ ve kullanıcıdan iki ayrı üyelik için
   * iki kez aidat çekilirdi.
   */
  it("ikinci YAŞAYAN üyelik satırı veritabanı seviyesinde yazılamaz", async () => {
    const first = await start();

    expect(first.membershipId).toBeTruthy();

    await expect(
      prisma.membership.create({
        data: {
          id: testId("membership", "gym-duplicate"),
          userId: USER,
          activeUserId: USER,
          planId: PLAN_YEARLY,
          startsAt: NOW,
          nextBillingAt: NOW,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("başka kullanıcı kendi üyeliğini açabilir — kural KULLANICI başınadır", async () => {
    await start();

    const other = await start({ planId: PLAN_YEARLY }, OTHER_USER);

    expect(other.membershipId).toBeTruthy();
  });

  /** PRD §6.2 hata yolları — sonuç test kartından belirleniyor. */
  it("kart REDDEDİLİRSE üyelik hiç açılmaz", async () => {
    await expect(start({ card: card(CARD_DECLINED) })).rejects.toBeInstanceOf(
      MembershipPaymentDeclinedError,
    );

    expect(await findLiveMembership(USER)).toBeNull();
    expect(await prisma.membership.count({ where: { userId: USER } })).toBe(0);
  });

  it("BAKİYE YETERSİZSE üyelik hiç açılmaz", async () => {
    await expect(start({ card: card(CARD_NO_FUNDS) })).rejects.toBeInstanceOf(
      MembershipInsufficientFundsError,
    );

    expect(await prisma.membership.count({ where: { userId: USER } })).toBe(0);
  });

  /** PRD §5.6: kural satın alma öncesi ONAYLANIR — kontrol sunucuda. */
  it("taahhüt onayı yoksa üyelik açılmaz", async () => {
    await expect(
      startMembership({
        userId: USER,
        // Şemayı atlayan çağıran: sunucu kuralı yine de arıyor.
        payload: { ...payload(), acceptedTerms: false as unknown as true },
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(MembershipTermsNotAcceptedError);

    expect(await prisma.membership.count({ where: { userId: USER } })).toBe(0);
  });

  it("olmayan paket 404 hatası verir", async () => {
    await expect(start({ planId: testId("plan", "yok") })).rejects.toBeInstanceOf(
      MembershipPlanNotFoundError,
    );
  });

  /**
   * YENİ KART HER ZAMAN KAYDEDİLİR: aidat her ay bu karttan çekilecek.
   * Kart NUMARASI saklanmıyor — yalnızca marka ve son 4 hane.
   */
  it("yeni kart kaydedilir ve üyeliğe bağlanır; numara SAKLANMAZ", async () => {
    const result = await start();

    const membership = await prisma.membership.findUniqueOrThrow({
      where: { id: result.membershipId },
      include: { savedCard: true },
    });

    expect(membership.savedCardId).toBeTruthy();
    expect(membership.savedCard?.last4).toBe("1111");
    expect(JSON.stringify(membership.savedCard)).not.toContain(CARD_OK);
  });

  /** Ekranın gördüğü durum KOLONDAN değil kuraldan geliyor (ADR-013). */
  it("üyelik ekranı aktif üyeliği ve hesaplanmış indirimi gösterir", async () => {
    await start({ planId: PLAN_YEARLY });

    const page = await getGymPageData({ userId: USER, now: NOW });

    expect(page.active?.state.status).toBe("active");
    expect(page.active?.state.hasAccess).toBe(true);
    expect(page.active?.plan.id).toBe(PLAN_YEARLY);

    // 949,90 → 712,40 arası fark %25,0; aşağı yuvarlanıyor.
    const yearly = page.plans.find((plan) => plan.id === PLAN_YEARLY);

    expect(yearly?.discountPercent).toBe(25);

    const monthly = page.plans.find((plan) => plan.id === PLAN_MONTHLY);

    expect(monthly?.discountPercent).toBe(0);
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
