import Link from "next/link";

import { messages } from "@/config/messages";
import { TicketStatusTrack } from "@/features/support/components/TicketStatusTrack";
import type { SupportTicketView } from "@/features/support/services/support-ticket-view";
import { formatIstanbulDateTime, toMachineDateTime } from "@/lib/datetime";

/**
 * Listedeki tek talep kartı: başlık, durum çizgisi, ek sayısı ve detay bağlantısı.
 *
 * SUNUCU BİLEŞENİ: durum sunucuda hesaplanıp geliyor (`SupportTicketView`).
 * İstemcide hesaplansaydı tarayıcının saati değiştirilerek "çözüldü" görünen
 * bir talep elde edilebilirdi — gerçeği değiştirmezdi ama yanlış bilgi
 * gösterirdi.
 *
 * AÇIKLAMA METNİ LİSTEDE KIRPILIYOR: kullanıcı 2000 karakterlik bir açıklama
 * yazabiliyor ve liste okunabilir kalmalı. Tam metin detay sayfasında.
 */

const copy = messages.support;

export function TicketCard({ ticket }: { ticket: SupportTicketView }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <header className="flex flex-col gap-1">
        <h3 className="font-heading text-lg font-semibold tracking-tight">{ticket.subject}</h3>
        <p className="text-sm text-muted-foreground">{copy.ticketCode(ticket.code)}</p>
        <p className="text-sm text-muted-foreground">
          <time dateTime={toMachineDateTime(ticket.createdAt)}>
            {copy.createdAt(formatIstanbulDateTime(ticket.createdAt))}
          </time>
        </p>
      </header>

      <TicketStatusTrack status={ticket.status} />

      <p className="line-clamp-2 text-sm text-muted-foreground">{ticket.description}</p>

      {ticket.attachments.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          {copy.attachmentCount(ticket.attachments.length)}
        </p>
      ) : null}

      <Link
        href={`/destek/${ticket.id}`}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-muted px-4 text-sm font-medium transition-colors hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
      >
        {copy.detailAction}
      </Link>
    </article>
  );
}
