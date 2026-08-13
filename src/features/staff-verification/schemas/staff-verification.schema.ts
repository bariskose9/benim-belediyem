import { z } from "zod";

import { EMAIL_MAX_LENGTH, OTP_CODE_LENGTH } from "@/config/constants";
import { messages } from "@/config/messages";

/**
 * Personel doğrulaması girdi şemaları (adım 17c · ADR-017 ilke 2).
 *
 * ⛔ `userId` HİÇBİR ŞEMADA YOK. Kimlik oturumdan geliyor; istemcinin gövdeye
 * yazacağı bir kullanıcı kimliği sonuca hiç ulaşamaz (05-auth-security.md).
 *
 * ⛔ `staffMemberId` DE YOK ve bu ÇOK ÖNEMLİ. İstemci hangi personel kaydına
 * bağlanacağını SÖYLEYEMİYOR; sunucu bunu yalnızca doğrulanmış kurumsal
 * adresten türetiyor. Alan olsaydı, kodunu kendi adresine alan biri gövdeye
 * başkasının kayıt kimliğini yazarak onun yetkisini alırdı — IDOR'un tam
 * karşılığı.
 *
 * ⛔ `isStaff` DE YOK: yetki istemciden gelmez, sunucuda hesaplanır.
 */

const copy = messages.staffVerification.errors;

/**
 * Kurumsal e-posta adresi.
 *
 * `toLowerCase()` ŞART: `staff_members.work_email` benzersiz ve küçük harfle
 * tohumlanıyor. Normalleştirilmeseydi `Ahmet.Sen@...` yazan kullanıcı
 * "rehberde yok" cevabı alırdı — üstelik büyük harfli varyantlarla adres
 * bazlı hız sınırı da defalarca sıfırdan başlatılabilirdi.
 *
 * Üst sınır ŞART: sınırsız uzun bir adres, özet ve hız sınırı hesaplarını
 * gereksiz yere pahalılaştırır (girdi boyutu her zaman sınırlanır).
 */
const workEmailSchema = z
  .email({ error: copy.invalidRequest })
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH, { error: copy.invalidRequest });

/** 1. adım — kurumsal adrese kod gönderilmesini ister. */
export const staffVerificationRequestSchema = z.object({
  workEmail: workEmailSchema,
});

export type StaffVerificationRequestPayload = z.infer<typeof staffVerificationRequestSchema>;

/**
 * 2. adım — kodu doğrular.
 *
 * ⛔ `workEmail` BURADA DA İSTENİYOR ve bu bir güvenlik gereği, kolaylık değil.
 * Sunucu, kodun GERÇEKTEN bu adrese gönderildiğini `destinationHash` üzerinden
 * kanıtlıyor (`pendingChallengeMatchesDestination`). Adres ikinci adımda
 * istenmeseydi, akış kimliği kullanıcının kendisi olduğu için sunucunun
 * hangi personel kaydına bağlayacağını yeniden bulması gerekirdi ve o bilgi
 * yalnızca istemciden gelebilirdi — yani kapı istemciye açılırdı.
 */
export const staffVerificationConfirmSchema = z.object({
  workEmail: workEmailSchema,
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^[0-9]{${OTP_CODE_LENGTH}}$`), { error: copy.codeInvalid }),
});

export type StaffVerificationConfirmPayload = z.infer<typeof staffVerificationConfirmSchema>;

/**
 * ═══ YANIT SÖZLEŞMELERİ (borç #107 · adım 107b · ADR-021) ═══
 *
 * ⚠️ `revealedCode` YALNIZCA local ve preview'da dolu. Production'da doğrulama
 * kodu kuruma ait kanaldan gidiyor; ekranda gösterilseydi personel doğrulaması
 * hiçbir şey doğrulamamış olurdu (ADR-004).
 */
export const staffVerificationStartedResponseSchema = z.object({
  revealedCode: z
    .string()
    .optional()
    .describe("Yalnızca local ve preview'da dolu; production'da HİÇ gönderilmez."),
});

/**
 * ⭐ `isStaff` SABİT `true` — ve bu bilinçli.
 *
 * Uç yalnızca doğrulama BAŞARIYLA bittiğinde bu gövdeyi döndürüyor;
 * başarısızlık hata zarfıyla geliyor. `boolean` yazmak, istemciye hiç
 * gelmeyecek bir `false` dalını ele almasını söylemek olurdu.
 */
export const staffVerificationConfirmedResponseSchema = z.object({
  isStaff: z.literal(true),
});
