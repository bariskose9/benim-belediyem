"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import type { CartLine } from "@/features/cart/types";
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

export function CartLines({ lines }: { lines: readonly CartLine[] }) {
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
      const response = await apiRequest(`/api/carts/current/items/${line.id}`, {
        method: "PATCH",
        body: { quantity },
      });

      return { ok: response.ok, message: response.ok ? undefined : response.message };
    });

  const remove = (line: CartLine) =>
    mutate(line.id, async () => {
      const response = await apiRequest(`/api/carts/current/items/${line.id}`, {
        method: "DELETE",
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
                "flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between",
                !line.isPurchasable && "ring-destructive/40",
              )}
            >
              <div className="flex flex-col gap-1">
                <span className="font-heading text-base font-medium">{line.name}</span>
                <span className="text-sm text-muted-foreground">
                  {copy.line.unitPrice}: {formatTry(line.unitPriceKurus)}
                </span>
                {line.note ? (
                  <span className="text-sm text-muted-foreground">
                    {copy.line.note}: {line.note}
                  </span>
                ) : null}
                {/* Satın alınamayan satır GİZLENMEZ, sebebi yazılır. */}
                {!line.isPurchasable ? (
                  <span className="text-sm font-medium text-destructive">
                    {line.availableStock === 0 ? copy.errors.outOfStock : copy.errors.unavailable}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
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

                <span className="min-w-24 text-right text-base font-semibold tabular-nums">
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
