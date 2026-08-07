"use client";

import Link from "next/link";
import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import type { CartSummary } from "@/features/cart/types";

/**
 * Ürünü sepete ekleyen düğme.
 *
 * NEDEN İSTEMCİ BİLEŞENİ: sayfanın tek etkileşimli parçası bu. Izgara,
 * kartlar ve süzgeçler sunucuda çiziliyor; yalnızca bu düğme tarayıcıda
 * çalışıyor.
 *
 * SEPET UCUNU ÇAĞIRIYOR, KENDİ KURALINI YAZMIYOR. Stok kontrolü, adet ve
 * satır sınırları `addItemToCart` içinde (adım 7) ve orada kalıyor — burada
 * ikinci bir kopyası olsaydı ikisi ayrışırdı. Düğmenin pasif olması bir
 * kolaylık, koruma değil: sunucu isteği yine reddediyor.
 *
 * SAYFA YENİLENMİYOR: üst menüdeki sepet simgesi bilerek sayı göstermiyor
 * (`SiteHeader`), yani tazelenecek bir şey yok. Onay bildirim balonuyla
 * veriliyor ve balonun içinde sepete giden bağlantı var.
 */
export function AddToCartButton({ productId, name }: { productId: string; name: string }) {
  const [isPending, setIsPending] = useState(false);
  const copy = messages.market.product;

  async function addToCart() {
    setIsPending(true);

    const result = await apiRequest<CartSummary>("/api/carts/current/items", {
      method: "POST",
      body: { itemType: "market", refId: productId, quantity: 1 },
    });

    setIsPending(false);

    if (result.ok) {
      toast.success(messages.market.toast.added(name), {
        action: (
          <Link href="/sepet" className="ml-auto shrink-0 font-medium underline underline-offset-4">
            {messages.market.toast.goToCart}
          </Link>
        ),
      });

      return;
    }

    /**
     * Sunucunun Türkçe mesajı doğrudan gösteriliyor: stok yetmediğinde
     * "Bu üründen yeterli stok kalmamış" gibi ANLAMLI bir sebep dönüyor.
     * Genel metne düşmek o sebebi kullanıcıdan saklamak olurdu.
     */
    toast.error(result.message || messages.market.toast.failed);
  }

  return (
    <Button
      type="button"
      // Dokunma hedefi en az 44px (07-ui-design-system.md)
      className="min-h-11 w-full"
      disabled={isPending}
      onClick={addToCart}
      aria-label={copy.addToCartLabel(name)}
    >
      <PlusIcon aria-hidden="true" />
      {isPending ? copy.adding : copy.addToCart}
    </Button>
  );
}
