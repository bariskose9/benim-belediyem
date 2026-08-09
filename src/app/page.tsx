import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { ServiceTile } from "@/components/layout/ServiceTile";
import { buttonVariants } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { serviceCards } from "@/config/navigation";
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
