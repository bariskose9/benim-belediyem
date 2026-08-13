"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CART_ITEM_NOTE_MAX_LENGTH, CART_MAX_QUANTITY_PER_ITEM } from "@/config/constants";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import { TextField } from "@/features/auth/components/TextField";
import type { CartSummary } from "@/features/cart/types";

/**
 * Bir menü kalemini ADET VE NOTLA adisyona ekler (PRD §5.4).
 *
 * ADIM 9'UN TEK YENİ KAVRAMI BU: markette "sepete ekle" tek tıklamaydı,
 * burada kullanıcı adet ve mutfak notu ("az acılı") giriyor.
 *
 * NEDEN İSTEMCİ BİLEŞENİ: sayfanın tek etkileşimli parçası. Menü ızgarası,
 * kartlar ve süzgeçler sunucuda çiziliyor.
 *
 * KENDİ KURALINI YAZMIYOR: adet sınırı, satılabilirlik ve hız sınırı
 * `addItemToCart` içinde (adım 7) ve orada kalıyor. Buradaki `max` bir
 * kolaylık, koruma değil — sunucu isteği yine reddediyor.
 *
 * SAYFA TAZELENİYOR (`router.refresh()`): sağdaki adisyon paneli sunucuda
 * çizilen bir bileşen, yani yeni kalem ancak tazelemeyle görünür. Market
 * ekranında böyle bir panel olmadığı için orada tazeleme de yok.
 */

const copy = messages.restaurant;

export function AddToTabForm({ itemId, name }: { itemId: string; name: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");

  function open() {
    // Form her açılışta temiz başlıyor: bir önceki kalemin notu burada kalsaydı
    // kullanıcı yanlış kaleme "az acılı" yazmış olurdu.
    setQuantity("1");
    setNote("");
    setIsOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);

    const result = await apiRequest<CartSummary>("/api/v1/carts/current/items", {
      method: "POST",
      body: {
        itemType: "restaurant",
        refId: itemId,
        quantity: Number(quantity),
        note: note.trim().length > 0 ? note.trim() : undefined,
      },
    });

    setIsPending(false);

    if (!result.ok) {
      /**
       * Sunucunun Türkçe mesajı doğrudan gösteriliyor: "bir üründen en fazla
       * 20 adet alabilirsiniz" gibi ANLAMLI bir sebep dönüyor. Genel metne
       * düşmek o sebebi kullanıcıdan saklamak olurdu.
       */
      toast.error(result.message || copy.toast.failed);

      return;
    }

    setIsOpen(false);
    toast.success(copy.toast.added(name));
    router.refresh();
  }

  if (!isOpen) {
    return (
      <Button
        type="button"
        // Dokunma hedefi en az 44px (07-ui-design-system.md)
        className="min-h-11 w-full"
        onClick={open}
        aria-label={copy.item.addToTabLabel(name)}
      >
        <PlusIcon aria-hidden="true" />
        {copy.item.addToTab}
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-3">
      {/* Formun neye ait olduğu ekran okuyucuda da belli olmalı. */}
      <p className="text-sm font-medium">{copy.form.heading(name)}</p>

      <TextField
        label={copy.form.quantity}
        type="number"
        inputMode="numeric"
        min={1}
        max={CART_MAX_QUANTITY_PER_ITEM}
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        required
      />

      <TextField
        label={copy.form.note}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={copy.form.notePlaceholder}
        help={copy.form.noteHelp}
        maxLength={CART_ITEM_NOTE_MAX_LENGTH}
        autoCapitalize="none"
      />

      <div className="flex gap-2">
        <Button type="submit" className="min-h-11 flex-1" disabled={isPending}>
          {isPending ? copy.form.submitting : copy.form.submit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          disabled={isPending}
          onClick={() => setIsOpen(false)}
        >
          {copy.form.cancel}
        </Button>
      </div>
    </form>
  );
}
