import {
  findLoginMethods,
  findUserIdByGoogleSubject,
  linkGoogleAccount,
  unlinkGoogleAccount,
} from "@/features/auth/repositories/google-account.repository";
import { findPasswordHashByUserId } from "@/features/auth/repositories/user.repository";
import type { GoogleIdentity } from "@/features/auth/services/google-oauth.service";
import { decideGoogleUnlink, decideStartGoogleLink } from "@/features/auth/services/login-methods";
import { verifyPassword } from "@/features/auth/services/password.service";
import { DUMMY_PASSWORD_HASH } from "@/features/auth/services/login.service";
import { recordAuditLog } from "@/lib/audit";
import { hashActorIp } from "@/lib/rate-limit";

/**
 * Profilden Google bağlantısı ekleme ve kaldırma (PRD §5.0 · teknik borç #33).
 *
 * ═══ BU AKIŞ GİRİŞTEN FARKLI BİR SORU SORUYOR ═══
 * `google-login.service.ts` şunu soruyor: "bu Google kimliği KİME ait?"
 * Buradaki soru ise: "GİRİŞLİ kullanıcı bu Google hesabını kendine bağlayabilir
 * mi?" İkisi karıştırılırsa hesap birleştirme kuralı (`google-account-linking`)
 * yanlış yerde uygulanır: orada e-posta eşleşmesi bir KANIT sorusudur, burada
 * kullanıcı kimliğini zaten oturumla kanıtlamıştır.
 *
 * ⛔ E-POSTA EŞLEŞMESİ BURADA ARANMIYOR ve bu bilinçli: kullanıcının kurumsal
 * adresi ile Google adresi farklı olabilir. Bağlanan şey `sub` (Google'ın
 * değişmeyen kimliği); giriş de o `sub` üzerinden yapılıyor, yani başka bir
 * hesabın e-postasıyla çakışmak kimseyi ele geçiremez.
 *
 * KATMAN: HTTP, çerez ve yönlendirme route'un işi; burada yalnızca iş kuralı.
 */

export type StartGoogleLinkOutcome =
  | { kind: "allowed" }
  | { kind: "rejected"; reason: "already_linked" | "password_required" | "invalid_password" };

export type CompleteGoogleLinkOutcome =
  | { kind: "linked" }
  /** Bağlantı zaten bu kullanıcıdaydı — akış başarılı sayılır. */
  | { kind: "already_linked" }
  /** Bu Google hesabı BAŞKA bir kullanıcıya bağlı. */
  | { kind: "rejected"; reason: "linked_to_other_account" };

export type UnlinkGoogleOutcome =
  { kind: "unlinked" } | { kind: "rejected"; reason: "not_linked" | "last_login_method" };

/**
 * Bağlama akışını başlatmadan önceki kapı: kural + ŞİFRE DOĞRULAMASI.
 *
 * ŞİFRE NEDEN SORULUYOR: bağlama hesaba KALICI bir giriş yolu ekler. Yalnızca
 * oturuma dayansaydı, çalınmış bir oturumla saldırgan kendi Google hesabını
 * bağlar; kurban şifresini değiştirip tüm oturumları düşürse bile saldırgan
 * girmeye devam ederdi (`login-methods.ts`). Şifre, oturumun tek başına
 * yetmediği ikinci bir kanıt.
 *
 * ŞİFRE YANLIŞ İLE KURAL İHLALİ AYRI DÖNÜYOR ama ikisi de akışı durduruyor;
 * ayrım yalnızca kullanıcıya doğru cümleyi göstermek için.
 */
export async function startGoogleLink(input: {
  userId: string;
  password: string;
}): Promise<StartGoogleLinkOutcome> {
  const methods = await findLoginMethods(input.userId);

  if (!methods) return { kind: "rejected", reason: "password_required" };

  const decision = decideStartGoogleLink(methods);

  if (!decision.allowed) return { kind: "rejected", reason: decision.reason };

  const passwordHash = await findPasswordHashByUserId(input.userId);

  /**
   * Şifre özeti olmayan hesapta da argon2 KOŞULUYOR (`DUMMY_PASSWORD_HASH`):
   * giriş akışındaki desenin aynısı. Erken dönmek, yanıt süresinden "bu hesabın
   * şifresi yok" bilgisini sızdırırdı.
   */
  const matches = await verifyPassword(passwordHash ?? DUMMY_PASSWORD_HASH, input.password);

  if (!passwordHash || !matches) return { kind: "rejected", reason: "invalid_password" };

  return { kind: "allowed" };
}

/**
 * Google'dan dönüldüğünde bağlantıyı kurar.
 *
 * ÇAKIŞMA KONTROLÜ ŞART: aynı Google hesabı iki kullanıcıya bağlanamaz
 * (`accounts` tablosunda `unique(provider, provider_account_id)`). Veritabanı
 * bunu zaten reddederdi ama kullanıcı ham bir kısıt hatası değil, ne olduğunu
 * anlatan bir cümle görmeli.
 *
 * `sub` ZATEN BU KULLANICIDAYSA hata yok: kullanıcı bağlama akışını iki kez
 * çalıştırmış olabilir (geri tuşu, çift tıklama). İkinci deneme sessizce
 * başarılı sayılıyor — `linkGoogleAccount` de `skipDuplicates` kullanıyor.
 */
export async function completeGoogleLink(input: {
  userId: string;
  identity: GoogleIdentity;
  actorIp: string;
}): Promise<CompleteGoogleLinkOutcome> {
  const owner = await findUserIdByGoogleSubject(input.identity.subject);

  if (owner === input.userId) return { kind: "already_linked" };

  if (owner) return { kind: "rejected", reason: "linked_to_other_account" };

  await linkGoogleAccount(input.userId, input.identity.subject);

  await recordAuditLog({
    userId: input.userId,
    action: "google_link",
    entityType: "account",
    ipHash: hashActorIp(input.actorIp),
  });

  return { kind: "linked" };
}

/**
 * Bağlantıyı kaldırır.
 *
 * ⛔ DENETİM KAYDINA GOOGLE KİMLİĞİ (`sub`) YAZILMIYOR: `entityId` boş
 * bırakıldı. Denetim kaydının cevaplaması gereken soru "bu hesapta ne zaman
 * giriş yöntemi değişti"; hangi Google hesabı olduğu bu soruyu cevaplamak için
 * gerekmiyor ve gereksiz kişisel veri log'a yazılmaz (CLAUDE.md §5.11).
 *
 * SIRA ÖNEMLİ: önce kural, sonra silme. Silip sonra "aslında olmazmış" demek
 * kullanıcıyı hesabından edecek bir hatayı geri alınamaz kılardı.
 */
export async function unlinkGoogle(input: {
  userId: string;
  actorIp: string;
}): Promise<UnlinkGoogleOutcome> {
  const methods = await findLoginMethods(input.userId);

  if (!methods) return { kind: "rejected", reason: "not_linked" };

  const decision = decideGoogleUnlink(methods);

  if (!decision.allowed) return { kind: "rejected", reason: decision.reason };

  const removed = await unlinkGoogleAccount(input.userId);

  // 0 satır: araya giren bir istek bağlantıyı zaten kaldırmış. Kullanıcının
  // istediği sonuç yine de gerçekleşti; hata göstermenin anlamı yok.
  if (removed === 0) return { kind: "rejected", reason: "not_linked" };

  await recordAuditLog({
    userId: input.userId,
    action: "google_unlink",
    entityType: "account",
    ipHash: hashActorIp(input.actorIp),
  });

  return { kind: "unlinked" };
}
