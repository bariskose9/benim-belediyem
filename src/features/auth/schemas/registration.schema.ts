import { z } from "zod";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, OTP_CODE_LENGTH } from "@/config/constants";
import { messages } from "@/config/messages";
import { isValidNationalId } from "@/lib/crypto";

/**
 * Kayıt akışının girdi şemaları.
 *
 * `03-api-guidelines.md`: "Her endpoint girişi (body, query, params) Zod ile
 * doğrulanır. İstisna yok."
 *
 * Şemalar İSTEMCİYE GÜVENMEZ: doğum tarihi, yaş, personel durumu, rol gibi
 * yetki belirleyici hiçbir alan burada YOKTUR — hepsi sunucuda hesaplanır.
 */

const copy = messages.auth.register.errors;

/**
 * Kimlik numarası. Kontrol basamağı BURADA da doğrulanıyor ama asıl kapı
 * `lookupIdentity` içinde; buradaki kontrol yalnızca geçersiz numaralar için
 * gereksiz bir dış servis çağrısını önlüyor.
 *
 * Hata mesajı TEK TİP: hangi kuralın tutmadığı söylenmiyor
 * (05-auth-security.md → numara taraması koruması).
 */
const nationalIdSchema = z
  .string()
  .trim()
  .refine(isValidNationalId, { error: messages.identity.lookupFailed });

const birthYearSchema = z.coerce
  .number({ error: copy.invalidBirthYear })
  .int({ error: copy.invalidBirthYear })
  .min(1900, { error: copy.invalidBirthYear })
  .max(new Date().getUTCFullYear(), { error: copy.invalidBirthYear });

/**
 * Bot doğrulama jetonu. Boş string kabul ediliyor ki "hiç gönderilmedi"
 * durumu şema hatası (422) değil, BOT_CHECK_REQUIRED (403) olarak dönsün —
 * PRD kabul kriteri bu uç için 403 istiyor.
 */
const turnstileTokenSchema = z.string().default("");

export const registrationStartSchema = z.object({
  nationalId: nationalIdSchema,
  birthYear: birthYearSchema,
  turnstileToken: turnstileTokenSchema,
});

export type RegistrationStartPayload = z.infer<typeof registrationStartSchema>;

/**
 * Türkiye cep telefonu: `05XXXXXXXXX`.
 *
 * Boşluk, tire ve parantez temizleniyor çünkü kullanıcılar numarayı
 * `0532 123 45 67` diye yazıyor ve bunu reddetmek gereksiz sürtünme olurdu.
 * `+90` ve `90` önekleri de kabul edilip `0`'a normalize ediliyor.
 */
export const turkishPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()\-.]/g, ""))
  .transform((value) => {
    if (value.startsWith("+90")) return `0${value.slice(3)}`;
    if (value.startsWith("90") && value.length === 12) return `0${value.slice(2)}`;
    if (value.startsWith("5") && value.length === 10) return `0${value}`;

    return value;
  })
  .refine((value) => /^05[0-9]{9}$/.test(value), { error: copy.invalidPhone });

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: copy.weakPassword })
  .max(PASSWORD_MAX_LENGTH, { error: copy.passwordTooLong });

export const registrationContactSchema = z
  .object({
    email: z.email({ error: copy.invalidEmail }).trim().toLowerCase(),
    phone: turkishPhoneSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    error: copy.passwordMismatch,
    path: ["passwordConfirm"],
  });

export type RegistrationContactPayload = z.infer<typeof registrationContactSchema>;

export const otpChannelSchema = z.enum(["email", "phone"]);

export const otpVerifySchema = z.object({
  channel: otpChannelSchema,
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^[0-9]{${OTP_CODE_LENGTH}}$`), { error: copy.otpInvalid }),
});

export type OtpVerifyPayload = z.infer<typeof otpVerifySchema>;

export const otpResendSchema = z.object({
  channel: otpChannelSchema,
  turnstileToken: turnstileTokenSchema,
});

export type OtpResendPayload = z.infer<typeof otpResendSchema>;
