import type { Metadata } from "next";
import Link from "next/link";

import { messages } from "@/config/messages";
import { guardPage } from "@/features/auth/services/page-guard";
import { SavedCardList } from "@/features/profile/components/SavedCardList";
import { listUserSavedCards } from "@/features/profile/services/saved-card.service";

/**
 * Kayıtlı kartlar (teknik borç #41 · PRD §6.2).
 *
 * IDOR KORUMASI TASARIM GEREĞİ: sayfa hiçbir kullanıcı kimliği parametresi
 * almıyor; liste oturumdaki kimliğe göre üretiliyor.
 *
 * ⛔ EKRANDA TAM KART NUMARASI YOK ve olamaz: veritabanında da yok
 * (data-model.md → "tam kart numarası ASLA saklanmaz").
 */
export const dynamic = "force-dynamic";

const copy = messages.profile.cards;

export const metadata: Metadata = { title: copy.pageTitle };

export default async function SavedCardsPage() {
  const guard = await guardPage("authenticated", "/hesabim/kartlarim");

  if (!guard.allowed) return null;

  const cards = await listUserSavedCards(guard.session.userId);

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
        {/*
          Kullanıcı burada "kart ekle" düğmesi arayacak ve bulamayacak.
          Bulamamasının NEDENİ ekranda yazıyor — sessiz bir eksik, bilinçli bir
          karardan ayırt edilemez (07-ui-design-system.md).
        */}
        <p className="max-w-prose rounded-lg bg-muted px-3 py-2 text-base text-muted-foreground">
          {copy.addNotice}
        </p>
      </header>

      <SavedCardList cards={cards} />
    </main>
  );
}
