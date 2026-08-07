import Image from "next/image";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { messages } from "@/config/messages";
import { formatTry } from "@/lib/money";
import type { MarketProduct } from "../types";

import { AddToCartButton } from "./AddToCartButton";

/**
 * Tek ürün kartı.
 *
 * SUNUCU BİLEŞENİ: kartın kendisi durum tutmuyor, yalnızca içindeki
 * "sepete ekle" düğmesi tarayıcıda çalışıyor. Kartı da istemciye taşımak
 * 45 ürünlük bir ızgarayı gereksizce tarayıcıya yıkardı.
 *
 * GÖRSELLER kategori başına tek yer tutucu (teknik borç #16): 45 ürüne ayrı
 * görsel üretmek bu adımın işi değil. `alt` metni ürün adını taşıyor, yani
 * ekran okuyucu için bilgi kaybı yok.
 */

const copy = messages.market.product;

/** Bu sayının altında "son N adet" uyarısı çıkar. */
const LOW_STOCK_THRESHOLD = 10;

export function ProductCard({ product }: { product: MarketProduct }) {
  const isOutOfStock = product.stock === 0;
  const isLowStock = !isOutOfStock && product.stock < LOW_STOCK_THRESHOLD;

  return (
    <Card className="flex h-full flex-col overflow-hidden pt-0">
      {/*
        SVG YER TUTUCU: Next.js `.svg` uzantılı kaynakta görsel optimizasyonunu
        kendiliğinden atlıyor (resmî doküman), yani ek yapılandırma gerekmiyor.
      */}
      <div className="relative aspect-4/3 w-full bg-muted">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          // Izgara mobilde tek, tablette iki, masaüstünde dört sütun.
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover"
        />

        {isOutOfStock ? (
          <span className="absolute top-2 left-2 rounded-md bg-foreground/85 px-2 py-1 text-xs font-medium text-background">
            {copy.outOfStock}
          </span>
        ) : null}
      </div>

      <CardContent className="flex flex-1 flex-col gap-1">
        <h3 className="text-base leading-snug font-medium">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>

        <p className="mt-auto pt-2 font-heading text-lg font-semibold">
          {formatTry(product.priceKurus)}
        </p>

        {/*
          Az stok uyarısı KIRMIZI DEĞİL: kırmızı bu tasarım sisteminde hata
          rengi (`destructive`) ve "son 3 adet" bir hata değil, bilgi.
          Vurgu renkle değil kalınlıkla veriliyor — böylece renk körü
          kullanıcı için de ayırt edilebilir kalıyor (WCAG 1.4.1).
        */}
        {isLowStock ? <p className="text-sm font-medium">{copy.lowStock(product.stock)}</p> : null}
      </CardContent>

      <CardFooter>
        {isOutOfStock ? (
          /**
           * Tükenmiş üründe düğme yerine düz metin: pasif bir düğme klavyeyle
           * gezilemez ve ekran okuyucuda sebebi belirsiz kalır. Asıl engel
           * zaten sunucuda — bu yalnızca boşuna tıklatmamak için.
           */
          <p className="flex min-h-11 w-full items-center justify-center text-sm text-muted-foreground">
            {copy.outOfStock}
          </p>
        ) : (
          <AddToCartButton productId={product.id} name={product.name} />
        )}
      </CardFooter>
    </Card>
  );
}
