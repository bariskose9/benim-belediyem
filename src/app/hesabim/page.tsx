import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheckIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messages } from "@/config/messages";
import { FormAlert } from "@/features/auth/components/FormAlert";
import { findLoginMethods } from "@/features/auth/repositories/google-account.repository";
import { findAccountProfile } from "@/features/auth/repositories/user.repository";
import { isGoogleLoginConfigured } from "@/features/auth/services/google-oauth.service";
import { guardPage } from "@/features/auth/services/page-guard";
import { LoginMethodsCard } from "@/features/profile/components/LoginMethodsCard";
import { RecordLinkCard } from "@/features/profile/components/RecordLinkCard";
import { countAddresses } from "@/features/profile/repositories/address.repository";
import { listSavedCards } from "@/features/profile/repositories/saved-card.repository";
import { formatIstanbulDate } from "@/lib/datetime";

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
const accountCopy = messages.account;
const staffCopy = messages.staffVerification;

export const metadata: Metadata = {
  title: copy.pageTitle,
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const guard = await guardPage("authenticated", "/hesabim");

  // `authenticated` kademesinde tek ret sebebi girişsizlik ve o zaten
  // yönlendirmeyle bitiyor; buraya gelen istek her zaman izinlidir.
  if (!guard.allowed) return null;

  // Dördü birbirinden bağımsız: sırayla beklemek sayfayı boşuna yavaşlatırdı.
  const [profile, addressCount, cards, methods] = await Promise.all([
    findAccountProfile(guard.session.userId),
    countAddresses(guard.session.userId),
    listSavedCards(guard.session.userId),
    findLoginMethods(guard.session.userId),
  ]);

  /**
   * Google akışının sonucu adres çubuğunda taşınıyor (`?google=…`).
   *
   * NEDEN ÇEREZ VEYA OTURUM DEĞİL: sonuç tek seferlik bir bilgi ve kullanıcı
   * Google'dan tam sayfa yönlendirmeyle dönüyor, yani istemci tarafında
   * tutulacak bir durum yok. Tanınmayan bir değer sessizce yok sayılıyor —
   * adresi kurcalayan biri ekrana kendi metnini yazdıramaz.
   */
  const googleResult = readGoogleResult(await searchParams);

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

      {/* Doğrulanmamış hesabın gideceği yer (adım 15c-2 · teknik borç #32).
          Kullanıcı eksiğini bir hizmete çarpmadan da görebilmeli. */}
      {guard.session.identityStatus === "unverified" ? (
        <Alert role="status">
          <BadgeCheckIcon aria-hidden="true" />
          <AlertTitle>{copy.identityPrompt.title}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{copy.identityPrompt.description}</span>
            <Link href="/kimlik-dogrulama" className="font-medium underline underline-offset-4">
              {copy.identityPrompt.cta}
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Personel yetkisi (adım 17c · ADR-017 ilke 2).
          ⛔ YALNIZCA KİMLİĞİ DOĞRULANMIŞ VE HENÜZ PERSONEL OLMAYAN hesapta
          görünüyor: doğrulanmamış hesap yukarıdaki kimlik uyarısını görüyor
          ve iki çağrıyı aynı anda göstermek sırayı belirsizleştirirdi. */}
      {guard.session.identityStatus === "kps_verified" && !guard.session.isStaff ? (
        <Alert role="status">
          <BadgeCheckIcon aria-hidden="true" />
          <AlertTitle>{staffCopy.entry.title}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{staffCopy.entry.description}</span>
            <Link href="/personel-dogrulama" className="font-medium underline underline-offset-4">
              {staffCopy.entry.cta}
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

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

        {/* Google'dan dönüş sonucu — başarı da hata da aynı yerde görünür. */}
        {googleResult ? (
          <FormAlert message={googleResult.message} variant={googleResult.variant} />
        ) : null}

        <LoginMethodsCard
          methods={{
            hasPassword: methods?.hasPassword ?? false,
            hasGoogle: methods?.hasGoogle ?? false,
            googleLinkedAtLabel: methods?.googleLinkedAt
              ? formatIstanbulDate(methods.googleLinkedAt)
              : null,
            googleAvailable: isGoogleLoginConfigured(),
            accountLabel: profile?.email ?? guard.session.fullName,
          }}
        />

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

          {/*
            Veri hakları kartı (adım 17b · KVKK m.11). Bu bağlantı hesabın en
            yıkıcı işlemine (silme) giden yol, ama GİZLENMİYOR: bir hakkı
            kullanmayı zorlaştırmak, o hakkı vermemenin yumuşak hâlidir.
          */}
          <RecordLinkCard
            href="/hesabim/verilerim"
            title={accountCopy.entry.title}
            description={accountCopy.entry.description}
          />
        </div>
      </section>
    </main>
  );
}

/**
 * `?google=…` değerini ekrandaki cümleye çevirir.
 *
 * SABİT LİSTE: metin adres çubuğundan GELMİYOR, yalnızca hangi metnin
 * gösterileceği seçiliyor. Tanınmayan değer `null` döner ve hiçbir şey
 * çizilmez — kurcalayan biri ekrana kendi cümlesini yazdıramaz.
 */
function readGoogleResult(
  params: Record<string, string | string[] | undefined>,
): { message: string; variant: "error" | "info" } | null {
  const raw = params.google;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const copy = profileCopy.loginMethods.result;

  switch (value) {
    case "baglandi":
      return { message: copy.linked, variant: "info" };
    case "baska_hesaba_bagli":
      return { message: copy.linkedToOtherAccount, variant: "error" };
    case "oturum_degisti":
      return { message: copy.sessionChanged, variant: "error" };
    case "basarisiz":
      return { message: copy.failed, variant: "error" };
    default:
      return null;
  }
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
