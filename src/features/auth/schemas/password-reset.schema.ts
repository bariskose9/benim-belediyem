import { z } from "zod";

import { OTP_CODE_LENGTH } from "@/config/constants";
import { messages } from "@/config/messages";
import { passwordSchema } from "@/features/auth/schemas/registration.schema";

/**
 * Şifre sıfırlama uçlarının girdi şemaları (adım 4b-3).
 *
 * `03-api-guidelines.md`: "Her endpoint girişi Zod ile doğrulanır. İstisna yok."
 */

const copy = messages.auth.passwordReset.errors;
const registerCopy = messages.auth.register.errors;

/**
 * Bot doğrulama jetonu. Boş string kabul ediliyor ki "hiç gönderilmedi" durumu
 * şema hatası (422) değil `BOT_CHECK_REQUIRED` (403) olarak dönsün — ekran
 * kutuyu buna göre açıyor.
 */
const turnstileTokenSchema = z.string().default("");

/**
 * KONTROL BASAMAĞI BURADA DOĞRULANMIYOR ve bu bilinçli.
 *
 * Kayıt akışında geçersiz kontrol basamağı reddediliyor (PRD kabul kriteri).
 * Burada reddedilseydi, kontrol basamağı geçerli ama kayıtlı olmayan bir numara
 * ile geçersiz bir numara FARKLI yanıt alırdı; saldırgan da bu farkı numara
 * üretmek için kullanırdı. Yalnızca "11 hane" aranıyor, gerisi sahte kod
 * kaydının işi (`password-reset.service.ts`) — kayıtsız her numara, biçimi ne
 * olursa olsun, aynı yanıtı görür.
 */
export const passwordResetRequestSchema = z.object({
  nationalId: z
    .string()
    .trim()
    .regex(/^[0-9]{11}$/, { error: copy.invalidNationalId }),
  turnstileToken: turnstileTokenSchema,
});

export type PasswordResetRequestPayload = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetResendSchema = z.object({
  turnstileToken: turnstileTokenSchema,
});

export type PasswordResetResendPayload = z.infer<typeof passwordResetResendSchema>;

/**
 * Kod + yeni şifre TEK İSTEKTE geliyor.
 *
 * Ayrı iki uç olsaydı "kod doğrulandı ama şifre henüz değişmedi" diye
 * korunması gereken üçüncü bir durum doğardı — kayıt akışında hesap oluşturmayı
 * ayrı bir uca taşımama gerekçesinin aynısı.
 */
export const passwordResetCompleteSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(new RegExp(`^[0-9]{${OTP_CODE_LENGTH}}$`), { error: registerCopy.otpInvalid }),
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    error: registerCopy.passwordMismatch,
    path: ["passwordConfirm"],
  });

export type PasswordResetCompletePayload = z.infer<typeof passwordResetCompleteSchema>;
