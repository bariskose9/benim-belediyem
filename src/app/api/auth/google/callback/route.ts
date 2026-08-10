import { publicEnv } from "@/config/env";
import { completeGoogleLink } from "@/features/auth/services/google-link.service";
import { completeGoogleLogin } from "@/features/auth/services/google-login.service";
import { consumeGoogleOauthCookie } from "@/features/auth/services/google-oauth-context";
import {
  exchangeGoogleCallback,
  isGoogleLoginConfigured,
  type GoogleIdentity,
} from "@/features/auth/services/google-oauth.service";
import {
  getCurrentSession,
  readSessionToken,
  writeSessionCookie,
} from "@/features/auth/services/session-context";
import { mergeGuestCartIntoUserCart } from "@/features/cart/services/cart.service";
import { linkVisitorConsentsToUser } from "@/features/legal/services/consent.service";
import { ensureAnonymousId } from "@/lib/anonymous-id";
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

    /**
     * BAĞLAMA AKIŞI GİRİŞTEN AYRILIYOR (adım 15c).
     *
     * Ayrım burada yapılıyor çünkü iki akışın SONUCU farklı: giriş oturum
     * açar, bağlama açmaz — kullanıcı zaten girişli. İkisi tek yolda
     * birleştirilseydi, bağlama sırasında yanlışlıkla yeni bir hesap açmak
     * ya da başka bir hesaba oturum vermek mümkün olurdu.
     */
    if (transaction.mode === "link") {
      return await finishLinkFlow(transaction, identity, request);
    }

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

    /**
     * Ziyaretçiyken doldurulan sepet hesaba taşınır (PRD §4). Şifreyle
     * girişte olduğu gibi burada da: kullanıcı hangi kapıdan girerse
     * girsin sepetini kaybetmemeli. Hatası girişi düşürmez.
     */
    const anonymousId = await ensureAnonymousId();

    try {
      await mergeGuestCartIntoUserCart({
        userId: outcome.userId,
        anonymousId,
        now: new Date(),
      });
    } catch (mergeError) {
      console.error("[CART_MERGE] ziyaretçi sepeti taşınamadı", mergeError);
    }

    /**
     * Ziyaretçiyken verilen çerez rızası hesaba bağlanır (PRD §5.10 · adım 17).
     * Şifreyle girişteki (`POST /api/sessions`) davranışın aynısı — kullanıcı
     * hangi kapıdan girerse girsin sonuç aynı olmalı.
     */
    await linkVisitorConsentsToUser({ anonymousId, userId: outcome.userId });

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

/**
 * Bağlama akışının son adımı (teknik borç #33).
 *
 * ═══ OTURUM İKİ KEZ KONTROL EDİLİYOR ve ikisi de gerekli ═══
 *   1. HÂLÂ GİRİŞLİ Mİ: akış başladıktan sonra kullanıcı çıkış yapmış olabilir.
 *      Girişsiz birine bağlantı kurmak, bağlantıyı sahipsiz bırakmak olurdu
 *   2. AYNI KULLANICI MI: başka sekmede başka hesaba geçilmiş olabilir.
 *      Çerezdeki kimlik o anki oturumla tutmuyorsa akış ölür — aksi hâlde
 *      Google hesabı YANLIŞ kullanıcıya bağlanırdı
 *
 * Bu akış OTURUM AÇMAZ ve açmamalı: kullanıcı zaten girişli. Buradan oturum
 * vermek, bağlama adımını bir giriş yoluna çevirirdi.
 */
async function finishLinkFlow(
  transaction: { userId?: string; returnTo: string },
  identity: GoogleIdentity,
  request: Request,
): Promise<Response> {
  const session = await getCurrentSession();

  if (!session) return redirectToLogin("baglanti_suresi_doldu");
  if (!transaction.userId || session.userId !== transaction.userId) {
    return redirectToAccount("oturum_degisti");
  }

  const outcome = await completeGoogleLink({
    userId: session.userId,
    identity,
    actorIp: readActorIp(request.headers),
  });

  if (outcome.kind === "rejected") return redirectToAccount("baska_hesaba_bagli");

  return redirectToAccount("baglandi");
}

function redirectTo(path: string): Response {
  return Response.redirect(new URL(path, publicEnv.NEXT_PUBLIC_APP_URL).toString(), 302);
}

/** Bağlama akışı her zaman profil sayfasına döner; sonuç adres çubuğunda taşınır. */
function redirectToAccount(result: string): Response {
  const target = new URL("/hesabim", publicEnv.NEXT_PUBLIC_APP_URL);

  target.searchParams.set("google", result);

  return Response.redirect(target.toString(), 302);
}

function redirectToLogin(reason: string): Response {
  const target = new URL("/giris", publicEnv.NEXT_PUBLIC_APP_URL);

  target.searchParams.set("hata", reason);

  return Response.redirect(target.toString(), 302);
}
