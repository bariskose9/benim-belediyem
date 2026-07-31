/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Bu testin koruduğu asıl kural ADR-004 bedel 2'dir: Cloudflare'a ulaşılamadığında
 * kapı ATLANMAZ, akış durur. "Dış servis çökerse sayfa ayakta kalır" kuralının
 * bilinçli istisnası budur — bir güvenlik kapısı bilgi widget'ı değildir.
 */

const envMock = vi.hoisted(() => ({
  envLabel: "preview" as "local" | "preview" | "production",
  serverEnv: { TURNSTILE_SECRET_KEY: "test-secret" as string | undefined },
}));

vi.mock("@/config/env", () => envMock);

async function verify(token: string, actorIp?: string) {
  const { verifyTurnstileToken } = await import("@/lib/turnstile");

  return verifyTurnstileToken({ token, actorIp });
}

function mockFetchJson(payload: unknown, status = 200) {
  const fetchSpy = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );

  vi.stubGlobal("fetch", fetchSpy);

  return fetchSpy;
}

beforeEach(() => {
  vi.resetModules();
  envMock.envLabel = "preview";
  envMock.serverEnv.TURNSTILE_SECRET_KEY = "test-secret";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Turnstile jeton doğrulaması", () => {
  it("geçerli jeton için success döner", async () => {
    mockFetchJson({ success: true });

    await expect(verify("gecerli-jeton")).resolves.toBe("success");
  });

  it("geçersiz jeton için failed döner", async () => {
    mockFetchJson({ success: false, "error-codes": ["invalid-input-response"] });

    await expect(verify("bozuk-jeton")).resolves.toBe("failed");
  });

  it("ikinci kez kullanılan jetonu reddeder", async () => {
    // Jeton tek kullanımlıktır; Cloudflare tekrarı `timeout-or-duplicate` ile bildirir.
    mockFetchJson({ success: false, "error-codes": ["timeout-or-duplicate"] });

    await expect(verify("tekrar-kullanilan-jeton")).resolves.toBe("failed");
  });

  it("jeton hiç gönderilmemişse ağa çıkmadan reddeder", async () => {
    const fetchSpy = mockFetchJson({ success: true });

    await expect(verify("")).resolves.toBe("failed");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("zaman aşımında unavailable döner — BAŞARILI SAYILMAZ", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Object.assign(new Error("timeout"), { name: "TimeoutError" })),
    );

    await expect(verify("jeton")).resolves.toBe("unavailable");
  });

  it("ağ hatasında unavailable döner — BAŞARILI SAYILMAZ", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(verify("jeton")).resolves.toBe("unavailable");
  });

  it("Cloudflare 5xx dönerse unavailable döner", async () => {
    mockFetchJson({}, 502);

    await expect(verify("jeton")).resolves.toBe("unavailable");
  });

  it("anahtar yoksa preview'da kapıyı ATLAMAZ", async () => {
    envMock.envLabel = "preview";
    envMock.serverEnv.TURNSTILE_SECRET_KEY = undefined;
    const fetchSpy = mockFetchJson({ success: true });

    await expect(verify("jeton")).resolves.toBe("unavailable");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("anahtar yoksa production'da kapıyı ATLAMAZ", async () => {
    envMock.envLabel = "production";
    envMock.serverEnv.TURNSTILE_SECRET_KEY = undefined;

    await expect(verify("jeton")).resolves.toBe("unavailable");
  });

  it("anahtar yoksa yalnızca local'de doğrulamayı atlar", async () => {
    // Depoyu yeni klonlayan biri anahtarsız da çalışabilsin diye. `.env.example`
    // zaten Cloudflare'ın resmî test anahtarlarını veriyor, bu yol normalde
    // hiç çalışmaz.
    envMock.envLabel = "local";
    envMock.serverEnv.TURNSTILE_SECRET_KEY = undefined;

    await expect(verify("")).resolves.toBe("success");
  });

  it("IP bilgisini Cloudflare'a iletir ama 'unknown' yer tutucusunu iletmez", async () => {
    const withIp = mockFetchJson({ success: true });
    await verify("jeton", "203.0.113.7");
    expect((withIp.mock.calls[0][1].body as FormData).get("remoteip")).toBe("203.0.113.7");

    vi.resetModules();
    const withoutIp = mockFetchJson({ success: true });
    await verify("jeton", "unknown");
    expect((withoutIp.mock.calls[0][1].body as FormData).get("remoteip")).toBeNull();
  });

  it("hata log'una jetonun kendisini yazmaz", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await verify("cok-gizli-jeton-degeri");

    const logged = errorSpy.mock.calls.map((call) => JSON.stringify(call)).join(" ");
    expect(logged).not.toContain("cok-gizli-jeton-degeri");
  });
});
