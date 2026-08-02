import { cookies } from "next/headers";

import { GOOGLE_OAUTH_COOKIE_NAME, GOOGLE_OAUTH_FLOW_TTL_MS } from "@/config/constants";
import { secureCookieDefaults } from "@/lib/cookies";
import { DEFAULT_REDIRECT_PATH, sanitizeRedirectPath } from "@/lib/redirect";

/**
 * OAuth akışının HTTP tarafı: tek kullanımlık işlem çerezini yazar ve okur.
 *
 * `session-context.ts` ile aynı desen — protokol servisi çerez bilmez, bu dosya
 * iki dünyayı birleştirir (01-architecture.md).
 *
 * ÇEREZ TEK KULLANIMLIK. Callback'te okunur okunmaz silinir; aynı `state` ile
 * ikinci bir istek geldiğinde okunacak bir şey kalmaz. Silinmeseydi çalınmış
 * bir yetkilendirme kodu, çerez ömrü boyunca (10 dk) tekrar denenebilirdi.
 */

export type GoogleOauthTransaction = {
  state: string;
  codeVerifier: string;
  nonce: string;
  /** Giriş bitince dönülecek yol — HER ZAMAN beyaz listeden geçirilir. */
  returnTo: string;
};

/**
 * İşlem çerezini yazar.
 *
 * İçerik JSON ve İMZALANMIYOR — gerekmiyor. Çerez `httpOnly`, yani sayfadaki
 * JavaScript ne okuyabilir ne yazabilir; kullanıcı çerezi elle değiştirse bile
 * kazandığı tek şey kendi akışını bozmak olur. `state` ve PKCE'nin koruduğu
 * saldırgan zaten BAŞKA bir tarayıcıdadır ve bu çereze hiç erişemez.
 *
 * Bir imza anahtarı eklemek (`AUTH_SECRET`) yönetilecek yeni bir sır demekti;
 * saklanmayan sır sızmaz.
 */
export async function writeGoogleOauthCookie(transaction: GoogleOauthTransaction): Promise<void> {
  const store = await cookies();

  store.set(GOOGLE_OAUTH_COOKIE_NAME, JSON.stringify(transaction), {
    ...secureCookieDefaults,
    maxAge: Math.floor(GOOGLE_OAUTH_FLOW_TTL_MS / 1000),
  });
}

/**
 * İşlem çerezini okur ve SİLER; yoksa veya bozuksa `null`.
 *
 * Bozuk içerik hata fırlatmıyor, `null` dönüyor: çağıran zaten "akış geçersiz"
 * dalını işlemek zorunda ve iki ayrı hata yolu tutmak, birinin unutulmasına
 * açık kapı bırakırdı.
 *
 * `returnTo` burada BİR KEZ DAHA beyaz listeden geçiyor. Yazarken de
 * geçiriliyor; iki kez kontrol etmek gereksiz görünebilir ama araya giren bir
 * hata (örneğin çerezin elle değiştirilmesi) açık yönlendirmeye dönüşmesin
 * diye son kapı burada (05-auth-security.md).
 */
export async function consumeGoogleOauthCookie(): Promise<GoogleOauthTransaction | null> {
  const store = await cookies();
  const raw = store.get(GOOGLE_OAUTH_COOKIE_NAME)?.value;

  store.delete(GOOGLE_OAUTH_COOKIE_NAME);

  if (!raw) return null;

  const parsed = parseTransaction(raw);

  if (!parsed) return null;

  return { ...parsed, returnTo: sanitizeRedirectPath(parsed.returnTo, DEFAULT_REDIRECT_PATH) };
}

export async function clearGoogleOauthCookie(): Promise<void> {
  const store = await cookies();

  store.delete(GOOGLE_OAUTH_COOKIE_NAME);
}

function parseTransaction(raw: string): GoogleOauthTransaction | null {
  try {
    const value: unknown = JSON.parse(raw);

    if (typeof value !== "object" || value === null) return null;

    const { state, codeVerifier, nonce, returnTo } = value as Record<string, unknown>;

    // Üç alandan biri bile eksikse akış doğrulanamaz; eksik doğrulama yerine
    // akışı bitirmek doğru davranış.
    if (typeof state !== "string" || typeof codeVerifier !== "string") return null;
    if (typeof nonce !== "string") return null;

    return {
      state,
      codeVerifier,
      nonce,
      returnTo: typeof returnTo === "string" ? returnTo : DEFAULT_REDIRECT_PATH,
    };
  } catch {
    return null;
  }
}
