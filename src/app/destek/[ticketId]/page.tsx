import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { messages } from "@/config/messages";
import { guardPage } from "@/features/auth/services/page-guard";
import { SupportTicketNotFoundError } from "@/features/support/errors";
import { AttachmentGallery } from "@/features/support/components/AttachmentGallery";
import { CloseTicketButton } from "@/features/support/components/CloseTicketButton";
import { TicketStatusTrack } from "@/features/support/components/TicketStatusTrack";
import { getSupportTicket } from "@/features/support/services/support-ticket.service";
import { formatIstanbulDateTime, formatIstanbulTime, toMachineDateTime } from "@/lib/datetime";

/**
 * Tek destek talebi (PRD §5.7).
 *
 * ═══ KABUL KRİTERİ BU SAYFADA ═══
 *
 * "Kullanıcı başkasının talebini göremez." Sahiplik SORGUNUN İÇİNDE
 * (`findTicketForUser`); başkasının kimliğiyle açılan adres 404 sayfası
 * gösterir ve talebin var olup olmadığı dışarıdan anlaşılamaz.
 *
 * KADEME `authenticated` (PRD §5.0 erişim tablosu).
 *
 * `force-dynamic`: durum talebin yaşından hesaplanıyor (ADR-013).
 */
export const dynamic = "force-dynamic";

const copy = messages.support;

export const metadata: Metadata = { title: copy.pageTitle };

export default async function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const guard = await guardPage("authenticated", `/destek/${ticketId}`);

  if (!guard.allowed) return null;

  const ticket = await loadTicket(guard.session.userId, ticketId);

  return (
    <main className="page-shell flex flex-col gap-6 py-8">
      <Link
        href="/destek"
        className="w-fit text-sm font-medium text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {copy.backToList}
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
          {ticket.subject}
        </h1>
        <p className="text-sm text-muted-foreground">{copy.ticketCode(ticket.code)}</p>
        <p className="text-sm text-muted-foreground">
          <time dateTime={toMachineDateTime(ticket.createdAt)}>
            {copy.createdAt(formatIstanbulDateTime(ticket.createdAt))}
          </time>
        </p>
      </header>

      <TicketStatusTrack status={ticket.status} />

      {/*
        Bir sonraki aşamanın saati yalnızca talep ilerlerken gösteriliyor ve
        metin "tahmini" diyor. Kesin bir saat vaadi, tutulmadığında haklı bir
        şikâyete dönüşürdü (sipariş kartındaki aynı karar).
      */}
      {ticket.nextStageAt ? (
        <p className="text-sm text-muted-foreground">
          <time dateTime={toMachineDateTime(ticket.nextStageAt)}>
            {copy.nextStageAt(formatIstanbulTime(ticket.nextStageAt))}
          </time>
        </p>
      ) : null}

      {ticket.closedAt ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {copy.closedAt(formatIstanbulDateTime(ticket.closedAt))}
        </p>
      ) : null}

      {/* `whitespace-pre-line`: kullanıcının satır sonları korunur. Metin JSX
          içinde METİN olarak çiziliyor — React kaçışı yapıyor, HTML olarak
          yorumlanmıyor (XSS). */}
      <section aria-label={copy.form.descriptionLabel} className="flex flex-col gap-2">
        <p className="max-w-prose text-base whitespace-pre-line">{ticket.description}</p>
      </section>

      <section aria-labelledby="ekler" className="flex flex-col gap-3">
        <h2 id="ekler" className="font-heading text-lg font-semibold tracking-tight">
          {copy.attachmentsHeading}
        </h2>
        <AttachmentGallery attachments={ticket.attachments} />
      </section>

      {ticket.canClose ? (
        <CloseTicketButton ticketId={ticket.id} />
      ) : (
        <p className="text-sm text-muted-foreground">{copy.close.alreadyClosedNotice}</p>
      )}
    </main>
  );
}

/**
 * Talebi getirir; yoksa VEYA başkasınınsa 404 sayfası.
 *
 * Servis 404'ü bir istisnayla anlatıyor (HTTP ucu onu duruma çeviriyor);
 * sayfa tarafında karşılığı `notFound()`. İkisinin aynı hatadan türemesi,
 * kuralın tek yerde kalmasını sağlıyor.
 */
async function loadTicket(userId: string, ticketId: string) {
  try {
    return await getSupportTicket({ userId, ticketId, now: new Date() });
  } catch (error) {
    if (error instanceof SupportTicketNotFoundError) notFound();

    throw error;
  }
}
