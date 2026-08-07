/**
 * Market ekranının gördüğü şekiller.
 *
 * TUTARLAR TAM SAYI KURUŞ (`src/lib/money.ts`) — bu tiplerin hiçbirinde
 * `Decimal` yok. Dönüşüm repository sınırında yapılıyor; ekran katmanı
 * ondalık sayıyla para hesabı yapamıyor, çünkü hiç görmüyor.
 *
 * Kategori şekli ORTAK (`features/catalog`): süzgeç şeridi restoranla aynı.
 * Ürünün kendisi ortak DEĞİL — markette stok sayısı var, restoranda yok.
 */

/** Izgaradaki bir ürün kartı. */
export type MarketProduct = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  priceKurus: number;
  /** 0 ise "tükendi"; asıl engel sepet servisinde (PRD §5.3). */
  stock: number;
  categoryId: string;
  categoryName: string;
};
