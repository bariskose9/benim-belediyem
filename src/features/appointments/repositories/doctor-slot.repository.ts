import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/**
 * `doctor_slots` tablosuna erişen tek katman.
 *
 * BU DOSYANIN EN ÖNEMLİ FONKSİYONU `reserveSlot`. Randevu modülünün tamamı
 * onun doğruluğuna dayanıyor: PRD §5.1'in kabul kriteri "iki kullanıcı aynı
 * saati aynı anda seçemez" ve bunu sağlayan şey uygulama mantığı değil,
 * PostgreSQL'in satır kilidi.
 */

/** Transaction içinde çalışan Prisma istemcisi — dışarıdan verilir. */
export type TransactionClient = Prisma.TransactionClient;

export type SlotRow = {
  id: string;
  startsAt: Date;
  isBooked: boolean;
};

/**
 * Bir doktorun verilen andan itibaren `[from, until)` aralığındaki tüm saatleri.
 *
 * DOLU SAATLER DE DÖNÜYOR. Gizlemek daha az veri göndermek olurdu ama takvimde
 * boşluk bırakırdı ve kullanıcı "doktorun o gün hiç saati yok" sanırdı. Dolu
 * saat ekranda görünür ve tıklanamaz — durumu ayrıca METİNLE de yazıyor,
 * yalnızca renkle değil (07-ui-design-system.md).
 *
 * `startsAt` üzerinde index var (`@@index([startsAt, isBooked])`), zaman
 * koşullu her sorgu bunu kullanır (ADR-007).
 */
export async function listSlotsForDoctor(input: {
  doctorId: string;
  from: Date;
  until: Date;
}): Promise<SlotRow[]> {
  return prisma.doctorSlot.findMany({
    where: {
      doctorId: input.doctorId,
      startsAt: { gte: input.from, lt: input.until },
    },
    select: { id: true, startsAt: true, isBooked: true },
    orderBy: { startsAt: "asc" },
  });
}

/**
 * Randevu alınacak saati, doktoru ve branşıyla birlikte transaction içinde okur.
 *
 * Branş kimliği burada okunuyor çünkü "aynı branşta aynı gün ikinci randevu"
 * kuralı ona ihtiyaç duyuyor ve İSTEMCİDEN ALINMIYOR: istemci yalnızca saat
 * kimliği gönderiyor, geri kalan her şey veritabanından geliyor.
 */
export async function findSlotForBooking(
  tx: TransactionClient,
  slotId: string,
): Promise<{ id: string; startsAt: Date; doctorId: string; specialtyId: string } | null> {
  const slot = await tx.doctorSlot.findUnique({
    where: { id: slotId },
    select: {
      id: true,
      startsAt: true,
      doctorId: true,
      doctor: { select: { specialtyId: true } },
    },
  });

  if (!slot) return null;

  return {
    id: slot.id,
    startsAt: slot.startsAt,
    doctorId: slot.doctorId,
    specialtyId: slot.doctor.specialtyId,
  };
}

/**
 * Saati rezerve etmeyi DENER. Başarılıysa `true`, saat kapılmışsa `false`.
 *
 * ═══ BU PROJENİN EN KRİTİK SORGUSU ═══
 *
 * Koşul (`isBooked: false`) `WHERE`'in içinde, uygulamada DEĞİL. Aradaki fark
 * şu: "önce oku, boşsa yaz" iki adımdır ve iki adımın arasına başka bir istek
 * girebilir — iki kullanıcı da boş görür, ikisi de yazar, saat iki kişiye
 * satılır.
 *
 * Tek bir koşullu UPDATE'te bu boşluk yok. PostgreSQL dokümanı (Transaction
 * Isolation → Read Committed) bunu şöyle anlatıyor: ikinci güncelleyici, ilk
 * işlem commit veya rollback edene kadar BEKLER; ilk işlem commit ederse
 * "the search condition of the command (the WHERE clause) is re-evaluated to
 * see if the updated version of the row still matches". Satır artık
 * `is_booked = true` olduğu için koşulu sağlamaz ve atlanır → etkilenen satır
 * sayısı 0 → çağıran 409 döner.
 *
 * `update` DEĞİL `updateMany` kullanılıyor: `update` koşula uymayan satırda
 * istisna fırlatır ve "kayıt yok" ile "kapılmış" birbirine karışırdı;
 * `updateMany` sayı döner, iki durum ayırt edilebilir kalır.
 */
export async function reserveSlot(tx: TransactionClient, slotId: string): Promise<boolean> {
  const result = await tx.doctorSlot.updateMany({
    where: { id: slotId, isBooked: false },
    data: { isBooked: true },
  });

  return result.count === 1;
}

/**
 * Saati yeniden satışa açar (iptal akışı).
 *
 * Koşulsuz: iptal edilen randevunun saati her hâlükârda boşalmalı.
 * `updateMany` yine bilinçli — saat bu arada silinmişse istisna fırlatıp
 * iptali başarısız kılmasın.
 */
export async function releaseSlot(tx: TransactionClient, slotId: string): Promise<void> {
  await tx.doctorSlot.updateMany({
    where: { id: slotId },
    data: { isBooked: false },
  });
}
