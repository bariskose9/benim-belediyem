import Link from "next/link";
import {
  DumbbellIcon,
  LifeBuoyIcon,
  ShoppingCartIcon,
  StethoscopeIcon,
  TicketIcon,
  UtensilsCrossedIcon,
  type LucideIcon,
} from "lucide-react";

import { messages } from "@/config/messages";
import type { ServiceKey } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * Ana sayfadaki hizmet kartı.
 *
 * ⛔ KURAL: SAYFASI OLMAYAN HİZMET BAĞLANTI DEĞİLDİR. Tıklanınca 404 veren bir
 * kart, kartın hiç olmamasından kötüdür; üstelik Next.js bağlantıları önceden
 * getirdiği için ana sayfa açılır açılmaz başarısız istekler düşerdi.
 * Durum ayrıca METİNLE yazıyor ("Yakında") — bilgi yalnızca renkle
 * aktarılmaz (07-ui-design-system.md · WCAG 2.1 AA).
 *
 * NEDEN `page.tsx`'TEN AYRI DOSYA (adım 13): destek hizmeti açılınca kapalı
 * hizmet KALMADI ve kuralı ölçen uçtan uca test örneksiz kaldı. Kural
 * kaybolmasın diye bileşen dışa taşındı; `tests/unit/service-tile.test.tsx`
 * onu uydurma bir kapalı kartla doğruluyor. Böylece kural, gerçekte kapalı
 * bir hizmet olmasa da korunuyor.
 */

/** İkonlar YAPILANDIRMADA değil burada: `navigation.ts` arayüzden bağımsız kalsın. */
const serviceIcons: Record<ServiceKey, LucideIcon> = {
  market: ShoppingCartIcon,
  restaurant: UtensilsCrossedIcon,
  events: TicketIcon,
  support: LifeBuoyIcon,
  hospital: StethoscopeIcon,
  gym: DumbbellIcon,
};

const TILE_CLASS_NAME =
  "flex h-full flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10";

export type ServiceTileProps = {
  serviceKey: ServiceKey;
  /** `null` ise sayfa henüz yok ve kart TIKLANABİLİR DEĞİLDİR. */
  href: string | null;
  staffOnly: boolean;
};

export function ServiceTile({ serviceKey, href, staffOnly }: ServiceTileProps) {
  const service = messages.services[serviceKey];
  const Icon = serviceIcons[serviceKey];

  const body = (
    <>
      <span className="flex size-10 items-center justify-center rounded-lg bg-brand-surface text-brand-surface-foreground">
        <Icon aria-hidden="true" className="size-5" />
      </span>

      <span className="flex flex-col gap-1">
        <span className="font-heading text-base font-medium">{service.title}</span>
        <span className="text-sm text-muted-foreground">{service.description}</span>
      </span>

      <span className="mt-auto flex flex-wrap items-center gap-2 text-xs font-medium">
        <span
          className={cn(
            "rounded-full px-2 py-0.5",
            href
              ? "bg-brand-surface text-brand-surface-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {href ? messages.badges.open : messages.badges.comingSoon}
        </span>
        {staffOnly ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {messages.badges.staffOnly}
          </span>
        ) : null}
      </span>
    </>
  );

  return (
    <li className="flex">
      {href ? (
        <Link
          href={href}
          className={cn(
            TILE_CLASS_NAME,
            "w-full transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {body}
        </Link>
      ) : (
        <div className={cn(TILE_CLASS_NAME, "w-full")}>{body}</div>
      )}
    </li>
  );
}
