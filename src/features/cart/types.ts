import type { CartItemType } from "@/generated/prisma/enums";

/**
 * Sepetin uygulama içindeki şekli.
 *
 * TUTARLAR TAM SAYI KURUŞ (`src/lib/money.ts`). Bu tiplerin hiçbir yerinde
 * `Decimal` yok: dönüşüm repository sınırında yapılıyor, servis ve ekran
 * katmanları yalnızca tam sayı görüyor.
 */

/** Sepetteki bir satır — katalogdan zenginleştirilmiş hâliyle. */
export type CartLine = {
  id: string;
  itemType: CartItemType;
  /**
   * İşaret ettiği katalog kaydının kimliği.
   *
   * Bilet satırında bu bir ETKİNLİK DEĞİL, `seat_reservations` kaydıdır
   * (adım 11, teknik borç #40): bir satır = bir koltuk.
   */
  refId: string;
  quantity: number;
  unitPriceKurus: number;
  note: string | null;

  /** Katalogdan okunan gösterim bilgisi. */
  name: string;
  imageUrl: string | null;

  /**
   * Satır hâlâ satın alınabilir mi.
   *
   * Sepet uzun süre açık kalabiliyor; bu arada ürün stoktan düşmüş veya
   * satıştan kalkmış olabilir. Ekran satırı GİZLEMEZ, uyarı gösterir —
   * sessizce kaybolan bir ürün kullanıcıya "sepetim değişti" demez.
   */
  isPurchasable: boolean;
  /** `null` = stok takibi yok (restoran kalemi). Bilet satırında her zaman 1. */
  availableStock: number | null;

  /**
   * Koltuk kilidinin bittiği an — yalnızca bilet satırlarında dolu (PRD §5.2).
   *
   * Ekran bunu geri sayıma çeviriyor. Süre SEPETTE UZAMAZ: burada görünen an
   * koltuğun seçildiği anda belirlenmiştir.
   */
  holdExpiresAt: Date | null;
};

/** Bir modülün sepetteki bölümü (PRD §6.1: ücret modül başına hesaplanır). */
export type CartSection = {
  itemType: CartItemType;
  lines: CartLine[];
  subtotalKurus: number;
  deliveryFeeKurus: number;
  /** Ücretsiz teslimat eşiğine kalan tutar; eşik yoksa veya aşıldıysa `null`. */
  freeDeliveryRemainingKurus: number | null;
};

/** Ekranın ve ödeme servisinin ortak gördüğü sepet özeti. */
export type CartSummary = {
  cartId: string;
  sections: CartSection[];
  subtotalKurus: number;
  deliveryFeeKurus: number;
  totalKurus: number;
  lineCount: number;
  /** Satın alınamaz satır varsa ödeme başlatılamaz. */
  hasBlockedLines: boolean;
};
