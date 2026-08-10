import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheckIcon, ChevronLeftIcon } from "lucide-react";

import { APPOINTMENT_VISIBLE_DAYS } from "@/config/constants";
import { messages } from "@/config/messages";
import { DayStrip } from "@/features/appointments/components/DayStrip";
import { DoctorGrid } from "@/features/appointments/components/DoctorGrid";
import { SlotList } from "@/features/appointments/components/SlotList";
import { SpecialtyGrid } from "@/features/appointments/components/SpecialtyGrid";
import {
  findDoctorById,
  findSpecialtyById,
  listDoctorsBySpecialty,
  listSpecialties,
} from "@/features/appointments/repositories/catalog.repository";
import { listSlotsForDoctor } from "@/features/appointments/repositories/doctor-slot.repository";
import { parseHospitalSearchParams } from "@/features/appointments/schemas/appointment.schema";
import { groupSlotsByIstanbulDay } from "@/features/appointments/services/appointment-rules";
import { AccessDeniedNotice } from "@/features/auth/components/AccessDeniedNotice";
import { guardPage } from "@/features/auth/services/page-guard";

/**
 * Hastane randevusu — branş → doktor → gün → saat (PRD §5.1).
 *
 * TEK ADRES, ADIM ADIM: seçim adres çubuğunda taşınıyor (`?brans=…&doktor=…`).
 * Böylece her adım sunucuda çiziliyor, geri tuşu bir adım geri alıyor ve
 * bağlantı paylaşılabiliyor. Adımları ayrı sayfalara bölmek üç ayrı erişim
 * kapısı ve üç ayrı test yüzeyi demekti; istemci tarafı bir sihirbaz ise geri
 * tuşunu bozardı.
 *
 * ERİŞİM: yalnızca personel. Kapı SAYFANIN İÇİNDE (`guardPage`), menüde
 * bağlantıyı gizlemek koruma değildir (05-auth-security.md).
 */
export const dynamic = "force-dynamic";

const copy = messages.hospital;

export const metadata: Metadata = { title: copy.pageTitle };

export default async function HospitalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const guard = await guardPage("staff", "/hastane");

  if (!guard.allowed) {
    return (
      <main className="page-shell flex flex-col gap-6 py-8">
        <PageHeader />
        <AccessDeniedNotice decision={guard.decision} returnTo="/hastane" />
      </main>
    );
  }

  const selection = parseHospitalSearchParams(await searchParams);

  return (
    <main className="page-shell flex flex-col gap-6 py-8">
      <PageHeader />

      <Link
        href="/hastane/randevularim"
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-brand-surface px-4 text-sm font-medium text-brand-surface-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CalendarCheckIcon aria-hidden="true" className="size-4" />
        {copy.myAppointments.link}
      </Link>

      {await renderStep(selection)}
    </main>
  );
}

function PageHeader() {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
      <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
    </header>
  );
}

/**
 * Hangi adımın çizileceğine karar verir.
 *
 * DOKTOR VARSA BRANŞ ONDAN OKUNUR, adres çubuğundaki `brans` parametresinden
 * değil. Kullanıcı adresi elle kurcalayıp uyumsuz bir çift yazarsa ekran
 * çelişkili bir başlık göstermek yerine kendini düzeltir.
 */
async function renderStep(selection: { specialtyId?: string; doctorId?: string; day?: string }) {
  if (selection.doctorId) {
    const doctor = await findDoctorById(selection.doctorId);

    if (doctor) return <SlotStep doctor={doctor} day={selection.day} />;
  }

  if (selection.specialtyId) {
    const specialty = await findSpecialtyById(selection.specialtyId);

    if (specialty) return <DoctorStep specialty={specialty} />;
  }

  // Buraya düşmek "parametre yok" veya "parametre artık geçerli değil"
  // demektir; ikisinde de doğru davranış akışın başına dönmek.
  return <SpecialtyStep />;
}

async function SpecialtyStep() {
  const specialties = await listSpecialties();

  return (
    <section className="flex flex-col gap-4" aria-labelledby="adim-brans">
      <h2 id="adim-brans" className="font-heading text-xl font-semibold tracking-tight">
        {copy.steps.specialty}
      </h2>
      <SpecialtyGrid specialties={specialties} />
    </section>
  );
}

async function DoctorStep({ specialty }: { specialty: { id: string; name: string } }) {
  const doctors = await listDoctorsBySpecialty(specialty.id);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="adim-doktor">
      <Breadcrumb items={[{ href: "/hastane", label: copy.steps.backToSpecialties }]} />

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">{specialty.name}</p>
        <h2 id="adim-doktor" className="font-heading text-xl font-semibold tracking-tight">
          {copy.steps.doctor}
        </h2>
      </div>

      <DoctorGrid doctors={doctors} specialtyId={specialty.id} />
    </section>
  );
}

async function SlotStep({
  doctor,
  day,
}: {
  doctor: {
    id: string;
    fullName: string;
    title: keyof typeof copy.doctorTitles;
    specialtyId: string;
    specialtyName: string;
  };
  day?: string;
}) {
  /**
   * Pencere ŞU ANDAN başlıyor, gün başından değil: geçmiş saatleri hiç
   * getirmemek, onları ekranda ayıklamaktan hem daha az veri hem daha az
   * hata yüzeyi. Sunucu kuralı yine de bağımsız olarak kontrol ediyor —
   * bu yalnızca sorgunun kendisi.
   */
  const now = new Date();
  const until = new Date(now.getTime() + APPOINTMENT_VISIBLE_DAYS * 24 * 60 * 60_000);

  const slots = await listSlotsForDoctor({ doctorId: doctor.id, from: now, until });
  const days = groupSlotsByIstanbulDay(slots).map((entry) => ({
    dayKey: entry.dayKey,
    date: entry.date,
    freeCount: entry.slots.filter((slot) => !slot.isBooked).length,
    slots: entry.slots,
  }));

  const doctorLabel = `${copy.doctorTitles[doctor.title]} ${doctor.fullName}`;
  const backToDoctors = `/hastane?brans=${encodeURIComponent(doctor.specialtyId)}`;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="adim-saat">
      <Breadcrumb
        items={[
          { href: "/hastane", label: copy.steps.backToSpecialties },
          { href: backToDoctors, label: copy.steps.backToDoctors },
        ]}
      />

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">
          {doctor.specialtyName} · {doctorLabel}
        </p>
        <h2 id="adim-saat" className="font-heading text-xl font-semibold tracking-tight">
          {copy.steps.slot}
        </h2>
      </div>

      {days.length === 0 ? (
        <p role="status" className="text-base text-muted-foreground">
          {copy.empty.slots}
        </p>
      ) : (
        <SlotDayPicker days={days} requestedDay={day} doctor={doctor} doctorLabel={doctorLabel} />
      )}
    </section>
  );
}

/** Gün şeridi + seçilen günün saatleri. */
function SlotDayPicker({
  days,
  requestedDay,
  doctor,
  doctorLabel,
}: {
  days: readonly {
    dayKey: string;
    date: Date;
    freeCount: number;
    slots: { id: string; startsAt: Date; isBooked: boolean }[];
  }[];
  requestedDay?: string;
  doctor: { id: string; specialtyId: string };
  doctorLabel: string;
}) {
  /**
   * Varsayılan gün: BOŞ SAATİ OLAN İLK GÜN.
   *
   * Takvimdeki ilk günü seçmek, o gün doluysa kullanıcıyı boş bir listeyle
   * karşılardı ve "randevu yok" izlenimi verirdi — oysa iki gün sonrası boş.
   */
  const selected =
    days.find((entry) => entry.dayKey === requestedDay) ??
    days.find((entry) => entry.freeCount > 0) ??
    days[0];

  const hrefForDay = (dayKey: string): string =>
    `/hastane?brans=${encodeURIComponent(doctor.specialtyId)}` +
    `&doktor=${encodeURIComponent(doctor.id)}&gun=${dayKey}`;

  return (
    <div className="flex flex-col gap-4">
      <DayStrip days={days} selectedDayKey={selected?.dayKey ?? ""} hrefForDay={hrefForDay} />

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">{copy.slots.heading}</h3>
        <SlotList slots={selected?.slots ?? []} doctorLabel={doctorLabel} />
      </div>
    </div>
  );
}

/** Adım geçmişi. `nav` + `aria-label`: ekran okuyucu bunun gezinme olduğunu bilmeli. */
function Breadcrumb({ items }: { items: readonly { href: string; label: string }[] }) {
  return (
    <nav aria-label={copy.steps.breadcrumbLabel}>
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="inline-flex min-h-11 items-center gap-1 text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeftIcon aria-hidden="true" className="size-4" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
