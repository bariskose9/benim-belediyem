import { EMAIL_SEND_TIMEOUT_MS } from "@/config/constants";
import { serverEnv } from "@/config/env";

/**
 * E-posta gönderimi — Resend'in HTTP API'si (integrations.md).
 *
 * NEDEN SDK YOK: tek bir POST isteği için paket eklemek `00-stack.md`'nin
 * "tek fonksiyon için paket eklenmez" kuralına aykırı. `fetch` yeterli ve
 * sağlayıcı değişirse yalnızca bu dosya değişir.
 *
 * KOD LOG'A YAZILMAZ. Hata durumunda yalnızca sağlayıcının durum kodu ve
 * alıcının maskeli hâli loglanır (05-auth-security.md → "kod hiçbir zaman
 * URL'de, log'da veya hata mesajında görünmez").
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

export type SendEmailResult = "sent" | "unavailable";

export async function sendEmail({ to, subject, text }: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = serverEnv.EMAIL_API_KEY;
  const from = serverEnv.EMAIL_FROM;

  if (!apiKey || !from) {
    // Anahtar yoksa uygulama açılmaya devam eder (bkz. src/config/env.ts
    // gerekçesi), yalnızca gönderim yapılamaz ve akış dürüstçe durur.
    console.error("[EMAIL] EMAIL_API_KEY veya EMAIL_FROM tanımlı değil — gönderim yapılamıyor.");

    return "unavailable";
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
      cache: "no-store",
      signal: AbortSignal.timeout(EMAIL_SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error("[EMAIL] sağlayıcı gönderimi reddetti", {
        status: response.status,
        to: maskEmail(to),
      });

      return "unavailable";
    }

    return "sent";
  } catch (error) {
    console.error("[EMAIL] sağlayıcıya ulaşılamadı", {
      reason: error instanceof Error ? error.name : "unknown",
      to: maskEmail(to),
    });

    return "unavailable";
  }
}

/** `ayse@ornek.com` → `a***@ornek.com`. Log'a tam adres yazılmaz. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");

  if (!domain) return "***";

  return `${local.slice(0, 1)}***@${domain}`;
}
