import { z } from "zod";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, OTP_CODE_LENGTH } from "@/config/constants";
import { messages } from "@/config/messages";
import {
  identityChallengeSchema,
  turnstileTokenSchema,
} from "@/features/identity/schemas/identity-challenge.schema";

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
 * ADIM 1 girdisi — kimlik numarası + doğum yılı + bot jetonu.
 *
 * ŞEMANIN KENDİSİ `identity-challenge.schema.ts` İÇİNDE ve ORTAK: aynı üçlüyü
 * kimlik doğrulama akışı da soruyor (mevcut hesaba kimlik bağlama, adım 15c-2).
 * Buradaki isim korunuyor çünkü kayıt akışının okunurluğu "başlangıç adımı"
 * kavramına bağlı; şema tek yerde, adı akışa özel.
 */
export const registrationStartSchema = identityChallengeSchema;

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
