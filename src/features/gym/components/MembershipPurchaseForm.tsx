"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import { FormAlert } from "@/features/auth/components/FormAlert";
import type { MembershipPlanOffer } from "@/features/gym/types";
import {
  CardPicker,
  emptyCardForm,
  toCardPayload,
  type CardFormState,
  type SavedCardOption,
} from "@/features/payment/components/CardPicker";
import { formatTry } from "@/lib/money";

/**
 * Üyelik başlatma formu (PRD §5.6).
 *
 * ═══ ÜÇ ŞEY AYNI EKRANDA, ONAYDAN ÖNCE ═══
 *  1. bugün tahsil edilecek tutar
 *  2. taahhüt süresi
 *  3. erken çıkarsa ne olacağı (ay başına fark, TL cinsinden)
 * PRD "bu kural satın alma öncesi ekranda açıkça gösterilir" diyor. Onay
 * kutusu bu metnin ALTINDA ve işaretlenmeden düğme çalışmıyor; sunucu da
 * aynı onayı bağımsız olarak arıyor (`acceptedTerms`).
 *
 * ÇİFT TAHSİLAT KORUMASI İKİ KATMANLI — ödeme formundaki desenin aynısı:
 * düğme istek sürerken devre dışı, `idempotencyKey` deneme boyunca sabit ve
 * yalnızca deneme SONUÇLANINCA yenileniyor.
 */

const copy = messages.gym;

export type MembershipPurchaseFormProps = {
  plan: MembershipPlanOffer;
  /** Taahhütsüz paketle aradaki aylık fark — erken çıkış metni bunu gösteriyor. */
  monthlyGapKurus: number;
  savedCards: readonly SavedCardOption[];
};

export function MembershipPurchaseForm(props: MembershipPurchaseFormProps) {
  const router = useRouter();

  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [card, setCard] = useState<CardFormState>(() => emptyCardForm(props.savedCards));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const result = await apiRequest<{ id: string }>("/api/memberships", {
      method: "POST",
      body: {
        planId: props.plan.id,
        idempotencyKey,
        acceptedTerms,
        card: toCardPayload(card),
      },
    });

    setIsPending(false);

    if (!result.ok) {
      setError(result.message);
      // Deneme sonuçlandı: sonraki deneme yeni anahtarla gitmeli, yoksa
      // kullanıcı başka kart denese bile "bu işlem zaten yapılmış" alır.
      setIdempotencyKey(crypto.randomUUID());

      return;
    }

    toast.success(copy.toast.created);
    router.push("/spor-salonu/uyelik");
    // Sunucuda çizilen sayfa istemci bir şey yazdıktan sonra kendiliğinden
    // tazelenmiyor; yeni üyelik görünsün diye açıkça isteniyor.
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {/* KALICI UYARI: kullanıcı gerçek kart bilgisi girmemeli. */}
      <p
        role="status"
        className="rounded-lg bg-brand-surface px-4 py-3 text-sm text-brand-surface-foreground"
      >
        {messages.payment.fakeNotice}
      </p>

      <FormAlert message={error} />

      <section className="flex flex-col gap-3" aria-labelledby="taahhut">
        <h2 id="taahhut" className="font-heading text-lg font-semibold">
          {copy.purchase.termsHeading}
        </h2>

        <p className="max-w-prose text-base text-muted-foreground">
          {props.plan.commitmentMonths === 0
            ? copy.purchase.termsNoCommitment
            : copy.purchase.termsCommitment(
                props.plan.commitmentMonths,
                formatTry(props.monthlyGapKurus),
              )}
        </p>

        <label className="flex min-h-11 items-start gap-3">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-1 size-4"
          />
          <span className="text-base">{copy.purchase.termsAccept}</span>
        </label>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="kart">
        <h2 id="kart" className="font-heading text-lg font-semibold">
          {messages.payment.card.heading}
        </h2>

        <p className="max-w-prose text-sm text-muted-foreground">{copy.purchase.cardSaveNotice}</p>

        {/*
          "Kartımı kaydet" kutusu YOK: üyelikte kart zorunlu olarak kaydediliyor
          (yukarıdaki bilgi metni bunu söylüyor). İşaretlenmediğinde çalışmayacak
          bir kutu göstermek yanıltıcı olurdu.
        */}
        <CardPicker savedCards={props.savedCards} value={card} onChange={setCard} />
      </section>

      <Button type="submit" size="lg" className="min-h-11" disabled={isPending || !acceptedTerms}>
        {isPending
          ? copy.purchase.submitting
          : `${copy.purchase.submit} · ${formatTry(props.plan.monthlyPriceKurus)}`}
      </Button>
    </form>
  );
}
