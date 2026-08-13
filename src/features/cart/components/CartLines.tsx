"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CART_ITEM_NOTE_MAX_LENGTH } from "@/config/constants";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import { TextField } from "@/features/auth/components/TextField";
import type { CartLine } from "@/features/cart/types";
import { SeatHoldCountdown } from "@/features/events/components/SeatHoldCountdown";
import { formatTry } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Sepet satırları ve adet kontrolleri.
 *
 * NEDEN İSTEMCİ BİLEŞENİ: adet değiştirmek anında geri bildirim isteyen bir
 * yazma işlemi. Sayfanın geri kalanı (tutarlar, bölümler) sunucuda çiziliyor;
 * yalnızca bu parça etkileşimli.
 *
 * TUTARLAR SUNUCUDAN GELEN ÖZETLE TAZELENİYOR: istek dönünce `router.refresh()`
 * çağrılıyor ve toplamları sunucu yeniden hesaplıyor. İstemcide toplam
 * hesaplamak, ekranda görünen tutarla tahsil edilenin ayrışması demekti.
 */

const copy = messages.cart;

export function CartLines({
  lines,
  allowNoteEditing = false,
}: {
  lines: readonly CartLine[];
  /**
   * Mutfak notu düzenlenebilir mi (PRD §5.4).
   *
   * Yalnızca restoran bölümünde açık: markette bir ürüne not bırakmanın
   * karşılığı yok ve her satırda bir not alanı göstermek, kullanıcıya
   * yazdığının bir işe yaradığını düşündürürdü.
   */
  allowNoteEditing?: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function mutate(itemId: string, action: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    setPendingId(itemId);

    const result = await action();

    setPendingId(null);

    if (!result.ok) {
      setError(result.message ?? messages.errors.unexpected);
    }

    // Başarılı da olsa başarısız da olsa tazeleniyor: hata "stok kalmadı" ise
    // ekrandaki adet artık gerçeği yansıtmıyor olabilir.
    router.refresh();
  }

  const changeQuantity = (line: CartLine, quantity: number) =>
    mutate(line.id, async () => {
      const response = await apiRequest(`/api/v1/carts/current/items/${line.id}`, {
        method: "PATCH",
        body: { quantity },
      });

      return { ok: response.ok, message: response.ok ? undefined : response.message };
    });

  const remove = (line: CartLine) =>
    mutate(line.id, async () => {
      const response = await apiRequest(`/api/v1/carts/current/items/${line.id}`, {
        method: "DELETE",
      });

      return { ok: response.ok, message: response.ok ? undefined : response.message };
    });

  const saveNote = (line: CartLine, note: string) =>
    mutate(line.id, async () => {
      const response = await apiRequest(`/api/v1/carts/current/items/${line.id}`, {
        method: "PATCH",
        // Boş metin `null` gidiyor: "notu sildim" ile "not yazmadım" aynı şey.
        body: { note: note.trim().length > 0 ? note.trim() : null },
      });

      return { ok: response.ok, message: response.ok ? undefined : response.message };
    });

  return (
    <div className="flex flex-col gap-3">
      {/*
        `role="alert"` DEĞİL: Next.js her sayfaya boş bir duyurucu koyuyor ve
        testlerde ikisi karışıyor. `aria-live` yine de değişikliği bildiriyor.
      */}
      {error ? (
        <p
          aria-live="assertive"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {lines.map((line) => {
          const busy = pendingId === line.id;

          return (
            <li
              key={line.id}
              className={cn(
                /*
                  `flex-wrap` + `min-w-0` DAR KAPSAYICI İÇİN: bu bileşen hem
                  geniş sepet sayfasında hem de restoran ekranının 384px'lik
                  adisyon panelinde çiziliyor. Sarma olmadan adet düğmeleri,
                  tutar ve çöp kutusu panelden taşıyor ve SAYFAYA yatay
                  kaydırma ekliyordu — ölçüldü.
                */
                "flex flex-col flex-wrap gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10",
                "sm:flex-row sm:items-center sm:justify-between",
                !line.isPurchasable && "ring-destructive/40",
              )}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-heading text-base font-medium">{line.name}</span>
                <span className="text-sm text-muted-foreground">
                  {copy.line.unitPrice}: {formatTry(line.unitPriceKurus)}
                </span>
                {allowNoteEditing ? (
                  <NoteEditor line={line} disabled={busy} onSave={saveNote} />
                ) : line.note ? (
                  <span className="text-sm text-muted-foreground">
                    {copy.line.note}: {line.note}
                  </span>
                ) : null}
                {/*
                  Bilet satırında KALAN SÜRE geri sayıyor (PRD §5.2). Süre
                  bitince bileşen sayfayı tazeliyor ve satırı sunucu düşürüyor.
                */}
                {line.holdExpiresAt ? <SeatHoldCountdown expiresAt={line.holdExpiresAt} /> : null}

                {/* Satın alınamayan satır GİZLENMEZ, sebebi yazılır. */}
                {!line.isPurchasable ? (
                  <span className="text-sm font-medium text-destructive">
                    {line.availableStock === 0 ? copy.errors.outOfStock : copy.errors.unavailable}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {/*
                  BİLET SATIRINDA ADET DÜĞMESİ YOK: bir satır bir KOLTUK
                  (teknik borç #40) ve "2 adet A-3-5 koltuğu" diye bir şey yok.
                  Düğmeyi göstermek kullanıcıya sunucunun her zaman reddedeceği
                  bir işlem sunmak olurdu. İkinci koltuk salon planından seçilir.
                */}
                {line.itemType === "event" ? null : (
                  <div className="flex items-center gap-1 rounded-lg ring-1 ring-foreground/10">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      aria-label={copy.line.decrease(line.name)}
                      disabled={busy}
                      onClick={() => void changeQuantity(line, line.quantity - 1)}
                    >
                      <MinusIcon aria-hidden="true" className="size-4" />
                    </Button>

                    {/* Adet ekran okuyucuya da anlamlı gelsin diye etiketli. */}
                    <span className="min-w-8 text-center text-base font-medium tabular-nums">
                      <span className="sr-only">{copy.line.quantity}: </span>
                      {line.quantity}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      aria-label={copy.line.increase(line.name)}
                      disabled={busy}
                      onClick={() => void changeQuantity(line, line.quantity + 1)}
                    >
                      <PlusIcon aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                )}

                <span className="text-right text-base font-semibold tabular-nums">
                  {formatTry(line.unitPriceKurus * line.quantity)}
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label={copy.line.remove(line.name)}
                  disabled={busy}
                  onClick={() => void remove(line)}
                >
                  <Trash2Icon aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Bir satırın mutfak notu (PRD §5.4 "adet ve not girilebilir").
 *
 * İKİ HÂLİ VAR: kapalıyken notu (veya "Not ekle" düğmesini) gösteriyor,
 * açıkken alanı. Alan hep açık dursaydı sepet ekranı beş kalemde beş metin
 * kutusuna dönerdi.
 *
 * TASLAK, DÜZENLEME AÇILDIĞINDA SUNUCUDAN GELEN DEĞERLE DOLUYOR — efekt
 * içinde `setState` YOK (ESLint bunu yasaklıyor ve haklı: efektle senkron
 * tutulan bir taslak, kaydetme sırasında yarışa girer).
 */
function NoteEditor({
  line,
  disabled,
  onSave,
}: {
  line: CartLine;
  disabled: boolean;
  onSave: (line: CartLine, note: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(line.note ?? "");

  function startEditing() {
    setDraft(line.note ?? "");
    setIsEditing(true);
  }

  async function save() {
    await onSave(line, draft);
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <div className="flex flex-wrap items-baseline gap-2">
        {line.note ? (
          <span className="text-sm text-muted-foreground">
            {copy.line.note}: {line.note}
          </span>
        ) : null}

        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-sm"
          aria-label={copy.line.noteEdit(line.name)}
          onClick={startEditing}
        >
          {line.note ? copy.line.noteChange : copy.line.noteAdd}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:max-w-xs">
      <TextField
        label={copy.line.note}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={copy.line.notePlaceholder}
        maxLength={CART_ITEM_NOTE_MAX_LENGTH}
        autoCapitalize="none"
      />

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="min-h-11"
          disabled={disabled}
          onClick={() => void save()}
        >
          {disabled ? copy.line.noteSaving : copy.line.noteSave}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-11"
          disabled={disabled}
          onClick={() => setIsEditing(false)}
        >
          {copy.line.noteCancel}
        </Button>
      </div>
    </div>
  );
}
