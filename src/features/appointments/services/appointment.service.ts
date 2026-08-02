import {
  APPOINTMENT_WRITE_RATE_LIMIT_MAX,
  APPOINTMENT_WRITE_RATE_LIMIT_WINDOW_MS,
} from "@/config/constants";
import {
  ActiveSpecialtyAppointmentError,
  AppointmentAlreadyCancelledError,
  AppointmentNotFoundError,
  AppointmentRateLimitedError,
  CancellationTooLateError,
  SlotInPastError,
  SlotNotFoundError,
  SlotTakenError,
} from "@/features/appointments/errors";
import {
  createAppointment,
  findOwnedAppointment,
  hasActiveAppointmentInSpecialty,
  markAppointmentCancelled,
} from "@/features/appointments/repositories/appointment.repository";
import {
  findSlotForBooking,
  releaseSlot,
  reserveSlot,
} from "@/features/appointments/repositories/doctor-slot.repository";
import { canCancelAt, isSlotInPast } from "@/features/appointments/services/appointment-rules";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { consumeRateLimit, hashActorIp, rateLimitKey } from "@/lib/rate-limit";

/**
 * Randevu alma ve iptal — PRD §5.1'in dört kuralının UYGULANDIĞI TEK YER.
 *
 * Kurallar buraya toplandı çünkü hem HTTP ucu hem de ileride bir planlı görev
 * (adım 16) aynı yoldan geçmeli. Kural sayfaya ya da route dosyasına
 * yazılsaydı, ikinci bir çağıran eklendiğinde sessizce atlanırdı.
 *
 * "ŞİMDİ" DIŞARIDAN GELİR: bir istek içindeki tüm kararlar aynı ana göre
 * verilir ve testler sahte saatle çalışabilir (06-testing.md).
 */

export type BookAppointmentInput = {
  /** Oturumdan gelir. İstemcinin gönderdiği bir değer ASLA buraya ulaşmaz. */
  userId: string;
  slotId: string;
  actorIp: string;
  now: Date;
};

/**
 * Randevu oluşturur.
 *
 * KONTROL SIRASI TESADÜF DEĞİL:
 *  1. Hız sınırı    → en ucuz kapı, veritabanı işlemi hiç açılmadan önce
 *  2. Saat var mı   → yoksa devam etmenin anlamı yok
 *  3. Geçmiş mi     → saf kural, sorgu gerektirmiyor
 *  4. Aktif randevu → bir sorgu daha; saat kilitlenmeden ÖNCE
 *  5. Rezervasyon   → satır kilidi burada alınır ve işlem hemen biter
 *
 * Rezervasyon en sona bırakıldı ki `doctor_slots` satırı mümkün olan en kısa
 * süre kilitli kalsın. Önce kilitlenip sonra "bu branşta randevun var mı" diye
 * sorulsaydı, o sorgu boyunca aynı saati isteyen herkes beklerdi.
 */
export async function bookAppointment(
  input: BookAppointmentInput,
): Promise<{ appointmentId: string; startsAt: Date }> {
  await enforceWriteBudget(input.userId, input.now);

  const booked = await prisma.$transaction(async (tx) => {
    const slot = await findSlotForBooking(tx, input.slotId);

    if (!slot) throw new SlotNotFoundError();

    // İstemcinin gönderdiği tarih DEĞİL, veritabanındaki saat ölçü alınıyor.
    if (isSlotInPast(slot.startsAt, input.now)) throw new SlotInPastError();

    const alreadyBooked = await hasActiveAppointmentInSpecialty(tx, {
      userId: input.userId,
      specialtyId: slot.specialtyId,
      now: input.now,
    });

    if (alreadyBooked) throw new ActiveSpecialtyAppointmentError();

    /**
     * PRD §5.1 KABUL KRİTERİ BURADA KARŞILANIYOR.
     *
     * `reserveSlot` koşullu bir UPDATE çalıştırıyor (`WHERE is_booked = false`).
     * İki kullanıcı aynı anda denerse PostgreSQL ikincisini bekletir, birinci
     * commit edince WHERE'i yeniden değerlendirir ve satır artık koşulu
     * sağlamadığı için atlar → `false` → 409.
     */
    if (!(await reserveSlot(tx, slot.id))) throw new SlotTakenError();

    const appointment = await createAppointment(tx, {
      userId: input.userId,
      slotId: slot.id,
    });

    return { appointmentId: appointment.id, startsAt: slot.startsAt };
  });

  /**
   * Denetim kaydı TRANSACTION'IN DIŞINDA (CLAUDE.md §5.11 · `login.service.ts`
   * ile aynı desen). İçeride olsaydı denetim tablosuna yazma hatası
   * kullanıcının randevusunu geri alırdı — denetim, işin kendisini bozmamalı.
   */
  await recordAuditLog({
    userId: input.userId,
    action: "appointment_create",
    entityType: "appointment",
    entityId: booked.appointmentId,
    ipHash: hashActorIp(input.actorIp),
  });

  return booked;
}

export type CancelAppointmentInput = {
  userId: string;
  appointmentId: string;
  actorIp: string;
  now: Date;
};

/**
 * Randevuyu iptal eder ve saati yeniden satışa açar.
 *
 * SAHİPLİK KONTROLÜ SORGUNUN İÇİNDE (`findOwnedAppointment`): başkasının
 * randevusu `null` döner ve 404 alır. 403 dönmek "böyle bir randevu var, ama
 * senin değil" bilgisini sızdırırdı (05-auth-security.md → IDOR).
 *
 * Kayıt SİLİNMEZ; `status = cancelled` olur ve 3 yıl saklanır (data-model.md).
 */
export async function cancelAppointment(input: CancelAppointmentInput): Promise<void> {
  await enforceWriteBudget(input.userId, input.now);

  await prisma.$transaction(async (tx) => {
    const appointment = await findOwnedAppointment(tx, {
      appointmentId: input.appointmentId,
      userId: input.userId,
    });

    if (!appointment) throw new AppointmentNotFoundError();
    if (appointment.status === "cancelled") throw new AppointmentAlreadyCancelledError();
    if (!canCancelAt(appointment.startsAt, input.now)) throw new CancellationTooLateError();

    /**
     * Koşullu güncelleme yine kritik: aynı randevuya iki iptal isteği
     * gelirse yalnızca biri satırı değiştirir. İkincisi `false` alır ve
     * saati İKİNCİ KEZ boşaltmadan durur — aksi hâlde bu arada o saati alan
     * başka bir kullanıcının randevusu sessizce "boş" işaretlenirdi.
     */
    const cancelled = await markAppointmentCancelled(tx, {
      appointmentId: appointment.id,
      userId: input.userId,
      cancelledAt: input.now,
    });

    if (!cancelled) throw new AppointmentAlreadyCancelledError();

    await releaseSlot(tx, appointment.slotId);
  });

  await recordAuditLog({
    userId: input.userId,
    action: "appointment_cancel",
    entityType: "appointment",
    entityId: input.appointmentId,
    ipHash: hashActorIp(input.actorIp),
  });
}

/**
 * Yazma bütçesi — kullanıcı başına (CLAUDE.md §5.5).
 *
 * Randevu alma ve iptal AYNI sayacı paylaşıyor: ikisi de aynı takvimi
 * değiştiren yazma işlemi ve ayrı bütçe vermek, "al-iptal et-al" döngüsüyle
 * sınırın iki katına çıkarılmasına izin verirdi.
 */
async function enforceWriteBudget(userId: string, now: Date): Promise<void> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("appointment_write", "user", userId),
    limit: APPOINTMENT_WRITE_RATE_LIMIT_MAX,
    windowMs: APPOINTMENT_WRITE_RATE_LIMIT_WINDOW_MS,
    now,
  });

  if (!decision.allowed) throw new AppointmentRateLimitedError();
}
