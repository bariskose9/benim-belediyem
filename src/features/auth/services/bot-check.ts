import {
  BotCheckFailedError,
  BotCheckRequiredError,
  BotCheckUnavailableError,
} from "@/features/auth/errors";
import { verifyTurnstileToken } from "@/lib/turnstile";

/**
 * Bot kapısı (ADR-004 · PRD §5.0 "Bot ve otomasyon koruması").
 *
 * ═══ NEDEN ORTAK DOSYA ═══
 * Aynı kapı üç akışta duruyor: kayıt, kod yeniden gönderme ve kimlik doğrulama
 * (adım 15c-2). Üç kopya olsaydı, birinde `unavailable` durumunun yanlışlıkla
 * "geçti" sayılması diğerlerinden fark edilmeden kalırdı.
 *
 * ⛔ `unavailable` ASLA GEÇMİŞ SAYILMAZ (ADR-004 bedel 2): Cloudflare'a
 * ulaşılamadığında kapı AÇILMAZ, kapanır. Aksi halde saldırganın tek yapması
 * gereken doğrulama servisini erişilemez kılmak olurdu.
 *
 * "Jeton hiç gelmedi" ile "jeton geçersiz" ayrı raporlanıyor: ilki kullanıcının
 * kutuyu işaretlemediği (kendi düzeltebileceği) durum, ikincisi başarısız bir
 * doğrulama.
 */
export async function assertBotCheckPassed(token: string, actorIp: string): Promise<void> {
  const outcome = await verifyTurnstileToken({ token, actorIp });

  if (outcome === "success") return;
  if (outcome === "unavailable") throw new BotCheckUnavailableError();

  throw token ? new BotCheckFailedError() : new BotCheckRequiredError();
}
