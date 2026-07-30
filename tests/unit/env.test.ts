import { describe, expect, it } from "vitest";

import { __testing, parseEnv } from "@/config/env";

const { publicEnvSchema, serverEnvSchema } = __testing;

const validPublicEnv = {
  NODE_ENV: "development",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_ENV_LABEL: "local",
};

describe("genel ortam değişkenleri", () => {
  it("geçerli değerleri kabul eder", () => {
    const parsed = parseEnv(publicEnvSchema, validPublicEnv, "test");

    expect(parsed.NEXT_PUBLIC_ENV_LABEL).toBe("local");
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("zorunlu değişken eksikse hangi değişkenin eksik olduğunu söyler", () => {
    const { NEXT_PUBLIC_APP_URL: _omitted, ...withoutAppUrl } = validPublicEnv;

    expect(() => parseEnv(publicEnvSchema, withoutAppUrl, "test")).toThrowError(
      /NEXT_PUBLIC_APP_URL/,
    );
  });

  it("adres biçimi bozuksa reddeder", () => {
    expect(() =>
      parseEnv(
        publicEnvSchema,
        { ...validPublicEnv, NEXT_PUBLIC_APP_URL: "localhost:3000" },
        "test",
      ),
    ).toThrowError(/NEXT_PUBLIC_APP_URL/);
  });

  it("tanımsız bir ortam etiketini reddeder", () => {
    expect(() =>
      parseEnv(publicEnvSchema, { ...validPublicEnv, NEXT_PUBLIC_ENV_LABEL: "staging" }, "test"),
    ).toThrowError(/NEXT_PUBLIC_ENV_LABEL/);
  });

  it("hata mesajı ne yapılacağını söyler", () => {
    expect(() => parseEnv(publicEnvSchema, {}, "test")).toThrowError(/\.env\.example/);
  });
});

describe("sunucu ortam değişkenleri", () => {
  it("henüz kullanılmayan anahtarlar olmadan da geçerlidir", () => {
    // Adım 0'da hiçbir gizli anahtar zorunlu değil; uygulama yine de açılmalı.
    const parsed = parseEnv(serverEnvSchema, {}, "test");

    expect(parsed.OTP_EMAIL_CHANNEL).toBe("mock");
    expect(parsed.NEWS_API_PROVIDER).toBe("gnews");
  });

  it("boş string'i 'verilmemiş' sayar", () => {
    // `.env` dosyalarında `KEY=` yaygındır; bu boş metin değil, eksik değer demektir.
    const parsed = parseEnv(serverEnvSchema, { DATABASE_URL: "" }, "test");

    expect(parsed.DATABASE_URL).toBeUndefined();
  });

  it("İzmir koordinatlarını varsayılan olarak kullanır", () => {
    const parsed = parseEnv(serverEnvSchema, {}, "test");

    expect(parsed.WEATHER_DEFAULT_LAT).toBeCloseTo(38.4237);
    expect(parsed.WEATHER_DEFAULT_LON).toBeCloseTo(27.1428);
  });

  it("geçersiz enlem değerini reddeder", () => {
    expect(() => parseEnv(serverEnvSchema, { WEATHER_DEFAULT_LAT: "120" }, "test")).toThrowError(
      /WEATHER_DEFAULT_LAT/,
    );
  });
});
