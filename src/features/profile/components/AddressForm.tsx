"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ADDRESS_DISTRICT_MAX_LENGTH,
  ADDRESS_DISTRICT_MIN_LENGTH,
  ADDRESS_FULL_MAX_LENGTH,
  ADDRESS_FULL_MIN_LENGTH,
  ADDRESS_TITLE_MAX_LENGTH,
  ADDRESS_TITLE_MIN_LENGTH,
} from "@/config/constants";
import { messages } from "@/config/messages";
import { FormAlert } from "@/features/auth/components/FormAlert";
import { TextField } from "@/features/auth/components/TextField";
import type { AddressRow } from "@/features/profile/repositories/address.repository";
import { cn } from "@/lib/utils";

/**
 * Adres formu — EKLEME VE DÜZENLEME AYNI BİLEŞEN.
 *
 * İki ayrı form yazmamanın sebebi DRY değil, DOĞRULUK: alan sınırları,
 * erişilebilirlik bağlantıları ve hata gösterimi iki dosyada ayrı ayrı
 * yaşarsa biri düzeltilirken diğeri unutulur. Değişen tek şey başlık, düğme
 * metni ve isteğin nereye gittiği.
 *
 * ⛔ BURADAKİ `minLength`/`maxLength` GÜVENLİK DEĞİL, KULLANICI DENEYİMİDİR.
 * Aynı sınırlar sunucuda Zod ile yeniden uygulanıyor (`profile.schema.ts`);
 * buradaki kontrolün tek amacı kullanıcıyı boşuna bir gidiş-dönüşten kurtarmak.
 */

const copy = messages.profile.addresses.form;

export type AddressFormProps = {
  /** Verilirse düzenleme kipi; verilmezse ekleme kipi. */
  address?: AddressRow;
  isPending: boolean;
  error: string | null;
  onSubmit: (values: { title: string; fullAddress: string; district: string }) => void;
  /** Düzenleme kipinde "vazgeç"; ekleme kipinde verilmez. */
  onCancel?: () => void;
};

export function AddressForm({ address, isPending, error, onSubmit, onCancel }: AddressFormProps) {
  const isEditing = address !== undefined;

  const [title, setTitle] = useState(address?.title ?? "");
  const [fullAddress, setFullAddress] = useState(address?.fullAddress ?? "");
  const [district, setDistrict] = useState(address?.district ?? "");

  return (
    <form
      className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ title, fullAddress, district });
      }}
    >
      <h3 className="font-heading text-lg font-semibold tracking-tight">
        {isEditing ? copy.editHeading : copy.addHeading}
      </h3>

      <FormAlert message={error} />

      <TextField
        label={copy.titleLabel}
        help={copy.titleHint}
        name="title"
        value={title}
        required
        minLength={ADDRESS_TITLE_MIN_LENGTH}
        maxLength={ADDRESS_TITLE_MAX_LENGTH}
        autoComplete="off"
        onChange={(event) => setTitle(event.target.value)}
      />

      {/*
        Çok satırlı alan için ayrı bir bileşen eklenmedi: `TextField` tek satır
        için yazılmış (destek formunda da aynı karar verildi). Erişilebilirlik
        kuralları burada elle kuruluyor — görünür etiket ve `aria-describedby`.
      */}
      <FullAddressField value={fullAddress} onChange={setFullAddress} />

      <TextField
        label={copy.districtLabel}
        help={copy.districtHint}
        name="district"
        value={district}
        required
        minLength={ADDRESS_DISTRICT_MIN_LENGTH}
        maxLength={ADDRESS_DISTRICT_MAX_LENGTH}
        autoComplete="address-level2"
        onChange={(event) => setDistrict(event.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="min-h-11" disabled={isPending}>
          {isPending ? copy.submitting : isEditing ? copy.submitEdit : copy.submitAdd}
        </Button>

        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            disabled={isPending}
            onClick={onCancel}
          >
            {copy.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function FullAddressField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  // `useId()`: sunucu ve istemci aynı kimliği üretir, yani hidrasyon uyuşur.
  const id = useId();
  const helpId = `${id}-help`;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{copy.fullAddressLabel}</Label>
      <textarea
        id={id}
        name="fullAddress"
        rows={4}
        required
        minLength={ADDRESS_FULL_MIN_LENGTH}
        maxLength={ADDRESS_FULL_MAX_LENGTH}
        value={value}
        autoComplete="street-address"
        aria-describedby={helpId}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base",
          "transition-colors outline-none placeholder:text-muted-foreground",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "dark:bg-input/30",
        )}
      />
      <p id={helpId} className="text-sm text-muted-foreground">
        {copy.fullAddressHint}
      </p>
    </div>
  );
}
