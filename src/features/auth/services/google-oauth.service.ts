import * as client from "openid-client";

import {
  GOOGLE_CALLBACK_PATH,
  GOOGLE_ISSUER_URL,
  GOOGLE_OAUTH_SCOPES,
  GOOGLE_OAUTH_TIMEOUT_SECONDS,
} from "@/config/constants";
import { publicEnv, serverEnv } from "@/config/env";

/**
 * Google ile girişin PROTOKOL katmanı — OpenID Connect'in kendisi (PRD §5.0).
 *
 * KATMAN: bu dosya veritabanı, çerez ve HTTP bilmez. Yalnızca "Google'a nasıl
 * gidilir, dönen cevap nasıl doğrulanır" sorusunu cevaplar. Hesap birleştirme,
 * oturum açma ve yönlendirme bir üst katmanın işidir (01-architecture.md).
 *
 * NEDEN `openid-client`: PKCE üretimi, `state` karşılaştırması, jeton değişimi
 * ve `id_token`'ın imza + yayıncı + hedef kitle + süre doğrulaması elle
 * yazıldığında sessizce yanlış yapılabilecek işlerdir. Bu kütüphane OpenID
 * Foundation SERTİFİKALI bir istemcidir; protokolün riskli kısmı denetlenmiş
 * koda bırakılıyor, iş kuralları bizde kalıyor.
 *
 * GOOGLE KİMLİK DOĞRULAMAZ. `id_token` yalnızca "bu e-posta hesabının sahibi
 * bu kişi" der. Kimliği KPS doğrular, çalışan olmayı personel rehberi gösterir
 * — üçü hesapta ayrı alanlardır ve birbirinin yerine geçmez.
 */

/** Google'dan dönen ve BİZE LAZIM OLAN her şey. Fazlası taşınmaz. */
export type GoogleIdentity = {
  /** Google'ın değişmeyen kullanıcı kimliği (`sub`). Hesap eşleşmesi bununla yapılır. */
  subject: string;
  email: string;
  /** Google bu e-postanın sahipliğini doğrulamış mı. Hesap birleştirmenin ÖN ŞARTI. */
  emailVerified: boolean;
  /** Görünen ad. Yoksa `null` — Google her hesapta göndermiyor. */
  name: string | null;
};

/** Akışı başlatırken üretilen ve callback'e kadar saklanması gereken değerler. */
export type GoogleAuthorizationRequest = {
  authorizationUrl: string;
  state: string;
  codeVerifier: string;
  nonce: string;
};

export class GoogleOauthNotConfiguredError extends Error {
  constructor() {
    super("Google ile giriş yapılandırılmamış");
    this.name = "GoogleOauthNotConfiguredError";
  }
}

/**
 * Google ile giriş bu ortamda kullanılabilir mi.
 *
 * Anahtarlar `optionalSecret` olarak tanımlı, yani eksikse uygulama AÇILIR —
 * yalnızca bu düğme gizlenir. Kayıt ve şifreyle giriş çalışmaya devam eder
 * (`auth-availability.ts` ile aynı desen): tek bir eksik anahtar tüm siteyi
 * kapatmamalı.
 */
export function isGoogleLoginConfigured(): boolean {
  return Boolean(serverEnv.GOOGLE_CLIENT_ID && serverEnv.GOOGLE_CLIENT_SECRET);
}

/** Google panelindeki "Authorized redirect URIs" ile birebir aynı olmak zorunda. */
export function googleCallbackUrl(): string {
  return new URL(GOOGLE_CALLBACK_PATH, publicEnv.NEXT_PUBLIC_APP_URL).toString();
}

/**
 * Keşif sonucu SÜREÇ BOYUNCA önbelleklenir.
 *
 * Google'ın uç adresleri her istekte yeniden sorulsaydı her girişe fazladan bir
 * ağ gidiş-dönüşü binerdi. Söz (promise) önbellekleniyor, sonuç değil: aynı anda
 * gelen iki istek tek keşif çağrısını paylaşır. Hata durumunda önbellek
 * temizleniyor, aksi hâlde geçici bir ağ hatası süreç ömrü boyunca kalıcı olurdu.
 */
let discoveryPromise: Promise<client.Configuration> | null = null;

export async function getGoogleConfiguration(): Promise<client.Configuration> {
  const clientId = serverEnv.GOOGLE_CLIENT_ID;
  const clientSecret = serverEnv.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) throw new GoogleOauthNotConfiguredError();

  discoveryPromise ??= client
    .discovery(new URL(GOOGLE_ISSUER_URL), clientId, clientSecret, undefined, {
      timeout: GOOGLE_OAUTH_TIMEOUT_SECONDS,
    })
    .catch((error: unknown) => {
      discoveryPromise = null;
      throw error;
    });

  return discoveryPromise;
}

/**
 * Yetkilendirme isteğini kurar: kullanıcının gönderileceği Google adresi ve
 * callback'te doğrulanacak üç gizli değer.
 *
 * ÜÇ KORUMA BİRLİKTE ÇALIŞIR ve hiçbiri diğerinin yerini tutmaz:
 *
 *   `state`  → CSRF. Saldırgan kendi Google hesabının kodunu kurbanın
 *              tarayıcısına yaptırırsa kurban saldırganın hesabına giriş yapmış
 *              olur. Çerezdeki `state` ile dönen `state` eşleşmezse akış ölür.
 *   PKCE     → çalınmış yetkilendirme kodunun kullanılmasını engeller. Kod
 *              adres çubuğunda, günlüklerde ve `Referer` başlığında görünebilir;
 *              doğrulayıcı olmadan işe yaramaz.
 *   `nonce`  → `id_token` tekrar oynatmasını engeller. Başka bir oturumda
 *              üretilmiş geçerli bir jeton buraya yapıştırılamaz.
 *
 * `prompt=select_account`: Google tek hesapla oturum açıksa hesap seçtirmeden
 * geçiyor. Ortak kullanılan bir bilgisayarda bu, bir önceki kişinin hesabına
 * sessizce giriş yapmak demek olurdu.
 */
export async function createGoogleAuthorizationRequest(): Promise<GoogleAuthorizationRequest> {
  const config = await getGoogleConfiguration();

  const codeVerifier = client.randomPKCECodeVerifier();
  const state = client.randomState();
  const nonce = client.randomNonce();

  const authorizationUrl = client.buildAuthorizationUrl(config, {
    redirect_uri: googleCallbackUrl(),
    scope: GOOGLE_OAUTH_SCOPES,
    code_challenge: await client.calculatePKCECodeChallenge(codeVerifier),
    code_challenge_method: "S256",
    state,
    nonce,
    prompt: "select_account",
  });

  return { authorizationUrl: authorizationUrl.toString(), state, codeVerifier, nonce };
}

export class GoogleCallbackError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GoogleCallbackError";
  }
}

/**
 * Callback'i doğrular ve jetonu kimliğe çevirir.
 *
 * `authorizationCodeGrant` üç kontrolü BİRLİKTE yapıyor: `state` eşleşmesi,
 * PKCE doğrulayıcısı ve `nonce`. Üçünden biri tutmazsa hata fırlatır ve akış
 * burada biter — "yine de devam et" seçeneği bilerek bırakılmadı.
 *
 * `idTokenExpected` açık: Google'ın jetonsuz bir cevap döndüğü bir durumda
 * sessizce kimliksiz devam etmek yerine hata almak istiyoruz.
 *
 * `email_verified` DÖNÜŞTÜRÜLMÜYOR, olduğu gibi taşınıyor. Bu alan hesap
 * birleştirme kuralının ön şartı (PRD §5.0); burada "muhtemelen doğrudur"
 * varsayımı yapmak, birleştirme kararını sessizce zayıflatmak olurdu.
 */
export async function exchangeGoogleCallback(
  currentUrl: URL,
  checks: { state: string; codeVerifier: string; nonce: string },
): Promise<GoogleIdentity> {
  const config = await getGoogleConfiguration();

  // Zaman aşımı burada TEKRAR verilmiyor: keşifte belirlenen değer bu
  // yapılandırmanın tüm isteklerine zaten uygulanıyor (kütüphane sözleşmesi).
  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    expectedState: checks.state,
    pkceCodeVerifier: checks.codeVerifier,
    expectedNonce: checks.nonce,
    idTokenExpected: true,
  });

  const claims = tokens.claims();

  if (!claims) throw new GoogleCallbackError("Google kimlik jetonu döndürmedi");

  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";

  if (!email) throw new GoogleCallbackError("Google e-posta adresi döndürmedi");

  return {
    subject: claims.sub,
    email,
    emailVerified: claims.email_verified === true,
    name: typeof claims.name === "string" && claims.name.trim() ? claims.name.trim() : null,
  };
}

/** Testlerin keşif önbelleğini sıfırlaması için — üretim kodu çağırmaz. */
export const __testing = {
  resetDiscoveryCache: () => {
    discoveryPromise = null;
  },
};
