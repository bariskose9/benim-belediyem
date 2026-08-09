import { z } from "zod";

import { checkoutCardSchema } from "@/features/payment/schemas/checkout.schema";

/**
 * Üyelik uçlarının girdi şemaları (03-api-guidelines.md: her uç Zod ile
 * doğrulanır, istemciye asla güvenilmez).
 *
 * ⛔ TUTAR İSTEMCİDEN ALINMAZ. Ne aylık ücret ne de erken çıkış farkı
 * gövdeden okunur; ikisi de sunucuda paket satırından hesaplanır. Şemadaki
 * `acknowledgedFeeKurus` bir FİYAT DEĞİL, bir MUTABAKAT alanıdır: "kullanıcı
 * hangi tutarı onayladı" sorusunu cevaplar ve sunucunun hesabıyla tutmuyorsa
 * işlem durur (sepetteki `expectedTotalKurus` ile aynı desen).
 *
 * ⛔ `userId` GÖVDEDE YOK. Oturumdan geliyor; istemci gönderse bile şema onu
 * sonuca taşımıyor (data-model.md → "istemciden gelen userId reddedilir").
 *
 * KART ŞEMASI ÖDEME MODÜLÜNDEN GELİYOR, kopyalanmıyor: kart doğrulaması iki
 * yerde yaşarsa biri gevşetildiğinde diğerinin unutulması an meselesi.
 */

export const createMembershipSchema = z.object({
  planId: z.string().trim().min(1).max(128),
  /**
   * Çift tahsilat kalkanı. Aynı denemenin tekrarlarında AYNI değer gönderilir;
   * `membership_payments.idempotency_key` üzerindeki benzersiz kısıt ikinci
   * yazmayı reddeder.
   */
  idempotencyKey: z.string().trim().min(8).max(128),
  /**
   * Taahhüt ve erken çıkış kuralının onayı (PRD §5.6).
   *
   * `z.literal(true)`: alan gönderilmemiş ya da `false` ise şema düşer.
   * `z.boolean()` olsaydı onay kutusunu hiç işaretlemeyen istek şemayı geçer
   * ve kural yalnızca serviste kalırdı — kapı ne kadar erken kapanırsa o kadar iyi.
   */
  acceptedTerms: z.literal(true),
  card: checkoutCardSchema,
});

/**
 * Paket değişimi ve otomatik yenileme ayarı.
 *
 * `pendingPlanId: null` = sıraya alınmış değişimi iptal et. Bu yüzden alan
 * `nullable`: `undefined` "dokunma", `null` "temizle" demek.
 */
export const updateMembershipSchema = z
  .object({
    pendingPlanId: z.string().trim().min(1).max(128).nullable().optional(),
    /**
     * TAAHHÜTSÜZ PAKETE DÜŞÜRME de erken çıkış kuralına tabidir (PRD §5.6).
     * O durumda ekran farkı gösterir ve kullanıcı onaylar; alan iptaldeki
     * `acknowledgedFeeKurus` ile aynı işi görür. Fark doğmayan değişimlerde
     * gönderilmez.
     */
    acknowledgedFeeKurus: z.number().int().min(0).optional(),
    idempotencyKey: z.string().trim().min(8).max(128),
  })
  .refine((data) => data.pendingPlanId !== undefined, {
    error: "Güncellenecek bir alan gönderilmedi.",
  });

export const cancelMembershipSchema = z.object({
  /**
   * Kullanıcının ekranda gördüğü ve onayladığı erken çıkış farkı.
   *
   * Sunucu farkı yine kendi hesaplar; bu sayı yalnızca "kullanıcının baktığı
   * ekran güncel miydi" sorusunu cevaplar. Eski bir sekmeden gelen onay,
   * kullanıcının hiç görmediği bir tutarı onaylamış saymak olurdu.
   */
  acknowledgedFeeKurus: z.number().int().min(0),
  idempotencyKey: z.string().trim().min(8).max(128),
});

export type CreateMembershipPayload = z.infer<typeof createMembershipSchema>;
export type UpdateMembershipPayload = z.infer<typeof updateMembershipSchema>;
export type CancelMembershipPayload = z.infer<typeof cancelMembershipSchema>;
