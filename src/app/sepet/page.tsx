import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, ShoppingCartIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { getCurrentSession } from "@/features/auth/services/session-context";
import { CartLines } from "@/features/cart/components/CartLines";
import { readCartOwner } from "@/features/cart/services/cart-context";
import { getCartSummary } from "@/features/cart/services/cart.service";
import type { CartSection } from "@/features/cart/types";
import { formatTry } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Ortak sepet (PRD §4 · §6.1).
 *
 * GİRİŞ ZORUNLU DEĞİL: ziyaretçi de sepet görebilir ve doldurabilir; sepeti
 * `bb_anon` çerezi taşıyor ve giriş yapıldığında hesaptaki sepetle
 * birleşiyor. Zorunluluk ödemede başlıyor — bu yüzden sayfada `guardPage`
 * yok, ama "ödemeye geç" düğmesi girişsiz kullanıcıyı giriş ekranına yolluyor.
 *
 * TUTARLAR SUNUCUDA HESAPLANIYOR (`summarizeCart`) ve ödeme servisi de aynı
 * fonksiyonu çağırıyor: ekranda görünen toplamla tahsil edilen toplam tek
 * kaynaktan geliyor.
 */
export const dynamic = "force-dynamic";

const copy = messages.cart;

export const metadata: Metadata = { title: copy.pageTitle };

export default async function CartPage() {
  const [owner, session] = await Promise.all([readCartOwner(), getCurrentSession()]);

  /**
   * SAHİP YOKSA ÇEREZ ÜRETİLMEZ. Sunucu bileşeninde çerez yazmak Next.js'te
   * istisna fırlatıyor; siteye ilk kez giren ziyaretçi bu yüzden boş sepet
   * görüyor ve kimliği ilk yazma isteğinde (uçta) üretiliyor.
   */
  const summary = owner
    ? await getCartSummary(owner, new Date())
    : {
        cartId: "",
        sections: [],
        subtotalKurus: 0,
        deliveryFeeKurus: 0,
        totalKurus: 0,
        lineCount: 0,
        hasBlockedLines: false,
      };

  return (
    <main className="page-shell flex flex-col gap-8 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
      </header>

      {summary.lineCount === 0 ? (
        <EmptyCart />
      ) : (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex flex-1 flex-col gap-8">
            {summary.sections.map((section) => (
              <Section key={section.itemType} section={section} />
            ))}
          </div>

          <OrderSummary summary={summary} isSignedIn={session !== null} />
        </div>
      )}
    </main>
  );
}

function EmptyCart() {
  return (
    <div
      role="status"
      className="flex flex-col items-start gap-4 rounded-xl bg-card p-8 ring-1 ring-foreground/10"
    >
      <span className="flex size-12 items-center justify-center rounded-lg bg-brand-surface text-brand-surface-foreground">
        <ShoppingCartIcon aria-hidden="true" className="size-6" />
      </span>
      <h2 className="font-heading text-xl font-semibold">{copy.empty.title}</h2>
      <p className="text-base text-muted-foreground">{copy.empty.description}</p>
      <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>
        {copy.empty.cta}
      </Link>
    </div>
  );
}

/** Bir modülün bölümü — başlık, satırlar ve o modülün ara toplamı. */
function Section({ section }: { section: CartSection }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={`bolum-${section.itemType}`}>
      <h2
        id={`bolum-${section.itemType}`}
        className="font-heading text-xl font-semibold tracking-tight"
      >
        {copy.sections[section.itemType]}
      </h2>

      {/*
        Mutfak notu yalnızca restoran satırlarında düzenlenebiliyor (PRD §5.4):
        market ürününe not bırakmanın karşılığı yok ve her satırda bir not
        alanı göstermek kullanıcıya yazdığının işe yaradığını düşündürürdü.
      */}
      <CartLines lines={section.lines} allowNoteEditing={section.itemType === "restaurant"} />

      <dl className="flex flex-col gap-1 text-sm">
        <Row label={copy.summary.subtotal} value={formatTry(section.subtotalKurus)} />
        {/* Bilet teslim edilmediği için ücret satırı hiç gösterilmiyor. */}
        {section.itemType !== "event" ? (
          <Row
            label={copy.summary.deliveryFee}
            value={
              section.deliveryFeeKurus === 0
                ? copy.summary.freeDelivery
                : formatTry(section.deliveryFeeKurus)
            }
          />
        ) : null}
      </dl>

      {/* Eşiğe ne kadar kaldığını söylemek kullanıcıyı tahmin ettirmez. */}
      {section.freeDeliveryRemainingKurus !== null ? (
        <p className="rounded-lg bg-brand-surface px-3 py-2 text-sm text-brand-surface-foreground">
          {copy.summary.freeDeliveryHint(
            formatTry(section.freeDeliveryRemainingKurus),
            copy.sections[section.itemType],
          )}
        </p>
      ) : null}
    </section>
  );
}

function OrderSummary({
  summary,
  isSignedIn,
}: {
  summary: Awaited<ReturnType<typeof getCartSummary>>;
  isSignedIn: boolean;
}) {
  return (
    <aside className="flex w-full flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10 lg:sticky lg:top-4 lg:w-80">
      <h2 className="font-heading text-lg font-semibold">{copy.summary.heading}</h2>

      <dl className="flex flex-col gap-2">
        <Row label={copy.summary.subtotal} value={formatTry(summary.subtotalKurus)} />
        <Row
          label={copy.summary.deliveryFee}
          value={
            summary.deliveryFeeKurus === 0
              ? copy.summary.freeDelivery
              : formatTry(summary.deliveryFeeKurus)
          }
        />
        <div className="mt-2 flex items-baseline justify-between border-t border-foreground/10 pt-3">
          <dt className="text-base font-semibold">{copy.summary.total}</dt>
          <dd className="text-lg font-bold tabular-nums">{formatTry(summary.totalKurus)}</dd>
        </div>
      </dl>

      {/*
        Satın alınamayan satır varken ödemeye geçilemez. Düğmeyi gizlemek
        koruma DEĞİL — sunucu da aynı kontrolü yapıyor (`assertCartIsPayable`);
        buradaki yalnızca kullanıcıyı boşuna uğraştırmamak için.
      */}
      {summary.hasBlockedLines ? (
        <p role="status" className="text-sm font-medium text-destructive">
          {copy.errors.unavailable}
        </p>
      ) : (
        <Link
          href={isSignedIn ? "/odeme" : "/giris?durum=giris-gerekli&donus=%2Fodeme"}
          className={cn(buttonVariants({ size: "lg" }), "min-h-11 w-full")}
        >
          {isSignedIn ? copy.summary.checkout : copy.summary.signInToCheckout}
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      )}
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
