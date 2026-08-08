import type { EventCategory } from "@/generated/prisma/enums";

/**
 * Etkinlik ve salon planının uygulama içindeki şekli (PRD §5.2).
 *
 * TUTARLAR TAM SAYI KURUŞ (`src/lib/money.ts`); `Decimal` dönüşümü repository
 * sınırında yapılıyor, yukarı katmanlar görmüyor.
 */

/** Listede bir etkinlik kartı. */
export type EventListItem = {
  id: string;
  name: string;
  category: EventCategory;
  performer: string;
  startsAt: Date;
  basePriceKurus: number;
  venueName: string;
  /**
   * Satılabilir koltuk sayısı.
   *
   * SÜRESİ DOLMUŞ KİLİTLER BOŞ SAYILIR (ADR-007): temizlik görevi hiç
   * çalışmasa bile sayı doğru olur.
   */
  availableSeatCount: number;
};

/**
 * Bir koltuğun kullanıcı açısından durumu.
 *
 * `held_by_me` ayrı bir durum çünkü ekranda farklı davranıyor: kendi
 * kilidime basmak onu bırakır, başkasınınkine basmak hiçbir şey yapmaz.
 */
export type SeatState = "available" | "held_by_me" | "taken";

export type SeatView = {
  id: string;
  block: string;
  rowLabel: string;
  seatNumber: number;
  state: SeatState;
  /** Yalnızca `held_by_me` durumunda dolu — geri sayımın bittiği an. */
  holdExpiresAt: Date | null;
  /** Yalnızca `held_by_me` durumunda dolu — sepet satırının işaret ettiği kayıt. */
  reservationId: string | null;
};

/** Salon planının bir sırası. */
export type SeatRow = {
  rowLabel: string;
  seats: SeatView[];
};

/** Salon planının bir bloğu (A, B …). */
export type SeatBlock = {
  block: string;
  rows: SeatRow[];
};

export type EventDetail = {
  id: string;
  name: string;
  category: EventCategory;
  performer: string;
  startsAt: Date;
  basePriceKurus: number;
  venueName: string;
  venueAddress: string;
  blocks: SeatBlock[];
  availableSeatCount: number;
  /** Etkinlik başladıysa koltuk seçimi kapanır — plan yine görünür. */
  hasStarted: boolean;
};
