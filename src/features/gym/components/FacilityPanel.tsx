import { CheckIcon, MapPinIcon } from "lucide-react";

import { messages } from "@/config/messages";
import { GYM_FACILITY, GYM_OPENING_HOURS } from "@/features/gym/data/facility";

/**
 * Tesis künyesi ve salon saatleri (PRD §5.6).
 *
 * SUNUCU BİLEŞENİ: içerik sabit, hiçbir etkileşim yok. İstemciye JavaScript
 * göndermenin karşılığı olmazdı.
 *
 * Saatler `dl` ile veriliyor, tabloyla değil: iki sütunlu bir ad-değer
 * listesi tablo değildir ve ekran okuyucuya tablo demek gezinmeyi zorlaştırır.
 */

const copy = messages.gym.facility;

export function FacilityPanel() {
  return (
    <section className="flex flex-col gap-6" aria-labelledby="tesis">
      <h2 id="tesis" className="font-heading text-xl font-semibold tracking-tight">
        {copy.heading}
      </h2>

      <div className="flex flex-col gap-4 rounded-xl bg-brand-surface p-4 text-brand-surface-foreground sm:p-6">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-lg font-semibold">{GYM_FACILITY.name}</h3>
          <p className="max-w-prose text-base">{GYM_FACILITY.summary}</p>
        </div>

        <p className="flex items-start gap-2 text-base">
          <MapPinIcon aria-hidden="true" className="mt-1 size-4 shrink-0" />
          <span>
            <span className="sr-only">{copy.addressHeading}: </span>
            {GYM_FACILITY.address}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">{copy.amenitiesHeading}</h3>
          <ul className="flex flex-col gap-2">
            {GYM_FACILITY.amenities.map((item) => (
              <li key={item} className="flex items-start gap-2 text-base">
                <CheckIcon aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">{copy.hoursHeading}</h3>
          <dl className="flex flex-col gap-2">
            {GYM_OPENING_HOURS.map((entry) => (
              <div key={entry.days} className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <dt className="text-base">{entry.days}</dt>
                {/*
                  Kapalı gün gizlenmiyor, "Kapalı" yazılıyor: satırı hiç
                  göstermemek kullanıcıya "acaba mı" dedirtirdi.
                */}
                <dd className="text-base font-medium tabular-nums">{entry.hours ?? copy.closed}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
