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

/**
 * Sağlık ucunun veritabanı kontrolü için üst sınır.
 *
 * Kısa tutuluyor: cevap vermeyen bir veritabanında sağlık ucu askıda kalırsa
 * izleme aracı "yavaş" ile "çökmüş" arasındaki farkı göremez.
 */
export const HEALTH_DB_TIMEOUT_MS = 3_000;

// ===========================================================================
// SAHTE KPS — dış servis simülasyonu (PRD §5.0 "Mimari" · ADR-003)
//
// İki taraf var ve sayılar bilerek ayrı gruplanmış:
//   · MOCK_*      → sahte servisin KENDİ davranışı (gecikme, hata üretimi)
//   · KPS_*       → servisi ÇAĞIRAN tarafın dayanıklılık kuralları
// Bu ayrım korunmazsa yeniden deneme mock'un içine düşer ve anlamsızlaşır.
// ===========================================================================

/** Sahte servisin yapay gecikme aralığı (PRD §5.0: 200–800 ms). */
export const MOCK_KPS_MIN_DELAY_MS = 200;
export const MOCK_KPS_MAX_DELAY_MS = 800;

/**
 * `simulationBehavior = timeout` kayıtlarında mock'un beklediği süre.
 *
 * Çağıranın 3 sn'lik sınırından belirgin şekilde uzun: aradaki fark yeterince
 * açık olmazsa test bazen zaman aşımı, bazen başarı görür ve kararsızlaşır.
 */
export const MOCK_KPS_TIMEOUT_DELAY_MS = 6_000;

/** Gizli anahtarın taşındığı başlık (ADR-009). Değer log'a yazılmaz. */
export const MOCK_KPS_API_KEY_HEADER = "x-mock-kps-key";

/** Çağıranın zaman aşımı (PRD §5.0). Bu süreden uzun yanıt beklenmez. */
export const KPS_REQUEST_TIMEOUT_MS = 3_000;

/**
 * En fazla 2 yeniden deneme (CLAUDE.md §5.9), yani en kötü hâlde 3 çağrı.
 * Sadece zaman aşımı ve sunucu hatası tekrarlanır; iş sonuçları tekrarlanmaz.
 */
export const KPS_MAX_RETRIES = 2;

/** Üstel geri çekilme tabanı: 1. tekrar 250 ms, 2. tekrar 500 ms bekler. */
export const KPS_RETRY_BACKOFF_MS = 250;

/**
 * Devre kesici (ADR-010): pencere içinde bu kadar hata birikirse devre açılır
 * ve soğuma süresince sahte KPS hiç çağrılmaz.
 */
export const KPS_BREAKER_FAILURE_THRESHOLD = 5;
export const KPS_BREAKER_WINDOW_MS = 60_000;
export const KPS_BREAKER_COOLDOWN_MS = 30_000;

/** Hız sınırı: 5 deneme / 15 dakika, IP + oturum bazlı (ADR-006, PRD §5.0). */
export const KPS_RATE_LIMIT_MAX_ATTEMPTS = 5;
export const KPS_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

/**
 * Numara taraması koruması: kimlik sorgusunun çağırana dönüş süresi bu tabana
 * doldurulur. "Bulundu", "eşleşmedi" ve "bulunamadı" böylece AYNI sürer —
 * saldırgan zamanlamadan numaranın kayıtlı olup olmadığını çıkaramaz
 * (05-auth-security.md → "yanıt süresi sabitlenir").
 *
 * Mock'un en yavaş normal yanıtından (800 ms) belirgin şekilde büyük olmalı,
 * yoksa doldurma bazı çağrılarda hiç devreye girmez ve fark yeniden açılır.
 */
export const KPS_CONSTANT_RESPONSE_MS = 1_500;
