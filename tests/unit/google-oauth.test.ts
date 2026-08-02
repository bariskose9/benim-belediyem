/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Google ile girişin PROTOKOL katmanı (PRD §5.0 · adım 4c).
 *
 * Bu testin koruduğu asıl kurallar:
 *   1. Yetkilendirme isteği PKCE + `state` + `nonce` OLMADAN kurulamaz
 *   2. Dönüş adresi Google panelindeki kayıtla karakteri karakterine aynı olmalı
 *   3. `state` tutmuyorsa akış Google'a HİÇ gitmeden ölür
 *
 * Google'ın kendisi çağrılmıyor; `fetch` taklit ediliyor. Ama taklit edilen
 * yalnızca AĞ — üretilen adres, PKCE özeti ve `state` karşılaştırması gerçek
 * kütüphane kodu tarafından yapılıyor (06-testing.md: "sadece mock'u doğrulayan
 * test yazılmaz").
 */

const envMock = vi.hoisted(() => ({
  envLabel: "local" as "local" | "preview" | "production",
  isProductionEnv: false,
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://benim-belediyem.vercel.app" },
  serverEnv: {
    GOOGLE_CLIENT_ID: "test-client-id" as string | undefined,
    GOOGLE_CLIENT_SECRET: "test-client-secret" as string | undefined,
  },
}));

vi.mock("@/config/env", () => envMock);

/** Google'ın gerçek keşif belgesinin bizim kullandığımız alanları. */
const DISCOVERY_DOCUMENT = {
  issuer: "https://accounts.google.com",
  authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  token_endpoint: "https://oauth2.googleapis.com/token",
  jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
  response_types_supported: ["code"],
  subject_types_supported: ["public"],
  id_token_signing_alg_values_supported: ["RS256"],
  code_challenge_methods_supported: ["S256"],
};

function mockDiscovery(): ReturnType<typeof vi.fn> {
  const fetchSpy = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(DISCOVERY_DOCUMENT), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );

  vi.stubGlobal("fetch", fetchSpy);

  return fetchSpy;
}

async function loadService() {
  return import("@/features/auth/services/google-oauth.service");
}

beforeEach(() => {
  vi.resetModules();
  envMock.serverEnv.GOOGLE_CLIENT_ID = "test-client-id";
  envMock.serverEnv.GOOGLE_CLIENT_SECRET = "test-client-secret";
  envMock.publicEnv.NEXT_PUBLIC_APP_URL = "https://benim-belediyem.vercel.app";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("yapılandırma kontrolü", () => {
  it("iki anahtar da varsa Google ile giriş açıktır", async () => {
    const { isGoogleLoginConfigured } = await loadService();

    expect(isGoogleLoginConfigured()).toBe(true);
  });

  it.each([
    ["istemci kimliği", "GOOGLE_CLIENT_ID"],
    ["istemci parolası", "GOOGLE_CLIENT_SECRET"],
  ] as const)("%s eksikse Google ile giriş KAPALIDIR", async (_ad, key) => {
    envMock.serverEnv[key] = undefined;

    const { isGoogleLoginConfigured } = await loadService();

    expect(isGoogleLoginConfigured()).toBe(false);
  });

  /**
   * Eksik anahtar SESSİZCE geçilmemeli: yapılandırılmamış bir kurulumda akışın
   * yarısına kadar gidip anlaşılmaz bir hata vermek, kurulum hatasını gizler.
   */
  it("anahtar yokken yapılandırma istenirse açık hata fırlatır", async () => {
    envMock.serverEnv.GOOGLE_CLIENT_ID = undefined;

    const { getGoogleConfiguration, GoogleOauthNotConfiguredError } = await loadService();

    await expect(getGoogleConfiguration()).rejects.toBeInstanceOf(GoogleOauthNotConfiguredError);
  });
});

describe("dönüş adresi", () => {
  /**
   * Google joker kabul etmiyor ve en ufak fark `redirect_uri_mismatch` veriyor.
   * Bu test, adresin biçimini yanlışlıkla değiştiren bir düzenlemeyi yakalar.
   */
  it("uygulama adresinin altında sabit callback yoluna kurulur", async () => {
    const { googleCallbackUrl } = await loadService();

    expect(googleCallbackUrl()).toBe("https://benim-belediyem.vercel.app/api/auth/google/callback");
  });

  it("ortam adresi değişince dönüş adresi de değişir", async () => {
    envMock.publicEnv.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    const { googleCallbackUrl } = await loadService();

    expect(googleCallbackUrl()).toBe("http://localhost:3000/api/auth/google/callback");
  });
});

describe("yetkilendirme isteği", () => {
  it("PKCE, state, nonce ve hesap seçtirme parametreleriyle kurulur", async () => {
    mockDiscovery();

    const { createGoogleAuthorizationRequest } = await loadService();
    const request = await createGoogleAuthorizationRequest();
    const url = new URL(request.authorizationUrl);

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://benim-belediyem.vercel.app/api/auth/google/callback",
    );
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("response_type")).toBe("code");

    // PKCE: adreste yalnızca ÖZET gider, doğrulayıcı bizde kalır.
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.searchParams.get("code_challenge")).not.toBe(request.codeVerifier);

    expect(url.searchParams.get("state")).toBe(request.state);
    expect(url.searchParams.get("nonce")).toBe(request.nonce);

    // Ortak bilgisayarda önceki kişinin hesabına sessizce girilmesini engeller.
    expect(url.searchParams.get("prompt")).toBe("select_account");
  });

  /**
   * Sabit `state` veya sabit doğrulayıcı, korumaların üçünü de anlamsız kılar.
   * Rastgeleliğin kaybolduğu bir düzenleme buradan görünür.
   */
  it("her istekte yeni state, doğrulayıcı ve nonce üretir", async () => {
    mockDiscovery();

    const { createGoogleAuthorizationRequest } = await loadService();
    const first = await createGoogleAuthorizationRequest();
    const second = await createGoogleAuthorizationRequest();

    expect(first.state).not.toBe(second.state);
    expect(first.codeVerifier).not.toBe(second.codeVerifier);
    expect(first.nonce).not.toBe(second.nonce);
  });
});

describe("keşif önbelleği", () => {
  it("uç adresleri süreç başına bir kez sorulur", async () => {
    const fetchSpy = mockDiscovery();

    const { createGoogleAuthorizationRequest } = await loadService();

    await createGoogleAuthorizationRequest();
    await createGoogleAuthorizationRequest();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  /**
   * Geçici bir ağ hatası KALICI olmamalı: önbellek başarısız sözü tutsaydı,
   * Google'ın bir saniyelik kesintisi süreç ömrü boyunca girişi kapatırdı.
   */
  it("keşif başarısız olursa sonraki denemede yeniden sorar", async () => {
    const fetchSpy = vi
      .fn()
      .mockRejectedValueOnce(new Error("ağ hatası"))
      .mockResolvedValue(
        new Response(JSON.stringify(DISCOVERY_DOCUMENT), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchSpy);

    const { getGoogleConfiguration } = await loadService();

    await expect(getGoogleConfiguration()).rejects.toThrow();
    await expect(getGoogleConfiguration()).resolves.toBeDefined();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe("callback doğrulaması", () => {
  /**
   * EN KRİTİK TEST. `state` tutmuyorsa saldırgan kendi Google hesabının kodunu
   * kurbanın tarayıcısında kullandırmış olabilir. Akış jeton ucuna HİÇ
   * GİTMEDEN ölmeli — yanlış `state` ile bile olsa Google'a kod göndermek,
   * korumayı yalnızca kısmen uygulamak olurdu.
   */
  it("state uyuşmuyorsa jeton değişimi HİÇ yapılmadan reddeder", async () => {
    const fetchSpy = mockDiscovery();

    const { exchangeGoogleCallback } = await loadService();

    const callbackUrl = new URL(
      "https://benim-belediyem.vercel.app/api/auth/google/callback?code=sahte-kod&state=SALDIRGANIN-STATE",
    );

    await expect(
      exchangeGoogleCallback(callbackUrl, {
        state: "BIZIM-STATE",
        codeVerifier: "dogrulayici",
        nonce: "nonce",
      }),
    ).rejects.toThrow();

    // Yalnızca keşif çağrısı yapılmış olmalı; jeton ucuna gidilmemiş.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  /**
   * Yukarıdaki iki testin BOŞ OLMADIĞINI kanıtlar: `state` eşleştiğinde akış
   * gerçekten jeton ucuna kadar ilerliyor. Bu test olmasaydı, ret testleri
   * bambaşka bir sebeple (örneğin keşfin patlaması) de geçebilirdi ve biz
   * korumanın çalıştığını sanırdık.
   */
  it("state eşleşiyorsa akış jeton ucuna kadar ilerler", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(DISCOVERY_DOCUMENT), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "invalid_grant" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchSpy);

    const { exchangeGoogleCallback } = await loadService();

    const callbackUrl = new URL(
      "https://benim-belediyem.vercel.app/api/auth/google/callback?code=sahte-kod&state=BIZIM-STATE",
    );

    await expect(
      exchangeGoogleCallback(callbackUrl, {
        state: "BIZIM-STATE",
        codeVerifier: "dogrulayici",
        nonce: "nonce",
      }),
    ).rejects.toThrow();

    // Keşif + jeton ucu = 2. Yani `state` kapısı geçilmiş.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("Google hata döndürdüyse jeton değişimi denenmez", async () => {
    const fetchSpy = mockDiscovery();

    const { exchangeGoogleCallback } = await loadService();

    const callbackUrl = new URL(
      "https://benim-belediyem.vercel.app/api/auth/google/callback?error=access_denied&state=BIZIM-STATE",
    );

    await expect(
      exchangeGoogleCallback(callbackUrl, {
        state: "BIZIM-STATE",
        codeVerifier: "dogrulayici",
        nonce: "nonce",
      }),
    ).rejects.toThrow();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
