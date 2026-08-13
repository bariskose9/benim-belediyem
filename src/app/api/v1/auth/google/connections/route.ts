import {
  PROFILE_WRITE_RATE_LIMIT_MAX,
  PROFILE_WRITE_RATE_LIMIT_WINDOW_MS,
} from "@/config/constants";
import {
  GoogleAlreadyLinkedError,
  GoogleLinkUnavailableError,
  GoogleNotLinkedError,
  LastLoginMethodError,
  LinkPasswordCheckFailedError,
} from "@/features/auth/errors";
import { requireAccess } from "@/features/auth/services/api-guard";
import { startGoogleLink, unlinkGoogle } from "@/features/auth/services/google-link.service";
import { writeGoogleOauthCookie } from "@/features/auth/services/google-oauth-context";
import {
  createGoogleAuthorizationRequest,
  isGoogleLoginConfigured,
} from "@/features/auth/services/google-oauth.service";
import { ProfileRateLimitedError } from "@/features/profile/errors";
import { fail, noContent } from "@/lib/http";
import { consumeRateLimit, rateLimitKey, readActorIp } from "@/lib/rate-limit";

/**
 * `/api/v1/auth/google/connections` — hesabın Google giriş bağlantısı
 * (PRD §5.0 · teknik borç #33).
 *
 * `POST`   → bağlama akışını başlatır (şifre doğrular, Google'a yönlendirir)
 * `DELETE` → bağlantıyı kaldırır
 *
 * ═══ NEDEN `POST` JSON DEĞİL YÖNLENDİRME DÖNÜYOR ═══
 * Bağlama tek adımda bitmiyor: kullanıcı Google'a gidip geri dönmek zorunda.
 * Uç bu yüzden 303 döndürüyor ve tarayıcı akışı sürdürüyor. Form
 * `method="post"` olduğu için JavaScript kapalıyken de çalışıyor —
 * `/api/v1/auth/google` (giriş başlatma) ile aynı desen.
 *
 * ⛔ MOD İSTEMCİDEN GELMİYOR: işlem çerezine `link` yazan yer BURASI. Adres
 * çubuğundan okunan bir parametre olsaydı, giriş ekranından gelen biri kendini
 * bağlama akışına sokabilirdi (`google-oauth-context.ts`).
 *
 * ⛔ CSRF: `POST` şifre istiyor ve oturum çerezi `sameSite=lax` — başka bir
 * siteden gönderilen form ne çerezi taşır ne de şifreyi bilir.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireAccess("authenticated");

    await enforceWriteBudget(session.userId);

    if (!isGoogleLoginConfigured()) throw new GoogleLinkUnavailableError();

    const form = await request.formData();
    const password = form.get("sifre");

    const outcome = await startGoogleLink({
      userId: session.userId,
      /**
       * Şifre uzunluk/biçim kontrolünden GEÇMİYOR ve bu bilinçli: doğrulama
       * zaten sabit süreli bir karşılaştırma ve geçersiz biçim ile yanlış şifre
       * aynı cevabı alıyor. Ayrı bir "şifre en az 8 karakter" hatası, saldırgana
       * denemesinin neden reddedildiğini söylerdi.
       */
      password: typeof password === "string" ? password : "",
    });

    if (outcome.kind === "rejected") throw rejectionToError(outcome.reason);

    const authorization = await createGoogleAuthorizationRequest();

    await writeGoogleOauthCookie({
      state: authorization.state,
      codeVerifier: authorization.codeVerifier,
      nonce: authorization.nonce,
      returnTo: "/hesabim",
      mode: "link",
      // Callback bu kimliği o anki oturumla karşılaştırıyor: araya giren bir
      // hesap değişikliğinde bağlantı yanlış hesaba kurulmasın.
      userId: session.userId,
    });

    /**
     * 303: tarayıcı `POST`'u tekrarlamadan `GET` ile devam etsin. 302 dönseydi
     * bazı istemciler yönlendirmeyi `POST` olarak izler ve form Google'a
     * gönderilirdi.
     */
    return Response.redirect(authorization.authorizationUrl, 303);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAccess("authenticated");

    await enforceWriteBudget(session.userId);

    const outcome = await unlinkGoogle({
      userId: session.userId,
      actorIp: readActorIp(request.headers),
    });

    if (outcome.kind === "rejected") {
      throw outcome.reason === "not_linked"
        ? new GoogleNotLinkedError()
        : new LastLoginMethodError();
    }

    return noContent();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Yazma bütçesi — profil uçlarıyla AYNI sayaç (15 dakikada 30 istek).
 *
 * SAYAÇ KULLANICIYA BAĞLI, IP'YE DEĞİL: aynı ofisten giren iki kişi birbirinin
 * bütçesini tüketmemeli. Şifre denemesi de bu bütçeden düşüyor, yani bu uç bir
 * şifre deneme kapısına dönüştürülemez.
 */
async function enforceWriteBudget(userId: string): Promise<void> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("google_connection", "user", userId),
    limit: PROFILE_WRITE_RATE_LIMIT_MAX,
    windowMs: PROFILE_WRITE_RATE_LIMIT_WINDOW_MS,
  });

  if (!decision.allowed) throw new ProfileRateLimitedError();
}

function rejectionToError(reason: "already_linked" | "password_required" | "invalid_password") {
  if (reason === "already_linked") return new GoogleAlreadyLinkedError();

  /**
   * `password_required` ve `invalid_password` AYNI hatayı döndürüyor: ikisini
   * ayırmak, bir hesabın şifresi olup olmadığını dışarıdan ölçülebilir kılardı.
   */
  return new LinkPasswordCheckFailedError();
}
