import { InfoIcon, LockIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { LOCALE } from "@/config/constants";
import { messages } from "@/config/messages";
import type { RegistrationIdentityView } from "@/features/auth/types";

/**
 * KPS'ten gelen kimlik bilgilerinin SALT OKUNUR gösterimi (PRD §5.0 adım 5).
 *
 * Tablo değil `<dl>` kullanılıyor: 375px'te tablo yatay kaydırma yaratıyor,
 * tanım listesi ise alt alta akıyor (07-ui-design-system.md mobil öncelik).
 *
 * "KAYDEDİLMEYEN ALANLAR" UYARISI BİLEREK GÖRÜNÜR: baba adı, anne adı, doğum
 * yeri, cinsiyet, medeni hâl ve nüfus adresi yalnızca bu ekranda gösteriliyor,
 * veritabanına yazılmıyor. KVKK'nın aydınlatma ilkesi bunu görünür kılmayı
 * gerektiriyor (14-privacy-and-compliance.md).
 */

const copy = messages.auth.register.contact;

export function IdentitySummary({ identity }: { identity: RegistrationIdentityView }) {
  const rows: { label: string; value: string; notStored?: boolean }[] = [
    { label: copy.fields.fullName, value: `${identity.firstName} ${identity.lastName}` },
    { label: copy.fields.nationalId, value: identity.nationalIdMasked },
    { label: copy.fields.birthDate, value: formatDate(identity.birthDate) },
    { label: copy.fields.registeredProvince, value: identity.registeredProvince },
    { label: copy.fields.registeredDistrict, value: identity.registeredDistrict },
    { label: copy.fields.birthPlace, value: identity.birthPlace, notStored: true },
    { label: copy.fields.fatherName, value: identity.fatherName, notStored: true },
    { label: copy.fields.motherName, value: identity.motherName, notStored: true },
    { label: copy.fields.gender, value: translateGender(identity.gender), notStored: true },
    {
      label: copy.fields.maritalStatus,
      value: translateMaritalStatus(identity.maritalStatus),
      notStored: true,
    },
    { label: copy.fields.registeredAddress, value: identity.registeredAddress, notStored: true },
  ];

  return (
    <section className="flex flex-col gap-4" aria-labelledby="kimlik-ozeti">
      <h2 id="kimlik-ozeti" className="sr-only">
        Nüfus kayıt bilgileriniz
      </h2>

      <Alert role="status">
        <LockIcon aria-hidden="true" />
        <AlertDescription>{copy.readOnlyNotice}</AlertDescription>
      </Alert>

      <dl className="grid divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
            <dt className="text-sm text-muted-foreground">
              {row.label}
              {row.notStored ? <span className="sr-only"> (kaydedilmez)</span> : null}
            </dt>
            <dd className="text-sm font-medium break-words">{row.value}</dd>
          </div>
        ))}
      </dl>

      <Alert role="status">
        <InfoIcon aria-hidden="true" />
        <AlertDescription>{copy.notStoredNotice}</AlertDescription>
      </Alert>
    </section>
  );
}

/** `1990-05-15` → `15 Mayıs 1990`. Tarih ekranda Türkçe biçimde görünür. */
function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    // Tarih bir TAKVİM günü; sunucunun saat dilimine göre kaydırılmamalı.
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00.000Z`));
}

function translateGender(value: string): string {
  const labels = copy.genderLabels as Record<string, string>;

  return labels[value] ?? labels.unspecified;
}

function translateMaritalStatus(value: string): string {
  const labels = copy.maritalStatusLabels as Record<string, string>;

  return labels[value] ?? labels.unspecified;
}
