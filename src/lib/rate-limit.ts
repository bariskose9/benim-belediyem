import { serverEnv } from "@/config/env";
import { hashPseudonym } from "@/lib/crypto";
import { prisma } from "@/lib/db";

/**
 * Hız sınırı sayacı — Postgres üzerinde (ADR-006).
 *
 * NEDEN VERİTABANI: uygulama Vercel'de sunucusuz çalışıyor. Bellekteki bir
 * sayaç hiçbir şey saymaz, çünkü her istek ayrı bir örneğe düşebilir ve örnek
 * istek bitince yok olur. Saldırgan yeterince istek atarsa her seferinde
 * "sıfırdan başlamış" bir sayaca denk gelir — koruma sağladığı SANILIR.
 *
 * PENCERE MODELİ: sabit pencere (fixed window). Her pencere `windowMs`'in tam
 * katlarına hizalanır, böylece eşzamanlı iki istek aynı satırı hedefler ve
 * `unique(key, windowStartedAt)` ikinci bir sayaç satırı açılmasını engeller.
 * Kayan pencereye göre kaba ama tek sorguda ve yarış koşulusuz çalışıyor;
 * bu ölçekte doğru takas (04-database.md → "parametreli tek sorgu").
 */

export type RateLimitDecision = {
  allowed: boolean;
  /** Pencerenin bittiği an — çağıran "ne zaman tekrar dene" hesaplayabilsin diye. */
  resetAt: Date;
};

export type ConsumeRateLimitInput = {
  /**
   * Sayaç anahtarı. KİŞİSEL VERİ İÇEREMEZ (ADR-006): kimlik numarası, düz IP
   * veya e-posta buraya yazılmaz. Anahtarı `rateLimitKey` ile üretin.
   */
  key: string;
  limit: number;
  windowMs: number;
  /** Testlerin sahte saatle çalışabilmesi için dışarıdan verilebilir. */
  now?: Date;
};

/**
 * Sayacı bir artırır ve limitin aşılıp aşılmadığını söyler.
 *
 * ÖNEMLİ: bu fonksiyon KULLANICI DENEMESİ başına bir kez çağrılır, dış servise
 * giden HTTP çağrısı başına DEĞİL. Bir denemenin içindeki yeniden denemeler
 * sayacı artırırsa 5 deneme/15 dakika bütçesi üçte bir sürede tükenir ve
 * korumanın kendisi kullanıcıyı kilitleyen bir arızaya dönüşür.
 */
export async function consumeRateLimit({
  key,
  limit,
  windowMs,
  now = new Date(),
}: ConsumeRateLimitInput): Promise<RateLimitDecision> {
  const windowStartedAt = alignWindowStart(now, windowMs);

  // Tek atomik UPSERT: satır yoksa 1'le açılır, varsa yerinde artırılır.
  // Önce okuyup sonra yazmak yarış koşulu yaratırdı — iki eşzamanlı istek
  // aynı sayacı okuyup ikisi de 1 yazardı.
  const counter = await prisma.rateLimitCounter.upsert({
    where: { key_windowStartedAt: { key, windowStartedAt } },
    create: { key, windowStartedAt, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  return {
    allowed: counter.count <= limit,
    resetAt: new Date(windowStartedAt.getTime() + windowMs),
  };
}

/**
 * Sayacı ARTIRMADAN okur.
 *
 * Neden gerekli: giriş ekranında "2 başarısız denemeden sonra bot doğrulaması"
 * (PRD §5.0) kuralı, denemeyi saymadan önce "şu ana kadar kaç kez başarısız
 * olmuş" sorusunu sormak zorunda. `consumeRateLimit` ile sorulsaydı sorunun
 * kendisi cevabı değiştirirdi.
 *
 * Aynı pencere hizalamasını kullanır; ayrı bir sayaç mekanizması DEĞİLDİR.
 */
export async function peekRateLimit(
  key: string,
  windowMs: number,
  now = new Date(),
): Promise<number> {
  const counter = await prisma.rateLimitCounter.findUnique({
    where: { key_windowStartedAt: { key, windowStartedAt: alignWindowStart(now, windowMs) } },
    select: { count: true },
  });

  return counter?.count ?? 0;
}

/**
 * Pencere başlangıcını `windowMs`'in tam katına yuvarlar.
 *
 * Hizalama şart: her istek kendi başlangıç anını yazsaydı, her istek yeni bir
 * satır açar ve sayaç hiçbir zaman 1'i geçmezdi — sınır hiç tetiklenmezdi.
 */
function alignWindowStart(now: Date, windowMs: number): Date {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

/** Sayacı sıfırlar. Devre kesici "başarılı çağrıdan sonra unut" için kullanır. */
export async function resetRateLimit(key: string): Promise<void> {
  await prisma.rateLimitCounter.deleteMany({ where: { key } });
}

/**
 * Anahtarın hangi tanımlayıcıya bağlandığı.
 *
 * `destination` = doğrulama kodunun gönderildiği e-posta veya telefon.
 * "Aynı hedefe 3 kod / 15 dakika" kuralı (05-auth-security.md) bunu kullanır.
 *
 * `user` = giriş yapmış kullanıcının kimliği. Girişli akışlarda IP yerine bunu
 * kullanmak gerekebiliyor: personele özel hizmetlerde (PRD §5.1, §5.6) tüm
 * kullanıcılar aynı kurumun ağından, tek bir dış IP'nin arkasından girebilir
 * ve IP bazlı bir sayaç onları birbirinin bütçesinden yerdi.
 */
export type RateLimitKind = "ip" | "session" | "destination" | "user";

/**
 * Anahtar üretir: `<amaç>:<tür>:<değer>`.
 *
 * IP adresi ve gönderim hedefi (e-posta / telefon) kişisel veridir ve düz
 * haliyle saklanmaz; tuzlanmış özete çevrilir (ADR-006 → "anahtar kişisel veri
 * içermez"). Oturum kimliği zaten rastgele bir jetondur, kişiye dair bilgi
 * taşımaz, olduğu gibi kullanılır.
 *
 * KULLANICI KİMLİĞİ DE ÖZETLENİR. Tek başına rastgele bir cuid'dir, ama
 * `users` tablosundaki satıra doğrudan işaret eder: düz yazılsaydı
 * `rate_limit_counters` tablosunu okuyan biri hangi hesabın ne zaman ne yaptığını
 * çıkarabilirdi. Özet bu bağı koparır, sayaç yine doğru çalışır.
 */
export function rateLimitKey(purpose: string, kind: RateLimitKind, value: string): string {
  const safeValue =
    kind === "ip"
      ? hashActorIp(value)
      : kind === "destination"
        ? hashDestination(value)
        : kind === "user"
          ? hashUserId(value)
          : value;

  return `${purpose}:${kind}:${safeValue}`;
}

/** Kullanıcı kimliğinin geri döndürülemez özeti — sayaç anahtarı için. */
export function hashUserId(userId: string): string {
  return hashPseudonym(userId, serverEnv.NATIONAL_ID_HASH_SALT, "user");
}

/** IP adresinin geri döndürülemez özeti — denetim kaydı da bunu yazar. */
export function hashActorIp(ip: string): string {
  return hashPseudonym(ip, serverEnv.NATIONAL_ID_HASH_SALT, "ip");
}

/**
 * Gönderim hedefinin (e-posta / telefon) geri döndürülemez özeti.
 *
 * `otp_challenges.destination_hash` ile AYNI fonksiyondan üretilir: aynı hedefe
 * gönderilen kodlar hem tabloda hem sayaçta aynı değere düşmezse "aynı hedefe
 * 3 kod" kuralı iki farklı hedefi sayıyor sanır ve hiç tetiklenmez.
 *
 * E-posta önce küçük harfe çevrilip kırpılır — `Ali@X.com` ile `ali@x.com`
 * aynı posta kutusudur ve iki ayrı bütçe almamalıdır.
 */
export function hashDestination(destination: string): string {
  return hashPseudonym(
    destination.trim().toLowerCase(),
    serverEnv.NATIONAL_ID_HASH_SALT,
    "destination",
  );
}

/**
 * İsteği atan IP'yi okur.
 *
 * `x-forwarded-for` birden fazla adres taşıyabilir (`istemci, vekil1, vekil2`);
 * EN SOLDAKİ istemcidir. Başlığın tamamını anahtar yapmak, araya bir vekil
 * eklendiğinde anahtarı değiştirir ve saldırganın sayacı sıfırlamasına yol açar.
 *
 * Başlık hiç yoksa sabit bir yer tutucu döner: IP okunamadı diye hız sınırını
 * TAMAMEN atlamak, korumayı "başlığı sil, serbest kal" ile devre dışı bırakılır
 * hale getirirdi. Yer tutucu tersine hepsini tek sayaca toplar — sıkı taraf.
 */
export function readActorIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();

  return first || headers.get("x-real-ip")?.trim() || "unknown";
}
