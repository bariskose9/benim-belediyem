"use client";

import { messages } from "@/config/messages";
import { TextField } from "@/features/auth/components/TextField";
import type { CardBrand } from "@/generated/prisma/enums";

/**
 * Kart seçme ve girme alanı — ÖDEME VE ÜYELİK EKRANLARININ ORTAK PARÇASI.
 *
 * ═══ NEDEN AYRI BİLEŞEN ═══
 *
 * Aynı alanlar iki ekranda çiziliyor: sepet ödemesi (PRD §6.2) ve spor salonu
 * üyeliği (PRD §5.6). İkinci kopya yazılsaydı, erişilebilirlik kuralları
 * (görünür etiket, `autoComplete`, yardım metinlerinin alanın ALTINDA
 * olması) tek yerde değil iki yerde yaşardı ve biri düzeltildiğinde
 * diğerinin unutulması an meselesiydi.
 *
 * ⛔ KART BİLGİSİ HİÇBİR YERE KALICILAŞTIRILMAZ. Değerler çağıranın
 * durumunda duruyor, istek gönderilince bileşen sayfadan ayrılıyor.
 * `localStorage`, çerez ve adres çubuğu kullanılmıyor; `autoComplete`
 * yalnızca TARAYICININ kendi güvenli kasasını çağırıyor.
 */

const copy = messages.payment.card;

export type SavedCardOption = {
  id: string;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
};

export type CardFormState = {
  /** `null` = yeni kart girilecek. */
  savedCardId: string | null;
  number: string;
  holderName: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  save: boolean;
};

export function emptyCardForm(savedCards: readonly SavedCardOption[]): CardFormState {
  return {
    savedCardId: savedCards[0]?.id ?? null,
    number: "",
    holderName: "",
    expMonth: "",
    expYear: "",
    cvv: "",
    save: false,
  };
}

/** Form durumunu API gövdesinin beklediği şekle çevirir. */
export function toCardPayload(state: CardFormState) {
  return state.savedCardId
    ? { kind: "saved" as const, savedCardId: state.savedCardId, cvv: state.cvv }
    : {
        kind: "new" as const,
        number: state.number,
        holderName: state.holderName,
        expMonth: Number(state.expMonth),
        expYear: Number(state.expYear),
        cvv: state.cvv,
        save: state.save,
      };
}

export type CardPickerProps = {
  savedCards: readonly SavedCardOption[];
  value: CardFormState;
  onChange: (next: CardFormState) => void;
  /**
   * "Bu kartı kaydet" kutusu gösterilsin mi.
   *
   * Üyelikte GÖSTERİLMİYOR çünkü orada seçenek yok: aidat her ay aynı karttan
   * çekilecek, dolayısıyla kart zorunlu olarak kaydediliyor. Kullanıcıya
   * işaretlemediği takdirde çalışmayacak bir kutu sunmak yanıltıcı olurdu;
   * onun yerine ekranda düz bir bilgi cümlesi duruyor.
   */
  showSaveOption?: boolean;
};

export function CardPicker({ savedCards, value, onChange, showSaveOption }: CardPickerProps) {
  const patch = (next: Partial<CardFormState>) => onChange({ ...value, ...next });

  return (
    <div className="flex flex-col gap-4">
      {savedCards.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{copy.savedHeading}</legend>
          {savedCards.map((card) => (
            <label key={card.id} className="flex min-h-11 items-center gap-3">
              <input
                type="radio"
                name="kart"
                checked={value.savedCardId === card.id}
                onChange={() => patch({ savedCardId: card.id })}
                className="size-4"
              />
              <span className="text-base">
                {copy.maskedLabel(copy.brands[card.brand], card.last4)}
              </span>
            </label>
          ))}
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name="kart"
              checked={value.savedCardId === null}
              onChange={() => patch({ savedCardId: null })}
              className="size-4"
            />
            <span className="text-base">{copy.useNew}</span>
          </label>
        </fieldset>
      ) : null}

      {value.savedCardId === null ? (
        <div className="flex flex-col gap-4">
          <TextField
            label={copy.number}
            value={value.number}
            onChange={(event) => patch({ number: event.target.value })}
            inputMode="numeric"
            autoComplete="cc-number"
            help={copy.numberHelp}
          />
          <TextField
            label={copy.holder}
            value={value.holderName}
            onChange={(event) => patch({ holderName: event.target.value })}
            autoComplete="cc-name"
          />
          <div className="flex gap-3">
            <TextField
              label={copy.expiryMonth}
              value={value.expMonth}
              onChange={(event) => patch({ expMonth: event.target.value })}
              inputMode="numeric"
              autoComplete="cc-exp-month"
              help={copy.expiryMonthHelp}
            />
            <TextField
              label={copy.expiryYear}
              value={value.expYear}
              onChange={(event) => patch({ expYear: event.target.value })}
              inputMode="numeric"
              autoComplete="cc-exp-year"
              help={copy.expiryYearHelp}
            />
          </div>

          {showSaveOption ? (
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={value.save}
                onChange={(event) => patch({ save: event.target.checked })}
                className="size-4"
              />
              <span className="text-sm">{copy.save}</span>
            </label>
          ) : null}
        </div>
      ) : null}

      <TextField
        label={copy.cvv}
        value={value.cvv}
        onChange={(event) => patch({ cvv: event.target.value })}
        inputMode="numeric"
        autoComplete="cc-csc"
        help={copy.cvvHelp}
      />
    </div>
  );
}
