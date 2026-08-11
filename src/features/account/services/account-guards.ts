import {
  ACCOUNT_DESTRUCTIVE_RATE_LIMIT_MAX,
  ACCOUNT_DESTRUCTIVE_RATE_LIMIT_WINDOW_MS,
  ACCOUNT_EXPORT_RATE_LIMIT_MAX,
  ACCOUNT_EXPORT_RATE_LIMIT_WINDOW_MS,
} from "@/config/constants";
import {
  AccountPasswordMismatchError,
  AccountPasswordRequiredError,
  AccountRateLimitedError,
} from "@/features/account/errors";
import { findPasswordHashByUserId } from "@/features/auth/repositories/user.repository";
import { DUMMY_PASSWORD_HASH } from "@/features/auth/services/login.service";
import { verifyPassword } from "@/features/auth/services/password.service";
import { consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";

/**
 * Hesap yönetimi uçlarının ORTAK kapıları: bütçe + şifre yeniden doğrulaması.
 *
 * NEDEN AYRI DOSYA: silme ve kimlik çözme aynı kapıdan geçiyor. İki serviste
 * ayrı ayrı yazılsaydı, biri sıkılaştırıldığında diğerinin unutulması an
 * meselesiydi (`profile/services/write-budget.ts` ile aynı gerekçe).
 */

/**
 * Veri indirme bütçesi — okuma olduğu için AYRI anahtar.
 *
 * Silme bütçesiyle aynı sayaca yazılsaydı, verisini üç kez indiren bir
 * kullanıcı hesabını silemez hâle gelirdi.
 */
export async function enforceExportBudget(userId: string, now: Date): Promise<void> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("account_export", "user", userId),
    limit: ACCOUNT_EXPORT_RATE_LIMIT_MAX,
    windowMs: ACCOUNT_EXPORT_RATE_LIMIT_WINDOW_MS,
    now,
  });

  if (!decision.allowed) throw new AccountRateLimitedError();
}

/** Geri alınamaz işlemlerin bütçesi (silme · kimlik çözme). */
export async function enforceDestructiveBudget(userId: string, now: Date): Promise<void> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("account_destructive", "user", userId),
    limit: ACCOUNT_DESTRUCTIVE_RATE_LIMIT_MAX,
    windowMs: ACCOUNT_DESTRUCTIVE_RATE_LIMIT_WINDOW_MS,
    now,
  });

  if (!decision.allowed) throw new AccountRateLimitedError();
}

/**
 * Geri alınamaz bir işlemden önce kullanıcıyı YENİDEN doğrular.
 *
 * ═══ NEDEN OTURUM YETMİYOR ═══
 * Hesap silme ve kimlik çözme, çalınmış bir oturumun yapabileceği EN AĞIR iki
 * işlem. Silme kurbanın hesabını yok eder; kimlik çözme ise numarayı serbest
 * bırakır ve saldırgan onu kendi hesabına bağlayabilir — ADR-017'nin tarif
 * ettiği zararın tam olarak kendisi. Şifre, oturumun tek başına yetmediği
 * ikinci bir kanıt (`google-link.service.ts` bağlamada aynı kararı verdi).
 *
 * ═══ ŞİFRESİ OLMAYAN HESAP GEÇEBİLİYOR ═══
 * Google ile açılmış hesapların şifresi YOK. Zorunlu kılmak, o kullanıcıların
 * hesabını hiç silememesi demek olurdu — KVKK m.11'in tanıdığı hakkı teknik
 * bir ayrıntı yüzünden kullandırmamak. Bedel kabul edildi ve teknik borç
 * olarak yazıldı: o hesaplarda tek kanıt oturumun kendisi.
 *
 * ═══ ŞİFRESİ OLAN HESAPTA ARGON2 HER ZAMAN KOŞUYOR ═══
 * Özet yoksa da `DUMMY_PASSWORD_HASH` doğrulanıyor (giriş akışındaki desen).
 * Erken dönmek, yanıt süresinden "bu hesabın şifresi yok" bilgisini
 * sızdırırdı.
 */
export async function requirePasswordConfirmation(input: {
  userId: string;
  hasPassword: boolean;
  password: string | undefined;
}): Promise<void> {
  if (!input.hasPassword) return;

  if (input.password === undefined || input.password.length === 0) {
    throw new AccountPasswordRequiredError();
  }

  const passwordHash = await findPasswordHashByUserId(input.userId);
  const matches = await verifyPassword(passwordHash ?? DUMMY_PASSWORD_HASH, input.password);

  if (!passwordHash || !matches) throw new AccountPasswordMismatchError();
}
