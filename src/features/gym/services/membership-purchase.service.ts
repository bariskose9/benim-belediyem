import {
  MEMBERSHIP_BILLING_PERIOD_MONTHS,
  MEMBERSHIP_WRITE_RATE_LIMIT_MAX,
  MEMBERSHIP_WRITE_RATE_LIMIT_WINDOW_MS,
} from "@/config/constants";
import {
  AlreadyMemberError,
  MembershipAlreadyProcessedError,
  MembershipInsufficientFundsError,
  MembershipPaymentDeclinedError,
  MembershipPlanNotFoundError,
  MembershipRateLimitedError,
  MembershipTermsNotAcceptedError,
} from "@/features/gym/errors";
import {
  createMembership,
  createMembershipPayment,
  expireLapsedMemberships,
  findLiveMembership,
} from "@/features/gym/repositories/membership.repository";
import { findMembershipPlan } from "@/features/gym/repositories/membership-plan.repository";
import { addCalendarMonths } from "@/features/gym/services/billing-period";
import type { CreateMembershipPayload } from "@/features/gym/schemas/membership.schema";
import { attemptPayment } from "@/features/payment/providers/mock-payment-provider";
import { saveCard } from "@/features/profile/repositories/saved-card.repository";
import { resolveCard } from "@/features/payment/services/card-resolver";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { consumeRateLimit, hashActorIp, rateLimitKey } from "@/lib/rate-limit";

/**
 * ÜYELİK BAŞLATMA (PRD §5.6).
 *
 * ═══ ÜYELİK SEPETE GİRMEZ ═══
 *
 * Kendi akışı var: paket seç → kart seç/gir → taahhüt ve erken çıkış kuralını
 * onayla → ilk ay tahsil edilir. Sepette bekleyen market/restoran/bilet
 * ürünleri bu akıştan hiç etkilenmiyor — `cart_items.item_type` enum'ında
 * `gym` DEĞERİ YOK ve bu bilinçli (data-model.md): abonelik tek seferlik
 * sipariş şemasına oturmaz, taahhüt ve yenileme kuralları farklıdır.
 *
 * ═══ SIRA: ÖNCE SAĞLAYICI, SONRA KAYIT ═══
 *
 * Ödeme modülündeki desenin aynısı: kart reddedilirse HİÇBİR ŞEY yazılmaz.
 * Ters sırada, reddedilen bir kart için üyelik açılır ve geri alınması
 * gerekirdi.
 *
 * ⚠️ İLK AY ÖDENMEZSE ÜYELİK HİÇ AÇILMAZ — "ödeme bekliyor" durumuna
 * DÜŞÜRÜLMEZ. PRD §5.6'daki `ödeme bekliyor` kuralı YENİLEME tahsilatı
 * içindir: orada kullanıcının ödenmiş bir geçmişi ve devam eden bir üyeliği
 * var. Başlangıçta aynısını yapmak, hiç ödeme yapmamış birine 3 gün ücretsiz
 * erişim vermek olurdu.
 */

export type StartMembershipInput = {
  userId: string;
  payload: CreateMembershipPayload;
  actorIp: string;
  now: Date;
};

export type StartMembershipResult = {
  membershipId: string;
  chargedKurus: number;
  nextBillingAt: Date;
  commitmentEndsAt: Date | null;
};

export async function startMembership(input: StartMembershipInput): Promise<StartMembershipResult> {
  await enforceBudget(input.userId, input.now);

  // Şema `z.literal(true)` istiyor; bu kontrol şemayı atlayan çağıranlar
  // (test, ileride planlı görev) için ikinci kapı. Kural sunucuda kalmalı.
  if (!input.payload.acceptedTerms) throw new MembershipTermsNotAcceptedError();

  const plan = await findMembershipPlan(input.payload.planId);

  if (!plan) throw new MembershipPlanNotFoundError();

  /**
   * Ömrü dolmuş üyelikleri önce kapat.
   *
   * Yenileme görevi yok (adım 16); onsuz, geçen yıl sona ermiş bir üyelik
   * kolonda hâlâ `active` görünür ve kullanıcı yeni üyelik alamazdı.
   * Temizlik ADR-007'nin tembel deseni: doğruluk okuma/yazma anında sağlanır.
   */
  await expireLapsedMemberships({ userId: input.userId, now: input.now });

  const existing = await findLiveMembership(input.userId);

  // Kullanıcıya doğru mesajı göstermek için ÖNDEN kontrol; asıl kararı
  // `active_user_id` üzerindeki benzersiz indeks veriyor (aşağıda).
  if (existing) throw new AlreadyMemberError();

  const card = await resolveCard({
    userId: input.userId,
    card: input.payload.card,
    now: input.now,
  });

  const result = await attemptPayment({
    cardNumber: card.cardNumber ?? "",
    cardLast4: card.last4,
    amountKurus: plan.monthlyPriceKurus,
  });

  const ipHash = hashActorIp(input.actorIp);

  if (result.status !== "success") {
    /**
     * Başarısız deneme `membership_payments`'a YAZILAMAZ: tablo üyeliğe
     * bağlı ve henüz üyelik yok. Kayıt yine de kalıyor — denetim kaydına.
     * "Neden üye olamadım" sorusunun izi burada.
     */
    await recordAuditLog({
      userId: input.userId,
      action: "membership_payment",
      entityType: "membership",
      ipHash,
    });

    throw result.status === "insufficient_funds"
      ? new MembershipInsufficientFundsError()
      : new MembershipPaymentDeclinedError();
  }

  const periodStart = input.now;
  const periodEnd = addCalendarMonths(periodStart, MEMBERSHIP_BILLING_PERIOD_MONTHS);
  const commitmentEndsAt =
    plan.commitmentMonths === 0 ? null : addCalendarMonths(periodStart, plan.commitmentMonths);

  const written = await guardDuplicate(() =>
    prisma.$transaction(async (tx) => {
      /**
       * YENİ KART HER ZAMAN KAYDEDİLİR — kullanıcının tercihine bırakılmıyor.
       *
       * Aidat her ay bu karttan çekilecek (PRD §5.6). Kaydedilmeseydi üyelik
       * daha ilk yenilemede tahsilat yapamaz ve "ödeme bekliyor"a düşerdi.
       * Kullanıcı bunu satın alma ekranında yazılı olarak görüyor; sessizce
       * yapılan bir şey değil. Kart NUMARASI yine saklanmıyor.
       */
      const savedCardId =
        card.savedCardId ??
        (
          await saveCard(
            {
              userId: input.userId,
              brand: card.brand,
              last4: card.last4,
              expMonth: card.expMonth,
              expYear: card.expYear,
              holderName: card.holderName,
            },
            tx,
          )
        ).id;

      const membership = await createMembership(
        {
          userId: input.userId,
          planId: plan.id,
          savedCardId,
          startsAt: periodStart,
          commitmentEndsAt,
          nextBillingAt: periodEnd,
        },
        tx,
      );

      await createMembershipPayment(
        {
          membershipId: membership.id,
          periodStart,
          periodEnd,
          amountKurus: plan.monthlyPriceKurus,
          kind: "renewal",
          status: "success",
          attemptedAt: input.now,
          idempotencyKey: input.payload.idempotencyKey,
        },
        tx,
      );

      return membership.id;
    }),
  );

  await recordAuditLog({
    userId: input.userId,
    action: "membership_create",
    entityType: "membership",
    entityId: written,
    ipHash,
  });

  await recordAuditLog({
    userId: input.userId,
    action: "membership_payment",
    entityType: "membership",
    entityId: written,
    ipHash,
  });

  return {
    membershipId: written,
    chargedKurus: plan.monthlyPriceKurus,
    nextBillingAt: periodEnd,
    commitmentEndsAt,
  };
}

/**
 * Benzersizlik ihlallerini doğru hataya çevirir.
 *
 * İKİ FARKLI KISIT, İKİ FARKLI ANLAM ve kullanıcıya söylenecek şey de farklı:
 *  · `active_user_id`  → "zaten üyesiniz" (paket değiştirmeye yönlendirilir)
 *  · `idempotency_key` → "bu işlem zaten yapıldı" (çift tıklama / tekrar gönderim)
 * İkisine tek mesaj vermek, çift tıklayan kullanıcıya "zaten üyesiniz" deyip
 * onu var olmayan bir sorunla uğraştırırdı.
 */
async function guardDuplicate<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const known = error as { code?: string; meta?: { target?: unknown } };

    if (known.code !== "P2002") throw error;

    throw JSON.stringify(known.meta?.target ?? "").includes("active_user_id")
      ? new AlreadyMemberError()
      : new MembershipAlreadyProcessedError();
  }
}

async function enforceBudget(userId: string, now: Date): Promise<void> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("membership_write", "user", userId),
    limit: MEMBERSHIP_WRITE_RATE_LIMIT_MAX,
    windowMs: MEMBERSHIP_WRITE_RATE_LIMIT_WINDOW_MS,
    now,
  });

  if (!decision.allowed) throw new MembershipRateLimitedError();
}

export { enforceBudget as enforceMembershipWriteBudget };
