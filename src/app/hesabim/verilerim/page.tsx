import type { Metadata } from "next";
import Link from "next/link";

import { messages } from "@/config/messages";
import { AccountDeletionCard } from "@/features/account/components/AccountDeletionCard";
import { DataExportCard } from "@/features/account/components/DataExportCard";
import { IdentityUnlinkCard } from "@/features/account/components/IdentityUnlinkCard";
import { PhoneForm } from "@/features/account/components/PhoneForm";
import { readAccountDeletionState } from "@/features/account/services/account-deletion.service";
import { readIdentityUnlinkState } from "@/features/account/services/identity-unlink.service";
import { findExportProfile } from "@/features/account/repositories/data-export.repository";
import { guardPage } from "@/features/auth/services/page-guard";

/**
 * "Verilerim ve hesabım" — KVKK m.11'in tanıdığı hakların kullanıldığı ekran
 * (PRD §5.11 · ADR-017 · adım 17b).
 *
 * IDOR KORUMASI TASARIM GEREĞİ: sayfa hiçbir kullanıcı kimliği parametresi
 * almıyor; her şey oturumdaki kimlikten okunuyor.
 *
 * ⛔ KADEME `authenticated`, `identity_verified` DEĞİL. Kimliği doğrulanmamış
 * bir kullanıcı da verisini indirebilmeli ve hesabını silebilmeli — KVKK m.11
 * bu hakkı doğrulama durumuna bağlamıyor.
 *
 * KARTLARIN SIRASI BİLİNÇLİ: en zararsızdan en yıkıcıya doğru (indir →
 * telefon → kimlik → sil). Silme kartı en altta ve tek kırmızı çerçeveli
 * bileşen; kullanıcı yanlışlıkla ona çarpmasın.
 */
export const dynamic = "force-dynamic";

const copy = messages.account.page;

export const metadata: Metadata = { title: copy.pageTitle };

export default async function AccountDataPage() {
  const guard = await guardPage("authenticated", "/hesabim/verilerim");

  if (!guard.allowed) return null;

  // Üçü birbirinden bağımsız: sırayla beklemek sayfayı boşuna yavaşlatırdı.
  const [profile, identityState, deletionState] = await Promise.all([
    findExportProfile(guard.session.userId),
    readIdentityUnlinkState(guard.session.userId),
    readAccountDeletionState({ userId: guard.session.userId, now: new Date() }),
  ]);

  // Hesap bu arada silinmişse oturum da geçersizdir; boş bir iskelet çizmek
  // yerine sayfa hiç çizilmiyor ve kullanıcı bir sonraki istekte girişe düşüyor.
  if (!profile || !identityState || !deletionState) return null;

  return (
    <main className="page-shell flex flex-col gap-6 py-8">
      <header className="flex flex-col gap-2">
        <Link
          href="/hesabim"
          className="inline-flex min-h-11 items-center text-base font-medium text-primary underline-offset-4 hover:underline"
        >
          ← {copy.backToAccount}
        </Link>
        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
      </header>

      <DataExportCard />

      <PhoneForm currentPhone={profile.phone} isVerified={profile.phoneVerifiedAt !== null} />

      <IdentityUnlinkCard state={identityState} />

      <AccountDeletionCard state={deletionState} />
    </main>
  );
}
