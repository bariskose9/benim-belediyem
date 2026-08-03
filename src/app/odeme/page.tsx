import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { messages } from "@/config/messages";
import { guardPage } from "@/features/auth/services/page-guard";
import { getCartSummary } from "@/features/cart/services/cart.service";
import { CheckoutForm } from "@/features/payment/components/CheckoutForm";
import { listAddresses, listSavedCards } from "@/features/payment/repositories/payment.repository";
import { buildDeliverySlots } from "@/features/payment/services/delivery-slots";
import { formatTry } from "@/lib/money";

/**
 * Ödeme ekranı (PRD §6.2).
 *
 * ÖDEME ADIMI GİRİŞ ZORUNLU (PRD §4) — sepet ziyaretçiye açık, tahsilat
 * değil. `guardPage("authenticated")` girişsiz kullanıcıyı dönüş adresiyle
 * giriş ekranına yolluyor; girdikten sonra buraya geri dönüyor ve ziyaretçi
 * sepeti de o sırada hesabına taşınmış oluyor.
 *
 * KİMLİK DOĞRULAMASI İSTENMİYOR: PRD §5.0'ın erişim kademeleri tablosunda
 * sipariş ve bilet doğrulanmamış kullanıcıya da açık; KPS doğrulaması
 * yalnızca hastane ve spor salonu için gerekiyor.
 */
export const dynamic = "force-dynamic";

const copy = messages.payment;

export const metadata: Metadata = { title: copy.pageTitle };

export default async function CheckoutPage() {
  const guard = await guardPage("authenticated", "/odeme");

  // `authenticated` kademesinde tek ret sebebi girişsizlik ve o zaten
  // yönlendirmeyle bitiyor; buraya gelen istek her zaman izinlidir.
  if (!guard.allowed) return null;

  const now = new Date();
  const summary = await getCartSummary({ userId: guard.session.userId }, now);

  // Boş sepetle ödeme ekranında durmanın anlamı yok; sunucu da aynı kontrolü
  // yapıyor (`assertCartIsPayable`), buradaki yalnızca kullanıcıyı doğru
  // yere göndermek için.
  if (summary.lineCount === 0) redirect("/sepet");

  const [savedCards, addresses] = await Promise.all([
    listSavedCards(guard.session.userId),
    listAddresses(guard.session.userId),
  ]);

  const needsDelivery = summary.sections.some((section) => section.itemType !== "event");

  return (
    <main className="page-shell flex flex-col gap-8 py-8 lg:flex-row lg:items-start">
      <div className="flex flex-1 flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
          <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
        </header>

        {/*
          Adresi olmayan kullanıcı market/restoran siparişini tamamlayamaz.
          Adres YÖNETİMİ profil sayfasının işi (adım 15); burada yalnızca
          eksikse yol gösteriliyor.
        */}
        {needsDelivery && addresses.length === 0 ? (
          <p role="status" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm">
            {copy.errors.addressRequired}{" "}
            <Link href="/sepet" className="font-medium underline underline-offset-4">
              {messages.cart.title}
            </Link>
          </p>
        ) : (
          <CheckoutForm
            totalKurus={summary.totalKurus}
            needsDelivery={needsDelivery}
            savedCards={savedCards}
            addresses={addresses}
            deliverySlots={buildDeliverySlots(now)}
          />
        )}
      </div>

      <aside className="flex w-full flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10 lg:sticky lg:top-4 lg:w-80">
        <h2 className="font-heading text-lg font-semibold">{messages.cart.summary.heading}</h2>

        <dl className="flex flex-col gap-2 text-sm">
          {summary.sections.map((section) => (
            <div key={section.itemType} className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">{messages.cart.sections[section.itemType]}</dt>
              <dd className="font-medium tabular-nums">{formatTry(section.subtotalKurus)}</dd>
            </div>
          ))}

          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{messages.cart.summary.deliveryFee}</dt>
            <dd className="font-medium tabular-nums">
              {summary.deliveryFeeKurus === 0
                ? messages.cart.summary.freeDelivery
                : formatTry(summary.deliveryFeeKurus)}
            </dd>
          </div>

          <div className="mt-2 flex items-baseline justify-between border-t border-foreground/10 pt-3">
            <dt className="text-base font-semibold">{messages.cart.summary.total}</dt>
            <dd className="text-lg font-bold tabular-nums">{formatTry(summary.totalKurus)}</dd>
          </div>
        </dl>

        <Link href="/sepet" className="text-sm underline underline-offset-4">
          {messages.cart.title}
        </Link>
      </aside>
    </main>
  );
}
