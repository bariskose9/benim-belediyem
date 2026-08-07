/**
 * Restoran menüsünün ekranda gördüğü şekil.
 *
 * TUTARLAR TAM SAYI KURUŞ (`src/lib/money.ts`) — `Decimal` yukarı katmana
 * hiç çıkmıyor, dönüşüm repository sınırında yapılıyor.
 *
 * STOK SAYISI YOK ve olmamalı: `menu_items` tablosunda yalnızca `isAvailable`
 * var (PRD §5.4). Mutfak "3 porsiyon kaldı" diye saymıyor; kalem ya var ya
 * yok. Market ürününün şekliyle ortaklaştırmak, olmayan bir alanı taşımak
 * için her satıra `null` koymak olurdu.
 */
export type MenuItemView = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  priceKurus: number;
  isAvailable: boolean;
  categoryId: string;
  categoryName: string;
};
