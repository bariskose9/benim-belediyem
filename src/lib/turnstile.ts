import { TURNSTILE_TIMEOUT_MS, TURNSTILE_VERIFY_URL } from "@/config/constants";
import { envLabel, serverEnv } from "@/config/env";
import { logger } from "@/lib/logger";

/**
 * Cloudflare Turnstile jeton doğrulaması (ADR-004 · integrations.md).
 *
 * ÜÇ SONUÇ VAR VE ÜÇÜ DE FARKLI ELE ALINIR:
 *  · `success`     → jeton geçerli, akış devam eder
 *  · `failed`      → jeton geçersiz, süresi dolmuş veya İKİNCİ KEZ kullanılmış
 *  · `unavailable` → Cloudflare'a ulaşılamadı
 *
 * `unavailable` ASLA "geçmiş" sayılmaz. ADR-004 bedel 2 bunu açıkça yazıyor:
 * "Turnstile erişilemezse kayıt ve şifre sıfırlama DURUR... güvenlik kapısı
 * açık bırakılarak atlanmaz." Bu, `12-operations-and-scaling.md`'deki
 * "dış servis çökerse sayfa ayakta kalır" kuralının bilinçli istisnasıdır.
 *
 * YENİDEN DENEME YOK. Jeton tek kullanımlıktır; ilk istek Cloudflare'a ulaşıp
 * jetonu tükettiyse ikinci deneme `timeout-or-duplicate` alır ve kullanıcı
 * haksız yere reddedilir. Bir deneme, sonra dürüst bir hata.
 */

export type TurnstileOutcome = "success" | "failed" | "unavailable";

export type VerifyTurnstileInput = {
  /** İstemciden gelen jeton. Boş string "hiç gönderilmemiş" demektir. */
  token: string;
  /** İsteği atan IP — Cloudflare'a opsiyonel ipucu olarak gider. */
  actorIp?: string;
};

/**
 * Local'de anahtar tanımlı değilse doğrulama atlanabilir mi?
 *
 * YALNIZCA local'de. `.env.example` Cloudflare'ın resmî test anahtarlarını
 * zaten veriyor, dolayısıyla bu yol normalde hiç çalışmaz; depoyu yeni klonlayan
 * birinin anahtarsız kalması için var. Preview ve production'da anahtar yoksa
 * kapı atlanmaz, `unavailable` döner ve akış durur.
 */
function canSkipVerification(): boolean {
  return envLabel === "local" && !serverEnv.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstileToken({
  token,
  actorIp,
}: VerifyTurnstileInput): Promise<TurnstileOutcome> {
  if (canSkipVerification()) return "success";

  const secret = serverEnv.TURNSTILE_SECRET_KEY;

  if (!secret) {
    // Preview/production'da anahtar yok. Kapıyı atlamak yerine akışı durduruyoruz.
    logger.error("turnstile_secret_missing");

    return "unavailable";
  }

  // Boş jeton için ağa hiç çıkmıyoruz: sonuç zaten belli ve gereksiz bir dış
  // çağrı, hız sınırı olmayan bir uçta bedava trafik demek olurdu.
  if (!token) return "failed";

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (actorIp && actorIp !== "unknown") body.append("remoteip", actorIp);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.error("turnstile_unexpected_status", { status: response.status });

      return "unavailable";
    }

    const result: unknown = await response.json();

    return isSuccessfulVerification(result) ? "success" : "failed";
  } catch (error) {
    // Ağ hatası ve zaman aşımı buraya düşer. Jetonun kendisi log'a YAZILMAZ.
    logger.error("turnstile_unreachable", {
      reason: error instanceof Error ? error.name : "unknown",
    });

    return "unavailable";
  }
}

/**
 * Yanıt şeması Zod ile değil elle kontrol ediliyor çünkü tek bir boolean
 * alanına bakıyoruz ve `success` dışındaki her şey zaten başarısızlık.
 * Cloudflare şemayı genişletirse bu kontrol bozulmaz.
 */
function isSuccessfulVerification(result: unknown): boolean {
  return (
    typeof result === "object" &&
    result !== null &&
    "success" in result &&
    (result as { success: unknown }).success === true
  );
}
