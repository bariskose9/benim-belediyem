import Link from "next/link";
import {
  ArrowRightIcon,
  DumbbellIcon,
  LifeBuoyIcon,
  ShoppingCartIcon,
  StethoscopeIcon,
  TicketIcon,
  UtensilsCrossedIcon,
  type LucideIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { serviceCards, type ServiceKey } from "@/config/navigation";
import { getCurrentSession } from "@/features/auth/services/session-context";
import { cn } from "@/lib/utils";

/**
 * Ana sayfa — tanıtım bölümü + hizmet ızgarası.
 *
 * Üst menü zaten oturumu okuduğu için sayfa hâlihazırda dinamik; buradaki
 * ikinci okuma ek maliyet getirmiyor (aynı istek içinde önbelleklenir) ama
 * girişli kullanıcıya "kayıt olun" demeyi engelliyor.
 */
export const dynamic = "force-dynamic";

const copy = messages.home;

/** İkonlar YAPILANDIRMADA değil burada: `navigation.ts` arayüzden bağımsız kalsın. */
const serviceIcons: Record<ServiceKey, LucideIcon> = {
  market: ShoppingCartIcon,
  restaurant: UtensilsCrossedIcon,
  events: TicketIcon,
  support: LifeBuoyIcon,
  hospital: StethoscopeIcon,
  gym: DumbbellIcon,
};

export default async function HomePage() {
  const session = await getCurrentSession();

  return (
    <main className="page-shell flex flex-col gap-12 py-10 md:py-14">
      <section className="flex flex-col items-start gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
          {copy.heading}
        </h1>
        <p className="max-w-prose text-base text-muted-foreground">{copy.intro}</p>

        <div className="flex flex-wrap gap-3">
          {session ? (
            <Link href="/hesabim" className={cn(buttonVariants({ size: "lg" }), "min-h-11 px-5")}>
              {copy.ctaAccount}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link href="/kayit" className={cn(buttonVariants({ size: "lg" }), "min-h-11 px-5")}>
                {copy.ctaRegister}
                <ArrowRightIcon aria-hidden="true" />
              </Link>
              <Link
                href="/giris"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-h-11 px-5")}
              >
                {copy.ctaLogin}
              </Link>
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="hizmetler" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="hizmetler" className="text-xl font-semibold tracking-tight">
            {copy.servicesHeading}
          </h2>
          <p className="text-sm text-muted-foreground">{copy.servicesIntro}</p>
        </div>

        {/* Mobil önce tek sütun; yer açıldıkça ikiye ve üçe çıkar. */}
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {serviceCards.map((service) => (
            <ServiceTile
              key={service.key}
              serviceKey={service.key}
              href={service.href}
              staffOnly={service.staffOnly}
            />
          ))}
        </ul>
      </section>
    </main>
  );
}

/**
 * Hizmet kartı.
 *
 * Sayfası olmayan hizmet BAĞLANTI DEĞİL: tıklanınca 404 veren bir kart,
 * kartın hiç olmamasından kötüdür. Durum ayrıca metinle yazıyor ("Yakında"),
 * çünkü bilgi yalnızca renkle aktarılmaz (07-ui-design-system.md).
 */
function ServiceTile({
  serviceKey,
  href,
  staffOnly,
}: {
  serviceKey: ServiceKey;
  href: string | null;
  staffOnly: boolean;
}) {
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

  const tileClassName =
    "flex h-full flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10";

  return (
    <li className="flex">
      {href ? (
        <Link
          href={href}
          className={cn(
            tileClassName,
            "w-full transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {body}
        </Link>
      ) : (
        <div className={cn(tileClassName, "w-full")}>{body}</div>
      )}
    </li>
  );
}
