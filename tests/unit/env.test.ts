import { describe, expect, it } from "vitest";

import { __testing, parseEnv, resolveVercelAppUrl } from "@/config/env";

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

/**
 * Bu blok bir DAĞITIM DEĞİŞMEZİni koruyor: OAuth `redirect_uri`'si sağlayıcı
 * panelindeki listeyle birebir eşleşmek zorunda. Dağıtım adresi her commit'te
 * değiştiği için panele yazılamaz; dal adresi ise dal boyunca sabittir.
 * Öncelik ters çevrilirse Google `redirect_uri_mismatch` verir (adım 4c).
 */
describe("preview adresinin seçimi", () => {
  const BRANCH_HOST = "benim-belediyem-git-feature-x-barisss.vercel.app";
  const DEPLOYMENT_HOST = "benim-belediyem-egg0uqrln-barisss.vercel.app";

  it("iki adres de varken DAL adresini seçer", () => {
    expect(resolveVercelAppUrl({ branchHost: BRANCH_HOST, deploymentHost: DEPLOYMENT_HOST })).toBe(
      `https://${BRANCH_HOST}`,
    );
  });

  it("dal adresi yoksa dağıtım adresine düşer", () => {
    // Vercel bir gün dal değişkenini vermezse uygulama adressiz kalmamalı;
    // yanlış adres, adres olmamasından iyidir (uygulama hiç açılmazdı).
    expect(resolveVercelAppUrl({ deploymentHost: DEPLOYMENT_HOST })).toBe(
      `https://${DEPLOYMENT_HOST}`,
    );
  });

  it("boş string'i adres saymaz", () => {
    // Vercel dışı ortamlarda değişken tanımlı ama boş gelebiliyor.
    expect(resolveVercelAppUrl({ branchHost: "", deploymentHost: DEPLOYMENT_HOST })).toBe(
      `https://${DEPLOYMENT_HOST}`,
    );
  });

  it("hiçbiri yoksa tanımsız döner", () => {
    // Local'de bu yol hiç çalışmaz; adres `.env` dosyasından gelir.
    expect(resolveVercelAppUrl({})).toBeUndefined();
  });
});

const LOCAL_DB_URL = "postgresql://belediye:belediye@localhost:5432/benim_belediyem";

const validServerEnv = {
  // Sunucu şeması ortam etiketini de okuyor: "production'da sahte OTP kanalı
  // kullanılamaz" kuralı ortamı bilmeden uygulanamaz (adım 4b-1).
  NEXT_PUBLIC_ENV_LABEL: "local",
  DATABASE_URL: LOCAL_DB_URL,
  DIRECT_URL: LOCAL_DB_URL,
  // Adım 4a'dan itibaren zorunlu: hız sınırı IP'yi bu tuzla özetliyor,
  // sahte KPS ucu bu anahtar olmadan hiçbir isteği kabul etmiyor.
  NATIONAL_ID_HASH_SALT: "test-only-salt",
  MOCK_KPS_API_KEY: "test-only-mock-kps-key-at-least-32-chars",
  // Adım 4b-1'den itibaren zorunlu: KPS yükü bu anahtarla şifreleniyor.
  NATIONAL_ID_ENCRYPTION_KEY: "bG9jYWwtZGV2LW9ubHkta2V5LTMyLWJ5dGVzLXh4eHg=",
};

describe("sunucu ortam değişkenleri", () => {
  it("henüz kullanılmayan anahtarlar olmadan da geçerlidir", () => {
    // Veritabanı dışındaki gizli anahtarlar sonraki adımlarda zorunlu olur;
    // o adıma gelinmeden uygulama açılabilmeli.
    const parsed = parseEnv(serverEnvSchema, validServerEnv, "test");

    expect(parsed.OTP_EMAIL_CHANNEL).toBe("mock");
    // Bilgi widget'ları anahtar İSTEMİYOR (ADR-016); yalnızca koordinatın
    // varsayılanı var ve o da verilmezse İzmir'e düşüyor.
    expect(parsed.WEATHER_DEFAULT_LAT).toBe(38.4237);
  });

  it("sahte KPS anahtarı ZORUNLUDUR — eksikse uygulama açılmaz", () => {
    // Opsiyonel olsaydı, anahtar unutulduğunda uygulama sessizce açılır ve
    // kimlik sorgu ucu herkese açık kalırdı (ADR-009). Kapı, atlanabiliyorsa
    // kapı değildir.
    const { MOCK_KPS_API_KEY: _omitted, ...withoutKey } = validServerEnv;

    expect(() => parseEnv(serverEnvSchema, withoutKey, "test")).toThrowError(/MOCK_KPS_API_KEY/);
  });

  it("tahmin edilebilecek kadar kısa bir KPS anahtarını reddeder", () => {
    expect(() =>
      parseEnv(serverEnvSchema, { ...validServerEnv, MOCK_KPS_API_KEY: "secret" }, "test"),
    ).toThrowError(/MOCK_KPS_API_KEY/);
  });

  it("özet tuzu ZORUNLUDUR — tuzsuz özet kaba kuvvetle çözülür", () => {
    const { NATIONAL_ID_HASH_SALT: _omitted, ...withoutSalt } = validServerEnv;

    expect(() => parseEnv(serverEnvSchema, withoutSalt, "test")).toThrowError(
      /NATIONAL_ID_HASH_SALT/,
    );
  });

  it("şifreleme anahtarı ZORUNLUDUR — eksikse kayıt ucu ham kripto hatası verirdi", () => {
    const { NATIONAL_ID_ENCRYPTION_KEY: _omitted, ...withoutKey } = validServerEnv;

    expect(() => parseEnv(serverEnvSchema, withoutKey, "test")).toThrowError(
      /NATIONAL_ID_ENCRYPTION_KEY/,
    );
  });

  it("yanlış uzunluktaki şifreleme anahtarını AÇILIŞTA reddeder", () => {
    // Aksi hâlde hata ilk kayıt denemesinde, kullanıcının önünde çıkardı.
    expect(() =>
      parseEnv(
        serverEnvSchema,
        { ...validServerEnv, NATIONAL_ID_ENCRYPTION_KEY: "Y29rLWtpc2E=" },
        "test",
      ),
    ).toThrowError(/NATIONAL_ID_ENCRYPTION_KEY/);
  });

  it("boş string'i 'verilmemiş' sayar", () => {
    // `.env` dosyalarında `KEY=` yaygındır; bu boş metin değil, eksik değer demektir.
    const parsed = parseEnv(serverEnvSchema, { ...validServerEnv, SENTRY_ORG: "" }, "test");

    expect(parsed.SENTRY_ORG).toBeUndefined();
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

/**
 * Bu blok bir GÜVENLİK DEĞİŞMEZİni koruyor: sahte OTP kanalı doğrulama kodunu
 * ekranda gösteriyor, `05-auth-security.md` bunu production'da kesin olarak
 * yasaklıyor. Kural şemada durduğu için yanlış yapılandırılmış bir production
 * dağıtımı hiç AÇILMIYOR — kodu ekranda göstermesindense açılmaması tercih edildi.
 */
describe("doğrulama kodu kanalı ile ortam tutarlılığı", () => {
  const productionEnv = {
    ...validServerEnv,
    NEXT_PUBLIC_ENV_LABEL: "production",
    OTP_EMAIL_CHANNEL: "email",
    OTP_PHONE_CHANNEL: "email_sim",
  };

  it("production'da gerçek kanallarla geçerlidir", () => {
    const parsed = parseEnv(serverEnvSchema, productionEnv, "test");

    expect(parsed.OTP_EMAIL_CHANNEL).toBe("email");
    expect(parsed.OTP_PHONE_CHANNEL).toBe("email_sim");
  });

  it("production'da sahte e-posta kanalını reddeder", () => {
    expect(() =>
      parseEnv(serverEnvSchema, { ...productionEnv, OTP_EMAIL_CHANNEL: "mock" }, "test"),
    ).toThrowError(/OTP_EMAIL_CHANNEL/);
  });

  it("production'da sahte telefon kanalını reddeder", () => {
    expect(() =>
      parseEnv(serverEnvSchema, { ...productionEnv, OTP_PHONE_CHANNEL: "mock" }, "test"),
    ).toThrowError(/OTP_PHONE_CHANNEL/);
  });

  it("local ve preview'da sahte kanala izin verir", () => {
    for (const label of ["local", "preview"] as const) {
      const parsed = parseEnv(
        serverEnvSchema,
        { ...validServerEnv, NEXT_PUBLIC_ENV_LABEL: label },
        "test",
      );

      expect(parsed.OTP_EMAIL_CHANNEL).toBe("mock");
      expect(parsed.OTP_PHONE_CHANNEL).toBe("mock");
    }
  });

  it("gerçek SMS kanalını her ortamda reddeder", () => {
    // Gerçek SMS sağlayıcısı PRD §2 uyarınca kapsam dışı. Değer seçilebilir
    // olsaydı, hiçbir şey göndermeyen bir kanal sessizce devreye girerdi.
    for (const label of ["local", "preview", "production"] as const) {
      expect(() =>
        parseEnv(
          serverEnvSchema,
          { ...productionEnv, NEXT_PUBLIC_ENV_LABEL: label, OTP_PHONE_CHANNEL: "sms" },
          "test",
        ),
      ).toThrowError(/OTP_PHONE_CHANNEL/);
    }
  });

  it("production'da e-posta anahtarı eksikse uygulama YİNE DE açılır", () => {
    // Bilinçli tercih: anahtar eksikken tüm uygulamanın açılmaması `main`'i
    // deploy edilemez hale getirirdi (CLAUDE.md §6.1). Eksik anahtarın bedeli
    // yalnızca kayıt ucunun 503 dönmesidir.
    const parsed = parseEnv(serverEnvSchema, productionEnv, "test");

    expect(parsed.EMAIL_API_KEY).toBeUndefined();
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
      { ...validServerEnv, DATABASE_URL: "postgres://u:p@h:5432/d" },
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
