import { z } from "zod";

/**
 * Ortam değişkenlerinin TEK okuma noktası (docs/standards/13-environments.md).
 *
 * Neden tek yer: `process.env` koda dağılırsa eksik bir değişken çalışma anında,
 * kullanıcının önünde, anlamsız bir hatayla patlar. Burada açılışta doğrulanır.
 *
 * İKİ AYRI ŞEMA var ve bu bilinçli:
 *  - `publicEnv`  → tarayıcıya gönderilmesi GÜVENLİ değerler (`NEXT_PUBLIC_` önekli)
 *  - `serverEnv`  → gizli anahtarlar; yalnızca sunucuda okunur, tarayıcıya asla gitmez
 *
 * `process.env.NEXT_PUBLIC_X` düz yazılmalıdır: Next.js bu ifadeyi derleme
 * sırasında metin olarak değiştirir. `process.env[isim]` gibi dinamik erişimde
 * değeri gömemez ve tarayıcıda `undefined` olur.
 */

const ENV_LABELS = ["local", "preview", "production"] as const;
export type EnvLabel = (typeof ENV_LABELS)[number];

/** Boş string'i "verilmemiş" saymak için — `.env` dosyalarında `KEY=` sık görülür. */
const optionalSecret = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal("").transform(() => undefined));

const publicEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // Protokol şartı gerekli: `z.url()` tek başına "localhost:3000" değerini de
  // geçerli sayıyor ("localhost:" protokol sanılıyor). O değer buradan geçseydi
  // metadataBase ve sitemap adresleri sessizce bozuk üretilirdi.
  NEXT_PUBLIC_APP_URL: z.url({
    protocol: /^https?$/,
    error: "http:// veya https:// ile başlayan tam adres olmalı, örn. http://localhost:3000",
  }),
  NEXT_PUBLIC_ENV_LABEL: z.enum(ENV_LABELS),

  // adım 4b'de zorunlu olur (Cloudflare Turnstile — ADR-004)
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalSecret,
});

/**
 * Postgres bağlantı adresi. Protokol şartı bilinçli: yanlış şemayla verilen bir
 * adres (örn. `mysql://`) Prisma tarafında çok daha geç ve anlamsız bir hatayla
 * patlardı.
 */
const postgresUrl = z.url({
  protocol: /^postgres(ql)?$/,
  error: "postgresql:// ile başlayan bir bağlantı adresi olmalı",
});

const serverEnvSchema = z.object({
  // Uygulamanın çalışma anı bağlantısı — Neon'da HAVUZLU (-pooler) adres
  DATABASE_URL: postgresUrl,
  // Migration'ların kullandığı HAVUZSUZ adres; havuzlayıcı DDL çalıştıramaz
  DIRECT_URL: postgresUrl,

  // adım 4b / 4c'de zorunlu olur (Auth.js)
  AUTH_SECRET: optionalSecret,
  AUTH_URL: optionalSecret,
  GOOGLE_CLIENT_ID: optionalSecret,
  GOOGLE_CLIENT_SECRET: optionalSecret,

  // adım 4b'de zorunlu olur (kimlik numarası şifreleme — data-model.md)
  NATIONAL_ID_ENCRYPTION_KEY: optionalSecret,
  NATIONAL_ID_HASH_SALT: optionalSecret,

  // adım 14'te zorunlu olur (bilgi widget'ları)
  NEWS_API_KEY: optionalSecret,
  NEWS_API_PROVIDER: z.enum(["gnews", "newsdata"]).default("gnews"),
  WEATHER_DEFAULT_LAT: z.coerce.number().min(-90).max(90).default(38.4237),
  WEATHER_DEFAULT_LON: z.coerce.number().min(-180).max(180).default(27.1428),

  // adım 13'te zorunlu olur (dosya yükleme)
  BLOB_READ_WRITE_TOKEN: optionalSecret,

  // adım 18'de zorunlu olur (hata takibi)
  SENTRY_DSN: optionalSecret,

  // adım 16'da zorunlu olur (planlı görevler)
  CRON_SECRET: optionalSecret,

  // adım 4b'de zorunlu olur (doğrulama kodu kanalları)
  OTP_EMAIL_CHANNEL: z.enum(["mock", "email"]).default("mock"),
  OTP_PHONE_CHANNEL: z.enum(["mock", "email_sim", "sms"]).default("mock"),
  EMAIL_API_KEY: optionalSecret,
  EMAIL_FROM: optionalSecret,
  SMS_PROVIDER_KEY: optionalSecret,
  TURNSTILE_SECRET_KEY: optionalSecret,

  // Tohumlama okur, hepsi boşsa hesabı atlar (PRD.md §5.0 "Tek gerçek hesap").
  // Uygulama çalışma anında bu değerleri KULLANMAZ; burada yalnızca yazım
  // hatası erken yakalansın diye tanımlılar.
  OWNER_TCKN: optionalSecret,
  OWNER_FULL_NAME: optionalSecret,
  OWNER_EMAIL: optionalSecret,
  OWNER_PHONE: optionalSecret,
  OWNER_BIRTH_DATE: optionalSecret,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Şemayı çalıştırır; hata varsa okunabilir Türkçe mesajla durur.
 * Testlerden de çağrılabilsin diye `process.env`'e değil, verilen nesneye bakar.
 */
export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: unknown,
  scope: string,
): z.infer<T> {
  const result = schema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Ortam değişkenleri eksik veya hatalı (${scope}).\n\n` +
        `${z.prettifyError(result.error)}\n\n` +
        `Yapılacak: .env.example dosyasını .env olarak kopyalayıp eksik değerleri doldurun.\n` +
        `Preview ve production için değerler Vercel panelinden ortam seçilerek girilir.`,
    );
  }

  return result.data;
}

/**
 * Preview dağıtımlarının adresi her dalda değişir, o yüzden elle sabitlenemez.
 * Vercel her dağıtımda `NEXT_PUBLIC_VERCEL_URL` değişkenini kendisi doldurur;
 * açıkça verilmiş bir değer varsa o her zaman kazanır (production kendi alan adını kullanır).
 */
const vercelAppUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : undefined;

export const publicEnvSource = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || vercelAppUrl,
  NEXT_PUBLIC_ENV_LABEL: process.env.NEXT_PUBLIC_ENV_LABEL,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
};

export const publicEnv: PublicEnv = parseEnv(publicEnvSchema, publicEnvSource, "genel");

/**
 * Gizli değerler yalnızca sunucuda okunur. Tarayıcıda `process.env` boştur;
 * eğer bu nesne bir istemci bileşenine sızarsa hata vererek sızıntıyı görünür kılar.
 */
export const serverEnv: ServerEnv =
  typeof window === "undefined"
    ? parseEnv(serverEnvSchema, process.env, "sunucu")
    : (new Proxy({} as ServerEnv, {
        get(_target, key) {
          throw new Error(
            `serverEnv.${String(key)} tarayıcıda okunamaz. ` +
              `Gizli değerler istemciye gönderilmez (docs/standards/05-auth-security.md). ` +
              `Bu değeri sunucu bileşeninde okuyup aşağı prop olarak geçirin.`,
          );
        },
      }) satisfies ServerEnv);

/** Ortam şeridi ve `noindex` kararları bu iki yardımcıdan okunur. */
export const envLabel: EnvLabel = publicEnv.NEXT_PUBLIC_ENV_LABEL;
export const isProductionEnv: boolean = envLabel === "production";

export const __testing = { publicEnvSchema, serverEnvSchema };
