import { publicEnv } from "@/config/env";
import { completeGoogleLogin } from "@/features/auth/services/google-login.service";
import { consumeGoogleOauthCookie } from "@/features/auth/services/google-oauth-context";
import {
  exchangeGoogleCallback,
  isGoogleLoginConfigured,
} from "@/features/auth/services/google-oauth.service";
import { readSessionToken, writeSessionCookie } from "@/features/auth/services/session-context";
import { revokeSession } from "@/features/auth/services/session.service";
import { DEFAULT_REDIRECT_PATH } from "@/lib/redirect";
import { readActorIp } from "@/lib/rate-limit";

/**
 * GET /api/auth/google/callback — Google'ın kullanıcıyı geri gönderdiği adres.
 *
 * Bu adres Google panelindeki "Authorized redirect URIs" listesiyle karakteri
 * karakterine aynı olmak zorunda; dosyanın yeri bu yüzden serbestçe
 * değiştirilemez.
 *
 * SIRALAMA GÜVENLİK AÇISINDAN ÖNEMLİ:
 *   1. İşlem çerezi okunur ve HEMEN SİLİNİR (tek kullanımlık)
 *   2. `state` + PKCE + `nonce` doğrulanır — biri tutmazsa akış ölür
 *   3. Hesap birleştirme kuralı uygulanır
 *   4. Ancak bundan sonra oturum açılır
 *
 * Hiçbir hata mesajı iç detay (stack, sağlayıcı hatası, e-posta) sızdırmaz;
 * ekrana yalnızca kısa bir kod gider.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Çerez HER DURUMDA tüketiliyor — hata yolunda bile. Ayakta kalan bir
  // işlem çerezi, aynı `state` ile ikinci bir denemeye kapı açardı.
  const transaction = await consumeGoogleOauthCookie();

  if (!isGoogleLoginConfigured()) return redirectToLogin("google_kullanilamiyor");

  /**
   * Çerez yoksa akış ya bu tarayıcıda başlamadı ya da süresi doldu.
   * İkisi de aynı sonucu doğurur: doğrulanacak bir `state` yok, devam edilemez.
   * Bu, CSRF korumasının fiilen çalıştığı yer.
   */
  if (!transaction) return redirectToLogin("baglanti_suresi_doldu");

  try {
    const identity = await exchangeGoogleCallback(new URL(request.url), {
      state: transaction.state,
      codeVerifier: transaction.codeVerifier,
      nonce: transaction.nonce,
    });

    const outcome = await completeGoogleLogin({
      identity,
      actorIp: readActorIp(request.headers),
    });

    if (outcome.kind === "verification_required") {
      return redirectToLogin(`dogrulama_gerekli_${outcome.reason}`);
    }

    // Aynı tarayıcının önceki oturumu kapatılır — `POST /api/sessions` ile
    // aynı gerekçe: kullanıcının artık ulaşamadığı bir jeton 7 gün daha
    // geçerli kalmamalı. Başka cihazlardaki oturumlara dokunulmaz.
    await revokeSession(await readSessionToken());
    await writeSessionCookie(outcome.token);

    return redirectTo(outcome.isNewUser ? DEFAULT_REDIRECT_PATH : transaction.returnTo);
  } catch (error) {
    /**
     * Buraya düşen her şey — `state` uyuşmazlığı, PKCE hatası, geçersiz
     * `id_token`, Google'ın 5xx'i, kullanıcının izni reddetmesi — AYNI ekrana
     * çıkar. Ayrıştırmak, saldırgana hangi korumaya takıldığını söylerdi.
     */
    console.error("google_oauth_callback_failed", error);

    return redirectToLogin("google_girisi_tamamlanamadi");
  }
}

function redirectTo(path: string): Response {
  return Response.redirect(new URL(path, publicEnv.NEXT_PUBLIC_APP_URL).toString(), 302);
}

function redirectToLogin(reason: string): Response {
  const target = new URL("/giris", publicEnv.NEXT_PUBLIC_APP_URL);

  target.searchParams.set("hata", reason);

  return Response.redirect(target.toString(), 302);
}
