import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CalendarIcon, MapPinIcon, UserRoundIcon } from "lucide-react";

import { messages } from "@/config/messages";
import { getCurrentSession } from "@/features/auth/services/session-context";
import { SeatMap, SignInToSelect } from "@/features/events/components/SeatMap";
import { findEventDetail } from "@/features/events/repositories/event.repository";
import { formatIstanbulDateTime } from "@/lib/datetime";
import { formatTry } from "@/lib/money";

/**
 * Etkinlik detayı ve salon planı (PRD §5.2).
 *
 * GİRİŞ ZORUNLU DEĞİL: ziyaretçi de salonun doluluğunu görebilir. Kapı koltuğa
 * BASILDIĞINDA devreye giriyor — o da bir tercih değil, veri modelinin sonucu:
 * `seat_reservations.user_id` zorunlu, yani ziyaretçi adına kilit yazılamaz.
 * Ekranı tamamen girişe kapatmak, kullanıcıya "salon dolu mu" sorusunu bile
 * sordurmazdı.
 *
 * SAYFA HER İSTEKTE TAZE: koltuk durumu saniyeler içinde değişiyor ve
 * önbelleklenmiş bir salon planı kullanıcıya dolu koltuğu boş gösterirdi.
 */
export const dynamic = "force-dynamic";

const copy = messages.events;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const event = await findEventDetail({
    eventId: (await params).eventId,
    viewerId: null,
    now: new Date(),
  });

  return { title: event ? event.name : copy.pageTitle };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await getCurrentSession();

  const event = await findEventDetail({
    eventId,
    viewerId: session?.userId ?? null,
    now: new Date(),
  });

  // Olmayan etkinlik 404 veriyor; uydurma bir kimlik girildiğinde 500 değil.
  if (!event) notFound();

  const canSelect = !event.hasStarted && event.availableSeatCount > 0;

  return (
    <main className="page-shell flex flex-col gap-8 py-8">
      <Link
        href="/etkinlikler"
        className="flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {copy.detail.backToList}
      </Link>

      <header className="flex flex-col gap-2">
        <span className="w-fit rounded-md bg-brand-surface px-2 py-1 text-xs font-medium text-brand-surface-foreground">
          {copy.categories[event.category]}
        </span>

        <h1 className="font-heading text-3xl font-bold tracking-tight">{event.name}</h1>

        <dl className="flex flex-col gap-1 text-base text-muted-foreground">
          <div className="flex items-center gap-2">
            <dt className="sr-only">{copy.detail.performerHeading}</dt>
            <UserRoundIcon aria-hidden="true" className="size-4 shrink-0" />
            <dd>{event.performer}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">{copy.detail.dateHeading}</dt>
            <CalendarIcon aria-hidden="true" className="size-4 shrink-0" />
            <dd>{formatIstanbulDateTime(event.startsAt)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">{copy.detail.venueHeading}</dt>
            <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
            <dd>
              {event.venueName} — {event.venueAddress}
            </dd>
          </div>
        </dl>

        <p className="pt-2 font-heading text-xl font-semibold">
          {copy.card.priceFrom(formatTry(event.basePriceKurus))}
        </p>
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="salon-plani">
        <div className="flex flex-col gap-2">
          <h2 id="salon-plani" className="font-heading text-xl font-semibold tracking-tight">
            {copy.detail.seatMapHeading}
          </h2>
          <p className="max-w-prose text-base text-muted-foreground">{copy.detail.seatMapHelp}</p>
        </div>

        {/*
          Üç durum da AÇIKÇA yazılıyor (07-ui-design-system.md: her ekranda
          yükleniyor / boş / hata durumu tanımlıdır). Salon planı üçünde de
          çiziliyor; değişen yalnızca seçim yapılabilir olup olmadığı.
        */}
        {event.hasStarted ? (
          <p role="status" className="rounded-lg bg-muted px-3 py-2 text-base">
            {copy.detail.started}
          </p>
        ) : event.availableSeatCount === 0 ? (
          <p role="status" className="rounded-lg bg-muted px-3 py-2 text-base">
            {copy.detail.soldOut}
          </p>
        ) : !session ? (
          <SignInToSelect returnPath={`/etkinlikler/${event.id}`} />
        ) : null}

        <SeatMap
          eventId={event.id}
          blocks={event.blocks}
          isSignedIn={session !== null}
          canSelect={canSelect}
        />
      </section>
    </main>
  );
}
