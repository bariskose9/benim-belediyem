/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Doğrulama kodu kanalları (PRD §5.0 · integrations.md).
 *
 * En kritik davranış: production'da telefon kodu TELEFONA DEĞİL e-postaya
 * gidiyor ve bunun bir simülasyon olduğu kullanıcıdan gizlenmiyor.
 */

const envMock = vi.hoisted(() => ({
  isProductionEnv: false,
  envLabel: "local" as "local" | "preview" | "production",
  serverEnv: {
    EMAIL_API_KEY: "test-email-key" as string | undefined,
    EMAIL_FROM: "test@ornek.com" as string | undefined,
    OTP_EMAIL_CHANNEL: "mock" as "mock" | "email",
    OTP_PHONE_CHANNEL: "mock" as "mock" | "email_sim" | "sms",
    NATIONAL_ID_HASH_SALT: "test-only-salt",
  },
}));

vi.mock("@/config/env", () => envMock);

const baseInput = {
  purpose: "register_email" as const,
  code: "123456",
  expiresAt: new Date("2026-07-31T12:05:00Z"),
  destination: { kind: "email" as const, value: "ayse@ornek.com" },
  contactEmail: "ayse@ornek.com",
};

function mockFetch(status = 200) {
  const spy = vi.fn().mockResolvedValue(new Response("{}", { status }));
  vi.stubGlobal("fetch", spy);

  return spy;
}

beforeEach(() => {
  vi.resetModules();
  envMock.isProductionEnv = false;
  envMock.serverEnv.EMAIL_API_KEY = "test-email-key";
  envMock.serverEnv.EMAIL_FROM = "test@ornek.com";
  envMock.serverEnv.OTP_EMAIL_CHANNEL = "mock";
  envMock.serverEnv.OTP_PHONE_CHANNEL = "mock";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MockChannel — local ve preview", () => {
  it("kodu çağırana geri verir, gönderim yapmaz", async () => {
    const fetchSpy = mockFetch();
    const { MockChannel } = await import("@/features/otp/providers/mock-channel");

    const result = await new MockChannel().send(baseInput);

    expect(result).toEqual({ outcome: "sent", revealedCode: "123456" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("kodu log'a YAZMAZ", async () => {
    // Vercel log'ları kalıcıdır; koda düşen bir doğrulama kodu orada kalırdı
    // (05-auth-security.md → "kod hiçbir zaman log'da görünmez").
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { MockChannel } = await import("@/features/otp/providers/mock-channel");

    await new MockChannel().send(baseInput);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });
});

describe("EmailChannel — production e-posta kodu", () => {
  it("kodu hedef adrese gönderir ve ekrana DÖNDÜRMEZ", async () => {
    const fetchSpy = mockFetch();
    const { EmailChannel } = await import("@/features/otp/providers/email-channel");

    const result = await new EmailChannel().send(baseInput);

    expect(result).toEqual({ outcome: "sent" });
    expect(result).not.toHaveProperty("revealedCode");

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.to).toBe("ayse@ornek.com");
    expect(body.subject).toContain("e-posta doğrulama");
    expect(body.text).toContain("123456");
  });

  it("sağlayıcı hata dönerse unavailable döner", async () => {
    mockFetch(500);
    const { EmailChannel } = await import("@/features/otp/providers/email-channel");

    await expect(new EmailChannel().send(baseInput)).resolves.toEqual({ outcome: "unavailable" });
  });

  it("e-posta anahtarı yoksa unavailable döner, çökmez", async () => {
    envMock.serverEnv.EMAIL_API_KEY = undefined;
    const fetchSpy = mockFetch();
    const { EmailChannel } = await import("@/features/otp/providers/email-channel");

    await expect(new EmailChannel().send(baseInput)).resolves.toEqual({ outcome: "unavailable" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("hata log'una tam e-posta adresini yazmaz", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch(500);
    const { EmailChannel } = await import("@/features/otp/providers/email-channel");

    await new EmailChannel().send(baseInput);

    const logged = errorSpy.mock.calls.map((call) => JSON.stringify(call)).join(" ");
    expect(logged).not.toContain("ayse@ornek.com");
    expect(logged).toContain("a***@ornek.com");
  });
});

describe("EmailSmsSimulationChannel — telefon kodu", () => {
  const phoneInput = {
    ...baseInput,
    purpose: "register_phone" as const,
    destination: { kind: "phone" as const, value: "05321234567" },
    contactEmail: "ayse@ornek.com",
  };

  it("kodu telefona DEĞİL kullanıcının e-postasına gönderir", async () => {
    const fetchSpy = mockFetch();
    const { EmailSmsSimulationChannel } =
      await import("@/features/otp/providers/email-sms-simulation-channel");

    await new EmailSmsSimulationChannel().send(phoneInput);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.to).toBe("ayse@ornek.com");
    expect(body.to).not.toBe("05321234567");
  });

  it("simülasyon olduğunu konu başlığında ve gövdede açıkça yazar", async () => {
    // Bunu gizlemek kullanıcıyı yanıltmak olurdu: telefon doğrulaması bugün
    // numaranın sahipliğini KANITLAMIYOR (roadmap teknik borç #1).
    const fetchSpy = mockFetch();
    const { EmailSmsSimulationChannel } =
      await import("@/features/otp/providers/email-sms-simulation-channel");

    await new EmailSmsSimulationChannel().send(phoneInput);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.subject).toContain("SMS simülasyonu");
    expect(body.text).toContain("SMS SİMÜLASYONU");
    expect(body.text).toContain("KANITLAMAZ");
  });

  it("e-posta gövdesinde tam telefon numarası geçmez", async () => {
    const fetchSpy = mockFetch();
    const { EmailSmsSimulationChannel } =
      await import("@/features/otp/providers/email-sms-simulation-channel");

    await new EmailSmsSimulationChannel().send(phoneInput);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.text).not.toContain("05321234567");
    expect(body.text).toContain("0532***4567");
  });

  it("kodu ekrana döndürmez", async () => {
    mockFetch();
    const { EmailSmsSimulationChannel } =
      await import("@/features/otp/providers/email-sms-simulation-channel");

    const result = await new EmailSmsSimulationChannel().send(phoneInput);

    expect(result).toEqual({ outcome: "sent" });
  });
});

describe("resolveOtpChannel — ortam değişkeninden kanal seçimi", () => {
  it("mock ayarında sahte kanalı seçer", async () => {
    const { resolveOtpChannel } = await import("@/features/otp/providers/resolve-channel");

    expect(resolveOtpChannel("email").channel).toBe("mock");
    expect(resolveOtpChannel("phone").channel).toBe("mock");
  });

  it("production ayarlarında gerçek kanalları seçer", async () => {
    envMock.serverEnv.OTP_EMAIL_CHANNEL = "email";
    envMock.serverEnv.OTP_PHONE_CHANNEL = "email_sim";
    const { resolveOtpChannel } = await import("@/features/otp/providers/resolve-channel");

    expect(resolveOtpChannel("email").channel).toBe("email");
    expect(resolveOtpChannel("phone").channel).toBe("email_sms_simulation");
  });
});
