import { z } from "zod";

/**
 * `GET /api/cron/daily` yanıt sözleşmesi (borç #107 · adım 107a · ADR-007).
 *
 * ⭐ GÖREV ADLARI ARTIK BURADA ve tip buradan TÜRETİLİYOR (`types.ts`). Daha
 * önce liste yalnızca bir TypeScript birleşimiydi; şema yazılırken aynı dokuz
 * adı ikinci kez yazmak gerekecekti ve o kopya sessizce sapardı — bu borcun
 * kapatmaya çalıştığı hatanın ta kendisi. Tek kaynak: bu dosya.
 *
 * ⛔ BU DEĞERLER DENETİM KAYDINDA YAŞIYOR. Bir adı değiştirmek geçmiş kayıtları
 * öksüz bırakır; yeniden adlandırmak yerine yeni ad eklenip eskisi kaldırılır.
 */
export const scheduledTaskNameSchema = z.enum([
  "cleanup_sessions",
  "cleanup_registration_drafts",
  "cleanup_otp_challenges",
  "cleanup_rate_limits",
  "cleanup_seat_holds",
  "cleanup_external_cache",
  "extend_doctor_calendar",
  "send_renewal_reminders",
  "renew_memberships",
]);

export const scheduledTaskOutcomeSchema = z.object({
  name: scheduledTaskNameSchema,
  status: z.enum(["ok", "failed"]),
  /** Etkilenen satır sayısı. Başarısız görevde 0. */
  affected: z.int().nonnegative(),
  durationMs: z.int().nonnegative(),
});

/**
 * Koşu özeti — Vercel panelinde "View Logs" ile bakan İNSAN bunu okuyor.
 *
 * `startedAt` telde ISO METİNDİR, `Date` değil: `runDailyTasks` onu
 * `toISOString()` ile yazıyor. Şema bu yüzden `z.iso.datetime()` — ve tam da
 * burası, yalnızca TypeScript tipine güvenilseydi belgenin sessizce yanlış
 * olacağı yer (`api-response-contract.ts`).
 */
export const scheduledRunResponseSchema = z.object({
  startedAt: z.iso.datetime(),
  durationMs: z.int().nonnegative(),
  taskCount: z.int().nonnegative(),
  failedCount: z.int().nonnegative(),
  tasks: z.array(scheduledTaskOutcomeSchema),
});
