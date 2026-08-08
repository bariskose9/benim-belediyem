import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2Icon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { guardPage } from "@/features/auth/services/page-guard";
import { findPaymentReceipt } from "@/features/payment/repositories/payment.repository";
import { formatIstanbulDateTime, toMachineDateTime } from "@/lib/datetime";
import { formatTry } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Ödeme sonrası onay ekranı ve SAHTE FİŞ (PRD §6.2 adım 6).
 *
 * İşlem kodu adres çubuğundan geliyor ama fiş SAHİPLİK KONTROLÜNDEN geçiyor:
 * `findPaymentReceipt` kaydı yalnızca oturumdaki kullanıcıya bağlıysa döner.
 * Kod tahmin edilse bile başkasının fişi okunamaz (IDOR).
 */
export const dynamic = "force-dynamic";

const copy = messages.payment.success;

export const metadata: Metadata = { title: copy.title };

/** Sipariş türlerinin Türkçe karşılıkları — enum değerleri İngilizce. */
const FULFILLMENT_LABELS = {
  market_delivery: messages.cart.sections.market,
  restaurant_delivery: messages.cart.sections.restaurant,
  ticket: messages.cart.sections.event,
} as const;

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const guard = await guardPage("authenticated", "/odeme/tamamlandi");

  if (!guard.allowed) return null;

  const params = await searchParams;
  const raw = params.islem;
  const transactionId = (Array.isArray(raw) ? raw[0] : raw)?.trim();

  if (!transactionId) notFound();

  const receipt = await findPaymentReceipt({
    userId: guard.session.userId,
    transactionId,
  });

  // Yok VEYA başkasına ait — ikisi de 404. Ayrıştırmak, kodun geçerli olup
  // olmadığını sızdırırdı.
  if (!receipt) notFound();

  return (
    <main className="page-shell flex max-w-2xl flex-col gap-6 py-8">
      <header className="flex flex-col items-start gap-3">
        <span className="flex size-12 items-center justify-center rounded-lg bg-brand-surface text-brand-surface-foreground">
          <CheckCircle2Icon aria-hidden="true" className="size-6" />
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="text-base text-muted-foreground">{copy.description}</p>
      </header>

      <section
        className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10"
        aria-labelledby="fis"
      >
        <h2 id="fis" className="font-heading text-lg font-semibold">
          {copy.receiptHeading}
        </h2>

        <dl className="flex flex-col gap-2 text-sm">
          <Row label={copy.transactionId} value={receipt.transactionId} />
          <Row
            label={messages.payment.card.heading}
            value={messages.payment.card.maskedLabel(
              messages.payment.card.brands[receipt.brand],
              receipt.cardLast4,
            )}
          />
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{messages.cart.summary.total}</dt>
            <dd className="text-base font-bold tabular-nums">{formatTry(receipt.amountKurus)}</dd>
          </div>
        </dl>

        <time
          dateTime={toMachineDateTime(receipt.attemptedAt)}
          className="text-sm text-muted-foreground"
        >
          {formatIstanbulDateTime(receipt.attemptedAt)}
        </time>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="siparisler">
        <h2 id="siparisler" className="font-heading text-lg font-semibold">
          {copy.orderHeading}
        </h2>

        {/*
          PRD §6.1: karışık sepet MODÜL BAŞINA AYRI SİPARİŞ üretir ve hepsi
          aynı ödemeye bağlıdır. Bu liste onun görünen kanıtı.
        */}
        <ul className="flex flex-col gap-2">
          {receipt.orders.map((order) => (
            <li
              key={order.id}
              className="flex items-baseline justify-between gap-4 rounded-lg bg-card p-4 ring-1 ring-foreground/10"
            >
              <span className="font-medium">{FULFILLMENT_LABELS[order.fulfillmentType]}</span>
              <span className="tabular-nums">{formatTry(order.totalKurus)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/*
        SİPARİŞ TAKİBİ ÖNCE, ANA SAYFA SONRA: ödemeyi tamamlayan kullanıcının
        bir sonraki sorusu "siparişim ne durumda" (PRD §5.5). Birincil eylem
        dolu düğme, ikincisi çerçeveli — ikisi de aynı ağırlıkta görünseydi
        kullanıcı hangisinin beklenen adım olduğunu okuyamazdı.
      */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/siparislerim"
          className={cn(buttonVariants({ variant: "default" }), "min-h-11 w-fit")}
        >
          {copy.viewOrders}
        </Link>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "min-h-11 w-fit")}>
          {copy.backToHome}
        </Link>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
