/**
 * Market ekranının gördüğü şekiller.
 *
 * TUTARLAR TAM SAYI KURUŞ (`src/lib/money.ts`) — bu tiplerin hiçbirinde
 * `Decimal` yok. Dönüşüm repository sınırında yapılıyor; ekran katmanı
 * ondalık sayıyla para hesabı yapamıyor, çünkü hiç görmüyor.
 */

/** Süzgeç şeridindeki bir kategori. */
export type MarketCategory = {
  id: string;
  name: string;
  /** Rozette gösterilen ürün sayısı — boş kategoriye tıklatmamak için. */
  productCount: number;
};

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
