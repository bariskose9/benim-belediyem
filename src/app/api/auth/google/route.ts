import { GOOGLE_OAUTH_START_RATE_LIMIT, GOOGLE_OAUTH_START_WINDOW_MS } from "@/config/constants";
import { publicEnv } from "@/config/env";
import { writeGoogleOauthCookie } from "@/features/auth/services/google-oauth-context";
import {
  createGoogleAuthorizationRequest,
  isGoogleLoginConfigured,
} from "@/features/auth/services/google-oauth.service";
import { logger } from "@/lib/logger";
import { DEFAULT_REDIRECT_PATH, sanitizeRedirectPath } from "@/lib/redirect";
import { consumeRateLimit, rateLimitKey, readActorIp } from "@/lib/rate-limit";

/**
 * GET /api/auth/google — Google ile giriş akışını başlatır.
 *
 * NEDEN GET VE NEDEN JSON DEĞİL: bu uç bir veri ucu değil, bir YÖNLENDİRME.
 * Kullanıcı düğmeye basar, buradan Google'a gider. Yanıt gövdesi yoktur;
 * `03-api-guidelines.md`'nin çoğul kaynak kuralı JSON uçları için geçerli,
 * OAuth adımları protokolün kendi adlandırmasını izler (dönüş adresi Google
 * panelinde kayıtlı ve değiştirilemez).
 *
 * Bu dosyada İŞ MANTIĞI YOKTUR: hız sınırını uygular, servisi çağırır, çerezi
 * yazar, yönlendirir.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = sanitizeRedirectPath(url.searchParams.get("donus") ?? undefined);

  /**
   * Yapılandırılmamışsa SESSİZCE giriş ekranına dönülür.
   *
   * 500 dönmek, eksik bir ortam değişkenini kullanıcının ekranına taşırdı.
   * Düğme zaten yalnızca yapılandırma varken çiziliyor; buraya elle gelen
   * biri anlamlı bir ekran görsün.
   */
  if (!isGoogleLoginConfigured()) return redirectToLogin("google_kullanilamiyor");

  const allowed = await enforceStartRateLimit(request);

  if (!allowed) return redirectToLogin("cok_fazla_deneme");

  try {
    const authorization = await createGoogleAuthorizationRequest();

    await writeGoogleOauthCookie({
      state: authorization.state,
      codeVerifier: authorization.codeVerifier,
      nonce: authorization.nonce,
      returnTo,
    });

    return Response.redirect(authorization.authorizationUrl, 302);
  } catch (error) {
    /**
     * Google'ın keşif ucu çökmüş olabilir. Sayfa ayakta kalır, kullanıcı
     * şifreyle girmeye devam edebilir (CLAUDE.md §5.9). Hata detayı istemciye
     * SIZDIRILMAZ, yalnızca sunucu günlüğüne yazılır.
     */
    logger.error("google_oauth_start_failed", { error });

    return redirectToLogin("google_kullanilamiyor");
  }
}

/**
 * Başlatma ucuna IP başına sınır (CLAUDE.md §5.5: "login ve yazma
 * endpoint'lerinde rate limit").
 *
 * Sınır yalnızca IP'ye bağlı, ziyaretçi çerezine DEĞİL: bu uç henüz kimliği
 * olmayan birine açık ve çerez silinerek kolayca sıfırlanabilirdi. Bütçe
 * cömert tutuldu — normal kullanıcı bir kez basar, ama bir bot bu ucu
 * Google'a karşı trafik üretmek için kullanamasın.
 */
async function enforceStartRateLimit(request: Request): Promise<boolean> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("google_oauth_start", "ip", readActorIp(request.headers)),
    limit: GOOGLE_OAUTH_START_RATE_LIMIT,
    windowMs: GOOGLE_OAUTH_START_WINDOW_MS,
  });

  return decision.allowed;
}

/** Giriş ekranına, sebebi taşıyan bir kodla döner. Kod ekranda Türkçeleşir. */
function redirectToLogin(reason: string): Response {
  const target = new URL("/giris", publicEnv.NEXT_PUBLIC_APP_URL);

  target.searchParams.set("hata", reason);
  target.searchParams.set("donus", DEFAULT_REDIRECT_PATH);

  return Response.redirect(target.toString(), 302);
}
