import { serverEnv } from "@/config/env";
import {
  AgeRestrictedError,
  IdentityAlreadyRegisteredError,
  IdentityAlreadyVerifiedError,
  IdentityCheckFailedError,
  IdentityRateLimitedError,
  IdentityServiceUnavailableError,
} from "@/features/auth/errors";
import {
  attachVerifiedIdentity,
  findIdentityStatusByUserId,
  findUserIdByNationalIdHash,
} from "@/features/auth/repositories/user.repository";
import { assertBotCheckPassed } from "@/features/auth/services/bot-check";
import { isAdultOn } from "@/features/auth/services/registration-age.service";
import type { IdentityChallengePayload } from "@/features/identity/schemas/identity-challenge.schema";
import { lookupIdentity } from "@/features/identity/services/identity-lookup.service";
import { recordAuditLog } from "@/lib/audit";
import { encryptSecret, hashNationalId, maskNationalId } from "@/lib/crypto";
import { hashActorIp } from "@/lib/rate-limit";

/**
 * MEVCUT hesaba KPS kimliği bağlama (PRD §5.0 · teknik borç #32).
 *
 * ═══ BU AKIŞ KAYITTAN FARKLI BİR SORU SORUYOR ═══
 * `registration.service.ts` şunu soruyor: "bu kimlikle YENİ hesap açılabilir
 * mi?" Buradaki soru: "GİRİŞLİ kullanıcı bu kimliği kendi hesabına
 * bağlayabilir mi?" Google ile açılan hesapta kimlik numarası, doğum tarihi ve
 * personel durumu YOKTUR (`google-account.repository.ts`); bu akış onları
 * dolduruyor ve hesabı `kps_verified` kademesine taşıyor.
 *
 * İKİ AKIŞ NEDEN BİRLEŞTİRİLMEDİ: kayıt akışı taslak, şifre, iki kanallı OTP ve
 * hesap OLUŞTURMA taşıyor; buradaysa hesap zaten var ve kullanıcı kimliğini
 * oturumla kanıtlamış. Ortak olan parçalar (bot kapısı, `lookupIdentity`,
 * 18 yaş kuralı, personel eşleştirme) tek tek paylaşılıyor — kopyalanmıyor.
 *
 * ═══ SIRA GÜVENLİK GEREĞİ ═══
 *  1. Bot doğrulaması — KPS sorgusundan ÖNCE (ADR-004). Bu uç da numara
 *     taramasının hedefi: girişli bir saldırgan da numara listesi deneyebilir.
 *  2. "Zaten doğrulanmış mı" — KENDİ hesabına dair bir bilgi, dışarıya hiçbir
 *     şey sızdırmıyor. Sorgudan önce olması gereksiz bir dış servis çağrısını
 *     ve gereksiz bir hız sınırı tüketimini önlüyor.
 *  3. `lookupIdentity` — hız sınırı, devre kesici, denetim kaydı ve SABİT
 *     yanıt süresi onun içinde.
 *  4. 18 yaş — KPS'ten gelen tarihten, SUNUCUDA (istemcinin yaşına güvenilmez).
 *  5. "Bu numara başka hesapta mı" — `lookupIdentity`'DEN SONRA, tıpkı kayıt
 *     akışındaki gibi: önce bakılsaydı sabit yanıt süresinin dışında kalır ve
 *     zamanlama üzerinden bir hesap sayımı kanalı açılırdı.
 *
 * ═══ ⛔ BU AKIŞ ARTIK PERSONEL YETKİSİ VERMİYOR (adım 17c · ADR-017 ilke 2) ═══
 * Altıncı bir adım vardı: `matchStaffMember(nationalIdHash)`. Kimlik numarası
 * personel rehberinde eşleşirse hesap AYNI İŞLEMDE personel oluyordu. Bu,
 * "kim olduğun" sorusunun cevabından "ne yapmaya yetkili olduğun" sorusunun
 * cevabını türetmekti — ve T.C. kimlik numarası Türkiye'de gizli bilgi
 * olmadığı için, kurbanın numarasını bilen biri onun hastane ve spor salonu
 * yetkisini de kazanıyordu (teknik borç #76).
 *
 * Yetki artık YALNIZCA `src/features/staff-verification/` akışından geliyor:
 * kod personel rehberindeki kurumsal e-posta adresine gidiyor, yani kanıt
 * kullanıcının BİLDİĞİ bir şey değil, işverenin kanalına SAHİP OLDUĞU.
 *
 * KATMAN: bu dosya iş kurallarını tutar. HTTP, çerez ve durum kodu bilgisi
 * YOKTUR — onlar route katmanının işi (01-architecture.md).
 */

export type VerifyIdentityInput = {
  /** Oturumdan gelir; istemciden ASLA. */
  userId: string;
  payload: IdentityChallengePayload;
  actorIp: string;
  /** Hız sınırının "oturum" bacağını besler (ADR-006). */
  sessionId: string;
  now?: Date;
};

export type VerifyIdentityResult = {
  /** KPS'ten gelen gerçek ad soyad; geçici Google adının yerine geçti. */
  fullName: string;
};

export async function verifyIdentity(input: VerifyIdentityInput): Promise<VerifyIdentityResult> {
  const now = input.now ?? new Date();

  await assertBotCheckPassed(input.payload.turnstileToken, input.actorIp);

  const status = await findIdentityStatusByUserId(input.userId);

  // Hesap silinmişse oturum zaten geçersizdir (`session.repository.ts`); yine de
  // sessizce devam etmek yerine akış burada duruyor.
  if (status === null || status === "kps_verified") throw new IdentityAlreadyVerifiedError();

  const lookup = await lookupIdentity({
    nationalId: input.payload.nationalId,
    birthYear: input.payload.birthYear,
    actorIp: input.actorIp,
    sessionId: input.sessionId,
  });

  if (lookup.outcome === "rate_limited") throw new IdentityRateLimitedError();
  if (lookup.outcome === "unavailable") throw new IdentityServiceUnavailableError();
  if (lookup.outcome === "failed") throw new IdentityCheckFailedError();

  const identity = lookup.identity;
  const birthDate = new Date(`${identity.birthDate}T00:00:00.000Z`);

  if (!isAdultOn(birthDate, now)) throw new AgeRestrictedError();

  const nationalIdHash = hashNationalId(input.payload.nationalId, serverEnv.NATIONAL_ID_HASH_SALT);
  const owner = await findUserIdByNationalIdHash(nationalIdHash);

  /**
   * ⛔ BİR KİMLİK NUMARASI YALNIZCA BİR HESABA BAĞLANABİLİR (PRD §5.0).
   *
   * Sahibi BU kullanıcı olsa bile akış durur: o durumda hesap zaten doğrulanmış
   * olurdu ve yukarıdaki kapıya takılırdı. Buraya düşmesi veri tutarsızlığı
   * demektir; sessizce üzerine yazmak yerine kullanıcı anlaşılır bir cümle görür.
   */
  if (owner) throw new IdentityAlreadyRegisteredError();

  const fullName = `${identity.firstName} ${identity.lastName}`;

  const outcome = await attachVerifiedIdentity({
    userId: input.userId,
    nationalIdEncrypted: encryptSecret(
      input.payload.nationalId,
      serverEnv.NATIONAL_ID_ENCRYPTION_KEY,
    ),
    nationalIdHash,
    nationalIdMasked: maskNationalId(input.payload.nationalId),
    fullName,
    birthDate,
    registeredProvince: identity.registeredProvince,
    registeredDistrict: identity.registeredDistrict,
    verifiedAt: now,
  });

  // Yarışı KAYBEDEN istek: arada başka bir istek ya bu hesabı doğruladı ya da
  // numarayı başka bir hesaba bağladı. İkisi de kullanıcıya farklı cümle ister.
  if (outcome === "already_verified") throw new IdentityAlreadyVerifiedError();
  if (outcome === "national_id_taken") throw new IdentityAlreadyRegisteredError();

  /**
   * ⛔ DENETİM KAYDINA KİMLİK NUMARASI YAZILMIYOR — `entityId` hesabın kendi
   * kimliği (cuid). Kaydın cevaplaması gereken soru "bu hesap ne zaman
   * doğrulandı"; numaranın kendisi bu soruyu cevaplamak için gerekmiyor
   * (CLAUDE.md §5.11). KPS sorgusunun ayrı kaydı zaten `kps_query_logs`'ta.
   */
  await recordAuditLog({
    userId: input.userId,
    action: "identity_verify",
    entityType: "user",
    entityId: input.userId,
    ipHash: hashActorIp(input.actorIp),
  });

  return { fullName };
}
