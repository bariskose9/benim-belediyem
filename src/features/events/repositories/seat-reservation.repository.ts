import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/**
 * `seat_reservations` tablosunun YAZMA tarafı (PRD §5.2 · ADR-007).
 *
 * ═══ BU DOSYANIN TAMAMI TEK BİR SORUNUN CEVABI ═══
 * "İki kullanıcı aynı koltuğa aynı anda talip olursa ne olur?"
 *
 * Cevap: biri alır, diğeri 409 alır — ve bu kararı UYGULAMA DEĞİL VERİTABANI
 * verir. "Önce boş mu diye bak, boşsa yaz" İKİ ADIMDIR: iki istek aynı anda
 * baktığında ikisi de boş görür ve ikisi de yazar. Bu proje aynı yanlışı adım
 * 6, 7, 8 ve 10'da da yapmadı; buradaki desen onların devamı.
 *
 * Koltuğu almanın iki yolu var ve İKİSİ DE TEK İFADE:
 *  1. `updateMany` + `WHERE ... hold_expires_at < now`  → süresi dolmuş kilidi
 *     devral. İki istek aynı anda denerse PostgreSQL ikincisini bekletir,
 *     birinci commit edince WHERE'i yeniden değerlendirir ve artık koşul
 *     tutmadığı için 0 satır etkiler.
 *  2. `createMany` + `skipDuplicates` → `INSERT ... ON CONFLICT DO NOTHING`.
 *     Kayıt hiç yoksa ekler; varsa 0 döner. `unique(event_id, seat_id)`
 *     kısıtı hakemlik yapar.
 *
 * ⚠️ İKİNCİ ADIMDA NEDEN `create` DEĞİL `createMany`: `create` çakışmada P2002
 * FIRLATIYOR ve PostgreSQL'de bir transaction içindeki hata o transaction'ı
 * KOMPLE ABORT ediyor — hatayı yakalayıp devam etmek mümkün olmuyor, sonraki
 * her ifade "current transaction is aborted" alıyor. `skipDuplicates` hiç
 * istisna üretmediği için kilit ile sepet satırı AYNI transaction'da
 * yazılabiliyor.
 */

type Client = Prisma.TransactionClient | typeof prisma;

export type HeldSeatRow = {
  id: string;
  eventId: string;
  seatId: string;
  userId: string;
  holdExpiresAt: Date | null;
};

/**
 * Koltuğu bu kullanıcı adına kilitler.
 *
 * Dönen değer `null` ise koltuk BAŞKASININ: satılmış ya da süresi dolmamış bir
 * kilit altında. Çağıran bunu 409'a çevirir (PRD §5.2 birinci kabul kriteri).
 *
 * TRANSACTION İÇİNDE ÇAĞRILMAK ÜZERE yazıldı: kilit ile sepet satırı birlikte
 * yazılıyor ve biri olmadan diğeri anlamsız.
 */
export async function acquireSeatHold(
  input: {
    eventId: string;
    seatId: string;
    userId: string;
    holdExpiresAt: Date;
    now: Date;
  },
  client: Client,
): Promise<HeldSeatRow | null> {
  const takenOver = await client.seatReservation.updateMany({
    where: {
      eventId: input.eventId,
      seatId: input.seatId,
      status: "held",
      holdExpiresAt: { lt: input.now },
    },
    data: { userId: input.userId, holdExpiresAt: input.holdExpiresAt },
  });

  if (takenOver.count === 0) {
    const inserted = await client.seatReservation.createMany({
      data: {
        eventId: input.eventId,
        seatId: input.seatId,
        userId: input.userId,
        status: "held",
        holdExpiresAt: input.holdExpiresAt,
      },
      skipDuplicates: true,
    });

    // Ne devralınabildi ne eklenebildi → koltuk gerçekten dolu.
    if (inserted.count === 0) return null;
  }

  /**
   * Kimlik ancak yazdıktan SONRA okunabiliyor: `createMany` kimlik döndürmüyor.
   * Okuma güvenli, çünkü satır bu transaction'ın kilidi altında — araya kimse
   * giremez.
   */
  return findSeatReservation({ eventId: input.eventId, seatId: input.seatId }, client);
}

/** Bir etkinlik + koltuk çiftinin rezervasyonu (varsa). */
export async function findSeatReservation(
  input: { eventId: string; seatId: string },
  client: Client = prisma,
): Promise<HeldSeatRow | null> {
  return client.seatReservation.findUnique({
    where: { eventId_seatId: { eventId: input.eventId, seatId: input.seatId } },
    select: { id: true, eventId: true, seatId: true, userId: true, holdExpiresAt: true },
  });
}

/**
 * Kilidi bırakır (kullanıcı vazgeçti veya sepetten çıkardı).
 *
 * SAHİPLİK VE DURUM SORGUNUN İÇİNDE: `userId` eşleşmezse hiçbir satır
 * etkilenmez (IDOR) ve `status = held` koşulu SATILMIŞ BİR BİLETİN
 * SİLİNMESİNİ imkânsız kılar — kimlik tahmin edilse bile.
 *
 * Kayıt siliniyor, `cancelled` işaretlenmiyor: vazgeçilmiş bir kilidin
 * saklanacak bir değeri yok ve satır dururken `unique(event_id, seat_id)`
 * yuvasını meşgul ederdi. 3 yıl saklanan şey SATILMIŞ bilettir (data-model.md).
 */
export async function releaseSeatHold(
  input: { reservationId: string; userId: string },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.seatReservation.deleteMany({
    where: { id: input.reservationId, userId: input.userId, status: "held" },
  });

  return result.count === 1;
}

/**
 * Süresi DOLMUŞ kilidi siler (sepet süpürmesi kullanıyor).
 *
 * `userId` koşulu YOK çünkü çağıran zaten kendi sepetindeki satırdan geliyor;
 * ama `hold_expires_at <= now` koşulu var: bu arada kilit yenilenmişse (başka
 * biri devralmışsa) satır korunur.
 */
export async function deleteExpiredSeatHold(
  input: { reservationId: string; now: Date },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.seatReservation.deleteMany({
    where: { id: input.reservationId, status: "held", holdExpiresAt: { lte: input.now } },
  });

  return result.count === 1;
}

/**
 * Kilidi SATIŞA çevirir — ödemenin transaction'ı içinde (PRD §5.2).
 *
 * Dört koşul birden aranıyor: doğru kayıt, doğru sahip, hâlâ kilitli ve süresi
 * DOLMAMIŞ. Biri tutmazsa 0 satır etkilenir ve çağıran ödemeyi bozar; yani
 * süresi ödeme ekranında dolmuş bir koltuk satılamaz. Süre kontrolünün burada
 * da olması ikinci kemer: sepet süpürmesi çalışmamış olsa bile koltuk
 * kaçırılmış sayılır.
 *
 * `hold_expires_at` boşaltılıyor: satılmış bilette "kilit ne zaman bitiyor"
 * sorusunun cevabı yok ve dolu kalsaydı okuma sorguları onu kilit sanardı.
 */
export async function markSeatSold(
  input: { reservationId: string; userId: string; now: Date },
  client: Client,
): Promise<boolean> {
  const result = await client.seatReservation.updateMany({
    where: {
      id: input.reservationId,
      userId: input.userId,
      status: "held",
      holdExpiresAt: { gt: input.now },
    },
    data: { status: "sold", holdExpiresAt: null },
  });

  return result.count === 1;
}

export type SeatReservationDetail = {
  id: string;
  status: "held" | "sold";
  holdExpiresAt: Date | null;
  eventName: string;
  block: string;
  rowLabel: string;
  seatNumber: number;
};

/**
 * Rezervasyonları etkinlik ve koltuk bilgisiyle birlikte getirir.
 *
 * Sepet süpürmesi kullanıyor: bildirimde koltuğun TAM ADRESİ geçmeli, yoksa
 * üç koltuk tutan kullanıcı hangisini kaybettiğini bilemez. Tek sorgu, satır
 * başına ayrı sorgu değil (N+1).
 */
export async function findSeatReservationDetails(
  reservationIds: readonly string[],
  client: Client = prisma,
): Promise<Map<string, SeatReservationDetail>> {
  if (reservationIds.length === 0) return new Map();

  const rows = await client.seatReservation.findMany({
    where: { id: { in: [...reservationIds] } },
    select: {
      id: true,
      status: true,
      holdExpiresAt: true,
      event: { select: { name: true } },
      seat: { select: { block: true, rowLabel: true, seatNumber: true } },
    },
  });

  return new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        status: row.status,
        holdExpiresAt: row.holdExpiresAt,
        eventName: row.event.name,
        block: row.seat.block,
        rowLabel: row.seat.rowLabel,
        seatNumber: row.seat.seatNumber,
      },
    ]),
  );
}
