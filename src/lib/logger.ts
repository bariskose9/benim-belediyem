import { redact } from "@/lib/log-redact";

/**
 * Yapılandırılmış (JSON) log — docs/standards/12-operations-and-scaling.md.
 *
 * ⛔ NEDEN JSON: Vercel'in çalışma zamanı log'u ve Sentry, satırları metin
 * olarak değil alan olarak arayabiliyor. Düz metin bir satırda "hangi
 * kullanıcı" veya "hangi olay" diye süzmek mümkün değil; adım 18'den önce
 * 35 ayrı `console.error` tam olarak bu yüzden işe yaramıyordu.
 *
 * ⛔ HER ŞEY `redact()`TEN GEÇER. Kural CLAUDE.md §5.11: log'a şifre, jeton,
 * kart ve kimlik numarası yazılmaz. Süzgeç çağıranın insafına bırakılmadı —
 * unutulabilecek bir adım, unutulur.
 */

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogContext = Record<string, unknown>;

/**
 * Ortam etiketi `@/config/env` yerine DOĞRUDAN okunuyor ve bu bilinçli.
 *
 * `@/config/env` içe aktarıldığı anda tüm sunucu değişkenlerini doğruluyor ve
 * eksik bir değişkende FIRLATIYOR. Log katmanı, gözlemlediği uygulamayı
 * düşürebilecek son yer olmalı: yapılandırma hatasını RAPORLAMASI beklenen
 * modülün, o hata yüzünden açılamaması sessiz bir körlük üretirdi.
 */
const envLabel = process.env.NEXT_PUBLIC_ENV_LABEL ?? "local";

/** `debug` yalnızca local'de yazılır (standart §12: "sadece local"). */
const MIN_LEVEL: LogLevel = envLabel === "local" ? "debug" : "info";

function isLevelEnabled(level: LogLevel): boolean {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(MIN_LEVEL);
}

/**
 * Hata takibine (Sentry) giden ikinci kanal.
 *
 * ⛔ NEDEN DOĞRUDAN `import * as Sentry` DEĞİL: bu modül hem sunucuda hem
 * tarayıcıda, hem de birim testlerinde çalışıyor. Sentry'yi doğrudan içe
 * aktarmak testlere kurulum yükü bindirir ve Sentry hiç kurulmamışken log
 * katmanını çalışamaz hale getirirdi. Kayıt `instrumentation` dosyalarından
 * yapılıyor; kaydedilmemişse log yalnızca stdout'a gider ve uygulama çalışır.
 */
export type LogSink = (entry: {
  level: LogLevel;
  event: string;
  context: LogContext;
  error?: unknown;
}) => void;

let sink: LogSink | undefined;

export function setLogSink(next: LogSink | undefined): void {
  sink = next;
}

/**
 * Projedeki TEK izinli `console` kullanımı — muafiyet `eslint.config.mjs`
 * içinde bu DOSYAYA verildi. Başka bir yerde `console` çağırmak lint hatası;
 * o satır süzgeci de (`redact`) Sentry iletimini de atlardı.
 *
 * Seviye başına ayrı metot: Vercel ve çoğu log toplayıcı `stderr` ile
 * `stdout`u ayırıyor, tek bir `console.log` her şeyi aynı akışa yığardı.
 */
const CONSOLE_BY_LEVEL: Record<LogLevel, (message: string) => void> = {
  debug: (message) => console.debug(message),
  info: (message) => console.info(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
};

function write(level: LogLevel, event: string, context: LogContext = {}): void {
  if (!isLevelEnabled(level)) {
    return;
  }

  const safeContext = redact(context) as LogContext;

  /**
   * Ayrılmış alanlar EN SONA yazılıyor: bağlamda yanlışlıkla bir `level` veya
   * `event` alanı varsa log satırının kendi kimliğini ezmesin.
   */
  const entry = {
    ...safeContext,
    ts: new Date().toISOString(),
    level,
    event,
    env: envLabel,
  };

  let line: string;

  try {
    line = JSON.stringify(entry);
  } catch {
    // Serileştirme patlarsa log satırı kaybolmasın: olay adı her zaman gitsin.
    line = JSON.stringify({ ts: entry.ts, level, event, env: envLabel, note: "bağlam yazılamadı" });
  }

  CONSOLE_BY_LEVEL[level](line);

  if (sink && (level === "error" || level === "warn")) {
    try {
      sink({ level, event, context: safeContext, error: context.error });
    } catch {
      // Hata takibinin kendisi patlarsa uygulama etkilenmemeli — log zaten yazıldı.
    }
  }
}

export const logger = {
  debug: (event: string, context?: LogContext) => write("debug", event, context),
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) => write("error", event, context),
};

/**
 * İstek kimliği — standart §12 her log satırında istiyor.
 *
 * Vercel her isteğe `x-vercel-id` başlığı koyuyor; local'de bu başlık yok ve
 * `undefined` dönmesi doğru davranış (uydurma bir kimlik iki isteği
 * birbirine bağlarmış gibi görünürdü).
 *
 * ⚠️ Bu değer ÇAĞIRAN tarafından geçilmek zorunda: Next.js'te ambient bir
 * istek bağlamı yok ve onu kurmak (AsyncLocalStorage + ara katman) her route'a
 * dokunmayı gerektirirdi — CLAUDE.md §7 "aynı anda tek modül". Teknik borç.
 */
export function readRequestId(headers: Headers): string | undefined {
  return headers.get("x-vercel-id") ?? undefined;
}
