import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messages } from "@/config/messages";
import { findAccountProfile } from "@/features/auth/repositories/user.repository";
import { guardPage } from "@/features/auth/services/page-guard";
import { RecordLinkCard } from "@/features/profile/components/RecordLinkCard";
import { countAddresses } from "@/features/profile/repositories/address.repository";
import { listSavedCards } from "@/features/profile/repositories/saved-card.repository";

/**
 * Hesabım — kullanıcının YALNIZCA kendi kaydı ve kayıtlarına açılan kapı
 * (PRD §4: "tüm randevuları, siparişleri, üyelikleri ve destek talepleri tek
 * yerde listelenir ve yönetilir").
 *
 * IDOR KORUMASI TASARIM GEREĞİ (05-auth-security.md): sayfa hiçbir kullanıcı
 * kimliği parametresi almıyor. Kimlik oturumdan geliyor, dolayısıyla
 * "başkasının kaydını iste" diyebileceği bir yüzey yok — bir sahiplik
 * kontrolünü unutma ihtimali de yok.
 *
 * Kimlik numarası burada da MASKELİ gösteriliyor; şifreli hâli hiç okunmuyor.
 *
 * PERSONELE ÖZEL BAĞLANTILAR GİZLENİYOR (randevu, spor salonu): kullanıcıyı
 * giremeyeceği bir sayfaya göndermemek için. ⛔ BU BİR YETKİ KONTROLÜ DEĞİL —
 * kapı o sayfaların KENDİSİNDE (`guardPage("staff")`); adresi elle yazan
 * kullanıcı aynı duvara çarpar.
 */
export const dynamic = "force-dynamic";

const copy = messages.auth.account;
const profileCopy = messages.profile;

export const metadata: Metadata = {
  title: copy.pageTitle,
};

export default async function AccountPage() {
  const guard = await guardPage("authenticated", "/hesabim");

  // `authenticated` kademesinde tek ret sebebi girişsizlik ve o zaten
  // yönlendirmeyle bitiyor; buraya gelen istek her zaman izinlidir.
  if (!guard.allowed) return null;

  // Üçü birbirinden bağımsız: sırayla beklemek sayfayı boşuna yavaşlatırdı.
  const [profile, addressCount, cards] = await Promise.all([
    findAccountProfile(guard.session.userId),
    countAddresses(guard.session.userId),
    listSavedCards(guard.session.userId),
  ]);

  return (
    <main className="page-shell flex flex-col gap-8 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{guard.session.fullName}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-4">
            <Row label={copy.fields.nationalId} value={profile?.nationalIdMasked} />
            <Row label={copy.fields.email} value={profile?.email} />
            <Row label={copy.fields.phone} value={profile?.phone} />
            <Row
              label={copy.fields.identityStatus}
              value={copy.identityStatusLabels[guard.session.identityStatus]}
            />
            <Row
              label={copy.fields.staffStatus}
              value={
                guard.session.isStaff
                  ? copy.staffStatusLabels.staff
                  : copy.staffStatusLabels.citizen
              }
            />
          </dl>
        </CardContent>
      </Card>

      <p className="max-w-prose text-base text-muted-foreground">{copy.maskedNotice}</p>

      <section aria-labelledby="kayitlarim" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="kayitlarim" className="font-heading text-xl font-semibold tracking-tight">
            {profileCopy.records.heading}
          </h2>
          <p className="max-w-prose text-base text-muted-foreground">
            {profileCopy.records.description}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <RecordLinkCard
            href="/siparislerim"
            title={profileCopy.records.orders.title}
            description={profileCopy.records.orders.description}
          />
          <RecordLinkCard
            href="/destek"
            title={profileCopy.records.support.title}
            description={profileCopy.records.support.description}
          />
          <RecordLinkCard
            href="/bildirimler"
            title={profileCopy.records.notifications.title}
            description={profileCopy.records.notifications.description}
          />

          {guard.session.isStaff ? (
            <>
              <RecordLinkCard
                href="/hastane/randevularim"
                title={profileCopy.records.appointments.title}
                description={profileCopy.records.appointments.description}
              />
              <RecordLinkCard
                href="/spor-salonu/uyelik"
                title={profileCopy.records.membership.title}
                description={profileCopy.records.membership.description}
              />
            </>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="hesap-ayarlari" className="flex flex-col gap-4">
        <h2 id="hesap-ayarlari" className="font-heading text-xl font-semibold tracking-tight">
          {profileCopy.settings.heading}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <RecordLinkCard
            href="/hesabim/adreslerim"
            title={profileCopy.settings.addresses.title}
            description={profileCopy.settings.addresses.description}
            hint={
              addressCount === 0
                ? profileCopy.settings.addresses.none
                : profileCopy.settings.addresses.count(addressCount)
            }
          />
          <RecordLinkCard
            href="/hesabim/kartlarim"
            title={profileCopy.settings.cards.title}
            description={profileCopy.settings.cards.description}
            hint={
              cards.length === 0
                ? profileCopy.settings.cards.none
                : profileCopy.settings.cards.count(cards.length)
            }
          />
        </div>
      </section>
    </main>
  );
}

/** Boş alan "—" ile gösterilir; boş satır kullanıcıya "yükleniyor" hissi verir. */
function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="text-base text-muted-foreground sm:w-48 sm:shrink-0">{label}</dt>
      <dd className="text-base font-medium wrap-break-word">{value ?? "—"}</dd>
    </div>
  );
}
