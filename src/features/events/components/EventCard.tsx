import Link from "next/link";
import { CalendarIcon, MapPinIcon, UserRoundIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { messages } from "@/config/messages";
import type { EventListItem } from "@/features/events/types";
import { formatIstanbulDateTime } from "@/lib/datetime";
import { formatTry } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Tek etkinlik kartı.
 *
 * SUNUCU BİLEŞENİ: kartta etkileşim yok, koltuk seçimi detay sayfasında.
 * Market kartının aksine burada "sepete ekle" YOK ve bu bilinçli — bilet
 * koltuksuz satılmıyor (PRD §5.2), yani listeden doğrudan sepete atılamaz.
 *
 * GÖRSEL YOK: etkinliğin şemada bir görsel alanı yok (data-model.md) ve
 * uydurma bir afiş üretmek 12 etkinlik için karşılığı olmayan bir işti.
 * Kartın kimliğini tür rozeti, sanatçı ve mekân taşıyor.
 */

const copy = messages.events;

export function EventCard({ event }: { event: EventListItem }) {
  const isSoldOut = event.availableSeatCount === 0;

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-2">
        <span className="w-fit rounded-md bg-brand-surface px-2 py-1 text-xs font-medium text-brand-surface-foreground">
          {copy.categories[event.category]}
        </span>

        <h3 className="font-heading text-lg leading-snug font-semibold">{event.name}</h3>

        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserRoundIcon aria-hidden="true" className="size-4 shrink-0" />
          {event.performer}
        </p>

        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarIcon aria-hidden="true" className="size-4 shrink-0" />
          {/* Saat İstanbul'a çevriliyor; sunucunun kendi saat dilimine güvenilmiyor. */}
          {formatIstanbulDateTime(event.startsAt)}
        </p>

        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
          {event.venueName}
        </p>

        <p className="mt-auto pt-2 font-heading text-lg font-semibold">
          {copy.card.priceFrom(formatTry(event.basePriceKurus))}
        </p>

        {/*
          Boş koltuk sayısı SÜRESİ DOLMUŞ KİLİTLERİ BOŞ SAYAR (ADR-007):
          temizlik görevi hiç çalışmasa bile sayı doğrudur.

          Vurgu renkle değil kalınlıkla veriliyor — renk körü kullanıcı için de
          ayırt edilebilir kalsın (WCAG 1.4.1), market kartındaki desenin aynısı.
        */}
        <p className="text-sm font-medium">
          {isSoldOut ? copy.card.soldOut : copy.card.availableSeats(event.availableSeatCount)}
        </p>
      </CardContent>

      <CardFooter>
        {/*
          TÜKENMİŞ ETKİNLİKTE DE BAĞLANTI AÇIK: kullanıcı salon planına bakıp
          birinin kilidinin düşmesini bekleyebilir. Market ürününden farkı bu —
          orada tükenmiş ürün için yapılacak bir şey yok.
        */}
        <Link
          href={`/etkinlikler/${event.id}`}
          className={cn(
            buttonVariants({ variant: isSoldOut ? "outline" : "default" }),
            "min-h-11 w-full",
          )}
          aria-label={copy.card.detailsLabel(event.name)}
        >
          {copy.card.details}
        </Link>
      </CardFooter>
    </Card>
  );
}
