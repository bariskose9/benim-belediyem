import { prisma } from "@/lib/db";

/**
 * Devre kesici — durum Postgres'te, `rate_limit_counters` tablosunda (ADR-010).
 *
 * NE İŞE YARAR: dış servis üst üste hata veriyorsa her istekte yeniden denemek
 * hem kullanıcıyı bekletir hem çöken servisi büsbütün boğar. Devre "açıldığında"
 * çağrı hiç yapılmaz, anında "servis erişilemiyor" dönülür; soğuma süresi
 * dolunca kendiliğinden yeniden denenir.
 *
 * NEDEN BELLEKTE DEĞİL: ADR-006'daki gerekçenin aynısı — sunucusuz ortamda her
 * istek ayrı örneğe düşebilir, bellekteki sayaç hiçbir şey saymaz.
 *
 * NEDEN "ARDIŞIK" DEĞİL "PENCERE İÇİNDE": ardışıklığı takip etmek her isteğin
 * sırasını bilmeyi gerektirir; sunucusuzda istekler paralel örneklere dağıldığı
 * için sıra zaten güvenilir değildir. "Son bir dakikada 5 hata" ölçütü aynı işi
 * tek atomik sayaçla ve yarış koşulusuz yapar.
 */

/** Sayaç satırları hız sınırıyla aynı tabloda; ön ek ikisini ayırır. */
const BREAKER_PREFIX = "circuit";

export type CircuitBreakerOptions = {
  /** Devrenin adı, örn. "mock-kps". Anahtarda kullanılır, kişisel veri içermez. */
  name: string;
  failureThreshold: number;
  windowMs: number;
  cooldownMs: number;
  /** Testlerin sahte saatle çalışabilmesi için dışarıdan verilebilir. */
  now?: Date;
};

/**
 * Devre şu an açık mı? Açıksa çağrı YAPILMAMALIDIR.
 *
 * Açılma anı ayrıca kaydedilmiyor: eşiğe ulaşan sayaç satırının kendi penceresi
 * zaten "ne zaman doldu" bilgisini taşıyor, soğuma o andan itibaren sayılıyor.
 */
export async function isCircuitOpen(options: CircuitBreakerOptions): Promise<boolean> {
  const now = options.now ?? new Date();
  const counter = await prisma.rateLimitCounter.findFirst({
    where: {
      key: breakerKey(options.name),
      // Soğumadan eski satırlar kararı etkilemez; yalnızca yakın geçmiş sayılır.
      windowStartedAt: { gte: new Date(now.getTime() - options.windowMs) },
    },
    orderBy: { windowStartedAt: "desc" },
    select: { count: true, updatedAt: true },
  });

  if (!counter || counter.count < options.failureThreshold) return false;

  // Eşik aşılmış. Soğuma dolduysa devre yeniden kapanır ("half-open"):
  // bir sonraki çağrıya izin verilir, başarılıysa sayaç sıfırlanır.
  return now.getTime() - counter.updatedAt.getTime() < options.cooldownMs;
}

/** Başarısız çağrıdan sonra çağrılır — hata sayacını bir artırır. */
export async function recordCircuitFailure(options: CircuitBreakerOptions): Promise<void> {
  const now = options.now ?? new Date();
  const windowStartedAt = alignWindowStart(now, options.windowMs);
  const key = breakerKey(options.name);

  await prisma.rateLimitCounter.upsert({
    where: { key_windowStartedAt: { key, windowStartedAt } },
    create: { key, windowStartedAt, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
}

/**
 * Başarılı çağrıdan sonra çağrılır — sayaç silinir, devre tamamen kapanır.
 * Bu olmadan geçmiş hatalar sonsuza kadar birikir ve sağlıklı bir servisi
 * pencere sınırında haksız yere kesebilirdi.
 */
export async function recordCircuitSuccess(
  options: Pick<CircuitBreakerOptions, "name">,
): Promise<void> {
  await prisma.rateLimitCounter.deleteMany({ where: { key: breakerKey(options.name) } });
}

function breakerKey(name: string): string {
  return `${BREAKER_PREFIX}:${name}`;
}

function alignWindowStart(now: Date, windowMs: number): Date {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}
