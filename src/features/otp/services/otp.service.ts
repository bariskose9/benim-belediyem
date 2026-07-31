import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_SEND_RATE_LIMIT_MAX,
  OTP_SEND_RATE_LIMIT_WINDOW_MS,
  OTP_TTL_MS,
} from "@/config/constants";
import { isProductionEnv } from "@/config/env";
import {
  createOtpChallenge,
  findConsumedPurposes,
  findLastChallengeExpiresAt,
  findPendingChallenge,
  incrementAttemptCount,
  invalidatePendingChallenges,
  markChallengeConsumed,
} from "@/features/otp/repositories/otp-challenge.repository";
import { resolveOtpChannel } from "@/features/otp/providers/resolve-channel";
import { generateOtpCode, otpCodeMatches, hashOtpCode } from "@/features/otp/services/otp-code";
import type { OtpChannelAdapter, OtpDestinationKind } from "@/features/otp/types";
import type { OtpPurpose } from "@/generated/prisma/enums";
import { consumeRateLimit, hashDestination, rateLimitKey } from "@/lib/rate-limit";

/**
 * Tek kullanımlık kod iş kuralları (05-auth-security.md · PRD §5.0).
 *
 * 6 hane · 5 dakika · 3 deneme · tek kullanımlık · özetlenerek saklanır ·
 * aynı hedefe 3 kod / 15 dakika.
 *
 * Kayıt akışında iki kod BİRBİRİNDEN BAĞIMSIZ doğrulanır: "biri geçerken
 * diğeri geçersizleşmez" (PRD §5.0). Bu yüzden her fonksiyon tek bir `purpose`
 * üzerinde çalışır ve diğerine hiç dokunmaz.
 */

export type IssueOtpInput = {
  registrationId: string;
  purpose: OtpPurpose;
  destinationKind: OtpDestinationKind;
  destinationValue: string;
  contactEmail: string;
  now?: Date;
};

export type IssueOtpResult =
  | { outcome: "sent"; expiresAt: Date; revealedCode?: string }
  | { outcome: "rate_limited" }
  | { outcome: "cooldown"; retryAfterMs: number }
  | { outcome: "unavailable" };

export type VerifyOtpInput = {
  registrationId: string;
  purpose: OtpPurpose;
  code: string;
  now?: Date;
};

export type VerifyOtpResult =
  | { outcome: "verified" }
  | { outcome: "invalid"; remainingAttempts: number }
  | { outcome: "expired" }
  | { outcome: "too_many_attempts" };

/**
 * Kod üretir, gönderir ve kaydeder.
 *
 * SIRA ÖNEMLİ: önce hız sınırı, sonra gönderim, EN SON veritabanı kaydı.
 * Kaydı önce yazsaydık ve gönderim başarısız olsaydı, kullanıcının elinde
 * hiç ulaşmayan bir kod için geçerli bir kayıt kalırdı ve o kayıt eski kodu
 * geçersizleştirmiş olurdu — kullanıcı tamamen kilitlenirdi.
 */
export async function issueOtp(input: IssueOtpInput): Promise<IssueOtpResult> {
  const now = input.now ?? new Date();
  const destinationHash = hashDestination(input.destinationValue);

  const cooldown = await checkResendCooldown(input.registrationId, input.purpose, now);
  if (cooldown) return cooldown;

  // "Aynı hedefe 3 kod / 15 dakika" — mevcut hız sınırı mekanizması kullanılıyor,
  // ikinci bir mekanizma KURULMUYOR (ADR-006).
  const decision = await consumeRateLimit({
    key: rateLimitKey("otp_send", "destination", input.destinationValue),
    limit: OTP_SEND_RATE_LIMIT_MAX,
    windowMs: OTP_SEND_RATE_LIMIT_WINDOW_MS,
    now,
  });

  if (!decision.allowed) return { outcome: "rate_limited" };

  const channel: OtpChannelAdapter = resolveOtpChannel(input.destinationKind);
  const code = generateOtpCode();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  const sent = await channel.send({
    purpose: input.purpose,
    code,
    expiresAt,
    destination: { kind: input.destinationKind, value: input.destinationValue },
    contactEmail: input.contactEmail,
  });

  if (sent.outcome === "unavailable") return { outcome: "unavailable" };

  // Yeni kod geçerli olduğu anda eskisi geçersizleşir. Aksi hâlde 3 deneme
  // sınırı kodlar arasında paylaşılır ve fiilen 3'ün katına çıkardı.
  await invalidatePendingChallenges(input.registrationId, input.purpose, now);

  await createOtpChallenge({
    registrationId: input.registrationId,
    purpose: input.purpose,
    channel: channel.channel,
    destinationHash,
    codeHash: hashOtpCode(code, scopeFor(input.registrationId, input.purpose)),
    expiresAt,
  });

  return {
    outcome: "sent",
    expiresAt,
    revealedCode: revealCodeIfAllowed(sent.revealedCode),
  };
}

/**
 * Kodu doğrular.
 *
 * Süre dolumu OKUMA ANINDA uygulanıyor (ADR-007): temizlik görevi hiç
 * çalışmasa bile süresi geçmiş kod kabul edilmez.
 */
export async function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
  const now = input.now ?? new Date();
  const challenge = await findPendingChallenge(input.registrationId, input.purpose);

  if (!challenge) return { outcome: "expired" };

  if (challenge.expiresAt.getTime() <= now.getTime()) {
    await markChallengeConsumed(challenge.id, now);

    return { outcome: "expired" };
  }

  if (challenge.attemptCount >= OTP_MAX_ATTEMPTS) {
    return { outcome: "too_many_attempts" };
  }

  const matches = otpCodeMatches(
    input.code,
    scopeFor(input.registrationId, input.purpose),
    challenge.codeHash,
  );

  if (!matches) {
    const attemptCount = await incrementAttemptCount(challenge.id);

    if (attemptCount >= OTP_MAX_ATTEMPTS) {
      // Kod kilitlendi; yeni kod istenmeli. Satır tüketilmiş sayılıyor ki
      // kilitli bir kodla uğraşmaya devam edilmesin.
      await markChallengeConsumed(challenge.id, now);

      return { outcome: "too_many_attempts" };
    }

    return { outcome: "invalid", remainingAttempts: OTP_MAX_ATTEMPTS - attemptCount };
  }

  await markChallengeConsumed(challenge.id, now);

  return { outcome: "verified" };
}

/** Bu kayıt için hangi kanallar doğrulandı. */
export async function readVerifiedPurposes(registrationId: string): Promise<Set<OtpPurpose>> {
  return new Set(await findConsumedPurposes(registrationId));
}

/**
 * KODUN EKRANA ÇIKABİLECEĞİ TEK KAPI.
 *
 * Production'da her zaman `undefined` döner. Route katmanı `revealedCode`
 * alanına doğrudan dokunmaz; yalnızca bu fonksiyonun çıktısını taşır.
 * Sahte kanal production'da zaten seçilemiyor (src/config/env.ts) — bu ikinci
 * bir kemer, tek başına dayandığımız koruma değil.
 */
function revealCodeIfAllowed(code: string | undefined): string | undefined {
  return isProductionEnv ? undefined : code;
}

/**
 * "Tekrar gönder" bekleme süresi. Hız sınırından AYRI ve ondan kısa: amacı
 * korumak değil, kullanıcıyı üç kod hakkını arka arkaya harcamaktan korumak.
 */
async function checkResendCooldown(
  registrationId: string,
  purpose: OtpPurpose,
  now: Date,
): Promise<{ outcome: "cooldown"; retryAfterMs: number } | null> {
  const lastExpiresAt = await findLastChallengeExpiresAt(registrationId, purpose);

  if (!lastExpiresAt) return null;

  // Üretim anı son kullanma anından geri hesaplanıyor; böylece bekleme süresi
  // veritabanı saatine değil, servisin saatine bağlı kalıyor (repository notu).
  const lastIssuedAt = lastExpiresAt.getTime() - OTP_TTL_MS;
  const elapsed = now.getTime() - lastIssuedAt;

  if (elapsed >= OTP_RESEND_COOLDOWN_MS) return null;

  return { outcome: "cooldown", retryAfterMs: OTP_RESEND_COOLDOWN_MS - elapsed };
}

/** Özet kapsamı — aynı kod farklı kayıtlarda farklı özet üretsin diye. */
function scopeFor(registrationId: string, purpose: OtpPurpose): string {
  return `${registrationId}:${purpose}`;
}
