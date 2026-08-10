import { CLEANUP_GRACE_MS, INFO_WIDGET_MAX_STALE_MS } from "@/config/constants";
import { deleteExpiredCacheEntries } from "@/features/info-widgets/repositories/external-cache.repository";
import {
  deleteExpiredOtpChallenges,
  deleteExpiredRegistrationDrafts,
  deleteExpiredSeatHolds,
  deleteExpiredSessions,
  deleteStaleRateLimitCounters,
} from "@/features/scheduled-tasks/repositories/cleanup.repository";
import type { ScheduledTask } from "@/features/scheduled-tasks/types";

/**
 * Çöp toplayan planlı görevler (ADR-007 · teknik borç #18, #53, #63).
 *
 * ═══ HEPSİ "PAYLI" ÇALIŞIYOR ═══
 * Hiçbir görev "süresi tam dolduğu anda" silmiyor; hepsi `CLEANUP_GRACE_MS`
 * kadar geriden bakıyor. Gerekçe sabitin başında yazılı — özeti: silmek
 * doğruluğa hiçbir şey katmıyor (kayıt zaten okuma anında yok sayılıyor), ama
 * tam anında silmek yarıda kalan bir akışa çarpabiliyor.
 */

function graceCutoff(now: Date): Date {
  return new Date(now.getTime() - CLEANUP_GRACE_MS);
}

export const cleanupSessionsTask: ScheduledTask = {
  name: "cleanup_sessions",
  description: "Sona ermiş oturum satırlarını siler",
  run: ({ now }) => deleteExpiredSessions(graceCutoff(now)),
};

export const cleanupRegistrationDraftsTask: ScheduledTask = {
  name: "cleanup_registration_drafts",
  description: "Yarım kalmış kayıt taslaklarını siler (şifreli kişisel veri taşırlar)",
  run: ({ now }) => deleteExpiredRegistrationDrafts(graceCutoff(now)),
};

export const cleanupOtpChallengesTask: ScheduledTask = {
  name: "cleanup_otp_challenges",
  description: "Süresi dolmuş doğrulama kodu kayıtlarını siler",
  run: ({ now }) => deleteExpiredOtpChallenges(graceCutoff(now)),
};

export const cleanupRateLimitsTask: ScheduledTask = {
  name: "cleanup_rate_limits",
  description: "Hız sınırı ve devre kesici sayaçlarını siler",
  run: ({ now }) => deleteStaleRateLimitCounters(graceCutoff(now)),
};

export const cleanupSeatHoldsTask: ScheduledTask = {
  name: "cleanup_seat_holds",
  description: "Süresi dolmuş koltuk kilitlerini siler (satılmış biletlere dokunmaz)",
  run: ({ now }) => deleteExpiredSeatHolds(graceCutoff(now)),
};

/**
 * ⚠️ BU GÖREVİN PAYI FARKLI ve sebebi ADR-015.
 *
 * Dış veri önbelleğinde süresi dolmuş bir kayıt ÖLÜ DEĞİLDİR: sağlayıcıya
 * ulaşılamadığında 24 saate kadar "güncellenemiyor" notuyla ekrana çıkabiliyor.
 * `CLEANUP_GRACE_MS` ile silmek, tam da sağlayıcının çöktüğü gün yedeği
 * silmek olurdu. Bu yüzden ölçüt `expiresAt` değil `fetchedAt` ve pay
 * `INFO_WIDGET_MAX_STALE_MS` — yani "artık bayat olarak bile gösterilemez"
 * çizgisi.
 */
export const cleanupExternalCacheTask: ScheduledTask = {
  name: "cleanup_external_cache",
  description: "Bayat olarak bile gösterilemeyecek dış veri önbelleğini siler",
  run: ({ now }) => deleteExpiredCacheEntries(new Date(now.getTime() - INFO_WIDGET_MAX_STALE_MS)),
};
