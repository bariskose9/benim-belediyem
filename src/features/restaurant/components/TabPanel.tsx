import Link from "next/link";
import { ArrowRightIcon, ClockIcon, ReceiptTextIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { RESTAURANT_PREP_MINUTES_MAX, RESTAURANT_PREP_MINUTES_MIN } from "@/config/constants";
import { messages } from "@/config/messages";
import { CartLines } from "@/features/cart/components/CartLines";
import type { CartSection } from "@/features/cart/types";
import { formatTry } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * ADİSYON — sepetin restoran bölümünün kendisi (PRD §5.4).
 *
 * ═══ NEDEN AYRI BİR "ADİSYON" DEPOSU YOK ═══
 * Adisyon kalemleri doğrudan ortak sepete yazılıyor; bu panel onu okuyup
 * gösteriyor. Ayrı bir taslak liste tutulsaydı üç şey birden kaybolurdu:
 * sayfayı yenileyince adisyon uçardı, ziyaretçiden üyeye geçişte
 * birleştirilmezdi (PRD §4) ve adet/satılabilirlik kuralları ekranda ikinci
 * kez yazılmak zorunda kalırdı. "Adisyon sepete aktarılır" adımı bu yüzden
 * bir düğme değil, zaten olmuş bir durum: aşağıdaki bağlantı ödemeye götürür.
 *
 * SUNUCU BİLEŞENİ: satırlar sunucuda okunuyor, yalnızca adet/not kontrolleri
 * (`CartLines`) tarayıcıda çalışıyor.
 *
 * NOT DÜZENLEME AÇIK: mutfak notu yalnızca restoran satırlarında anlamlı.
 */

const copy = messages.restaurant.tab;

export function TabPanel({ section }: { section: CartSection | null }) {
  return (
    <aside
      aria-labelledby="adisyon"
      className="flex w-full flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10 lg:sticky lg:top-4 lg:w-96"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-surface text-brand-surface-foreground">
          <ReceiptTextIcon aria-hidden="true" className="size-5" />
        </span>
        <h2 id="adisyon" className="font-heading text-lg font-semibold">
          {copy.heading}
        </h2>
      </div>

      {section === null ? (
        /* Boş durum ekranda AÇIKÇA yazıyor (CLAUDE.md §5.7). */
        <p role="status" className="text-sm text-muted-foreground">
          {copy.empty}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{copy.description}</p>

          <CartLines lines={section.lines} allowNoteEditing />

          <dl className="flex flex-col gap-2 border-t border-foreground/10 pt-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">{copy.subtotal}</dt>
              <dd className="font-medium tabular-nums">{formatTry(section.subtotalKurus)}</dd>
            </div>

            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">{messages.cart.summary.deliveryFee}</dt>
              <dd className="font-medium tabular-nums">
                {section.deliveryFeeKurus === 0
                  ? messages.cart.summary.freeDelivery
                  : formatTry(section.deliveryFeeKurus)}
              </dd>
            </div>
          </dl>

          {/* Eşiğe ne kadar kaldığını söylemek kullanıcıyı tahmin ettirmez. */}
          {section.freeDeliveryRemainingKurus !== null ? (
            <p className="rounded-lg bg-brand-surface px-3 py-2 text-sm text-brand-surface-foreground">
              {messages.cart.summary.freeDeliveryHint(
                formatTry(section.freeDeliveryRemainingKurus),
                messages.cart.sections.restaurant,
              )}
            </p>
          ) : null}

          {/* Hazırlık süresi bir TAHMİN; sipariş kaydına yazılmıyor (PRD §5.4). */}
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ClockIcon aria-hidden="true" className="size-4 shrink-0" />
            {copy.prepTime(RESTAURANT_PREP_MINUTES_MIN, RESTAURANT_PREP_MINUTES_MAX)}
          </p>

          <Link href="/sepet" className={cn(buttonVariants({ size: "lg" }), "min-h-11 w-full")}>
            {copy.goToCart}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </>
      )}
    </aside>
  );
}
