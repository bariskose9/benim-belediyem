import {
  LOGIN_BOT_CHECK_AFTER_FAILURES,
  LOGIN_FAILURE_WINDOW_MS,
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_MS,
} from "@/config/constants";
import { serverEnv } from "@/config/env";
import {
  BotCheckFailedError,
  BotCheckRequiredError,
  BotCheckUnavailableError,
  InvalidCredentialsError,
  LoginRateLimitedError,
} from "@/features/auth/errors";
import { findAuthUserByNationalIdHash } from "@/features/auth/repositories/user.repository";
import type { LoginPayload } from "@/features/auth/schemas/login.schema";
import { verifyPassword } from "@/features/auth/services/password.service";
import { issueSession, revokeSession } from "@/features/auth/services/session.service";
import { recordAuditLog } from "@/lib/audit";
import { hashNationalId } from "@/lib/crypto";
import {
  consumeRateLimit,
  hashActorIp,
  peekRateLimit,
  rateLimitKey,
  resetRateLimit,
} from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

/**
 * Giriş akışı (PRD §5.0 "Giriş akışı").
 *
 * GİRİŞTE KPS SORGULANMAZ ve bu PRD'nin açık kararı: "hız ve dayanıklılık
 * için". Sahte KPS çökse bile mevcut kullanıcılar giriş yapabilmeli — kimlik
 * bir kez, kayıt sırasında doğrulandı.
 *
 * KATMAN: iş kuralları burada; HTTP, çerez ve durum kodu route katmanının işi
 * (01-architecture.md).
 */

/**
 * Kullanıcı bulunamadığında karşılaştırılan SAHTE özet.
 *
 * NEDEN VAR: hesap yoksa erken dönmek, yanıtı argon2 doğrulaması kadar (~50 ms)
 * hızlandırır. Saldırgan mesajları ayırt edemese de SÜREYİ ölçerek "bu numara
 * kayıtlı" sonucunu çıkarır — hesap sayımı koruması (PRD §5.0) tam olarak bunu
 * engellemek için var. Sahte özetle doğrulama çalıştırınca iki yol da aynı işi
 * yapar ve aynı sürer.
 *
 * Bilinmeyen rastgele bir metinden üretildi; hiçbir şifreye karşılık gelmez ve
 * doğrulaması HER ZAMAN başarısız olur. Parametreleri `constants.ts`
 * değerleriyle aynı olmalı — aksi hâlde süreler yeniden ayrışır. Bunu
 * `tests/unit/login-dummy-hash.test.ts` koruyor: argon2 ayarları değişip bu
 * sabit güncellenmezse test kırmızı olur.
 *
 * SIZINTI DEĞİL: bu bir özet ve karşılığı olan bir şifre yok. Depo public
 * olsa bile saldırgana hiçbir şey vermez.
 */
export const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,p=1,t=3$a9UMu26biaIc0/vs9y/qGw$OINg9oyHbxD7YD6Ss105dFb+BHKfmyo4KhPBvRU/Mp4";

export type LoginInput = {
  payload: LoginPayload;
  actorIp: string;
  /** Hız sınırının "oturum" bacağı — ziyaretçi kimliği (ADR-006). */
  sessionId: string;
  now?: Date;
};

export type LoginResult = {
  /** Çereze yazılacak ham oturum jetonu. */
  token: string;
  expiresAt: Date;
  userId: string;
};

export async function login(input: LoginInput): Promise<LoginResult> {
  const now = input.now ?? new Date();
  const ipHash = hashActorIp(input.actorIp);
  const keys = buildKeys(input.actorIp, input.sessionId);

  await assertWithinRateLimit(keys, now);
  await assertBotCheckPassedIfNeeded(keys, input.payload.turnstileToken, input.actorIp, now);

  const nationalIdHash = hashNationalId(input.payload.nationalId, serverEnv.NATIONAL_ID_HASH_SALT);
  const user = await findAuthUserByNationalIdHash(nationalIdHash);

  /**
   * TEK ÇIKIŞ NOKTASI: "hesap yok", "şifresi yok" (yalnızca Google ile açılmış
   * veya tohum verisi) ve "şifre yanlış" üçü de buradan aynı biçimde dönüyor.
   * Ayrı `if` blokları zamanla ayrı mesajlara dönüşme eğilimindedir.
   */
  const passwordMatches = await verifyPassword(
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    input.payload.password,
  );

  if (!user || !user.passwordHash || !passwordMatches) {
    throw new InvalidCredentialsError(await recordFailure(keys, now));
  }

  // Başarılı girişte YALNIZCA bot kapısının sayacı sıfırlanır; deneme sayacı
  // (5/15 dk) DURUR. Onu da sıfırlamak, elinde tek geçerli hesap olan bir
  // saldırgana "her başarılı girişten sonra 5 tahmin daha" hakkı verirdi.
  await Promise.all(keys.failure.map(resetRateLimit));

  const session = await issueSession(user.id, now);

  await recordAuditLog({
    userId: user.id,
    action: "login",
    entityType: "session",
    entityId: session.sessionId,
    ipHash,
  });

  return { token: session.token, expiresAt: session.expiresAt, userId: user.id };
}

export type LogoutInput = {
  token: string | undefined;
  userId: string | undefined;
  sessionId: string | undefined;
  actorIp: string;
};

/**
 * Çıkış — oturum satırı silinir (ADR-005).
 *
 * Jeton zaten geçersizse sessizce başarılı sayılır: çıkış işleminin
 * "böyle bir oturum yok" diye hata vermesi kullanıcıya hiçbir şey kazandırmaz,
 * üstelik geçerli jeton ile geçersiz jetonu ayırt eden bir yanıt üretirdi.
 */
export async function logout(input: LogoutInput): Promise<void> {
  await revokeSession(input.token);

  if (!input.userId) return;

  await recordAuditLog({
    userId: input.userId,
    action: "logout",
    entityType: "session",
    entityId: input.sessionId,
    ipHash: hashActorIp(input.actorIp),
  });
}

type LoginKeys = {
  /** Deneme sayacı — her denemede artar (5 / 15 dk). */
  attempt: string[];
  /** Başarısızlık sayacı — yalnızca hatalı denemede artar, bot kapısını açar. */
  failure: string[];
};

/**
 * İKİ BACAK, İKİ SAYAÇ (ADR-006 · PRD §5.0): IP ve ziyaretçi oturumu.
 *
 * Anahtar önekleri kimlik sorgusunun (`identity:*`) anahtarlarından ayrı;
 * bir akışın bütçesi diğerini tüketmemeli.
 */
function buildKeys(actorIp: string, sessionId: string): LoginKeys {
  return {
    attempt: [rateLimitKey("login", "ip", actorIp), rateLimitKey("login", "session", sessionId)],
    failure: [
      rateLimitKey("login_failure", "ip", actorIp),
      rateLimitKey("login_failure", "session", sessionId),
    ],
  };
}

async function assertWithinRateLimit(keys: LoginKeys, now: Date): Promise<void> {
  const decisions = await Promise.all(
    keys.attempt.map((key) =>
      consumeRateLimit({
        key,
        limit: LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
        windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
        now,
      }),
    ),
  );

  if (decisions.some((decision) => !decision.allowed)) throw new LoginRateLimitedError();
}

/**
 * PRD §5.0: "2 başarısız denemeden sonra bot doğrulaması istenir."
 *
 * Sayaç ARTIRILMADAN okunuyor (`peekRateLimit`) — okuma denemeyi saymamalı.
 * İki bacaktan HERHANGİ BİRİ eşiği geçtiyse kapı iner: saldırgan çerezini
 * silerek oturum bacağını sıfırlasa bile IP bacağı ayakta kalır.
 */
async function assertBotCheckPassedIfNeeded(
  keys: LoginKeys,
  token: string,
  actorIp: string,
  now: Date,
): Promise<void> {
  if (!(await isBotCheckRequired(keys, now))) return;

  const outcome = await verifyTurnstileToken({ token, actorIp });

  if (outcome === "success") return;
  if (outcome === "unavailable") throw new BotCheckUnavailableError();

  throw token ? new BotCheckFailedError() : new BotCheckRequiredError();
}

async function isBotCheckRequired(keys: LoginKeys, now: Date): Promise<boolean> {
  const counts = await Promise.all(
    keys.failure.map((key) => peekRateLimit(key, LOGIN_FAILURE_WINDOW_MS, now)),
  );

  return counts.some((count) => count >= LOGIN_BOT_CHECK_AFTER_FAILURES);
}

/** Başarısızlığı sayar ve "bir sonraki denemede kutu gerekiyor mu" bilgisini döner. */
async function recordFailure(keys: LoginKeys, now: Date): Promise<boolean> {
  await Promise.all(
    keys.failure.map((key) =>
      consumeRateLimit({
        key,
        // Sayaç yalnızca EŞİK için okunuyor; kendisi kimseyi engellemediğinden
        // limit pratikte sonsuz. `consumeRateLimit` limit istediği için
        // eşiğin üstünde güvenli bir değer veriliyor.
        limit: Number.MAX_SAFE_INTEGER,
        windowMs: LOGIN_FAILURE_WINDOW_MS,
        now,
      }),
    ),
  );

  return isBotCheckRequired(keys, now);
}
