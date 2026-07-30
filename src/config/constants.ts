/**
 * Sihirli sayı ve sabit metinler koda gömülmez, buradan okunur
 * (docs/standards/02-coding-standards.md).
 */

/** Biçimlendirme yerel ayarı — para, tarih ve sıralama bunu kullanır. */
export const LOCALE = "tr-TR" as const;

/**
 * Ekranda gösterilen saat dilimi. Veritabanında her zaman UTC saklanır;
 * sunucunun kendi saat dilimine güvenilmez (docs/standards/02-coding-standards.md).
 */
export const DISPLAY_TIME_ZONE = "Europe/Istanbul" as const;

/** Para birimi — hesaplama kuruş cinsinden tam sayı ile yapılır, float ile asla. */
export const CURRENCY = "TRY" as const;

/**
 * Sürüm bilgisi — `/api/health` bunu döner.
 *
 * `package.json` içe aktarmak yerine sabit tutuluyor: JSON içe aktarımı tüm
 * bağımlılık listesini paketin içine gömer ve sürüm bilgisi için bu gereksiz.
 * Sürüm yükseltilirken `package.json` ile birlikte burası da güncellenir.
 */
export const APP_VERSION = "0.1.0" as const;

/**
 * Hangi commit'in yayında olduğu — duman testinde "yeni sürüm gerçekten çıktı mı"
 * sorusunu cevaplar. Vercel bu değişkeni her dağıtımda kendisi doldurur.
 */
export const BUILD_COMMIT: string = (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7);
