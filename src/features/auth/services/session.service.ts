import { createHash, randomBytes } from "node:crypto";

import {
  SESSION_REFRESH_THRESHOLD_MS,
  SESSION_TOKEN_BYTES,
  SESSION_TTL_MS,
} from "@/config/constants";
import {
  createSession,
  deleteSessionByTokenHash,
  deleteSessionsForUser,
  extendSession,
  findValidSessionByTokenHash,
  type SessionUserRow,
} from "@/features/auth/repositories/session.repository";

/**
 * Oturum çekirdeği — açma, okuma, kapatma (ADR-002 · ADR-005).
 *
 * KATMAN: bu dosya HTTP ve çerez bilmez. Ham jetonu alır ve döner; çerezi
 * yazan taraf route katmanıdır (01-architecture.md). Bu ayrım sayesinde
 * servisin tamamı `next/headers` taklit etmeden test edilebiliyor.
 *
 * ÇEREZDE YALNIZCA JETON VAR. Rol, personel durumu ve kimlik durumu çereze
 * YAZILMAZ; her istekte veritabanından okunur. Aksi hâlde yetkisi düşen bir
 * kullanıcı çerezi eskidiği sürece yetkili görünmeye devam ederdi
 * (05-auth-security.md → "Yetki kaynağı ... yalnızca sunucuda hesaplanır").
 */

export type IssuedSession = {
  /** Çereze yazılacak HAM jeton. Veritabanında yalnızca özeti duruyor. */
  token: string;
  expiresAt: Date;
  /** Denetim kaydının `entityId` alanı için — kişisel veri değil, cuid. */
  sessionId: string;
};

/**
 * Yeni oturum açar.
 *
 * Jeton `randomBytes` ile üretiliyor — `Math.random()` kriptografik değildir
 * ve tahmin edilebilir jeton, oturum kaçırmanın en kısa yoludur.
 */
export async function issueSession(userId: string, now: Date = new Date()): Promise<IssuedSession> {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  const sessionId = await createSession({ tokenHash: hashSessionToken(token), userId, expiresAt });

  return { token, expiresAt, sessionId };
}

/**
 * Jetonu doğrular ve oturumu döner; geçersizse `null`.
 *
 * KAYAN YENİLEME burada yapılıyor: kalan ömür eşiğin altına düştüyse bitiş
 * anı yeniden 7 güne çekilir (`SESSION_REFRESH_THRESHOLD_MS` gerekçesi
 * `constants.ts` içinde yazılı). Uzatma veritabanında yapılır ve
 * ORADAKİ DEĞER YETKİLİDİR — çerezin kendi son kullanma tarihi yalnızca
 * tarayıcının jetonu ne kadar taşıyacağını belirler.
 */
export async function readSession(
  token: string | undefined,
  now: Date = new Date(),
): Promise<SessionUserRow | null> {
  if (!token) return null;

  const session = await findValidSessionByTokenHash(hashSessionToken(token), now);

  if (!session) return null;

  const remainingMs = session.expiresAt.getTime() - now.getTime();

  if (remainingMs < SESSION_REFRESH_THRESHOLD_MS) {
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    await extendSession(session.sessionId, expiresAt);

    return { ...session, expiresAt };
  }

  return session;
}

/**
 * Çıkış: oturum satırı SİLİNİR.
 *
 * "Geçersiz işaretle ama sakla" yapılmıyor — saklanan satır, silinmiş sayılan
 * bir jetonu kabul eden bir hataya açık kapı bırakır ve tabloyu şişirir.
 */
export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token) return;

  await deleteSessionByTokenHash(hashSessionToken(token));
}

/**
 * Kullanıcının tüm oturumlarını düşürür — şifre değişimi ve şüpheli durum için
 * (05-auth-security.md · ADR-005). 4b-3'ün şifre sıfırlama akışı bunu çağıracak.
 */
export async function revokeAllSessionsForUser(userId: string): Promise<number> {
  return deleteSessionsForUser(userId);
}

/**
 * Jetonun veritabanında saklanan hâli.
 *
 * Düz SHA-256 yeterli ve tuz gerekmiyor: girdi 32 rastgele bayt, yani sözlük
 * ya da gökkuşağı tablosu saldırısının tarayabileceği bir uzay yok. Şifre
 * özetlemesiyle karıştırılmamalı — orada girdi düşük entropili olduğu için
 * argon2id şart (ADR-011).
 */
function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
