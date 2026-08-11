/**
 * Log'a ve hata takibine giden HER değerin geçtiği tek süzgeç
 * (docs/standards/12-operations-and-scaling.md · CLAUDE.md §5.11).
 *
 * ⛔ NEDEN TEK YER: kural iki ayrı yerde yaşarsa biri güncellenir, diğeri
 * geride kalır. Sunucu log'u ve Sentry aynı `redact()` çağrısından geçiyor;
 * yeni bir hassas alan eklendiğinde iki tarafı birden kapatıyor.
 *
 * İKİ BAĞIMSIZ SAVUNMA VAR ve ikisi de gerekli:
 *
 *  1. **Alan adına göre** — `{ password: "..." }` gizlenir. Yapılandırılmış
 *     bağlamı (bizim yazdığımız log alanlarını) kapatır.
 *  2. **Değerin biçimine göre** — serbest metnin İÇİNDEKİ kimlik numarası,
 *     kart numarası, e-posta ve jeton gizlenir.
 *
 * ⭐ İKİNCİSİ OLMADAN BORÇ #79 KAPANMAZ. Prisma bir doğrulama hatası
 * fırlattığında argüman nesnesinin TAMAMINI hata METNİNİN içine düz yazı
 * olarak koyuyor — yani ad soyad, doğum tarihi ve kimlik numarası bir alan
 * adının arkasında değil, cümlenin ortasında duruyor. Alan adına bakan bir
 * süzgeç oradan hiçbir şey yakalayamaz.
 */

export const REDACTED = "[gizlendi]";

/** Log satırı bir hatayı gizlemesin diye: derin nesneler kırpılır, silinmez. */
const MAX_DEPTH = 5;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 40;
const MAX_STRING_LENGTH = 512;
/** Stack trace'in tamamı log'u boğuyor; ilk kareler sebebi zaten gösteriyor. */
const MAX_STACK_LINES = 12;

/**
 * Adı ne olursa olsun gizlenecek alanlar.
 *
 * Bunlar TAM EŞLEŞME ile aranıyor çünkü parça olarak aransalardı masum
 * alanları da yutarlardı: `ip` → `recipe`/`description`, `pan` → `panel`.
 */
const SENSITIVE_KEYS_EXACT = new Set([
  "ip",
  "ipaddress",
  "clientip",
  "remoteaddr",
  "xforwardedfor",
  "pan",
  "cvv",
  "cvc",
  "iban",
  "dsn",
  "otp",
  "kod",
]);

/**
 * Alan adının İÇİNDE geçtiğinde gizlenecek parçalar.
 *
 * `code` bilerek YOK: `AppError.code` (`VALIDATION_ERROR`) tam da log'da
 * görmek istediğimiz şey. Doğrulama kodu için özel adlar aşağıda.
 */
const SENSITIVE_KEY_PARTS = [
  "password",
  "sifre",
  "parola",
  "passphrase",
  "token",
  "secret",
  "apikey",
  "authorization",
  "cookie",
  "credential",
  "privatekey",
  "otpcode",
  "verificationcode",
  "dogrulamakodu",
  "cardnumber",
  "cardnum",
  "email",
  "eposta",
  "mail",
  "phone",
  "telefon",
  "gsm",
  "msisdn",
  "fullname",
  "firstname",
  "lastname",
  "givenname",
  "surname",
  "adsoyad",
  "address",
  "adres",
  "birthdate",
  "birthyear",
  "dogumtarihi",
  "dogumyili",
  "hash",
  "salt",
];

/**
 * Alan adı hangi biçimde yazılmış olursa olsun aynı görünsün diye
 * (`national_id`, `nationalId`, `NATIONAL-ID` → `nationalid`).
 */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Kimlik numarası, adı ne olursa olsun gizlenir — `...Id` muafiyeti (aşağıda)
 * bu üçünü kapsamamalı.
 */
const ALWAYS_SENSITIVE_PARTS = ["nationalid", "tckn", "tckimlik", "kimlikno"];

export function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);

  if (ALWAYS_SENSITIVE_PARTS.some((part) => normalized.includes(part))) {
    return true;
  }

  if (SENSITIVE_KEYS_EXACT.has(normalized)) {
    return true;
  }

  /**
   * `...Id` ile biten alanlar MUAF.
   *
   * Gerekçe: `addressId` ve `emailChallengeId` birer yabancı anahtar, kişisel
   * veri değil — ve bir arızayı takip ederken ihtiyaç duyulan tam olarak o
   * kimlikler. Muafiyet olmasaydı süzgeç, log'u okunamaz hale getirerek
   * kendi amacını baltalardı. Yukarıdaki üç kimlik numarası bu muafiyetin
   * DIŞINDA tutuldu.
   */
  if (normalized.endsWith("id")) {
    return false;
  }

  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
}

/**
 * Serbest metnin içindeki hassas dizileri gizler.
 *
 * ⭐ KISMÎ EŞLEŞMEYİ ÖNLEYEN ŞEY SIRA DEĞİL, LOOKAROUND'LAR.
 *
 * İlk sürümde "kart numarası önce aranmalı, yoksa 16 hanenin ilk 11'i kimlik
 * sanılır" yazıyordu. **Sıra bilerek ters çevrilip ölçüldü ve testler yeşil
 * kaldı** — yani o gerekçe yanlıştı. Gerçek koruma `(?<!\d)` ve `(?!\d)`:
 * 11 hanelik desen, daha uzun bir rakam dizisinin İÇİNDE hiç eşleşmiyor,
 * hangi sırada denendiğinden bağımsız olarak.
 *
 * `\b` bu işi yapamazdı: iki rakam arasında sınır görmediği için uzun bir
 * sayının ortasından 11 hane kesip yanlış eşleşme üretirdi.
 *
 * Sıra yine de anlamlı olabilir — yeni bir desen eklendiğinde lookaround'lar
 * onu kapsamayabilir. Yeni desen eklerken bu dosyanın testine, iki komşu
 * desenin birbirini kesmediğini gösteren bir vaka ekle.
 */
const VALUE_PATTERNS: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
  // JWT / imzalı jeton
  { pattern: /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g, replacement: REDACTED },
  // "Authorization: Bearer <jeton>"
  { pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, replacement: `Bearer ${REDACTED}` },
  // Kart numarası: 13-19 hane, araya boşluk veya tire girebilir
  { pattern: /(?<![\d-])(?:\d[ -]?){12,18}\d(?![\d-])/g, replacement: REDACTED },
  // Türkiye cep telefonu: 5xx xxx xx xx, başında 0 veya +90 olabilir
  {
    pattern: /(?<!\d)(?:\+90|0)?5\d{2}[ -]?\d{3}[ -]?\d{2}[ -]?\d{2}(?!\d)/g,
    replacement: REDACTED,
  },
  // T.C. kimlik numarası: 11 hane, sıfırla başlamaz
  { pattern: /(?<!\d)[1-9]\d{10}(?!\d)/g, replacement: REDACTED },
  // E-posta adresi
  { pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replacement: REDACTED },
];

export function redactString(value: string): string {
  let output = value;

  for (const { pattern, replacement } of VALUE_PATTERNS) {
    // `g` bayraklı düzenli ifadeler `lastIndex` taşıdığı için her çağrıda
    // sıfırlanmalı; yoksa ikinci çağrı metnin ortasından aramaya başlar.
    pattern.lastIndex = 0;
    output = output.replace(pattern, replacement);
  }

  return output.length > MAX_STRING_LENGTH
    ? `${output.slice(0, MAX_STRING_LENGTH)}…[kırpıldı]`
    : output;
}

function redactStack(stack: string): string {
  const lines = stack.split("\n");
  const kept = lines.slice(0, MAX_STACK_LINES).join("\n");

  return redactString(kept);
}

/**
 * Hata nesnesini log'lanabilir düz bir nesneye çevirir.
 *
 * `cause` zinciri takip ediliyor: `InternalError` orijinal hatayı orada
 * taşıyor ve arızanın gerçek sebebi genelde en dipte.
 */
function redactError(error: Error, depth: number, seen: WeakSet<object>): Record<string, unknown> {
  const output: Record<string, unknown> = {
    name: error.name,
    message: redactString(error.message),
  };

  if (error.stack) {
    output.stack = redactStack(error.stack);
  }

  /**
   * Prisma hataları alan değerlerini `meta` içinde taşıyor; standart `Error`
   * alanları dışındaki her şey de süzgeçten geçirilerek ekleniyor.
   */
  for (const key of Object.keys(error)) {
    if (key === "name" || key === "message" || key === "stack" || key === "cause") {
      continue;
    }

    output[key] = isSensitiveKey(key)
      ? REDACTED
      : redactValue((error as unknown as Record<string, unknown>)[key], depth + 1, seen);
  }

  if (error.cause !== undefined && error.cause !== null) {
    output.cause = redactValue(error.cause, depth + 1, seen);
  }

  return output;
}

function redactValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return redactString(value);
  }

  /**
   * Sayılar olduğu gibi geçiyor ve bu bilinçli bir kabul.
   *
   * 11 haneli bir sayıyı gizlemek zaman damgalarını, tutarları (kuruş) ve
   * sayaçları da yutardı — yani log'un işe yarayan kısmını. Sayı olarak
   * taşınan kimlik numarası alan ADINDAN yakalanıyor; bu projede kimlik
   * numarası zaten hiçbir yerde `number` olarak tutulmuyor.
   */
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return typeof value === "bigint" ? value.toString() : value;
  }

  if (typeof value === "function" || typeof value === "symbol") {
    return `[${typeof value}]`;
  }

  if (depth >= MAX_DEPTH) {
    return "[derinlik sınırı]";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[döngüsel]";
    }

    seen.add(value);

    if (value instanceof Error) {
      return redactError(value, depth, seen);
    }

    if (Array.isArray(value)) {
      const items = value
        .slice(0, MAX_ARRAY_ITEMS)
        .map((item) => redactValue(item, depth + 1, seen));

      return value.length > MAX_ARRAY_ITEMS
        ? [...items, `…${value.length - MAX_ARRAY_ITEMS} kayıt daha`]
        : items;
    }

    const entries = Object.entries(value as Record<string, unknown>);
    const output: Record<string, unknown> = {};

    for (const [key, entryValue] of entries.slice(0, MAX_OBJECT_KEYS)) {
      output[key] = isSensitiveKey(key) ? REDACTED : redactValue(entryValue, depth + 1, seen);
    }

    if (entries.length > MAX_OBJECT_KEYS) {
      output["…"] = `${entries.length - MAX_OBJECT_KEYS} alan daha`;
    }

    return output;
  }

  return String(value);
}

/**
 * Dışarıya açık tek giriş noktası.
 *
 * `WeakSet` her çağrıda yeniden kuruluyor: paylaşılsaydı ikinci log satırı,
 * ilk satırda görülen nesneleri "döngüsel" sanardı.
 */
export function redact(value: unknown): unknown {
  return redactValue(value, 0, new WeakSet());
}
