import { randomBytes, createHash } from "node:crypto";

import { REGISTRATION_DRAFT_TTL_MS, REGISTRATION_TOKEN_BYTES } from "@/config/constants";
import { serverEnv } from "@/config/env";
import {
  AgeRestrictedError,
  EmailAlreadyRegisteredError,
  IdentityAlreadyRegisteredError,
  IdentityCheckFailedError,
  IdentityRateLimitedError,
  IdentityServiceUnavailableError,
  LeakedPasswordError,
  OtpChannelUnavailableError,
  OtpExpiredError,
  OtpInvalidError,
  OtpSendRateLimitedError,
  OtpTooManyAttemptsError,
  RegistrationClosedError,
  RegistrationExpiredError,
  WeakPasswordError,
} from "@/features/auth/errors";
import {
  createRegistrationDraft,
  deleteDraftsForNationalIdHash,
  deleteRegistrationDraft,
  findActiveDraftByTokenHash,
  updateDraftContact,
  type RegistrationDraftRow,
} from "@/features/auth/repositories/registration-draft.repository";
import {
  createVerifiedUser,
  findUserIdByEmail,
  findUserIdByNationalIdHash,
} from "@/features/auth/repositories/user.repository";
import type {
  RegistrationContactPayload,
  RegistrationStartPayload,
} from "@/features/auth/schemas/registration.schema";
import { assertBotCheckPassed } from "@/features/auth/services/bot-check";
import { checkPasswordPolicy } from "@/features/auth/services/password-policy.service";
import { hashPassword } from "@/features/auth/services/password.service";
import { isAdultOn } from "@/features/auth/services/registration-age.service";
import { isRegistrationOpen } from "@/features/auth/services/auth-availability";
import { matchStaffMember } from "@/features/auth/services/staff-matching.service";
import type {
  RegistrationContact,
  RegistrationIdentityView,
  RegistrationState,
} from "@/features/auth/types";
import { recordRegistrationConsents } from "@/features/legal/services/consent.service";
import { lookupIdentity } from "@/features/identity/services/identity-lookup.service";
import type { IdentityRecord } from "@/features/identity/types";
import { maskPhone } from "@/features/otp/providers/email-sms-simulation-channel";
import { maskEmail } from "@/features/otp/providers/email-transport";
import { issueOtp, readVerifiedPurposes, verifyOtp } from "@/features/otp/services/otp.service";
import { messages } from "@/config/messages";
import { recordAuditLog } from "@/lib/audit";
import { decryptSecret, encryptSecret, hashNationalId, maskNationalId } from "@/lib/crypto";
import { hashActorIp, hashDestination } from "@/lib/rate-limit";

/**
 * Kayıt akışı (PRD §5.0).
 *
 * Üç adım: kimlik sorgusu → iletişim + şifre → iki bağımsız kod.
 * Adımlar arasındaki durum `registration_drafts` tablosunda şifreli duruyor
 * (ADR-012); tarayıcı yalnızca rastgele bir jeton taşıyor.
 *
 * KATMAN: bu dosya iş kurallarını tutar. HTTP, çerez ve durum kodu bilgisi
 * YOKTUR — onlar route katmanının işi (01-architecture.md).
 */

export type StartRegistrationInput = {
  payload: RegistrationStartPayload;
  actorIp: string;
  sessionId: string;
  now?: Date;
};

export type StartRegistrationResult = {
  /** Çereze yazılacak HAM jeton. Veritabanında yalnızca özeti duruyor. */
  token: string;
  identity: RegistrationIdentityView;
  expiresAt: Date;
};

/**
 * ADIM 1 — kimlik sorgusu.
 *
 * SIRA ÖNEMLİ VE GÜVENLİK GEREĞİ:
 *  1. Bot doğrulaması — KPS sorgusundan ÖNCE (PRD §5.0 · ADR-004). Kayıt formu
 *     numara taramasının birincil hedefi ve her sorgu dış servis maliyeti.
 *  2. `lookupIdentity` — hız sınırı, devre kesici, denetim kaydı ve SABİT
 *     1500 ms yanıt süresi zaten onun içinde (adım 4a).
 *  3. 18 yaş kontrolü — KPS'ten gelen tarihten, sunucuda.
 *  4. "Bu numarayla hesap var mı" — `lookupIdentity`'DEN SONRA. Önce
 *     kontrol edilseydi, sabit yanıt süresi doldurmasının dışında kalır ve
 *     zamanlama üzerinden bir hesap sayımı kanalı açılırdı.
 */
export async function startRegistration(
  input: StartRegistrationInput,
): Promise<StartRegistrationResult> {
  const now = input.now ?? new Date();

  // Ekranda formu gizlemek YETKİLENDİRME DEĞİLDİR (05-auth-security.md):
  // aynı kontrol sunucuda da yapılıyor, yoksa doğrudan uca istek atan biri
  // kimliğini doğrulatıp hiç gelmeyecek bir kodu beklerdi.
  if (!isRegistrationOpen()) throw new RegistrationClosedError();

  await assertBotCheckPassed(input.payload.turnstileToken, input.actorIp);

  const lookup = await lookupIdentity({
    nationalId: input.payload.nationalId,
    birthYear: input.payload.birthYear,
    actorIp: input.actorIp,
    sessionId: input.sessionId,
  });

  if (lookup.outcome === "rate_limited") {
    throw new IdentityRateLimitedError();
  }

  if (lookup.outcome === "unavailable") {
    throw new IdentityServiceUnavailableError();
  }

  if (lookup.outcome === "failed") {
    throw new IdentityCheckFailedError();
  }

  const identity = lookup.identity;
  const birthDate = new Date(`${identity.birthDate}T00:00:00.000Z`);

  if (!isAdultOn(birthDate, now)) {
    throw new AgeRestrictedError();
  }

  const nationalIdHash = hashNationalId(input.payload.nationalId, serverEnv.NATIONAL_ID_HASH_SALT);

  if (await findUserIdByNationalIdHash(nationalIdHash)) {
    throw new IdentityAlreadyRegisteredError();
  }

  // Kullanıcı akışı yarıda bırakıp baştan başlamış olabilir; eski taslağın
  // jetonu geçerli kalmasın.
  await deleteDraftsForNationalIdHash(nationalIdHash);

  const token = randomBytes(REGISTRATION_TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(now.getTime() + REGISTRATION_DRAFT_TTL_MS);

  await createRegistrationDraft({
    tokenHash: hashToken(token),
    nationalIdHash,
    kpsPayloadEncrypted: encryptSecret(
      JSON.stringify({ ...identity, nationalId: input.payload.nationalId }),
      encryptionKey(),
    ),
    // Düz IP ASLA yazılmaz — tuzlanmış özet (ADR-006).
    actorIpHash: hashActorIp(input.actorIp),
    expiresAt,
  });

  return {
    token,
    identity: toIdentityView(identity, input.payload.nationalId),
    expiresAt,
  };
}

export type SubmitContactInput = {
  token: string;
  payload: RegistrationContactPayload;
  now?: Date;
};

export type SubmitContactResult = {
  expiresAt: Date;
  /** Yalnızca local ve preview'da dolu — production'da her zaman `undefined`. */
  simulationCodes?: { email?: string; phone?: string };
};

/**
 * ADIM 2 — iletişim bilgisi, şifre ve iki kodun gönderimi.
 *
 * ŞİFRE BURADA ÖZETLENİYOR, doğrulama adımında değil. Gerekçe: düz şifre
 * yalnızca TEK bir isteğin ömrü boyunca var oluyor ve istemci kodları
 * doğruladıktan sonra araya başka bir şifre sokamıyor.
 */
export async function submitContact(input: SubmitContactInput): Promise<SubmitContactResult> {
  const now = input.now ?? new Date();
  const draft = await requireDraft(input.token, now);
  const { email, phone, password } = input.payload;

  const identity = readIdentity(draft);

  const policy = checkPasswordPolicy(password, {
    nationalId: identity.nationalId,
    email,
    fullName: `${identity.firstName} ${identity.lastName}`,
  });

  if (policy.outcome === "leaked") throw new LeakedPasswordError();
  if (policy.outcome === "contains_personal_data") {
    throw new WeakPasswordError(messages.auth.register.errors.passwordContainsPersonalData);
  }
  if (policy.outcome !== "ok") {
    throw new WeakPasswordError(messages.auth.register.errors.weakPassword);
  }

  if (await findUserIdByEmail(email)) {
    throw new EmailAlreadyRegisteredError();
  }

  await updateDraftContact(draft.id, {
    contactEncrypted: encryptSecret(JSON.stringify({ email, phone }), encryptionKey()),
    emailHash: hashDestination(email),
    phoneHash: hashDestination(phone),
    passwordHash: await hashPassword(password),
  });

  const emailCode = await sendCode(draft.id, "email", email, email, now);
  const phoneCode = await sendCode(draft.id, "phone", phone, email, now);

  return {
    expiresAt: draft.expiresAt,
    simulationCodes: emailCode || phoneCode ? { email: emailCode, phone: phoneCode } : undefined,
  };
}

export type ResendCodeInput = {
  token: string;
  channel: "email" | "phone";
  turnstileToken: string;
  actorIp: string;
  now?: Date;
};

/**
 * "Kodu tekrar gönder" — PRD §5.0 bu ucu da bot korumasının ZORUNLU olduğu
 * yerler arasında sayıyor (gönderim maliyeti ve e-posta bombardımanı).
 */
export async function resendCode(
  input: ResendCodeInput,
): Promise<{ simulationCode?: string; expiresAt: Date }> {
  const now = input.now ?? new Date();

  await assertBotCheckPassed(input.turnstileToken, input.actorIp);

  const draft = await requireDraft(input.token, now);
  const contact = readContact(draft);

  const destination = input.channel === "email" ? contact.email : contact.phone;
  const code = await sendCode(draft.id, input.channel, destination, contact.email, now);

  return { simulationCode: code, expiresAt: draft.expiresAt };
}

export type VerifyCodeInput = {
  token: string;
  channel: "email" | "phone";
  code: string;
  actorIp: string;
  now?: Date;
};

export type VerifyCodeResult =
  | { completed: false; emailVerified: boolean; phoneVerified: boolean }
  | { completed: true; isStaff: boolean };

/**
 * ADIM 3 — kod doğrulama; iki kanal da tamamlanırsa hesap oluşur.
 *
 * HESAP OLUŞTURMA AYRI BİR UÇ DEĞİL, burada gerçekleşiyor. Gerekçe: ayrı bir
 * uç olsaydı, "iki kod da doğrulanmış ama hesap henüz açılmamış" diye
 * korunması gereken üçüncü bir durum ve dışarıya açık ikinci bir yüzey
 * doğardı.
 */
export async function verifyCode(input: VerifyCodeInput): Promise<VerifyCodeResult> {
  const now = input.now ?? new Date();
  const draft = await requireDraft(input.token, now);
  const purpose = input.channel === "email" ? "register_email" : "register_phone";

  const result = await verifyOtp({
    registrationId: draft.id,
    purpose,
    code: input.code,
    now,
  });

  if (result.outcome === "expired") throw new OtpExpiredError();
  if (result.outcome === "too_many_attempts") throw new OtpTooManyAttemptsError();
  if (result.outcome === "invalid") throw new OtpInvalidError(result.remainingAttempts);

  const verified = await readVerifiedPurposes(draft.id);
  const emailVerified = verified.has("register_email");
  const phoneVerified = verified.has("register_phone");

  // PRD §5.0: "İki koddan yalnızca biri doğrulanmışsa hesap AÇILMAZ."
  if (!emailVerified || !phoneVerified) {
    return { completed: false, emailVerified, phoneVerified };
  }

  return finalizeRegistration(draft, hashActorIp(input.actorIp), now);
}

/** Kayıt ekranlarının okuduğu durum. */
export async function getRegistrationState(
  token: string,
  now: Date = new Date(),
): Promise<RegistrationState | null> {
  const draft = await findActiveDraftByTokenHash(hashToken(token), now);

  if (!draft) return null;

  const identity = readIdentity(draft);
  const contact = draft.contactEncrypted ? readContact(draft) : null;
  const verified = await readVerifiedPurposes(draft.id);

  return {
    step: contact ? "verify" : "contact",
    identity: toIdentityView(identity, identity.nationalId),
    emailMasked: contact ? maskEmail(contact.email) : null,
    phoneMasked: contact ? maskPhone(contact.phone) : null,
    emailVerified: verified.has("register_email"),
    phoneVerified: verified.has("register_phone"),
    expiresAt: draft.expiresAt,
  };
}

/** Kullanıcı vazgeçti — taslak hemen silinir, süre dolmasını beklemez. */
export async function cancelRegistration(token: string, now: Date = new Date()): Promise<void> {
  const draft = await findActiveDraftByTokenHash(hashToken(token), now);

  if (draft) await deleteRegistrationDraft(draft.id);
}

// ---------------------------------------------------------------------------
// İç yardımcılar
// ---------------------------------------------------------------------------

async function finalizeRegistration(
  draft: RegistrationDraftRow,
  actorIpHash: string,
  now: Date,
): Promise<VerifyCodeResult> {
  const identity = readIdentity(draft);
  const contact = readContact(draft);

  // Yarış koşulu: kullanıcı kodlarını doğrularken aynı numarayla başka bir
  // hesap açılmış olabilir. Son anda bir kez daha bakılıyor.
  if (await findUserIdByNationalIdHash(draft.nationalIdHash)) {
    throw new IdentityAlreadyRegisteredError();
  }

  const staffMemberId = await matchStaffMember(draft.nationalIdHash);

  const created = await createVerifiedUser({
    nationalIdEncrypted: encryptSecret(identity.nationalId, encryptionKey()),
    nationalIdHash: draft.nationalIdHash,
    nationalIdMasked: maskNationalId(identity.nationalId),
    fullName: `${identity.firstName} ${identity.lastName}`,
    birthDate: new Date(`${identity.birthDate}T00:00:00.000Z`),
    email: contact.email,
    phone: contact.phone,
    passwordHash: requirePasswordHash(draft),
    registeredProvince: identity.registeredProvince,
    registeredDistrict: identity.registeredDistrict,
    staffMemberId,
    verifiedAt: now,
  });

  // Taslak artık gereksiz: içindeki kalıcı tutulmayan KPS alanları
  // (baba adı, anne adı, doğum yeri, medeni hâl, nüfus adresi) burada yok olur.
  await deleteRegistrationDraft(draft.id);

  await recordAuditLog({
    userId: created.id,
    action: "register",
    entityType: "user",
    entityId: created.id,
    ipHash: actorIpHash,
  });

  /**
   * Kullanım şartları ve aydınlatma metninin gösterildiği kaydedilir
   * (adım 17 · PRD §5.10). Kayıt düğmesinin üstünde iki bağlantı ve "kayıt
   * olarak kabul etmiş olursunuz" cümlesi duruyor.
   *
   * HESAP AÇILDIKTAN SONRA yazılıyor: rızanın öznesi hesap, hesap ise bu
   * satırdan önce yok. Hatası hesabı düşürmez — gerekçe
   * `recordRegistrationConsents` içinde yazılı.
   */
  await recordRegistrationConsents({ userId: created.id, ipHash: actorIpHash });

  return { completed: true, isStaff: created.isStaff };
}

async function sendCode(
  draftId: string,
  channel: "email" | "phone",
  destinationValue: string,
  contactEmail: string,
  now: Date,
): Promise<string | undefined> {
  const result = await issueOtp({
    registrationId: draftId,
    purpose: channel === "email" ? "register_email" : "register_phone",
    destinationKind: channel,
    destinationValue,
    contactEmail,
    now,
  });

  if (result.outcome === "rate_limited") throw new OtpSendRateLimitedError();
  if (result.outcome === "unavailable") throw new OtpChannelUnavailableError();

  return result.revealedCode;
}

async function requireDraft(token: string, now: Date): Promise<RegistrationDraftRow> {
  const draft = await findActiveDraftByTokenHash(hashToken(token), now);

  if (!draft) throw new RegistrationExpiredError();

  return draft;
}

/**
 * Çerezdeki jetonun veritabanı karşılığı.
 *
 * Jetonun KENDİSİ saklanmıyor: veritabanı dökümü ele geçse bile oradaki
 * değerle çerez üretilemesin diye yalnızca SHA-256 özeti tutuluyor —
 * oturum jetonlarında kullanılan aynı desen.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

type StoredIdentity = IdentityRecord & { nationalId: string };

function readIdentity(draft: RegistrationDraftRow): StoredIdentity {
  return JSON.parse(decryptSecret(draft.kpsPayloadEncrypted, encryptionKey())) as StoredIdentity;
}

function readContact(draft: RegistrationDraftRow): RegistrationContact {
  if (!draft.contactEncrypted) {
    throw new Error("İletişim adımı tamamlanmadan bu bilgi okunamaz.");
  }

  return JSON.parse(decryptSecret(draft.contactEncrypted, encryptionKey())) as RegistrationContact;
}

function requirePasswordHash(draft: RegistrationDraftRow): string {
  if (!draft.passwordHash) {
    throw new Error("İletişim adımı tamamlanmadan hesap oluşturulamaz.");
  }

  return draft.passwordHash;
}

/**
 * İstemciye gidecek kimlik görünümü.
 *
 * ALANLAR TEK TEK YAZILIYOR, `...identity` ile yayılmıyor. Gerekçe: taslakta
 * saklanan nesne KPS kaydına ek olarak DÜZ KİMLİK NUMARASINI da taşıyor
 * (şifreyi ve numarayı sonradan doğrulayabilmek için). Yayma kullanılsaydı
 * `getRegistrationState` tam numarayı yanıta koyardı — tam olarak
 * `05-auth-security.md`'nin yasakladığı şey. Beyaz liste, yayılmadan daha
 * uzun ama yanlışlıkla alan eklenmesine kapalı.
 */
function toIdentityView(identity: IdentityRecord, nationalId: string): RegistrationIdentityView {
  return {
    firstName: identity.firstName,
    lastName: identity.lastName,
    birthDate: identity.birthDate,
    birthPlace: identity.birthPlace,
    fatherName: identity.fatherName,
    motherName: identity.motherName,
    registeredProvince: identity.registeredProvince,
    registeredDistrict: identity.registeredDistrict,
    gender: identity.gender,
    maritalStatus: identity.maritalStatus,
    registeredAddress: identity.registeredAddress,
    nationalIdMasked: maskNationalId(nationalId),
  };
}

function encryptionKey(): string {
  return serverEnv.NATIONAL_ID_ENCRYPTION_KEY;
}
