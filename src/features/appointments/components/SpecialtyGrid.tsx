import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { messages } from "@/config/messages";
import type { SpecialtyRow } from "@/features/appointments/repositories/catalog.repository";

/**
 * Akışın ilk adımı: branş listesi.
 *
 * Her branş bir BAĞLANTI, düğme değil. Sebebi seçimin adres çubuğuna
 * yazılması: kullanıcı geri tuşunu kullanabiliyor, bağlantıyı
 * paylaşabiliyor ve JavaScript yüklenmeden önce de tıklayabiliyor. Aynı işi
 * `onClick` ile yapan bir düğme bunların üçünü de kaybettirirdi.
 */

const copy = messages.hospital;

export function SpecialtyGrid({ specialties }: { specialties: readonly SpecialtyRow[] }) {
  if (specialties.length === 0) {
    return (
      <p role="status" className="text-base text-muted-foreground">
        {copy.empty.specialties}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {specialties.map((specialty) => (
        <li key={specialty.id} className="flex">
          <Link
            href={`/hastane?brans=${encodeURIComponent(specialty.id)}`}
            /**
             * `min-h-11` — dokunma hedefi en az 44px (WCAG 2.1 AA "Target
             * Size"). Masaüstünde fark edilmez, telefonda yanlış branşa
             * girmenin önüne geçer.
             */
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex flex-col gap-0.5">
              <span className="font-heading text-base font-medium">{specialty.name}</span>
              <span className="text-sm text-muted-foreground">
                {copy.doctorCount(specialty.doctorCount)}
              </span>
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
