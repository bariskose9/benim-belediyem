import type { DoctorTitle } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * Branş ve doktor kataloğuna erişen tek katman.
 *
 * Katalog HERKESE AYNI: kullanıcıya göre değişen hiçbir alanı yok, dolayısıyla
 * burada sahiplik kontrolü de yok. Kişiye bağlı olan tek şey randevunun
 * kendisi ve o `appointment.repository.ts` içinde.
 *
 * Ekran bu fonksiyonları doğrudan çağırıyor, arada bir HTTP ucu yok: sayfalar
 * sunucu bileşeni (`/hesabim` ile aynı desen). Yalnızca okuma yapan, kullanıcıya
 * göre değişmeyen bir liste için ayrı bir uç açmak, korunması gereken ikinci
 * bir yüzey açmak demekti.
 */

export type SpecialtyRow = {
  id: string;
  name: string;
  doctorCount: number;
};

export type DoctorRow = {
  id: string;
  fullName: string;
  title: DoctorTitle;
};

/**
 * Branşları, doktoru olanlar önce gelecek şekilde listeler.
 *
 * Doktoru olmayan branş listede KALIR ama sayısı görünür: gizlemek,
 * kullanıcının aradığı branşı bulamayıp "sistem bozuk" sanmasına yol açardı.
 */
export async function listSpecialties(): Promise<SpecialtyRow[]> {
  const rows = await prisma.specialty.findMany({
    select: {
      id: true,
      name: true,
      _count: { select: { doctors: true } },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    doctorCount: row._count.doctors,
  }));
}

export async function findSpecialtyById(
  specialtyId: string,
): Promise<{ id: string; name: string } | null> {
  return prisma.specialty.findUnique({
    where: { id: specialtyId },
    select: { id: true, name: true },
  });
}

export async function listDoctorsBySpecialty(specialtyId: string): Promise<DoctorRow[]> {
  return prisma.doctor.findMany({
    where: { specialtyId },
    select: { id: true, fullName: true, title: true },
    orderBy: { fullName: "asc" },
  });
}

/**
 * Doktoru branşıyla birlikte getirir.
 *
 * Branş adı da okunuyor çünkü ekranın üst kısmı "Kardiyoloji · Prof. Dr. …"
 * yazıyor ve bunu ikinci bir sorguyla almak gereksiz bir gidiş-dönüş olurdu.
 */
export async function findDoctorById(doctorId: string): Promise<{
  id: string;
  fullName: string;
  title: DoctorTitle;
  specialtyId: string;
  specialtyName: string;
} | null> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      id: true,
      fullName: true,
      title: true,
      specialtyId: true,
      specialty: { select: { name: true } },
    },
  });

  if (!doctor) return null;

  return {
    id: doctor.id,
    fullName: doctor.fullName,
    title: doctor.title,
    specialtyId: doctor.specialtyId,
    specialtyName: doctor.specialty.name,
  };
}
