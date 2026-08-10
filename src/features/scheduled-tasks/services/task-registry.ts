import {
  cleanupExternalCacheTask,
  cleanupOtpChallengesTask,
  cleanupRateLimitsTask,
  cleanupRegistrationDraftsTask,
  cleanupSeatHoldsTask,
  cleanupSessionsTask,
} from "@/features/scheduled-tasks/services/cleanup-tasks";
import { extendDoctorCalendarTask } from "@/features/scheduled-tasks/services/doctor-calendar-task";
import {
  renewMembershipsTask,
  sendRenewalRemindersTask,
} from "@/features/scheduled-tasks/services/membership-tasks";
import type { ScheduledTask } from "@/features/scheduled-tasks/types";

/**
 * Günlük koşunun görev listesi — TEK KAYNAK.
 *
 * ═══ SIRA ANLAMLI ═══
 * Önce ucuz ve risksiz temizlikler, sonra veri ÜRETEN işler. Gerekçe: koşu
 * fonksiyon süresine takılırsa (Vercel), takılan iş listenin sonundaki
 * pahalı iş olsun. Temizlik hiç çalışmasa tablo şişer; tahsilat hiç çalışmasa
 * kullanıcı ödeme yapmamış sayılır — ikincisi daha pahalı, o yüzden en sona
 * değil, pahalı işlerin başına konuldu.
 *
 * ⚠️ Tahsilat EN SONDA: en uzun süren iş o (her üyelik için sahte ödeme
 * sağlayıcısına çağrı) ve bir gün eksik kalırsa bedeli en düşük olan da o —
 * durum okuma anında türetiliyor (ADR-013), kullanıcı 3 gün boyunca yanlış
 * bir şey görmüyor (`MEMBERSHIP_PAYMENT_GRACE_DAYS`).
 */
export const DAILY_TASKS: readonly ScheduledTask[] = [
  cleanupSessionsTask,
  cleanupRegistrationDraftsTask,
  cleanupOtpChallengesTask,
  cleanupRateLimitsTask,
  cleanupSeatHoldsTask,
  cleanupExternalCacheTask,
  extendDoctorCalendarTask,
  sendRenewalRemindersTask,
  renewMembershipsTask,
];
