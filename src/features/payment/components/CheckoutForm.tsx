"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { RESTAURANT_PREP_MINUTES_MAX, RESTAURANT_PREP_MINUTES_MIN } from "@/config/constants";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import { FormAlert } from "@/features/auth/components/FormAlert";
import {
  CardPicker,
  emptyCardForm,
  toCardPayload,
  type CardFormState,
  type SavedCardOption,
} from "@/features/payment/components/CardPicker";
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

  const [addressId, setAddressId] = useState(props.addresses[0]?.id ?? "");
  const [deliverySlot, setDeliverySlot] = useState(props.deliverySlots[0] ?? "");
  const [card, setCard] = useState<CardFormState>(() => emptyCardForm(props.savedCards));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const result = await apiRequest<{ transactionId: string }>("/api/v1/payments", {
      method: "POST",
      body: {
        idempotencyKey,
        expectedTotalKurus: props.totalKurus,
        card: toCardPayload(card),
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

        <CardPicker savedCards={props.savedCards} value={card} onChange={setCard} showSaveOption />
      </section>

      <Button type="submit" size="lg" className="min-h-11" disabled={isPending}>
        {isPending ? copy.submitting : `${copy.submit} · ${formatTry(props.totalKurus)}`}
      </Button>
    </form>
  );
}
