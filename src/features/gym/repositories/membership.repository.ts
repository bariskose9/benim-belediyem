import { MEMBERSHIP_PAYMENT_GRACE_DAYS } from "@/config/constants";
import { addDays } from "@/features/gym/services/billing-period";
import type { MembershipPaymentRow, MembershipRow } from "@/features/gym/types";
import type { Prisma } from "@/generated/prisma/client";
import type { MembershipPaymentKind, MembershipPaymentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { toDecimalInput, toKurus } from "@/lib/money";

/**
 * `memberships` ve `membership_payments` tablolarına erişen tek katman
 * (PRD §5.6 · adım 12).
 *
 * ═══ BU DOSYADAKİ HER YAZMA KOŞULLUDUR ═══
 *
 * Üyelikte yanlış giderse bedeli para: aynı dönem iki kez tahsil edilirse
 * kullanıcıdan iki kez çekilir, iptal iki kez işlenirse erken çıkış farkı iki
 * kez alınır. Bu yüzden hiçbir kural "önce oku, sonra karar ver, sonra yaz"
 * biçiminde yazılmadı — o üç adım arasına başka bir istek girebilir. Her kural
 * `updateMany` + `WHERE` biçiminde tek ifade ve ETKİLENEN SATIR SAYISINA
 * bakılıyor (koltuk kilidi ve sipariş iptalindeki desenin aynısı).
 *
 * `Decimal` bu dosyanın dışına çıkmaz; sınırda `toKurus` / `toDecimalInput`.
 */

type Client = Prisma.TransactionClient | typeof prisma;

const MEMBERSHIP_SELECT = {
  id: true,
  userId: true,
  planId: true,
  savedCardId: true,
  startsAt: true,
  commitmentEndsAt: true,
  status: true,
  autoRenewEnabled: true,
  nextBillingAt: true,
  cancelledAt: true,
  pendingPlanId: true,
  pendingPlanEffectiveAt: true,
  renewalReminderForBillingAt: true,
} as const;

type MembershipSelectResult = Prisma.MembershipGetPayload<{ select: typeof MEMBERSHIP_SELECT }>;

function toMembershipRow(row: MembershipSelectResult): MembershipRow {
  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId,
    savedCardId: row.savedCardId,
    startsAt: row.startsAt,
    commitmentEndsAt: row.commitmentEndsAt,
    storedStatus: row.status,
    autoRenewEnabled: row.autoRenewEnabled,
    nextBillingAt: row.nextBillingAt,
    cancelledAt: row.cancelledAt,
    pendingPlanId: row.pendingPlanId,
    pendingPlanEffectiveAt: row.pendingPlanEffectiveAt,
    renewalReminderForBillingAt: row.renewalReminderForBillingAt,
  };
}

/**
 * Kullanıcının YAŞAYAN üyeliği — yoksa `null`.
 *
 * Sorgu `active_user_id` üzerinden gidiyor, `user_id` + durum süzgeci
 * üzerinden değil: kuralı zorlayan benzersiz indeks o kolonda ve okuma ile
 * yazma AYNI tanımı kullanmalı. İkisi ayrı yazılsaydı, biri değiştiğinde
 * diğerinin unutulması an meselesiydi.
 */
export async function findLiveMembership(
  userId: string,
  client: Client = prisma,
): Promise<MembershipRow | null> {
  const row = await client.membership.findUnique({
    where: { activeUserId: userId },
    select: MEMBERSHIP_SELECT,
  });

  return row ? toMembershipRow(row) : null;
}

/**
 * Kimliğiyle üyelik getirir — YALNIZCA sahibine.
 *
 * Sahiplik sorgunun İÇİNDE (`userId`), sonradan bakılan bir `if` değil:
 * başkasının üyeliğini iptal edebilmek IDOR açığı olurdu (05-auth-security.md).
 */
export async function findOwnedMembership(
  input: { membershipId: string; userId: string },
  client: Client = prisma,
): Promise<MembershipRow | null> {
  const row = await client.membership.findFirst({
    where: { id: input.membershipId, userId: input.userId },
    select: MEMBERSHIP_SELECT,
  });

  return row ? toMembershipRow(row) : null;
}

/**
 * Ömrü dolmuş üyelikleri KOLONA YAZARAK kapatır ve `active_user_id`'yi boşaltır.
 *
 * ═══ NEDEN GEREKLİ ═══
 * Ekranda gösterilen durum kuraldan türetiliyor (`membership-state.ts`), ama
 * "aynı anda tek üyelik" kuralını zorlayan benzersiz indeks KOLONA bakıyor.
 * Yenileme görevi henüz yok (adım 16) ve olduğunda da günde bir çalışacak;
 * bu arada ömrü dolmuş bir üyelik kolonda `active` kalır ve kullanıcı yeni
 * üyelik alamazdı. Bu fonksiyon o boşluğu kapatıyor: temizlik YAZMA yolunda,
 * okuma anında yapılıyor (ADR-007'nin tembel temizlik deseni).
 *
 * ⚠️ WHERE KOŞULLARI `deriveMembershipState`'İN AYNADAKİ HÂLİDİR. Biri
 * değişirse diğeri de değişmeli; ikisini birden `tests/db/` içindeki testler
 * aynı senaryolarla sınıyor.
 */
export async function expireLapsedMemberships(
  input: { userId: string; now: Date },
  client: Client = prisma,
): Promise<number> {
  const graceCutoff = addDays(input.now, -MEMBERSHIP_PAYMENT_GRACE_DAYS);

  const result = await client.membership.updateMany({
    where: {
      activeUserId: input.userId,
      OR: [
        // İptal edilmiş: ödenmiş dönem bitti.
        { status: "cancelled", nextBillingAt: { lte: input.now } },
        // Yenilenmeyecek: dönem bitti.
        { status: "active", autoRenewEnabled: false, nextBillingAt: { lte: input.now } },
        // Yenilenecekti ama tahsilat hiç yapılmadı ve ödeme süresi de doldu.
        { status: "active", autoRenewEnabled: true, nextBillingAt: { lte: graceCutoff } },
        // Tahsilat başarısızdı ve 3 günlük süre doldu.
        { status: "payment_pending", nextBillingAt: { lte: graceCutoff } },
      ],
    },
    data: { status: "expired", activeUserId: null },
  });

  return result.count;
}

export type CreateMembershipInput = {
  userId: string;
  planId: string;
  savedCardId: string | null;
  startsAt: Date;
  commitmentEndsAt: Date | null;
  nextBillingAt: Date;
};

/**
 * Üyeliği açar.
 *
 * `activeUserId` de burada yazılıyor; benzersiz indeks yüzünden kullanıcının
 * yaşayan bir üyeliği varsa bu `create` P2002 fırlatır ve çağıran onu 409'a
 * çevirir. Karar veritabanınındır — uygulamanın önceden yaptığı kontrol
 * yalnızca kullanıcıya doğru mesajı göstermek içindir.
 */
export async function createMembership(
  input: CreateMembershipInput,
  client: Client = prisma,
): Promise<{ id: string }> {
  return client.membership.create({
    data: {
      userId: input.userId,
      activeUserId: input.userId,
      planId: input.planId,
      savedCardId: input.savedCardId,
      startsAt: input.startsAt,
      commitmentEndsAt: input.commitmentEndsAt,
      status: "active",
      autoRenewEnabled: true,
      nextBillingAt: input.nextBillingAt,
    },
    select: { id: true },
  });
}

export type CreateMembershipPaymentInput = {
  membershipId: string;
  periodStart: Date;
  periodEnd: Date;
  amountKurus: number;
  kind: MembershipPaymentKind;
  status: MembershipPaymentStatus;
  attemptedAt: Date;
  idempotencyKey: string;
};

/**
 * Tahsilat denemesini yazar — BAŞARILI VE BAŞARISIZ İKİSİ İÇİN DE.
 *
 * `unique(membership_id, period_start)` aynı dönemin iki kez tahsil
 * edilmesini VERİTABANI seviyesinde engelliyor (PRD §5.6 kabul kriteri:
 * "Yenileme işi iki kez çalışırsa kullanıcıdan iki kez tahsilat yapılmaz").
 * Başarısız denemeler de yazılıyor çünkü tablo append-only bir denetim
 * kaydı: "aidatım neden çekilmedi" sorusunun cevabı ancak deneme kayıtlıysa
 * verilebilir.
 */
export async function createMembershipPayment(
  input: CreateMembershipPaymentInput,
  client: Client = prisma,
): Promise<{ id: string }> {
  return client.membershipPayment.create({
    data: {
      membershipId: input.membershipId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      amount: toDecimalInput(input.amountKurus),
      kind: input.kind,
      status: input.status,
      attemptedAt: input.attemptedAt,
      idempotencyKey: input.idempotencyKey,
    },
    select: { id: true },
  });
}

/** Üyeliğin ödeme geçmişi — en yeni en üstte (PRD §5.6 "profilde ödeme geçmişi görünür"). */
export async function listMembershipPayments(
  membershipId: string,
  client: Client = prisma,
): Promise<MembershipPaymentRow[]> {
  const rows = await client.membershipPayment.findMany({
    where: { membershipId },
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      amount: true,
      kind: true,
      status: true,
      attemptedAt: true,
    },
    orderBy: { attemptedAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    amountKurus: toKurus(row.amount),
    kind: row.kind,
    status: row.status,
    attemptedAt: row.attemptedAt,
  }));
}

/**
 * BAŞARIYLA tahsil edilmiş ay sayısı — erken çıkış farkının çarpanı.
 *
 * Erken çıkış farkı kendisi bu sayıya girmiyor (`kind: "renewal"`): fark bir
 * ay kullanımı değil, geçmiş ayların yeniden hesabıdır. Başarısız denemeler
 * de sayılmıyor — kullanıcı o ayın parasını ödemedi.
 */
export async function countPaidMonths(
  membershipId: string,
  client: Client = prisma,
): Promise<number> {
  return client.membershipPayment.count({
    where: { membershipId, kind: "renewal", status: "success" },
  });
}

/**
 * Erken çıkış farkı bu üyelikten daha önce TAHSİL EDİLDİ Mİ.
 *
 * ═══ NEDEN SORULUYOR ═══
 * Fark iki farklı işlemde doğabiliyor: iptal ve taahhütsüz pakete düşürme
 * (PRD §5.6). Kullanıcı önce düşürüp sonra iptal ederse, ödenmiş ay sayısı
 * değişmediği için aynı fark ikinci kez hesaplanırdı. Kayıt tablosuna sormak,
 * "bu fark bir kez alınır" kuralını uygulamanın hafızasına değil VERİYE
 * bağlıyor.
 */
export async function hasSettledEarlyExitFee(
  membershipId: string,
  client: Client = prisma,
): Promise<boolean> {
  const count = await client.membershipPayment.count({
    where: { membershipId, kind: "early_exit_fee", status: "success" },
  });

  return count > 0;
}

/**
 * Tahsilat başarılı: dönemi ilerletir ve bekleyen paket değişimini yürürlüğe koyar.
 *
 * KOŞUL `nextBillingAt` ÜZERİNDE: aynı dönem için ikinci bir çağrı geldiğinde
 * (görev iki kez koştu, kullanıcı iki kez tıkladı) tarih artık eşleşmez ve 0
 * satır etkilenir. Böylece dönem iki kez ilerlemez.
 */
export async function advanceBillingPeriod(
  input: {
    membershipId: string;
    /** Beklenen mevcut vade — koşul budur. */
    fromBillingAt: Date;
    nextBillingAt: Date;
    /** Paket değişimi yürürlüğe giriyorsa yeni paket, girmiyorsa `null`. */
    newPlanId: string | null;
    /** Yeni paket taahhütlüyse taahhüdün biteceği an. */
    newCommitmentEndsAt: Date | null;
  },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.membership.updateMany({
    where: { id: input.membershipId, nextBillingAt: input.fromBillingAt },
    data: {
      status: "active",
      nextBillingAt: input.nextBillingAt,
      ...(input.newPlanId === null
        ? {}
        : {
            planId: input.newPlanId,
            commitmentEndsAt: input.newCommitmentEndsAt,
            pendingPlanId: null,
            pendingPlanEffectiveAt: null,
          }),
    },
  });

  return result.count === 1;
}

/**
 * Tahsilat başarısız: üyeliği "ödeme bekliyor" durumuna alır.
 *
 * Vade İLERLETİLMİYOR — pasifleşme süresi (3 gün) vadeden sayılıyor ve
 * `deriveMembershipState` o pencereyi `nextBillingAt` üzerinden okuyor.
 * Koşul yine vadenin kendisi: aynı dönem için ikinci çağrı 0 satır etkiler.
 */
export async function markPaymentPending(
  input: { membershipId: string; billingAt: Date },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.membership.updateMany({
    where: { id: input.membershipId, nextBillingAt: input.billingAt, status: "active" },
    data: { status: "payment_pending" },
  });

  return result.count === 1;
}

/**
 * Paket değişimini SIRAYA KOYAR — hemen uygulamaz (PRD §5.6: "paket değişimi
 * bir sonraki tahsilat tarihinde yürürlüğe girer; ödenmiş ay sonuna kadar
 * eski paket geçerli kalır").
 *
 * Sahiplik ve durum koşulu WHERE'in içinde: sona ermiş ya da iptal edilmiş
 * bir üyelikte paket değiştirilemez.
 */
export async function schedulePlanChange(
  input: {
    membershipId: string;
    userId: string;
    pendingPlanId: string | null;
    effectiveAt: Date | null;
  },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.membership.updateMany({
    where: {
      id: input.membershipId,
      userId: input.userId,
      status: { in: ["active", "payment_pending"] },
    },
    data: {
      pendingPlanId: input.pendingPlanId,
      pendingPlanEffectiveAt: input.effectiveAt,
    },
  });

  return result.count === 1;
}

/**
 * Üyeliği iptal eder: yenileme durur, erişim ÖDENMİŞ DÖNEM SONUNA kadar sürer.
 *
 * `activeUserId` BURADA BOŞALTILMIYOR ve bu bilinçli: üyelik hâlâ yaşıyor
 * (kullanıcı ay sonuna kadar tesise girebiliyor) ve o süre boyunca ikinci bir
 * üyelik açılmamalı. Kolon, dönem bittiğinde `expireLapsedMemberships`
 * tarafından boşaltılır.
 *
 * KOŞUL: yalnızca iptal edilmemiş bir üyelik iptal edilebilir. İkinci istek 0
 * satır etkiler; erken çıkış farkının iki kez tahsil edilmesini bu engelliyor.
 */
export async function cancelMembership(
  input: { membershipId: string; userId: string; now: Date },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.membership.updateMany({
    where: {
      id: input.membershipId,
      userId: input.userId,
      status: { in: ["active", "payment_pending"] },
    },
    data: {
      status: "cancelled",
      autoRenewEnabled: false,
      cancelledAt: input.now,
      pendingPlanId: null,
      pendingPlanEffectiveAt: null,
    },
  });

  return result.count === 1;
}

/**
 * Yenileme hatırlatmasını BU DÖNEM İÇİN üstlenir.
 *
 * `true` dönerse bildirimi yazma hakkı bu çağrınındır. İki sekme aynı anda
 * ekranı açarsa ikincisinin güncellemesi 0 satır etkiler ve aynı hatırlatma
 * iki kez yazılmaz — `orders.notified_status` ile birebir aynı desen.
 *
 * `NOT: billingAt` koşulu dönem ilerlediğinde kendiliğinden eşleşmez oluyor,
 * yani bir sonraki ay yeni bir hatırlatma yazılabiliyor.
 */
export async function claimRenewalReminder(
  input: { membershipId: string; billingAt: Date },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.membership.updateMany({
    where: {
      id: input.membershipId,
      nextBillingAt: input.billingAt,
      OR: [
        { renewalReminderForBillingAt: null },
        { renewalReminderForBillingAt: { not: input.billingAt } },
      ],
    },
    data: { renewalReminderForBillingAt: input.billingAt },
  });

  return result.count === 1;
}
