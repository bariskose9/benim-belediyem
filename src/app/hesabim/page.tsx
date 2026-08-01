import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messages } from "@/config/messages";
import { findAccountProfile } from "@/features/auth/repositories/user.repository";
import { guardPage } from "@/features/auth/services/page-guard";

/**
 * Hesabım — kullanıcının YALNIZCA kendi kaydı.
 *
 * IDOR KORUMASI TASARIM GEREĞİ (05-auth-security.md): sayfa hiçbir kullanıcı
 * kimliği parametresi almıyor. Kimlik oturumdan geliyor, dolayısıyla
 * "başkasının kaydını iste" diyebileceği bir yüzey yok — bir sahiplik
 * kontrolünü unutma ihtimali de yok.
 *
 * Kimlik numarası burada da MASKELİ gösteriliyor; şifreli hâli hiç okunmuyor.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: messages.auth.account.pageTitle,
};

const copy = messages.auth.account;

export default async function AccountPage() {
  const guard = await guardPage("authenticated", "/hesabim");

  // `authenticated` kademesinde tek ret sebebi girişsizlik ve o zaten
  // yönlendirmeyle bitiyor; buraya gelen istek her zaman izinlidir.
  if (!guard.allowed) return null;

  const profile = await findAccountProfile(guard.session.userId);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
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

      <p className="text-sm text-muted-foreground">{copy.maskedNotice}</p>
    </main>
  );
}

/** Boş alan "—" ile gösterilir; boş satır kullanıcıya "yükleniyor" hissi verir. */
function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="text-sm text-muted-foreground sm:w-48 sm:shrink-0">{label}</dt>
      <dd className="text-sm font-medium break-words">{value ?? "—"}</dd>
    </div>
  );
}
