import type { Metadata } from "next";

import { publicEnv } from "@/config/env";
import { messages } from "@/config/messages";
import { guardPage } from "@/features/auth/services/page-guard";
import { NewTicketForm } from "@/features/support/components/NewTicketForm";
import { TicketCard } from "@/features/support/components/TicketCard";
import { listSupportTickets } from "@/features/support/services/support-ticket.service";

/**
 * Destek talepleri — YALNIZCA kullanıcının kendi talepleri (PRD §5.7).
 *
 * IDOR KORUMASI TASARIM GEREĞİ (`/siparislerim` ile aynı desen): sayfa hiçbir
 * kullanıcı kimliği parametresi almıyor. Kimlik oturumdan geliyor, dolayısıyla
 * "başkasının talebini göster" diyebileceği bir yüzey yok ve unutulabilecek
 * bir sahiplik kontrolü de yok.
 *
 * KADEME `authenticated`: PRD §5.0 erişim tablosunda destek üç kademede de
 * açık — kimlik doğrulaması veya personel şartı yok.
 *
 * `force-dynamic`: durum talebin yaşından hesaplanıyor (ADR-013), yani cevap
 * ZAMANA bağlı. Önbelleklenen bir sayfa "Açık"ta donup kalırdı.
 */
export const dynamic = "force-dynamic";

const copy = messages.support;

export const metadata: Metadata = { title: copy.pageTitle };

export default async function SupportPage() {
  const guard = await guardPage("authenticated", "/destek");

  // `authenticated` kademesinde tek ret sebebi "giriş yapılmamış" ve onu
  // `guardPage` yönlendirmeyle çözüyor; buraya reddedilmiş hâlde gelinmiyor.
  if (!guard.allowed) return null;

  const tickets = await listSupportTickets({ userId: guard.session.userId, now: new Date() });

  return (
    <main className="page-shell flex flex-col gap-8 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
        {/*
          Simülasyon olduğu EKRANDA yazıyor: yönetici paneli yok (teknik borç
          #4) ve durum zamanla türetiliyor. Kullanıcının gerçek bir görevlinin
          baktığını sanması yanıltıcı olurdu (14-privacy-and-compliance.md).
        */}
        <p className="max-w-prose rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {copy.simulationNotice}
        </p>
      </header>

      <NewTicketForm turnstileSiteKey={publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />

      <section aria-labelledby="talep-listesi" className="flex flex-col gap-4">
        <h2 id="talep-listesi" className="font-heading text-xl font-semibold tracking-tight">
          {copy.listHeading}
        </h2>

        {tickets.length === 0 ? <EmptyState /> : null}

        {tickets.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <TicketCard ticket={ticket} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}

/**
 * Boş durum: kullanıcıya "hiçbir şey yok" demekle kalmayıp NE YAPACAĞINI da
 * söylüyor (07-ui-design-system.md: her ekranda yükleniyor/boş/hata).
 */
function EmptyState() {
  return (
    <section
      role="status"
      className="flex flex-col gap-2 rounded-xl bg-card p-6 ring-1 ring-foreground/10"
    >
      <h3 className="font-heading text-lg font-semibold tracking-tight">{copy.empty.title}</h3>
      <p className="max-w-prose text-base text-muted-foreground">{copy.empty.description}</p>
    </section>
  );
}
