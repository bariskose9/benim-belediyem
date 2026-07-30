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

const LOCAL_DB_URL = "postgresql://belediye:belediye@localhost:5432/benim_belediyem";

const validServerEnv = {
  DATABASE_URL: LOCAL_DB_URL,
  DIRECT_URL: LOCAL_DB_URL,
};

describe("sunucu ortam değişkenleri", () => {
  it("henüz kullanılmayan anahtarlar olmadan da geçerlidir", () => {
    // Veritabanı dışındaki gizli anahtarlar sonraki adımlarda zorunlu olur;
    // o adıma gelinmeden uygulama açılabilmeli.
    const parsed = parseEnv(serverEnvSchema, validServerEnv, "test");

    expect(parsed.OTP_EMAIL_CHANNEL).toBe("mock");
    expect(parsed.NEWS_API_PROVIDER).toBe("gnews");
  });

  it("boş string'i 'verilmemiş' sayar", () => {
    // `.env` dosyalarında `KEY=` yaygındır; bu boş metin değil, eksik değer demektir.
    const parsed = parseEnv(serverEnvSchema, { ...validServerEnv, SENTRY_DSN: "" }, "test");

    expect(parsed.SENTRY_DSN).toBeUndefined();
  });

  it("İzmir koordinatlarını varsayılan olarak kullanır", () => {
    const parsed = parseEnv(serverEnvSchema, validServerEnv, "test");

    expect(parsed.WEATHER_DEFAULT_LAT).toBeCloseTo(38.4237);
    expect(parsed.WEATHER_DEFAULT_LON).toBeCloseTo(27.1428);
  });

  it("geçersiz enlem değerini reddeder", () => {
    expect(() =>
      parseEnv(serverEnvSchema, { ...validServerEnv, WEATHER_DEFAULT_LAT: "120" }, "test"),
    ).toThrowError(/WEATHER_DEFAULT_LAT/);
  });
});

describe("veritabanı bağlantı adresleri", () => {
  it("iki adres de zorunludur", () => {
    // Adım 2'den itibaren uygulama veritabanı olmadan açılmamalı.
    expect(() => parseEnv(serverEnvSchema, {}, "test")).toThrowError(/DATABASE_URL/);
    expect(() => parseEnv(serverEnvSchema, { DATABASE_URL: LOCAL_DB_URL }, "test")).toThrowError(
      /DIRECT_URL/,
    );
  });

  it("postgresql ve postgres şemalarını kabul eder", () => {
    const parsed = parseEnv(
      serverEnvSchema,
      { DATABASE_URL: "postgres://u:p@h:5432/d", DIRECT_URL: LOCAL_DB_URL },
      "test",
    );

    expect(parsed.DATABASE_URL).toBe("postgres://u:p@h:5432/d");
  });

  it("yanlış veritabanı türünü reddeder", () => {
    // `mysql://` verilse Prisma tarafında çok daha geç ve anlamsız bir hata alınırdı.
    expect(() =>
      parseEnv(
        serverEnvSchema,
        { ...validServerEnv, DATABASE_URL: "mysql://u:p@h:3306/d" },
        "test",
      ),
    ).toThrowError(/DATABASE_URL/);
  });

  it("adres olmayan metni reddeder", () => {
    expect(() =>
      parseEnv(serverEnvSchema, { ...validServerEnv, DIRECT_URL: "localhost:5432" }, "test"),
    ).toThrowError(/DIRECT_URL/);
  });
});
