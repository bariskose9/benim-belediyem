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

  /**
   * Sentry hata takibi (adım 18a).
   *
   * ⛔ ZORUNLU DEĞİL ve bu bilinçli: DSN yoksa Sentry sessizce devre dışı
   * kalır, uygulama normal çalışır. Zorunlu olsaydı local ve preview hiç
   * açılmazdı — `EMAIL_API_KEY` ile aynı gerekçe (CLAUDE.md §6.1: `main` her
   * zaman deploy edilebilir kalmalı).
   *
   * ⚠️ ADI `NEXT_PUBLIC_` ÖNEKLİ VE BU SEÇİM DEĞİL, ZORUNLULUK: Vercel'in
   * Sentry entegrasyonu değişkeni tam olarak bu adla enjekte ediyor
   * (`SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` ile birlikte).
   * DSN gizli bir anahtar DEĞİLDİR — tarayıcıya gitmek zorunda, çünkü istemci
   * tarafı hataları da oraya gönderiyor. Kimseye yazma yetkisi vermiyor.
   *
   * ⚠️ `NEXT_PUBLIC_*` değeri DERLEME ANINDA gömülür: panelde tanımlandıktan
   * sonra YENİDEN DAĞITIM gerekir, yoksa tarayıcı tarafı DSN'siz kalır.
   */
  NEXT_PUBLIC_SENTRY_DSN: optionalSecret,
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

const serverEnvBaseSchema = z.object({
  /**
   * Ortam etiketi burada İKİNCİ kez okunuyor ve bu bilinçli: aşağıdaki
   * `superRefine` "production'da sahte kanal kullanılamaz" kuralını uygularken
   * ortamı bilmek zorunda. Şemanın kendi içinde okunması, kuralın testten
   * doğrudan çalıştırılabilmesini sağlıyor (`__testing.serverEnvSchema`).
   */
  NEXT_PUBLIC_ENV_LABEL: z.enum(ENV_LABELS),

  // Uygulamanın çalışma anı bağlantısı — Neon'da HAVUZLU (-pooler) adres
  DATABASE_URL: postgresUrl,
  // Migration'ların kullandığı HAVUZSUZ adres; havuzlayıcı DDL çalıştıramaz
  DIRECT_URL: postgresUrl,

  // adım 4b / 4c'de zorunlu olur (Auth.js)
  AUTH_SECRET: optionalSecret,
  AUTH_URL: optionalSecret,
  GOOGLE_CLIENT_ID: optionalSecret,
  GOOGLE_CLIENT_SECRET: optionalSecret,

  /**
   * Kimlik numarası ve KPS yükü şifreleme anahtarı (data-model.md · ADR-012).
   *
   * ADIM 4b-1'DEN İTİBAREN ZORUNLU. Opsiyonel bırakılsaydı uygulama açılır ama
   * kayıt ucu çalışma anında ham bir kripto hatasıyla 500 dönerdi — sessizce
   * bozuk bir kurulum. `EMAIL_API_KEY`'den farkı şu: e-posta anahtarı üçüncü
   * bir servisten alınır ve meşru olarak henüz elde olmayabilir; bu anahtar
   * `openssl rand -base64 32` ile üretilir ve her ortamda zaten tanımlıdır.
   *
   * 32 baytlık base64 olduğu ayrıca kontrol ediliyor: yanlış uzunluktaki bir
   * değer aksi hâlde ilk kayıt denemesinde patlardı.
   */
  NATIONAL_ID_ENCRYPTION_KEY: z
    .string()
    .trim()
    .refine((value) => Buffer.from(value, "base64").length === 32, {
      error: "32 bayt (base64 kodlu) olmalı. Üretmek için: openssl rand -base64 32",
    }),

  // Takma ad (pseudonym) özetlerinin gizli tuzu. Adım 4a'dan itibaren ZORUNLU:
  // hız sınırı ve denetim kaydı IP adresini bu tuzla özetleyerek saklıyor
  // (ADR-006 → "IP adresi tuzlanmış özet olarak saklanır"). Tuz boşsa özet
  // kaba kuvvetle çözülebilir hale gelirdi, o yüzden opsiyonel bırakılamaz.
  NATIONAL_ID_HASH_SALT: z.string().trim().min(1),

  /**
   * Sahte KPS ucunun paylaşılan gizli anahtarı (ADR-009).
   *
   * ZORUNLU ve opsiyonel DEĞİL: eksikse uygulama açılışta durur. Alternatifi
   * (boşsa korumayı atla) sessizce herkese açık bir kimlik sorgu ucu bırakırdı —
   * depo ve site herkese açık olduğu için bu doğrudan numara taraması demek.
   *
   * 32 karakter alt sınırı tahmin edilebilir bir değerin ("test", "secret")
   * yanlışlıkla kullanılmasını engeller. Üretmek için: openssl rand -base64 32
   */
  MOCK_KPS_API_KEY: z.string().trim().min(32, {
    error: "En az 32 karakter olmalı. Üretmek için: openssl rand -base64 32",
  }),

  /**
   * Bilgi widget'ları (adım 14) — koordinat DIŞINDA hiçbir değişkene ihtiyaç yok.
   *
   * `NEWS_API_KEY` ve `NEWS_API_PROVIDER` KALDIRILDI: haber kaynağı anahtar
   * gerektirmeyen bir RSS akışı (ADR-016), hava/döviz/kripto sağlayıcıları da
   * anahtarsız. Kullanılmayan değişkeni şemada tutmak, sonraki oturuma
   * "bir yere anahtar girilmesi gerekiyor" diye yanlış bir iz bırakırdı.
   *
   * Koordinat yapılandırmada kalıyor: şehir değişirse kod değil ortam değişir.
   * Varsayılan İzmir — üç ortamda da tanımlanmasına gerek yok.
   */
  WEATHER_DEFAULT_LAT: z.coerce.number().min(-90).max(90).default(38.4237),
  WEATHER_DEFAULT_LON: z.coerce.number().min(-180).max(180).default(27.1428),

  // adım 13'te zorunlu olur (dosya yükleme)
  BLOB_READ_WRITE_TOKEN: optionalSecret,

  /**
   * Sentry kaynak haritası yüklemesi (adım 18a) — Vercel entegrasyonu
   * enjekte ediyor, elle girilmiyor.
   *
   * ⛔ ESKİ `SENTRY_DSN` SATIRI SİLİNDİ: DSN artık `NEXT_PUBLIC_SENTRY_DSN`
   * adıyla PUBLIC şemada. Aynı değer için iki ad bırakmak, hangisinin
   * okunduğunu belirsizleştiren bir tuzaktı.
   *
   * Üçü de yalnızca DERLEME sırasında okunuyor; çalışma anında kullanılmıyor.
   * Yoksa kaynak haritası yüklenmez ve Sentry'de yığın izi küçültülmüş
   * (minified) görünür — hata yine yakalanır.
   */
  SENTRY_ORG: optionalSecret,
  SENTRY_PROJECT: optionalSecret,
  SENTRY_AUTH_TOKEN: optionalSecret,

  // adım 16'da zorunlu olur (planlı görevler)
  CRON_SECRET: optionalSecret,

  /**
   * API BELGESİNİ PRODUCTION'DA YAYINLAMA BAYRAĞI (adım 18b · ADR-019).
   *
   * ⛔ VARSAYILAN KAPALI. Bu API kendi arayüzümüzün arka ucu (BFF), üçüncü
   * taraflara sunulan bir ürün değil — belgesi kimseye hizmet etmezken tüm
   * uçları, doğrulama kurallarını ve hata kodlarını taranabilir biçimde
   * sunar (03-api-guidelines.md).
   *
   * Local ve preview'da bayrak OKUNMAZ, belge her hâlükârda açıktır.
   *
   * ⚠️ `z.coerce.boolean()` KULLANILMADI: o, `"false"` dizesini de `true`
   * sayardı ("boş olmayan metin"). Ortam değişkenleri her zaman metindir,
   * yani bu hata sessizce belgeyi canlıda açardı.
   */
  API_DOCS_PUBLIC: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  /**
   * YANIT SÖZLEŞMESİ ÇALIŞMA ANI KONTROLÜ (borç #107 · adım 107a).
   *
   * Açıkken her başarılı yanıt, belgede yazan şemasından GEÇİRİLİR ve
   * uyuşmazlık istisna fırlatır. Amaç belgenin yalan söylediğini testte
   * yakalamak.
   *
   * ⛔ NEDEN GEREKLİ — TypeScript BU İŞİ YAPAMAZ: tip bağı JSON'a hayatta
   * kalmıyor. `Date` alanı derlemede `Date`, telde ISO METİN. Yalnızca tip
   * bağı kursaydık belge tam da bu alanlarda yanlış olurdu ve hiçbir derleme
   * bunu göremezdi.
   *
   * ⛔ NEDEN `NODE_ENV`'E BAĞLANMADI — ÖLÇÜLDÜ: `playwright.config.ts` sunucuyu
   * `next build && next start` ile kaldırıyor, yani E2E **production modunda**
   * koşuyor. `NODE_ENV !== "production"` koşulu, kontrolü en çok işe yarayacağı
   * yerde — 342 E2E testinin tamamında — SESSİZCE kapatırdı. Bayrak bu yüzden
   * ayrı ve açıkça veriliyor (12-factor: yapılandırma ortamdan gelir).
   *
   * ⛔ PRODUCTION'DA KAPALI OLMALI: uyuşmazlık belgenin hatasıdır, kullanıcının
   * değil. Canlıda açık olsaydı yanlış yazılmış bir şema, çalışan bir ucu
   * 500'e çevirirdi.
   */
  API_RESPONSE_CONTRACT_CHECK: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  // adım 4b'de zorunlu olur (doğrulama kodu kanalları)
  OTP_EMAIL_CHANNEL: z.enum(["mock", "email"]).default("mock"),
  OTP_PHONE_CHANNEL: z.enum(["mock", "email_sim", "sms"]).default("mock"),
  EMAIL_API_KEY: optionalSecret,
  EMAIL_FROM: optionalSecret,
  SMS_PROVIDER_KEY: optionalSecret,
  TURNSTILE_SECRET_KEY: optionalSecret,

  /**
   * YASAL SAYFALARDAKİ VERİ SORUMLUSU (adım 17 · PRD §5.10).
   *
   * ⛔ NEDEN KODA YAZILMIYOR: bu iki değer GERÇEK bir kişiyi tanımlar. Depo
   * herkese açık; koda yazılan bir ad ve e-posta adresi sonsuza kadar git
   * geçmişinde kalır ve toplayıcı botlara açık olur. Veri minimizasyonu
   * yalnızca KULLANICININ verisi için değil, proje sahibinin verisi için de
   * geçerlidir (14-privacy-and-compliance.md).
   *
   * ⛔ ZORUNLU DEĞİL, BİLİNÇLİ: eksikse uygulama açılır ve yasal sayfalar
   * başvuru kanalı olarak kaynak kodu deposunu gösterir. Zorunlu olsaydı
   * değişkeni girilmemiş bir ortam hiç açılmazdı — `EMAIL_API_KEY` ile aynı
   * gerekçe (CLAUDE.md §6.1: `main` her zaman deploy edilebilir kalmalı).
   */
  LEGAL_CONTROLLER_NAME: optionalSecret,
  LEGAL_CONTACT_EMAIL: z
    .email({ error: "geçerli bir e-posta adresi olmalı" })
    .optional()
    .or(z.literal("").transform(() => undefined)),

  // Tohumlama okur, hepsi boşsa hesabı atlar (PRD.md §5.0 "Tek gerçek hesap").
  // Uygulama çalışma anında bu değerleri KULLANMAZ; burada yalnızca yazım
  // hatası erken yakalansın diye tanımlılar.
  OWNER_TCKN: optionalSecret,
  OWNER_FULL_NAME: optionalSecret,
  OWNER_EMAIL: optionalSecret,
  OWNER_PHONE: optionalSecret,
  OWNER_BIRTH_DATE: optionalSecret,
});

/**
 * Doğrulama kodu kanallarının ortamla tutarlılığı.
 *
 * Buradaki tek kural bir GÜVENLİK DEĞİŞMEZİdir ve gevşetilemez:
 * `05-auth-security.md` "local ve preview ortamlarında sabit kod kullanılabilir;
 * production'da ASLA" diyor. Sahte kanal kodu ekrana bastığı için, production'da
 * sahte kanal seçilmiş bir dağıtım kodu herkese gösterirdi. Bu yüzden yanlış
 * yapılandırılmış bir production dağıtımının AÇILMAMASI tercih edildi.
 *
 * Buna karşılık `EMAIL_API_KEY` eksikliği açılışı DURDURMAZ. Gerekçe: e-posta
 * anahtarı henüz girilmemişken uygulamanın tamamı açılamasaydı `main` deploy
 * edilemez hale gelir ve CLAUDE.md §6.1 ("main her zaman çalışır ve deploy
 * edilebilir") kırılırdı. Anahtar yoksa yalnızca kayıt ucu 503 döner; anasayfa,
 * sağlık ucu ve diğer sayfalar ayakta kalır.
 */
const serverEnvSchema = serverEnvBaseSchema.superRefine((env, ctx) => {
  if (env.OTP_PHONE_CHANNEL === "sms") {
    ctx.addIssue({
      code: "custom",
      path: ["OTP_PHONE_CHANNEL"],
      message:
        "Gerçek SMS sağlayıcısı bu projede yok (PRD §2 kapsam dışı). " +
        "Kullanılabilir değerler: mock (local/preview) veya email_sim (production).",
    });
  }

  if (env.NEXT_PUBLIC_ENV_LABEL !== "production") {
    return;
  }

  if (env.OTP_EMAIL_CHANNEL === "mock") {
    ctx.addIssue({
      code: "custom",
      path: ["OTP_EMAIL_CHANNEL"],
      message:
        "Production'da sahte kanal kullanılamaz — sahte kanal doğrulama kodunu ekranda gösterir " +
        "(docs/standards/05-auth-security.md). Production'da değer 'email' olmalı.",
    });
  }

  if (env.OTP_PHONE_CHANNEL === "mock") {
    ctx.addIssue({
      code: "custom",
      path: ["OTP_PHONE_CHANNEL"],
      message:
        "Production'da sahte kanal kullanılamaz — sahte kanal doğrulama kodunu ekranda gösterir " +
        "(docs/standards/05-auth-security.md). Production'da değer 'email_sim' olmalı.",
    });
  }

  /**
   * Yanıt sözleşmesi kontrolü production'da AÇILAMAZ (borç #107).
   *
   * Kural yalnızca yorumda kalsaydı bir gün "hata ayıklamak için" açılır ve
   * yanlış yazılmış tek bir şema, çalışan bir ucu gerçek kullanıcıya 500
   * döndürürdü. Bayrak yanlış ortamda verilirse dağıtım açılmıyor.
   */
  if (env.API_RESPONSE_CONTRACT_CHECK) {
    ctx.addIssue({
      code: "custom",
      path: ["API_RESPONSE_CONTRACT_CHECK"],
      message:
        "Yanıt sözleşmesi kontrolü production'da açılamaz — şema uyuşmazlığı belgenin hatasıdır, " +
        "kullanıcının değil. Bayrak yalnızca local, test ve E2E ortamlarında 'true' olur.",
    });
  }
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
 * Preview dağıtımlarının adresi elle sabitlenemez, Vercel iki aday sunar:
 *
 *   `NEXT_PUBLIC_VERCEL_BRANCH_URL` → `...-git-<dal>-....vercel.app`, DAL BOYUNCA SABİT
 *   `NEXT_PUBLIC_VERCEL_URL`        → `...-<rastgele>-....vercel.app`, HER DAĞITIMDA DEĞİŞİR
 *
 * ÖNCE DAL ADRESİ. Sebebi Google OAuth: `redirect_uri`, sağlayıcı panelindeki
 * listeyle karakteri karakterine eşleşmek zorunda. Dağıtım adresi her commit'te
 * değiştiği için panele önceden yazılamaz ve akış `redirect_uri_mismatch` ile
 * ölür (2026-08-02'de adım 4c'de yaşandı). Aynı gerekçe Cloudflare Turnstile'ın
 * hostname listesi için de geçerli.
 *
 * Açıkça verilmiş `NEXT_PUBLIC_APP_URL` her zaman kazanır — production kendi
 * alan adını kullanır ve bu mantığa hiç girmez.
 */
export function resolveVercelAppUrl(env: {
  branchHost?: string;
  deploymentHost?: string;
}): string | undefined {
  const host = env.branchHost || env.deploymentHost;

  return host ? `https://${host}` : undefined;
}

const vercelAppUrl = resolveVercelAppUrl({
  branchHost: process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL,
  deploymentHost: process.env.NEXT_PUBLIC_VERCEL_URL,
});

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
