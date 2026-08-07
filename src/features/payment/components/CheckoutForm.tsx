"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { RESTAURANT_PREP_MINUTES_MAX, RESTAURANT_PREP_MINUTES_MIN } from "@/config/constants";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import { FormAlert } from "@/features/auth/components/FormAlert";
import { TextField } from "@/features/auth/components/TextField";
import type { CardBrand } from "@/generated/prisma/enums";
import { formatTry } from "@/lib/money";

/**
 * Ödeme formu (PRD §6.2).
 *
 * ⛔ KART BİLGİSİ HİÇBİR YERDE SAKLANMAZ. Numara ve CVV yalnızca bileşen
 * durumunda duruyor, istek gönderilince bileşen sayfadan ayrılıyor.
 * `localStorage`'a, çereze veya adres çubuğuna YAZILMIYOR; alanlarda
 * `autoComplete="cc-number"` var ki tarayıcının kendi güvenli kasası
 * kullanılabilsin, ama biz hiçbir şey kalıcılaştırmıyoruz.
 *
 * ÇİFT TAHSİLAT KORUMASI İKİ KATMANLI:
 *  1. Düğme istek sürerken devre dışı — çift tıklama engellenir
 *  2. `idempotencyKey` her denemede SABİT kalır; ağ kopup istek tekrarlansa
 *     bile veritabanındaki benzersiz kısıt ikinci tahsilatı reddeder.
 *     Anahtar yalnızca deneme SONUÇLANDIĞINDA (başarısız olsa da) yenilenir.
 */

const copy = messages.payment;

export type SavedCardOption = {
  id: string;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
};

export type AddressOption = { id: string; title: string; district: string };

export type CheckoutFormProps = {
  totalKurus: number;
  /** Sepette market veya restoran var mı — adres bu durumda zorunlu. */
  needsAddress: boolean;
  /**
   * Zaman aralığı sorulacak mı — YALNIZCA markette (PRD §6.1).
   *
   * Restoran siparişi ödemeden sonra hemen hazırlanmaya başladığı için
   * seçilecek bir pencere yok; onun yerine tahmini hazırlık süresi
   * gösteriliyor. Bu bir görünüm kararı, koruma değil: sunucu da sepetin
   * içine bakıp aynı kararı bağımsız veriyor.
   */
  needsSlot: boolean;
  /** Sepette restoran kalemi var mı — hazırlık süresi bilgisi bu durumda çıkar. */
  showsPrepTime: boolean;
  savedCards: readonly SavedCardOption[];
  addresses: readonly AddressOption[];
  /** Teslimat zaman aralığı seçenekleri — sunucuda üretiliyor. */
  deliverySlots: readonly string[];
};

export function CheckoutForm(props: CheckoutFormProps) {
  const router = useRouter();

  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [useSavedCardId, setUseSavedCardId] = useState<string | null>(
    props.savedCards[0]?.id ?? null,
  );
  const [addressId, setAddressId] = useState(props.addresses[0]?.id ?? "");
  const [deliverySlot, setDeliverySlot] = useState(props.deliverySlots[0] ?? "");

  const [number, setNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveCard, setSaveCard] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const card = useSavedCardId
      ? { kind: "saved" as const, savedCardId: useSavedCardId, cvv }
      : {
          kind: "new" as const,
          number,
          holderName,
          expMonth: Number(expMonth),
          expYear: Number(expYear),
          cvv,
          save: saveCard,
        };

    const result = await apiRequest<{ transactionId: string }>("/api/payments", {
      method: "POST",
      body: {
        idempotencyKey,
        expectedTotalKurus: props.totalKurus,
        card,
        delivery: props.needsAddress
          ? { addressId, ...(props.needsSlot ? { deliverySlot } : {}) }
          : {},
      },
    });

    setIsPending(false);

    if (!result.ok) {
      setError(result.message);
      // Deneme SONUÇLANDI: bir sonraki deneme yeni bir anahtarla gitmeli,
      // yoksa kullanıcı başka kart denese bile "bu ödeme zaten alınmış" alır.
      setIdempotencyKey(crypto.randomUUID());

      return;
    }

    router.push(`/odeme/tamamlandi?islem=${encodeURIComponent(result.data.transactionId)}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {/* KALICI UYARI: kullanıcı gerçek kart bilgisi girmemeli. */}
      <p
        role="status"
        className="rounded-lg bg-brand-surface px-4 py-3 text-sm text-brand-surface-foreground"
      >
        {copy.fakeNotice}
      </p>

      <FormAlert message={error} />

      {props.needsAddress ? (
        <section className="flex flex-col gap-4" aria-labelledby="teslimat">
          <h2 id="teslimat" className="font-heading text-lg font-semibold">
            {copy.delivery.heading}
          </h2>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{copy.delivery.addressLabel}</span>
            <select
              required
              value={addressId}
              onChange={(event) => setAddressId(event.target.value)}
              className="min-h-11 rounded-lg bg-background px-3 ring-1 ring-foreground/15 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{copy.delivery.addressPlaceholder}</option>
              {props.addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.title} · {address.district}
                </option>
              ))}
            </select>
          </label>

          {/* Zaman aralığı YALNIZCA markette sorulur (PRD §6.1). */}
          {props.needsSlot ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{copy.delivery.slotLabel}</span>
              <select
                required
                value={deliverySlot}
                onChange={(event) => setDeliverySlot(event.target.value)}
                className="min-h-11 rounded-lg bg-background px-3 ring-1 ring-foreground/15 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {props.deliverySlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {/* Restoranda seçim değil BİLGİ: hazırlık süresi bir tahmin. */}
          {props.showsPrepTime ? (
            <p role="status" className="text-sm text-muted-foreground">
              {copy.delivery.prepTimeNotice(
                RESTAURANT_PREP_MINUTES_MIN,
                RESTAURANT_PREP_MINUTES_MAX,
              )}
            </p>
          ) : null}
        </section>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          {copy.delivery.ticketNotice}
        </p>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="kart">
        <h2 id="kart" className="font-heading text-lg font-semibold">
          {copy.card.heading}
        </h2>

        {props.savedCards.length > 0 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{copy.card.savedHeading}</legend>
            {props.savedCards.map((card) => (
              <label key={card.id} className="flex min-h-11 items-center gap-3">
                <input
                  type="radio"
                  name="kart"
                  checked={useSavedCardId === card.id}
                  onChange={() => setUseSavedCardId(card.id)}
                  className="size-4"
                />
                <span className="text-base">
                  {copy.card.maskedLabel(copy.card.brands[card.brand], card.last4)}
                </span>
              </label>
            ))}
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="radio"
                name="kart"
                checked={useSavedCardId === null}
                onChange={() => setUseSavedCardId(null)}
                className="size-4"
              />
              <span className="text-base">{copy.card.useNew}</span>
            </label>
          </fieldset>
        ) : null}

        {useSavedCardId === null ? (
          <div className="flex flex-col gap-4">
            <TextField
              label={copy.card.number}
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              inputMode="numeric"
              autoComplete="cc-number"
              help={copy.card.numberHelp}
            />
            <TextField
              label={copy.card.holder}
              value={holderName}
              onChange={(event) => setHolderName(event.target.value)}
              autoComplete="cc-name"
            />
            <div className="flex gap-3">
              <TextField
                label={copy.card.expiryMonth}
                value={expMonth}
                onChange={(event) => setExpMonth(event.target.value)}
                inputMode="numeric"
                autoComplete="cc-exp-month"
                help={copy.card.expiryMonthHelp}
              />
              <TextField
                label={copy.card.expiryYear}
                value={expYear}
                onChange={(event) => setExpYear(event.target.value)}
                inputMode="numeric"
                autoComplete="cc-exp-year"
                help={copy.card.expiryYearHelp}
              />
            </div>

            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(event) => setSaveCard(event.target.checked)}
                className="size-4"
              />
              <span className="text-sm">{copy.card.save}</span>
            </label>
          </div>
        ) : null}

        <TextField
          label={copy.card.cvv}
          value={cvv}
          onChange={(event) => setCvv(event.target.value)}
          inputMode="numeric"
          autoComplete="cc-csc"
          help={copy.card.cvvHelp}
        />
      </section>

      <Button type="submit" size="lg" className="min-h-11" disabled={isPending}>
        {isPending ? copy.submitting : `${copy.submit} · ${formatTry(props.totalKurus)}`}
      </Button>
    </form>
  );
}
