import type { Metadata } from "next";
import Link from "next/link";

import { messages } from "@/config/messages";
import { guardPage } from "@/features/auth/services/page-guard";
import { AddressList } from "@/features/profile/components/AddressList";
import { listUserAddresses } from "@/features/profile/services/address.service";

/**
 * Teslimat adresleri (PRD §5.0: "Nüfus adresi ile teslimat adresi ayrıdır.
 * Teslimat adresini kullanıcı kendi girer").
 *
 * IDOR KORUMASI TASARIM GEREĞİ: sayfa hiçbir kullanıcı kimliği parametresi
 * almıyor; liste oturumdaki kimliğe göre üretiliyor.
 *
 * `force-dynamic`: liste kullanıcıya özel ve her yazmadan sonra değişiyor.
 * Önbelleklenen bir sayfa başka bir kullanıcıya servis edilebilirdi.
 */
export const dynamic = "force-dynamic";

const copy = messages.profile.addresses;

export const metadata: Metadata = { title: copy.pageTitle };

export default async function AddressesPage() {
  const guard = await guardPage("authenticated", "/hesabim/adreslerim");

  // `authenticated` kademesinde tek ret sebebi girişsizlik ve onu `guardPage`
  // yönlendirmeyle çözüyor; buraya reddedilmiş hâlde gelinmiyor.
  if (!guard.allowed) return null;

  const addresses = await listUserAddresses(guard.session.userId);

  return (
    <main className="page-shell flex flex-col gap-8 py-8">
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

      <AddressList addresses={addresses} />
    </main>
  );
}
