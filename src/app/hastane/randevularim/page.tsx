import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlusIcon } from "lucide-react";

import { APPOINTMENT_HISTORY_LIMIT } from "@/config/constants";
import { messages } from "@/config/messages";
import { CancelAppointmentButton } from "@/features/appointments/components/CancelAppointmentButton";
import {
  listPastAppointments,
  listUpcomingAppointments,
  type AppointmentRow,
} from "@/features/appointments/repositories/appointment.repository";
import { canCancelAt } from "@/features/appointments/services/appointment-rules";
import { AccessDeniedNotice } from "@/features/auth/components/AccessDeniedNotice";
import { guardPage } from "@/features/auth/services/page-guard";
import { formatIstanbulDateTime, toMachineDateTime } from "@/lib/datetime";

/**
 * Randevularım — kullanıcının YALNIZCA kendi kayıtları (PRD §5.1).
 *
 * IDOR KORUMASI TASARIM GEREĞİ (`/hesabim` ile aynı desen): sayfa hiçbir
 * kullanıcı kimliği parametresi almıyor. Kimlik oturumdan geliyor, dolayısıyla
 * "başkasının randevusunu göster" diyebileceği bir yüzey yok ve unutulabilecek
 * bir sahiplik kontrolü de yok.
 */
export const dynamic = "force-dynamic";

const copy = messages.hospital.myAppointments;

export const metadata: Metadata = { title: copy.pageTitle };

export default async function MyAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const guard = await guardPage("staff", "/hastane/randevularim");

  if (!guard.allowed) {
    return (
      <main className="page-shell flex flex-col gap-6 py-8">
        <Header />
        <AccessDeniedNotice decision={guard.decision} returnTo="/hastane/randevularim" />
      </main>
    );
  }

  const now = new Date();
  const [upcoming, past, params] = await Promise.all([
    listUpcomingAppointments(guard.session.userId, now),
    listPastAppointments(guard.session.userId, now, APPOINTMENT_HISTORY_LIMIT),
    searchParams,
  ]);

  return (
    <main className="page-shell flex flex-col gap-8 py-8">
      <Header />

      {/*
        Randevu alındıktan sonra buraya yönlendiriliyoruz; adresteki işaret
        başarı mesajını gösteriyor. `role="status"` (assertive değil):
        sayfada duran bir bilgi kutusu, kullanıcıyı bölmemeli.
      */}
      {params.durum === "alindi" ? (
        <p
          role="status"
          className="rounded-lg bg-brand-surface px-4 py-3 text-base text-brand-surface-foreground"
        >
          {messages.hospital.booked.success}
        </p>
      ) : null}

      <Link
        href="/hastane"
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-brand-surface px-4 text-sm font-medium text-brand-surface-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CalendarPlusIcon aria-hidden="true" className="size-4" />
        {copy.newAppointment}
      </Link>

      <section className="flex flex-col gap-4" aria-labelledby="yaklasan">
        <h2 id="yaklasan" className="font-heading text-xl font-semibold tracking-tight">
          {copy.upcomingHeading}
        </h2>

        {upcoming.length === 0 ? (
          <p role="status" className="text-base text-muted-foreground">
            {copy.empty}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.map((appointment) => (
              <li key={appointment.id}>
                <UpcomingCard appointment={appointment} now={now} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="gecmis">
        <h2 id="gecmis" className="font-heading text-xl font-semibold tracking-tight">
          {copy.pastHeading}
        </h2>

        {past.length === 0 ? (
          <p role="status" className="text-base text-muted-foreground">
            {copy.pastEmpty}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {past.map((appointment) => (
              <li key={appointment.id}>
                <PastCard appointment={appointment} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Header() {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
      <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
    </header>
  );
}

function UpcomingCard({ appointment, now }: { appointment: AppointmentRow; now: Date }) {
  /**
   * İptal düğmesinin görünürlüğü SUNUCUDA hesaplanıyor, aynı saf kuralla
   * (`canCancelAt`) — uç da onu kullanıyor. Ekran ve sunucu iki ayrı yerde
   * hesaplasaydı biri değiştiğinde diğeri sessizce yanlış kalırdı.
   */
  const cancellable = canCancelAt(appointment.startsAt, now);

  return (
    <article className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
      <AppointmentSummary appointment={appointment} />

      {cancellable ? (
        <CancelAppointmentButton appointmentId={appointment.id} />
      ) : (
        <p className="text-sm text-muted-foreground">{messages.hospital.cancel.closed}</p>
      )}
    </article>
  );
}

function PastCard({ appointment }: { appointment: AppointmentRow }) {
  return (
    <article className="flex flex-col gap-2 rounded-xl bg-card p-4 opacity-80 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
      <AppointmentSummary appointment={appointment} />

      {/* Durum METİNLE yazılıyor; soluk görünüm tek başına bilgi taşımaz. */}
      <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        {appointment.status === "cancelled" ? copy.statusCancelled : copy.statusPast}
      </span>
    </article>
  );
}

function AppointmentSummary({ appointment }: { appointment: AppointmentRow }) {
  const doctorLabel = `${messages.hospital.doctorTitles[appointment.doctorTitle]} ${appointment.doctorFullName}`;

  return (
    <div className="flex flex-col gap-1">
      {/*
        `<time>` etiketi makine tarafında ISO değeri taşıyor: ekran okuyucular
        ve arama motorları biçimlendirilmiş Türkçe metni değil bunu okur.
      */}
      <time dateTime={toMachineDateTime(appointment.startsAt)} className="text-base font-medium">
        {formatIstanbulDateTime(appointment.startsAt)}
      </time>
      <p className="text-sm text-muted-foreground">
        {appointment.specialtyName} · {doctorLabel}
      </p>
    </div>
  );
}
