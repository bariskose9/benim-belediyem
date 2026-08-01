import { randomBytes } from "node:crypto";

import {
  OTP_MAX_ATTEMPTS,
  OTP_SEND_RATE_LIMIT_MAX,
  OTP_SEND_RATE_LIMIT_WINDOW_MS,
  OTP_TTL_MS,
  PASSWORD_RESET_DECOY_SECRET_BYTES,
} from "@/config/constants";
import { isProductionEnv } from "@/config/env";
import {
  createOtpChallenge,
  findConsumedPurposes,
  findLatestChallenge,
  findPendingChallenge,
  incrementAttemptCount,
  invalidatePendingChallenges,
  invalidatePendingChallengesForUser,
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
  /**
   * Kodun ait olduğu hesap — şifre sıfırlamada dolu, kayıt akışında yok
   * (hesap henüz açılmamış). Doğrulama adımında hangi hesabın sıfırlanacağı
   * BU ALANDAN okunur; istemciden gelen hiçbir değer o kararı etkileyemez.
   */
  userId?: string;
  now?: Date;
};

export type IssueOtpResult =
  | { outcome: "sent"; expiresAt: Date; revealedCode?: string }
  | { outcome: "rate_limited" }
  | { outcome: "unavailable" };

export type VerifyOtpInput = {
  registrationId: string;
  purpose: OtpPurpose;
  code: string;
  /**
   * Doğru kod hemen tüketilsin mi (varsayılan: evet).
   *
   * `false` YALNIZCA çağıranın kodu doğruladıktan SONRA başka bir kuralda
   * takılabildiği yerlerde kullanılır — şifre sıfırlamada yeni şifre politikası
   * gibi. Orada kod tüketilseydi, "şifren yeterince güçlü değil" diyen bir
   * yanıttan sonra kullanıcının elindeki doğru kod ölürdü.
   */
  consumeOnSuccess?: boolean;
  now?: Date;
};

export type VerifyOtpResult =
  | { outcome: "verified"; challengeId: string }
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
    userId: input.userId,
  });

  return {
    outcome: "sent",
    expiresAt,
    revealedCode: revealCodeIfAllowed(sent.revealedCode),
  };
}

export type IssueDecoyChallengeInput = {
  registrationId: string;
  purpose: OtpPurpose;
  now?: Date;
};

/**
 * KİMSEYE AİT OLMAYAN, HİÇ GÖNDERİLMEYEN kod kaydı açar (adım 4b-3).
 *
 * NEDEN VAR — hesap sayımı koruması (PRD §5.0): şifre sıfırlamada kayıtsız bir
 * kimlik numarası için hiçbir kayıt açılmasaydı, kullanıcı ikinci ekranda kod
 * girdiğinde "kodun süresi doldu" görürdü; kayıtlı numarada ise "kod hatalı,
 * 2 deneme kaldı". Birinci ekranın mesajını eşitlemek bu farkı kapatmaz —
 * saldırgan ayrımı ikinci ekranda okur. Sahte kayıt sayesinde iki yol da aynı
 * deneme hakkını, aynı kilitlenmeyi ve aynı mesajları üretir.
 *
 * KOD OLARAK 6 HANE ÜRETİLMEZ: özet, 32 rastgele bayttan hesaplanıyor.
 * Kullanıcının girebileceği hiçbir 6 haneli değer bu özete denk gelemez, yani
 * sahte akış kazara bile "doğrulandı" durumuna geçemez.
 *
 * `userId` YAZILMAZ — doğrulama adımı sahibi olmayan kaydı bu sayede tanır.
 */
export async function issueDecoyChallenge(input: IssueDecoyChallengeInput): Promise<{
  expiresAt: Date;
}> {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  // Sahte kayıt yalnızca e-posta taşıyan akışlarda (şifre sıfırlama) üretiliyor.
  const channel: OtpChannelAdapter = resolveOtpChannel("email");

  // Gerçek gönderimle aynı davranış: yeni kayıt açılınca eskisi geçersizleşir,
  // yoksa 3 deneme sınırı kayıtlar arasında paylaşılırdı.
  await invalidatePendingChallenges(input.registrationId, input.purpose, now);

  await createOtpChallenge({
    registrationId: input.registrationId,
    purpose: input.purpose,
    // Gerçek kayıtla aynı görünsün diye ortamın kanalı yazılıyor; hiçbir
    // gönderim yapılmadı, bu satır yalnızca akışın devamını taşıyor.
    channel: channel.channel,
    destinationHash: hashDestination(
      randomBytes(PASSWORD_RESET_DECOY_SECRET_BYTES).toString("hex"),
    ),
    codeHash: hashOtpCode(
      randomBytes(PASSWORD_RESET_DECOY_SECRET_BYTES).toString("hex"),
      scopeFor(input.registrationId, input.purpose),
    ),
    expiresAt,
  });

  return { expiresAt };
}

/**
 * Bekleyen kodun sahibini söyler; kod yoksa `null`.
 *
 * Şifre sıfırlamanın doğrulama adımı hangi hesabı güncelleyeceğini buradan
 * öğrenir. Sahte kayıtta `userId` `null` döner ve akış hiçbir hesaba dokunmaz.
 */
export async function findChallengeOwner(
  registrationId: string,
  purpose: OtpPurpose,
): Promise<{ userId: string | null } | null> {
  const challenge = await findPendingChallenge(registrationId, purpose);

  return challenge ? { userId: challenge.userId } : null;
}

/**
 * Akışın sahibini TÜKETİLMİŞ kayıttan da okur.
 *
 * "Yeni kod gönder" bunu kullanıyor: kodunu üç kez yanlış girip kilitleyen
 * kullanıcı, ekranda yazdığı gibi yeni bir kod isteyebilmeli. `createdAfter`
 * akışın ömrünü sınırlar.
 */
export async function findRecentChallengeOwner(
  registrationId: string,
  purpose: OtpPurpose,
  createdAfter: Date,
): Promise<{ userId: string | null } | null> {
  const challenge = await findLatestChallenge(registrationId, purpose, createdAfter);

  return challenge ? { userId: challenge.userId } : null;
}

/**
 * Bir hesabın bekleyen tüm kodlarını geçersizleştirir.
 *
 * Şifre değiştikten sonra çağrılır: kullanıcı üst üste iki kez kod istediyse
 * kullanılmayan diğeri hâlâ geçerli kalırdı (05-auth-security.md).
 */
export async function invalidateUserChallenges(
  userId: string,
  purpose: OtpPurpose,
  now: Date,
): Promise<void> {
  await invalidatePendingChallengesForUser(userId, purpose, now);
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

  if (input.consumeOnSuccess ?? true) await markChallengeConsumed(challenge.id, now);

  return { outcome: "verified", challengeId: challenge.id };
}

/**
 * Kodu tüketilmiş işaretler.
 *
 * `verifyOtp` bunu normalde kendi yapar; ayrı bir kapı olarak da duruyor çünkü
 * şifre sıfırlama, kodu doğruladıktan sonra şifre politikasında takılabiliyor
 * ve o durumda kodun ölmemesi gerekiyor.
 */
export async function consumeChallenge(challengeId: string, now: Date = new Date()): Promise<void> {
  await markChallengeConsumed(challengeId, now);
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

/** Özet kapsamı — aynı kod farklı kayıtlarda farklı özet üretsin diye. */
function scopeFor(registrationId: string, purpose: OtpPurpose): string {
  return `${registrationId}:${purpose}`;
}
