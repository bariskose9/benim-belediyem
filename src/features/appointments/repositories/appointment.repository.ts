import type { TransactionClient } from "@/features/appointments/repositories/doctor-slot.repository";
import type { AppointmentStatus, DoctorTitle } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * `appointments` tablosuna erişen tek katman.
 *
 * BURADAKİ HER OKUMA `userId` İLE FİLTRELENİR — istisnasız. IDOR koruması
 * (05-auth-security.md · 03-api-guidelines.md) bir `if` kontrolü olarak değil,
 * SORGUNUN KENDİSİNDE duruyor: "önce çek, sonra sahibi mi diye bak" deseninde
 * kontrolü unutmak mümkündür, `where: { userId }` deseninde değildir.
 */

export type AppointmentRow = {
  id: string;
  status: AppointmentStatus;
  cancelledAt: Date | null;
  slotId: string;
  startsAt: Date;
  doctorFullName: string;
  doctorTitle: DoctorTitle;
  specialtyName: string;
};

/** Liste ekranı için ortak `select` — üç yerde tekrar yazılmasın diye. */
const appointmentSelect = {
  id: true,
  status: true,
  cancelledAt: true,
  slotId: true,
  slot: {
    select: {
      startsAt: true,
      doctor: {
        select: {
          fullName: true,
          title: true,
          specialty: { select: { name: true } },
        },
      },
    },
  },
} as const;

type RawAppointment = {
  id: string;
  status: AppointmentStatus;
  cancelledAt: Date | null;
  slotId: string;
  slot: {
    startsAt: Date;
    doctor: { fullName: string; title: DoctorTitle; specialty: { name: string } };
  };
};

function toAppointmentRow(row: RawAppointment): AppointmentRow {
  return {
    id: row.id,
    status: row.status,
    cancelledAt: row.cancelledAt,
    slotId: row.slotId,
    startsAt: row.slot.startsAt,
    doctorFullName: row.slot.doctor.fullName,
    doctorTitle: row.slot.doctor.title,
    specialtyName: row.slot.doctor.specialty.name,
  };
}

/**
 * Kullanıcının YAKLAŞAN randevuları: aktif ve saati henüz gelmemiş.
 *
 * Sayfalanmıyor ve bu bilinçli: "aynı branşta aynı gün tek randevu" kuralı
 * listeyi doğal olarak küçük tutuyor. Sınırsız büyüyebilen liste geçmiş
 * randevulardır ve o sayfalanıyor.
 */
export async function listUpcomingAppointments(
  userId: string,
  now: Date,
): Promise<AppointmentRow[]> {
  const rows = await prisma.appointment.findMany({
    where: {
      userId,
      status: "booked",
      slot: { startsAt: { gte: now } },
    },
    select: appointmentSelect,
    orderBy: { slot: { startsAt: "asc" } },
  });

  return rows.map(toAppointmentRow);
}

/**
 * Geçmiş ve iptal edilen randevular — en yeniden eskiye.
 *
 * İptal edilenler saati gelmemiş olsa bile buraya düşer: kullanıcı için o
 * randevu artık "olmuş bitmiş" bir kayıttır, yaklaşan bir işi değil.
 */
export async function listPastAppointments(
  userId: string,
  now: Date,
  limit: number,
): Promise<AppointmentRow[]> {
  const rows = await prisma.appointment.findMany({
    where: {
      userId,
      OR: [{ status: "cancelled" }, { slot: { startsAt: { lt: now } } }],
    },
    select: appointmentSelect,
    orderBy: { slot: { startsAt: "desc" } },
    take: limit,
  });

  return rows.map(toAppointmentRow);
}

/**
 * İptal için randevuyu getirir — YALNIZCA sahibine.
 *
 * `findUnique({ where: { id } })` KULLANILMIYOR: o, kaydı önce getirip sonra
 * sahipliğini kontrol etmeyi gerektirirdi ve o kontrolü unutmak bir IDOR
 * açığıdır. Bileşik koşul, başkasının kaydında `null` döner — çağıran taraf
 * "yok" ile "senin değil" arasında ayrım yapamaz, zaten yapmamalı.
 */
export async function findOwnedAppointment(
  tx: TransactionClient,
  input: { appointmentId: string; userId: string },
): Promise<{ id: string; status: AppointmentStatus; slotId: string; startsAt: Date } | null> {
  const row = await tx.appointment.findFirst({
    where: { id: input.appointmentId, userId: input.userId },
    select: {
      id: true,
      status: true,
      slotId: true,
      slot: { select: { startsAt: true } },
    },
  });

  if (!row) return null;

  return { id: row.id, status: row.status, slotId: row.slotId, startsAt: row.slot.startsAt };
}

/**
 * Kullanıcının belirli bir branşta AKTİF randevusu var mı
 * (PRD §5.1: "aynı branşta aktif randevu varken ikinci randevu alınamaz").
 *
 * "AKTİF" İKİ KOŞULUN BİRLİKTE SAĞLANMASIDIR:
 *  · `status = booked`  → iptal edilen randevu engel SAYILMAZ. Aksi hâlde
 *    iptal bir cezaya dönüşür ve kullanıcı fikrini değiştiremezdi
 *  · `startsAt > now`   → saati geçen randevu engel olmaktan çıkar. Kullanıcı
 *    muayenesini olduktan sonra yeni randevu alabilmeli
 *
 * Zaman koşulu `starts_at` index'ini kullanıyor (ADR-007: süreye bağlı her
 * sorgu zaman koşulu içerir ve o koşul indekslidir).
 *
 * TARİH ARALIĞI YOK, GÜN HESABI YOK. Kural 2026-08-03'te "aynı gün"den
 * "aktif randevu"ya çevrildi (PRD §5.1 güncelleme notu): bekleyen randevusu
 * olan kullanıcı o branştan hiçbir güne yeni randevu alamıyor.
 */
export async function hasActiveAppointmentInSpecialty(
  tx: TransactionClient,
  input: { userId: string; specialtyId: string; now: Date },
): Promise<boolean> {
  const existing = await tx.appointment.findFirst({
    where: {
      userId: input.userId,
      status: "booked",
      slot: {
        startsAt: { gt: input.now },
        doctor: { specialtyId: input.specialtyId },
      },
    },
    select: { id: true },
  });

  return existing !== null;
}

export async function createAppointment(
  tx: TransactionClient,
  input: { userId: string; slotId: string },
): Promise<{ id: string }> {
  return tx.appointment.create({
    data: { userId: input.userId, slotId: input.slotId },
    select: { id: true },
  });
}

/**
 * Randevuyu iptal eder. Satır SİLİNMEZ — `status` değişir ve 3 yıl saklanır
 * (data-model.md saklama süreleri). Denetim değeri olan bir kaydı silmek,
 * "bu randevu hiç olmadı" demekle aynı şey olurdu.
 *
 * Koşulda `status: "booked"` var: iki eşzamanlı iptal isteğinden yalnızca biri
 * satırı değiştirir, ikincisi 0 sayısı alır. Saat iki kez boşaltılmaz.
 */
export async function markAppointmentCancelled(
  tx: TransactionClient,
  input: { appointmentId: string; userId: string; cancelledAt: Date },
): Promise<boolean> {
  const result = await tx.appointment.updateMany({
    where: { id: input.appointmentId, userId: input.userId, status: "booked" },
    data: { status: "cancelled", cancelledAt: input.cancelledAt },
  });

  return result.count === 1;
}
