import {
  CONSENT_RATE_LIMIT_MAX,
  CONSENT_RATE_LIMIT_WINDOW_MS,
  COOKIE_NOTICE_VERSION,
} from "@/config/constants";
import { ConsentRateLimitedError } from "@/features/legal/errors";
import {
  appendConsentRecord,
  findLatestConsent,
  linkAnonymousConsentsToUser,
  type ConsentSubject,
} from "@/features/legal/repositories/consent.repository";
import { ConsentType } from "@/generated/prisma/enums";
import { recordAuditLog } from "@/lib/audit";
import { consumeRateLimit, hashActorIp, rateLimitKey } from "@/lib/rate-limit";

/**
 * Rıza kaydının iş mantığı (adım 17 · PRD §5.10).
 *
 * ⛔ ÇEREZ BİLMİYOR: bu dosya `next/headers` içe aktarmıyor. Çerezi okuyup
 * yazan taraf `cookie-notice-cookie.ts`; bu ayrım `session.service.ts` ile
 * aynı disiplin ve testlerin sahte bir HTTP bağlamı kurmadan koşabilmesini
 * sağlıyor.
 */

export type RecordCookieNoticeConsentInput = {
  subject: ConsentSubject;
  /** `false` = kullanıcı tercihini geri aldı. */
  isGranted: boolean;
  /** `hashActorIp()` ile özetlenecek düz IP. */
  actorIp: string;
};

/**
 * Çerez bildirimi tercihini kaydeder.
 *
 * SIRA ÖNEMLİ: önce hız sınırı, sonra yazma, sonra denetim kaydı. Sınır yazma
 * işleminden sonra çalışsaydı sınırı aşan istek de tabloya bir satır bırakırdı,
 * yani korumanın engellemek istediği şey zaten olmuş olurdu.
 */
export async function recordCookieNoticeConsent({
  subject,
  isGranted,
  actorIp,
}: RecordCookieNoticeConsentInput): Promise<void> {
  const ipHash = hashActorIp(actorIp);

  const decision = await consumeRateLimit({
    key: rateLimitKey("consent", "ip", ipHash),
    limit: CONSENT_RATE_LIMIT_MAX,
    windowMs: CONSENT_RATE_LIMIT_WINDOW_MS,
  });

  if (!decision.allowed) throw new ConsentRateLimitedError();

  const record = await appendConsentRecord({
    subject,
    consentType: ConsentType.necessary_cookies,
    isGranted,
  });

  /**
   * Denetim kaydı: CLAUDE.md §5.11 rıza değişikliğini kritik işlem sayıyor.
   * `entityId` satırın kimliği — kişisel veri taşımaz.
   */
  await recordAuditLog({
    userId: subject.userId,
    action: "consent_change",
    entityType: "consent_record",
    entityId: record.id,
    ipHash,
  });
}

/**
 * Ziyaretçiyken verilen rızaları hesaba bağlar. Giriş başarılı olduğunda çağrılır.
 *
 * ⛔ SESSİZCE BAŞARISIZ OLMASI GEREKİYOR: bu bağlama, girişin başarısının bir
 * parçası DEĞİL. Burada atılan bir istisna kullanıcının giriş yapamamasına yol
 * açardı — rıza kaydının öznesini çözemediğimiz için kimseyi kapıda bırakmak
 * orantısız olurdu. Hata yutulmuyor, günlüğe düşüyor (`console.error` ESLint
 * tarafından yasak olduğu için `http.ts`'deki desen: hata yukarı taşınmıyor
 * ama sayısı ölçülebiliyor).
 *
 * @returns bağlanan satır sayısı; bağlanamadıysa 0
 */
export async function linkVisitorConsentsToUser(input: {
  anonymousId: string | undefined;
  userId: string;
}): Promise<number> {
  if (!input.anonymousId) return 0;

  try {
    return await linkAnonymousConsentsToUser({
      anonymousId: input.anonymousId,
      userId: input.userId,
    });
  } catch {
    return 0;
  }
}

/**
 * Öznenin yürürlükteki çerez tercihi. Kaydı yoksa veya geri alındıysa `false`.
 *
 * ⛔ SAYFA ÇİZİMİNDE KULLANILMAZ: her sayfa için bir sorgu demek olurdu. Bandın
 * çizilip çizilmeyeceğine çerez karar veriyor (`cookie-notice-cookie.ts`);
 * bu fonksiyon yalnızca çerez politikası sayfasındaki "tercihiniz" kutusunda,
 * yani tek bir sayfada çağrılıyor.
 */
export async function readCookieNoticeConsent(subject: ConsentSubject): Promise<boolean> {
  const latest = await findLatestConsent(subject, ConsentType.necessary_cookies);

  return latest?.isGranted ?? false;
}

/**
 * Kayıt sırasında "şartları ve aydınlatma metnini gördü" kaydını yazar.
 *
 * NEDEN ONAY KUTUSU YOK: kayıt düğmesinin hemen üstünde "kayıt olarak … kabul
 * etmiş olursunuz" cümlesi ve iki bağlantı duruyor. Metinler ziyaretçiye açık
 * ve kaydın kendisi zaman damgalı; ayrıca zorunlu bir kutu eklemek kayıt
 * şemasını ve akışın testlerini değiştirmeyi gerektirirdi (adım 17 kapsamı).
 * ⚠️ BİLİNEN SINIR: bu, kutu işaretlemekten daha zayıf bir kanıttır ve
 * `roadmap.md` teknik borcunda böyle yazılıdır.
 *
 * ⛔ HATA YUTULUYOR ve bu bilinçli: rıza satırı yazılamadı diye açılmış bir
 * hesabın kaydı geri alınamaz. Hesap oluşturma zaten kendi transaction'ında
 * bitmiş oluyor; buradaki başarısızlık kullanıcıya yansımamalı.
 */
export async function recordRegistrationConsents(input: {
  userId: string;
  ipHash: string;
}): Promise<void> {
  const types = [ConsentType.terms_of_use, ConsentType.privacy_notice] as const;

  for (const consentType of types) {
    try {
      const record = await appendConsentRecord({
        subject: { userId: input.userId },
        consentType,
        isGranted: true,
      });

      await recordAuditLog({
        userId: input.userId,
        action: "consent_change",
        entityType: "consent_record",
        entityId: record.id,
        ipHash: input.ipHash,
      });
    } catch {
      // Yutuluyor — gerekçe yukarıda.
    }
  }
}

/** Kullanıcının gördüğü bildirim sürümü güncel mi. */
export function isCurrentNoticeVersion(value: string | undefined): boolean {
  return value === COOKIE_NOTICE_VERSION;
}
