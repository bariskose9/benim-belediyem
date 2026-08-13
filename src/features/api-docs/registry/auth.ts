import { z } from "zod";

import { loginSchema } from "@/features/auth/schemas/login.schema";
import {
  passwordResetCompleteSchema,
  passwordResetRequestSchema,
  passwordResetResendSchema,
} from "@/features/auth/schemas/password-reset.schema";
import {
  otpResendSchema,
  otpVerifySchema,
  registrationContactSchema,
  registrationStartSchema,
} from "@/features/auth/schemas/registration.schema";
import type { ApiOperation } from "@/features/api-docs/types";

/** Oturum, kayıt, şifre sıfırlama ve Google bağlama uçları (adım 18b). */

const TAG_SESSION = "Oturum";
const TAG_REGISTRATION = "Kayıt";
const TAG_PASSWORD_RESET = "Şifre sıfırlama";
const TAG_GOOGLE = "Google ile giriş";

export const authOperations: ApiOperation[] = [
  {
    path: "/api/v1/sessions",
    method: "post",
    tag: TAG_SESSION,
    summary: "Giriş yapar ve oturum çerezini kurar.",
    description:
      "Kimlik bilgisi hatalıysa e-postanın mı şifrenin mi tutmadığı BİLEREK söylenmez " +
      "(hesap sayımı saldırısı). Var olmayan kullanıcıda da sahte bir özet doğrulanır, " +
      "böylece yanıt süresi ipucu vermez.",
    access: "public",
    requestBody: { schema: loginSchema },
    success: { status: 201, description: "Oturumun bitiş zamanı (`expiresAt`)." },
    errors: ["INVALID_CREDENTIALS"],
    rateLimited: true,
  },
  {
    path: "/api/v1/sessions/current",
    method: "delete",
    tag: TAG_SESSION,
    summary: "Çıkış yapar; oturumu sunucuda geçersizleştirir.",
    description: "Çerezi silmek yeterli değildir — oturum satırı veritabanından da düşürülür.",
    access: "public",
    success: { status: 204, description: "Çıkış yapıldı." },
    errors: [],
  },

  {
    path: "/api/v1/registrations",
    method: "post",
    tag: TAG_REGISTRATION,
    summary: "Kayıt akışını başlatır; kimlik bilgilerini doğrular.",
    description:
      "Kimlik doğrulaması bu adımda YALNIZCA kişinin var olduğunu kanıtlar; hiçbir yetki " +
      "vermez (05-auth-security.md · ADR-017). Taslak sunucuda şifreli tutulur (ADR-012).",
    access: "public",
    requestBody: { schema: registrationStartSchema },
    success: { status: 201, description: "Taslak kimliği ve sonraki adım bilgisi." },
    errors: [
      "IDENTITY_CHECK_FAILED",
      "IDENTITY_ALREADY_REGISTERED",
      "AGE_RESTRICTED",
      "IDENTITY_SERVICE_UNAVAILABLE",
      "BOT_CHECK_REQUIRED",
      "BOT_CHECK_FAILED",
      "BOT_CHECK_UNAVAILABLE",
      "REGISTRATION_CLOSED",
    ],
    rateLimited: true,
  },
  {
    path: "/api/v1/registrations/current",
    method: "get",
    tag: TAG_REGISTRATION,
    summary: "Devam eden kayıt taslağının durumunu döner.",
    access: "public",
    success: {
      status: 200,
      description: "Taslağın hangi adımda olduğu ve maskeli iletişim bilgisi.",
    },
    errors: ["REGISTRATION_EXPIRED"],
  },
  {
    path: "/api/v1/registrations/current",
    method: "patch",
    tag: TAG_REGISTRATION,
    summary: "Taslağa iletişim bilgisi ve şifre yazar, doğrulama kodu gönderir.",
    access: "public",
    requestBody: { schema: registrationContactSchema },
    success: { status: 200, description: "Kodun gönderildiği kanal ve son geçerlilik zamanı." },
    errors: [
      "REGISTRATION_EXPIRED",
      "EMAIL_ALREADY_REGISTERED",
      "WEAK_PASSWORD",
      "LEAKED_PASSWORD",
      "TERMS_NOT_ACCEPTED",
      "OTP_CHANNEL_UNAVAILABLE",
      "OTP_SEND_RATE_LIMITED",
    ],
    rateLimited: true,
  },
  {
    path: "/api/v1/registrations/current",
    method: "delete",
    tag: TAG_REGISTRATION,
    summary: "Kayıt taslağını iptal eder.",
    access: "public",
    success: { status: 204, description: "Taslak silindi." },
    errors: ["REGISTRATION_EXPIRED"],
  },
  {
    path: "/api/v1/registrations/current/otp-challenges",
    method: "post",
    tag: TAG_REGISTRATION,
    summary: "Doğrulama kodunu yeniden gönderir.",
    access: "public",
    requestBody: { schema: otpResendSchema },
    success: { status: 201, description: "Yeni kodun son geçerlilik zamanı." },
    errors: ["REGISTRATION_EXPIRED", "OTP_SEND_RATE_LIMITED", "OTP_CHANNEL_UNAVAILABLE"],
    rateLimited: true,
  },
  {
    path: "/api/v1/registrations/current/verifications",
    method: "post",
    tag: TAG_REGISTRATION,
    summary: "Doğrulama kodunu kontrol eder ve kaydı tamamlar.",
    description:
      "Kod doğrulanınca bekleyen tüm kodlar geçersizleşir. Sahte (decoy) kayıtlar " +
      "`userId` taşımaz — yalnızca `registrationId` üzerinden bulunur.",
    access: "public",
    requestBody: { schema: otpVerifySchema },
    success: { status: 201, description: "Kayıt tamamlandı; oturum kuruldu." },
    errors: ["REGISTRATION_EXPIRED", "OTP_INVALID", "OTP_EXPIRED", "OTP_TOO_MANY_ATTEMPTS"],
    rateLimited: true,
  },

  {
    path: "/api/v1/password-resets",
    method: "post",
    tag: TAG_PASSWORD_RESET,
    summary: "Şifre sıfırlama akışını başlatır.",
    description:
      "⛔ Adresin kayıtlı olup olmadığı yanıttan ANLAŞILMAZ: her iki durumda da aynı " +
      "cevap döner, böylece uç bir hesap sayımı kanalına dönüşmez.",
    access: "public",
    requestBody: { schema: passwordResetRequestSchema },
    success: { status: 201, description: "Kodun son geçerlilik zamanı." },
    errors: [
      "PASSWORD_RESET_SEND_RATE_LIMITED",
      "PASSWORD_RESET_CLOSED",
      "OTP_CHANNEL_UNAVAILABLE",
    ],
    rateLimited: true,
  },
  {
    path: "/api/v1/password-resets/current/otp-challenges",
    method: "post",
    tag: TAG_PASSWORD_RESET,
    summary: "Sıfırlama kodunu yeniden gönderir.",
    access: "public",
    requestBody: { schema: passwordResetResendSchema },
    success: { status: 201, description: "Yeni kodun son geçerlilik zamanı." },
    errors: [
      "PASSWORD_RESET_EXPIRED",
      "PASSWORD_RESET_SEND_RATE_LIMITED",
      "OTP_CHANNEL_UNAVAILABLE",
    ],
    rateLimited: true,
  },
  {
    path: "/api/v1/password-resets/current/password",
    method: "put",
    tag: TAG_PASSWORD_RESET,
    summary: "Kodu doğrular ve yeni şifreyi yazar.",
    description: "Şifre değişince kullanıcının TÜM aktif oturumları düşürülür.",
    access: "public",
    requestBody: { schema: passwordResetCompleteSchema },
    success: { status: 200, description: "Şifre değiştirildi (`completed: true`)." },
    errors: [
      "PASSWORD_RESET_EXPIRED",
      "OTP_INVALID",
      "OTP_EXPIRED",
      "OTP_TOO_MANY_ATTEMPTS",
      "WEAK_PASSWORD",
      "LEAKED_PASSWORD",
    ],
    rateLimited: true,
  },

  {
    path: "/api/v1/auth/google",
    method: "get",
    tag: TAG_GOOGLE,
    summary: "Google yetkilendirme adresine yönlendirir.",
    description: "PKCE + `state` + `nonce` üretilir ve `httpOnly` çerezde saklanır.",
    access: "public",
    success: { status: 302, description: "Google'ın yetkilendirme adresine yönlendirme." },
    errors: ["GOOGLE_LINK_UNAVAILABLE"],
  },
  {
    path: "/api/auth/google/callback",
    method: "get",
    tag: TAG_GOOGLE,
    summary: "Google'dan dönen yetkilendirmeyi işler.",
    description:
      "`state` ve `nonce` çerezdekiyle karşılaştırılır. Bağlama akışında çerezdeki " +
      "kullanıcı kimliği o anki oturumla da karşılaştırılır — araya giren bir hesap " +
      "değişikliğinde bağlantı yanlış hesaba kurulmasın.",
    access: "public",
    success: { status: 302, description: "Sonuç sayfasına yönlendirme." },
    errors: ["GOOGLE_LINKED_TO_OTHER_ACCOUNT", "GOOGLE_ALREADY_LINKED"],
  },
  {
    path: "/api/v1/auth/google/connections",
    method: "post",
    tag: TAG_GOOGLE,
    summary: "Mevcut hesaba Google hesabı bağlamayı başlatır.",
    description:
      "⛔ Şifre onayı ister. Şifre biçim doğrulamasından GEÇMEZ ve bu bilinçli: geçersiz " +
      "biçim ile yanlış şifre aynı cevabı alır, saldırgan denemesinin neden reddedildiğini öğrenemez. " +
      "`303` döner ki tarayıcı `POST`'u tekrarlamasın.",
    access: "authenticated",
    requestBody: {
      // Kendi şeması yok: uç formdan yalnızca `sifre` alanını okuyor ve onu
      // bilerek doğrulamadan geçiriyor (yukarıdaki gerekçe).
      schema: z.object({ sifre: z.string().describe("Hesabın mevcut şifresi.") }),
      contentType: "multipart/form-data",
    },
    success: { status: 303, description: "Google'ın yetkilendirme adresine yönlendirme." },
    errors: ["GOOGLE_ALREADY_LINKED", "GOOGLE_LINK_UNAVAILABLE", "LINK_PASSWORD_CHECK_FAILED"],
    rateLimited: true,
  },
  {
    path: "/api/v1/auth/google/connections",
    method: "delete",
    tag: TAG_GOOGLE,
    summary: "Google bağlantısını kaldırır.",
    description: "Son giriş yöntemiyse reddedilir — hesap erişilemez hâle gelmesin.",
    access: "authenticated",
    success: { status: 204, description: "Bağlantı kaldırıldı." },
    errors: ["GOOGLE_NOT_LINKED", "LAST_LOGIN_METHOD"],
    rateLimited: true,
  },
];
