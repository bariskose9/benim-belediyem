import { z } from "zod";

/**
 * Koltuk kilidi uçlarının girdileri (PRD §5.2).
 *
 * ADRES VE GÖVDE İKİSİ DE GİRDİ NOKTASIDIR ve doğrulanır
 * (03-api-guidelines.md: "her endpoint girişi Zod ile doğrulanır").
 * Doğrulamanın asıl işi sınırsız uzunlukta bir değerin sorguya taşınmasını
 * engellemek; SQL enjeksiyonu zaten Prisma'nın parametreli sorgularıyla kapalı.
 *
 * KİMLİĞİN BİÇİMİ ZORLANMIYOR (`cuid()` deseni aranmıyor): biçim doğrulaması
 * güvenlik katkısı vermez — kayıt yoksa sorgu zaten boş döner — ama şema
 * kimlik üretimi değişirse (uuid'ye geçilirse) sessizce kırılırdı.
 */

/** Katalog şemasındaki `recordId` ile aynı sınırlar — tek bir standart. */
const recordId = z.string().trim().min(1).max(128);

export const holdSeatSchema = z.object({
  seatId: recordId,
});

export type HoldSeatPayload = z.infer<typeof holdSeatSchema>;

export const eventIdSchema = recordId;
export const reservationIdSchema = recordId;
