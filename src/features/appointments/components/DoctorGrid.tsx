import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { messages } from "@/config/messages";
import type { DoctorRow } from "@/features/appointments/repositories/catalog.repository";

/**
 * Akışın ikinci adımı: seçilen branştaki doktorlar.
 *
 * `SpecialtyGrid` ile aynı görsel dil ve aynı bağlantı deseni kullanılıyor;
 * iki adımın farklı görünmesi kullanıcıya "başka bir yere geldim" hissi
 * verirdi.
 */

const copy = messages.hospital;

export function DoctorGrid({
  doctors,
  specialtyId,
}: {
  doctors: readonly DoctorRow[];
  specialtyId: string;
}) {
  if (doctors.length === 0) {
    return (
      <p role="status" className="text-base text-muted-foreground">
        {copy.empty.doctors}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {doctors.map((doctor) => (
        <li key={doctor.id} className="flex">
          <Link
            href={`/hastane?brans=${encodeURIComponent(specialtyId)}&doktor=${encodeURIComponent(doctor.id)}`}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="font-heading text-base font-medium">
              {copy.doctorTitles[doctor.title]} {doctor.fullName}
            </span>
            <ChevronRightIcon
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-foreground"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
