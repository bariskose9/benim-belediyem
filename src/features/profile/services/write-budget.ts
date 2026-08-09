import {
  PROFILE_WRITE_RATE_LIMIT_MAX,
  PROFILE_WRITE_RATE_LIMIT_WINDOW_MS,
} from "@/config/constants";
import { ProfileRateLimitedError } from "@/features/profile/errors";
import { consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";

/**
 * Profil yazma bütçesi — adres ve kart uçlarının ORTAK kapısı.
 *
 * NEDEN AYRI DOSYA: iki servis de aynı bütçeyi tüketiyor. Sayaç anahtarı iki
 * yerde ayrı yazılsaydı ("profile_write" / "profil_write" gibi tek harflik bir
 * fark) iki ayrı bütçeye dönüşür ve sınır sessizce ikiye katlanırdı.
 *
 * SAYAÇ KULLANICI BAŞINA, IP BAŞINA DEĞİL: aynı kurumun personeli aynı dış
 * IP'nin arkasından geliyor (ADR-006 · destek ve üyelik modülleriyle aynı
 * gerekçe). IP bazlı sayaç bir kullanıcının komşusunu kilitlerdi.
 */
export async function enforceProfileWriteBudget(userId: string, now: Date): Promise<void> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("profile_write", "user", userId),
    limit: PROFILE_WRITE_RATE_LIMIT_MAX,
    windowMs: PROFILE_WRITE_RATE_LIMIT_WINDOW_MS,
    now,
  });

  if (!decision.allowed) throw new ProfileRateLimitedError();
}
