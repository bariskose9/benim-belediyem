import Image from "next/image";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { messages } from "@/config/messages";
import { formatTry } from "@/lib/money";
import type { MenuItemView } from "../types";

import { AddToTabForm } from "./AddToTabForm";

/**
 * Tek menü kalemi kartı.
 *
 * SUNUCU BİLEŞENİ: kart durum tutmuyor, yalnızca içindeki adisyon formu
 * tarayıcıda çalışıyor. Kartı da istemciye taşımak 31 kalemlik bir ızgarayı
 * gereksizce tarayıcıya yıkardı.
 *
 * MARKET KARTININ KOPYASI DEĞİL: burada stok sayısı ve "son N adet" uyarısı
 * yok (menü kaleminde stok sayılmıyor), buna karşılık adet ve not soran bir
 * form var. Ortak olan parçalar (ızgara, süzgeç, arama, boş durum) zaten
 * `features/catalog` altında paylaşılıyor.
 *
 * GÖRSELLER kategori başına tek yer tutucu (teknik borç #16): `alt` metni
 * kalem adını taşıyor, yani ekran okuyucu için bilgi kaybı yok.
 */

const copy = messages.restaurant.item;

export function MenuCard({ item }: { item: MenuItemView }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden pt-0">
      {/*
        SVG YER TUTUCU: Next.js `.svg` uzantılı kaynakta görsel optimizasyonunu
        kendiliğinden atlıyor (resmî doküman), yani ek yapılandırma gerekmiyor.
      */}
      <div className="relative aspect-4/3 w-full bg-muted">
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          // Izgara mobilde tek, tablette iki, masaüstünde üç sütun.
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />

        {!item.isAvailable ? (
          <span className="absolute top-2 left-2 rounded-md bg-foreground/85 px-2 py-1 text-xs font-medium text-background">
            {copy.unavailable}
          </span>
        ) : null}
      </div>

      <CardContent className="flex flex-1 flex-col gap-1">
        <h3 className="text-base leading-snug font-medium">{item.name}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>

        <p className="mt-auto pt-2 font-heading text-lg font-semibold">
          {formatTry(item.priceKurus)}
        </p>
      </CardContent>

      <CardFooter>
        {item.isAvailable ? (
          <AddToTabForm itemId={item.id} name={item.name} />
        ) : (
          /**
           * Tükenmiş kalemde düğme yerine düz metin: pasif bir düğme klavyeyle
           * gezilemez ve ekran okuyucuda sebebi belirsiz kalır. Asıl engel
           * zaten sunucuda — bu yalnızca boşuna tıklatmamak için.
           */
          <p className="flex min-h-11 w-full items-center justify-center text-sm text-muted-foreground">
            {copy.unavailable}
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
