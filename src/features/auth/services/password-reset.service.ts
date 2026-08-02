import { createHash, randomBytes } from "node:crypto";

import {
  PASSWORD_RESET_CONSTANT_RESPONSE_MS,
  PASSWORD_RESET_FLOW_TTL_MS,
  PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS,
  PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
  PASSWORD_RESET_SEND_RATE_LIMIT_MAX,
  PASSWORD_RESET_SEND_RATE_LIMIT_WINDOW_MS,
  PASSWORD_RESET_TOKEN_BYTES,
} from "@/config/constants";
import { messages } from "@/config/messages";
import { serverEnv } from "@/config/env";
import {
  BotCheckFailedError,
  BotCheckRequiredError,
  BotCheckUnavailableError,
  LeakedPasswordError,
  OtpChannelUnavailableError,
  OtpExpiredError,
  OtpInvalidError,
  OtpTooManyAttemptsError,
  PasswordResetClosedError,
  PasswordResetExpiredError,
  PasswordResetRateLimitedError,
  PasswordResetSendRateLimitedError,
  WeakPasswordError,
} from "@/features/auth/errors";
import {
  findPasswordPolicyProfile,
  findPasswordResetTargetByNationalIdHash,
  updateUserPassword,
} from "@/features/auth/repositories/user.repository";
import type {
  PasswordResetCompletePayload,
  PasswordResetRequestPayload,
} from "@/features/auth/schemas/password-reset.schema";
import { isPasswordResetOpen } from "@/features/auth/services/auth-availability";
import {
  checkPasswordPolicy,
  type PasswordPolicyContext,
} from "@/features/auth/services/password-policy.service";
import { hashPassword } from "@/features/auth/services/password.service";
import { revokeAllSessionsForUser } from "@/features/auth/services/session.service";
import {
  consumeChallenge,
  findChallengeOwner,
  findRecentChallengeOwner,
  invalidateUserChallenges,
  issueDecoyChallenge,
  issueOtp,
  verifyOtp,
} from "@/features/otp/services/otp.service";
import { recordAuditLog } from "@/lib/audit";
import { decryptNationalId, hashNationalId } from "@/lib/crypto";
import { consumeRateLimit, hashActorIp, rateLimitKey } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sleep } from "@/lib/utils";

/**
 * Şifre sıfırlama (PRD §5.0 "Şifre sıfırlama" · adım 4b-3).
 *
 * AKIŞIN TAMAMI HESAP SAYIMI KORUMASI ÜZERİNE KURULU: kimlik numarası kayıtlı
 * olsun olmasın aynı mesaj, aynı davranış ve aynı yanıt süresi döner. Bunu üç
 * ayrı önlem birlikte sağlıyor ve üçü de gerekli:
 *
 *  1. TEK TİP YANIT — her iki yolda da 201 ve aynı gövde.
 *  2. SAHTE KOD KAYDI — kayıtsız numarada da bir kod satırı açılır
 *     (`issueDecoyChallenge`), böylece İKİNCİ EKRAN da aynı davranır: aynı
 *     deneme hakkı, aynı kilitlenme, aynı hata mesajları. Yalnızca birinci
 *     ekranı eşitlemek korumayı yarım bırakırdı.
 *  3. SABİT YANIT SÜRESİ — kayıt varsa e-posta gönderilir, yoksa gönderilmez;
 *     aradaki fark milisaniyeden okunur. Yanıt sabit bir tabana doldurulur
 *     (`equalizeDuration`), giriş akışındaki sahte argon2 doğrulamasının aynı
 *     mantığı.
 *
 * KATMAN: burada iş kuralları var; HTTP, çerez ve durum kodu route katmanının
 * işi (01-architecture.md).
 */

/** Akışın taşındığı amaç — hepsi tek `OtpPurpose` üzerinde çalışır. */
const RESET_PURPOSE = "password_reset" as const;

export type RequestPasswordResetInput = {
  payload: PasswordResetRequestPayload;
  actorIp: string;
  /** Hız sınırının "oturum" bacağı — ziyaretçi kimliği (ADR-006). */
  sessionId: string;
  now?: Date;
};

export type RequestPasswordResetResult = {
  /** Çereze yazılacak HAM jeton. Veritabanında yalnızca özeti duruyor. */
  token: string;
  /** Kodun son geçerlilik anı. Kayıtlı ve kayıtsız numarada aynı hesaplanır. */
  expiresAt: Date;
};

/**
 * BU ADIMIN YANITINDA SİMÜLASYON KODU YOKTUR — local ve preview'da bile.
 *
 * Dönseydi, alanın VARLIĞI "bu numara kayıtlı" demeye gelirdi: sahte akışta
 * gösterilecek bir kod üretilmiyor. Test ortamında kod, ikinci ekrandaki
 * "Kodu göster" düğmesiyle (yeni kod isteme ucu) alınıyor — kayıt akışındaki
 * desenin aynısı.
 */

/**
 * ADIM 1 — kod isteme.
 *
 * SIRA ÖNEMLİ VE GÜVENLİK GEREĞİ:
 *  1. Akış açık mı — hesap ARANMADAN önce. Sonraya bırakılsaydı kayıtlı numara
 *     503, kayıtsız numara 201 alırdı.
 *  2. Hız sınırı — hesaptan bağımsız, iki yolda da aynı.
 *  3. Bot doğrulaması — PRD bu ekranda İLK DENEMEDEN İTİBAREN istiyor; giriş
 *     ekranındaki "2 başarısız denemeden sonra" kuralı buraya GEÇMEZ.
 *  4. Gönderim bütçesi — anahtarı kimlik numarasının özeti, hedef e-posta
 *     DEĞİL; gerekçesi `constants.ts` içinde yazılı.
 *  5. Hesap araması ve kod — sabit süre doldurmasının İÇİNDE.
 */
export async function requestPasswordReset(
  input: RequestPasswordResetInput,
): Promise<RequestPasswordResetResult> {
  const now = input.now ?? new Date();

  if (!isPasswordResetOpen()) throw new PasswordResetClosedError();

  await assertWithinRateLimit(input.actorIp, input.sessionId, now);
  await assertBotCheckPassed(input.payload.turnstileToken, input.actorIp);

  const nationalIdHash = hashNationalId(input.payload.nationalId, serverEnv.NATIONAL_ID_HASH_SALT);

  await assertWithinSendBudget(nationalIdHash, now);

  const token = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");

  const dispatched = await equalizeDuration(() =>
    dispatchCodeForNationalId(hashFlowToken(token), nationalIdHash, now),
  );

  return { token, expiresAt: dispatched.expiresAt };
}

export type ResendPasswordResetCodeInput = {
  /** Çerezdeki HAM akış jetonu. */
  token: string;
  turnstileToken: string;
  actorIp: string;
  sessionId: string;
  now?: Date;
};

/**
 * "Yeni kod gönder" — PRD §5.0 bu ucu da bot korumasının ZORUNLU olduğu yerler
 * arasında sayıyor (gönderim maliyeti ve e-posta bombardımanı).
 *
 * Akışın hangi hesaba ait olduğu KİMLİK NUMARASINDAN DEĞİL, çerezdeki jetonun
 * işaret ettiği kod kaydından okunuyor: kullanıcı numarasını ikinci kez
 * girmiyor, dolayısıyla bu uç yeni bir tarama yüzeyi açmıyor.
 *
 * TÜKETİLMİŞ KAYIT DA SAHİBİNİ VERİR (`findRecentChallengeOwner`): üç kez
 * hatalı deneyip kodu kilitleyen kullanıcı, ekranda yazdığı gibi yeni bir kod
 * isteyebilmeli. Akışın ömrü yine de sınırlı — 15 dakikadan eski jeton kabul
 * edilmez.
 */
export async function resendPasswordResetCode(
  input: ResendPasswordResetCodeInput,
): Promise<{ expiresAt: Date; simulationCode?: string }> {
  const now = input.now ?? new Date();

  if (!isPasswordResetOpen()) throw new PasswordResetClosedError();

  await assertWithinRateLimit(input.actorIp, input.sessionId, now);
  await assertBotCheckPassed(input.turnstileToken, input.actorIp);

  const flowId = hashFlowToken(input.token);
  const owner = await findRecentChallengeOwner(
    flowId,
    RESET_PURPOSE,
    new Date(now.getTime() - PASSWORD_RESET_FLOW_TTL_MS),
  );

  if (!owner) throw new PasswordResetExpiredError();

  await assertWithinSendBudget(flowId, now);

  const dispatched = await equalizeDuration(() => dispatchCodeForOwner(flowId, owner.userId, now));

  return { expiresAt: dispatched.expiresAt, simulationCode: dispatched.revealedCode };
}

export type CompletePasswordResetInput = {
  /** Çerezdeki HAM akış jetonu. */
  token: string;
  payload: PasswordResetCompletePayload;
  actorIp: string;
  now?: Date;
};

/**
 * ADIM 2 — kodu doğrula, şifreyi değiştir, TÜM OTURUMLARI DÜŞÜR.
 *
 * SIRA GÜVENLİK GEREĞİ ŞÖYLE:
 *  1. Kod doğrulanır ama HENÜZ TÜKETİLMEZ.
 *  2. Şifre politikası kontrol edilir.
 *  3. Her şey geçerse kod tüketilir ve şifre değişir.
 *
 * NEDEN POLİTİKA KODDAN SONRA: politika önce çalışsaydı, kodu HİÇ BİLMEYEN
 * biri bile şifre denemesi gönderip "bu şifre hesabın adını/e-postasını
 * içeriyor" yanıtını alabilirdi — hesap sahibinin adını doğrulayan bir kehanet.
 * Kodu bilmeyen artık ikinci adıma hiç geçemiyor.
 *
 * NEDEN KOD HEMEN TÜKETİLMİYOR: tüketilseydi, "şifreniz en az 8 karakter
 * olmalı" uyarısını alan kullanıcının elindeki doğru kod ölür ve 3 deneme
 * hakkından biri zayıf bir şifre yüzünden yanardı.
 *
 * Oturumların düşmesi ADR-005'in varlık sebebi: jeton veritabanında durduğu
 * için şifre değişince kullanıcının tüm cihazlarındaki oturumlar ANINDA
 * geçersizleşir. JWT ile bu söz tutulamazdı.
 */
export async function completePasswordReset(input: CompletePasswordResetInput): Promise<void> {
  const now = input.now ?? new Date();
  const flowId = hashFlowToken(input.token);

  const owner = await findChallengeOwner(flowId, RESET_PURPOSE);

  if (!owner) throw new PasswordResetExpiredError();

  const verification = await verifyOtp({
    registrationId: flowId,
    purpose: RESET_PURPOSE,
    code: input.payload.code,
    consumeOnSuccess: false,
    now,
  });

  if (verification.outcome === "expired") throw new OtpExpiredError();
  if (verification.outcome === "too_many_attempts") throw new OtpTooManyAttemptsError();
  if (verification.outcome === "invalid") throw new OtpInvalidError(verification.remainingAttempts);

  /**
   * SAHTE AKIŞ BURAYA ULAŞAMAZ: sahte kaydın özeti 32 rastgele bayttan
   * üretiliyor ve hiçbir 6 haneli kod ona denk gelemez. Yine de sessizce
   * geçilmiyor — sahibi olmayan bir kayıt hiçbir hesabı değiştiremez.
   */
  if (!owner.userId) throw new PasswordResetExpiredError();

  assertPasswordAllowed(input.payload.password, await readPolicyContext(owner.userId));

  await consumeChallenge(verification.challengeId, now);

  const updated = await updateUserPassword(
    owner.userId,
    await hashPassword(input.payload.password),
  );

  // Hesap kod doğrulanırken silinmiş olabilir; sessizce "başarılı" denmez.
  if (updated === 0) throw new PasswordResetExpiredError();

  // Kullanıcı üst üste iki kez kod istediyse diğeri hâlâ 5 dakika geçerliydi.
  await invalidateUserChallenges(owner.userId, RESET_PURPOSE, now);

  await revokeAllSessionsForUser(owner.userId);

  // KİMLİK NUMARASI YAZILMAZ — `recordAuditLog` imzasında böyle bir alan
  // zaten yok (05-auth-security.md).
  await recordAuditLog({
    userId: owner.userId,
    action: "password_reset",
    entityType: "user",
    entityId: owner.userId,
    ipHash: hashActorIp(input.actorIp),
  });
}

// ---------------------------------------------------------------------------
// İç yardımcılar
// ---------------------------------------------------------------------------

type DispatchedCode = { expiresAt: Date; revealedCode?: string };

/** Kimlik numarasına göre: hesap varsa gerçek kod, yoksa sahte kayıt. */
async function dispatchCodeForNationalId(
  flowId: string,
  nationalIdHash: string,
  now: Date,
): Promise<DispatchedCode> {
  const user = await findPasswordResetTargetByNationalIdHash(nationalIdHash);

  if (!user) return issueDecoyChallenge({ registrationId: flowId, purpose: RESET_PURPOSE, now });

  return sendRealCode(flowId, user.id, user.email, now);
}

/** Akış zaten kurulmuşken (yeni kod isteme): sahibi varsa gerçek kod. */
async function dispatchCodeForOwner(
  flowId: string,
  userId: string | null,
  now: Date,
): Promise<DispatchedCode> {
  if (!userId) return issueDecoyChallenge({ registrationId: flowId, purpose: RESET_PURPOSE, now });

  const profile = await findPasswordPolicyProfile(userId);

  // Hesap arada silindi: akış sahte akışa dönüşür, kullanıcı farkı görmez.
  if (!profile?.email) {
    return issueDecoyChallenge({ registrationId: flowId, purpose: RESET_PURPOSE, now });
  }

  return sendRealCode(flowId, userId, profile.email, now);
}

async function sendRealCode(
  flowId: string,
  userId: string,
  email: string,
  now: Date,
): Promise<DispatchedCode> {
  const result = await issueOtp({
    registrationId: flowId,
    purpose: RESET_PURPOSE,
    destinationKind: "email",
    destinationValue: email,
    contactEmail: email,
    userId,
    now,
  });

  /**
   * BİLİNEN SINIR: bu iki hata yalnızca gerçek hesabı olan yolda çıkabilir.
   *  · `rate_limited` — aynı e-postaya başka bir akıştan (örn. yeni kayıt) da
   *    kod gitmişse tetiklenir. Numaranın kendi bütçesi zaten yukarıda
   *    tükendiği için pratikte önce o durdurur.
   *  · `unavailable` — e-posta sağlayıcısı çökmüşse. Bunu gizlemek, kullanıcıya
   *    hiç gelmeyecek bir kodu beklettirmek olurdu (ADR-004'ün "kapı açık
   *    bırakılmaz" kuralıyla aynı tercih).
   * İkisi de `roadmap.md` teknik borç listesinde yazılı.
   */
  if (result.outcome === "rate_limited") throw new PasswordResetSendRateLimitedError();
  if (result.outcome === "unavailable") throw new OtpChannelUnavailableError();

  return { expiresAt: result.expiresAt, revealedCode: result.revealedCode };
}

/**
 * Şifre politikasının "kendi verini şifre yapma" bağlamı.
 *
 * BURAYA YALNIZCA KODU DOĞRULAMIŞ ÇAĞIRAN ULAŞIR. Bu yüzden hesabın adını ve
 * e-postasını karşılaştırmada kullanmak bilgi sızdırmaz: karşıdaki kişi kodu
 * bildiğine göre zaten o posta kutusuna erişebiliyor.
 *
 * Kimlik numarası burada çözülüyor ve YALNIZCA karşılaştırmada kullanılıyor;
 * hiçbir yanıta, log'a veya hata mesajına girmiyor.
 */
async function readPolicyContext(userId: string): Promise<PasswordPolicyContext> {
  const profile = await findPasswordPolicyProfile(userId);

  if (!profile) return {};

  return {
    fullName: profile.fullName,
    email: profile.email ?? undefined,
    nationalId: profile.nationalIdEncrypted
      ? decryptNationalId(profile.nationalIdEncrypted, serverEnv.NATIONAL_ID_ENCRYPTION_KEY)
      : undefined,
  };
}

function assertPasswordAllowed(password: string, context: PasswordPolicyContext): void {
  const policy = checkPasswordPolicy(password, context);

  if (policy.outcome === "ok") return;
  if (policy.outcome === "leaked") throw new LeakedPasswordError();

  if (policy.outcome === "contains_personal_data") {
    throw new WeakPasswordError(messages.auth.register.errors.passwordContainsPersonalData);
  }

  throw new WeakPasswordError(messages.auth.register.errors.weakPassword);
}

/**
 * İKİ BACAK, TEK SAYAÇ (ADR-006): IP ve ziyaretçi oturumu.
 *
 * Anahtar öneki giriş ve kimlik sorgusundan AYRI; bir akışın bütçesi diğerini
 * tüketmemeli.
 */
async function assertWithinRateLimit(actorIp: string, sessionId: string, now: Date): Promise<void> {
  const decisions = await Promise.all(
    [
      rateLimitKey("password_reset", "ip", actorIp),
      rateLimitKey("password_reset", "session", sessionId),
    ].map((key) =>
      consumeRateLimit({
        key,
        limit: PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS,
        windowMs: PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
        now,
      }),
    ),
  );

  if (decisions.some((decision) => !decision.allowed)) throw new PasswordResetRateLimitedError();
}

/**
 * "Aynı hedefe 3 kod / 15 dakika" kuralının bu akıştaki karşılığı.
 *
 * `subject` gerçek bir hedef değil, kimlik numarasının özeti (ilk adım) ya da
 * akış kimliği (yeni kod isteme). İkisi de kişisel veri içermez ve ikisi de
 * hesabın var olup olmadığından bağımsız çalışır — sınır bu yüzden iki yolda
 * da aynı yerde devreye girer.
 */
async function assertWithinSendBudget(subject: string, now: Date): Promise<void> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("password_reset_send", "destination", subject),
    limit: PASSWORD_RESET_SEND_RATE_LIMIT_MAX,
    windowMs: PASSWORD_RESET_SEND_RATE_LIMIT_WINDOW_MS,
    now,
  });

  if (!decision.allowed) throw new PasswordResetSendRateLimitedError();
}

/** Bot kapısı. `unavailable` ASLA geçmiş sayılmaz (ADR-004 bedel 2). */
async function assertBotCheckPassed(token: string, actorIp: string): Promise<void> {
  const outcome = await verifyTurnstileToken({ token, actorIp });

  if (outcome === "success") return;
  if (outcome === "unavailable") throw new BotCheckUnavailableError();

  throw token ? new BotCheckFailedError() : new BotCheckRequiredError();
}

/**
 * Yanıt süresini sabit bir tabana doldurur (PRD §5.0: "aynı yanıt süresi").
 *
 * `finally` kullanılıyor ki HATA YOLU DA doldurulsun: yalnızca başarı yolu
 * doldurulsaydı, hızlı dönen bir hata tek başına bilgi taşırdı.
 *
 * Gerçek saat okunuyor (`Date.now`), çağırandan gelen `now` değil: `now`
 * testlerin sahte saati olabilir ve gerçek geçen süreyi ölçmez.
 */
async function equalizeDuration<T>(run: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();

  try {
    return await run();
  } finally {
    const remaining = PASSWORD_RESET_CONSTANT_RESPONSE_MS - (Date.now() - startedAt);

    if (remaining > 0) await sleep(remaining);
  }
}

/**
 * Çerezdeki jetonun veritabanı karşılığı.
 *
 * Jetonun KENDİSİ saklanmıyor: veritabanı dökümü ele geçse bile oradaki
 * değerle çerez üretilemesin diye yalnızca SHA-256 özeti tutuluyor — oturum
 * jetonu ve kayıt taslağı ile aynı desen.
 */
function hashFlowToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
