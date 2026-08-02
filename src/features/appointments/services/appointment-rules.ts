import { APPOINTMENT_CANCEL_CUTOFF_MS } from "@/config/constants";
import { istanbulDayKey } from "@/lib/datetime";

/**
 * PRD §5.1'in zaman kuralları — SAF FONKSİYONLAR.
 *
 * Bu dosya veritabanı, HTTP ve oturum bilmez. Girdi olarak tarih alır, çıktı
 * olarak karar döner. Sebep `access-control.ts` ile aynı: kuralın kendisi tek
 * bir birim testiyle, sayfa çizmeden ve veritabanı ayağa kaldırmadan tam
 * olarak kanıtlanabiliyor.
 *
 * "ŞİMDİ" HER ZAMAN DIŞARIDAN VERİLİR, içeride `new Date()` çağrılmaz. İki
 * sebebi var: (1) testler sahte saatle çalışabiliyor (06-testing.md),
 * (2) tek bir istek içindeki tüm kararlar AYNI ana göre veriliyor — sorgu ile
 * kontrol arasında saat ilerlerse sınır durumları tutarsızlaşırdı.
 */

/**
 * Saat geçmişte mi (PRD §5.1: "geçmiş tarihe randevu alınamaz").
 *
 * Ölçüt GÜN değil AN: tohumlama öğleden sonra çalıştığında bugünün sabah
 * saatleri de geçmiştedir. Günü ölçüt almak, saat 15:00'te sabah 09:00'a
 * randevu verilmesine yol açardı.
 *
 * Tam o ana denk gelen saat de geçmiş sayılır (`<=`): başlamakta olan bir
 * randevuya kayıt açmanın anlamı yok.
 */
export function isSlotInPast(startsAt: Date, now: Date): boolean {
  return startsAt.getTime() <= now.getTime();
}

/**
 * İptal edilebilecek son an: randevudan 2 saat önce (PRD §5.1).
 *
 * Ayrı bir fonksiyon çünkü ekran da bu değere ihtiyaç duyuyor — kullanıcıya
 * "şu ana kadar iptal edebilirsiniz" diye gösteriliyor. Karar ile gösterim
 * ayrı ayrı hesaplansaydı, biri değiştiğinde diğerinin unutulması an
 * meselesiydi.
 */
export function cancellationDeadline(startsAt: Date): Date {
  return new Date(startsAt.getTime() - APPOINTMENT_CANCEL_CUTOFF_MS);
}

/**
 * İptal penceresi hâlâ açık mı (PRD §5.1: "iptal en geç randevudan 2 saat önce").
 *
 * SINIR DAHİLDİR: tam 2 saat kala yapılan iptal KABUL EDİLİR. "En geç 2 saat
 * önce" ifadesinin doğal okunuşu bu; sınırı dışlamak, saatine bakıp tam
 * zamanında tıklayan kullanıcıyı haksız yere reddederdi.
 */
export function canCancelAt(startsAt: Date, now: Date): boolean {
  return now.getTime() <= cancellationDeadline(startsAt).getTime();
}

/**
 * Saatleri İstanbul takvim gününe göre gruplar — ekranın gün şeridi bunu kullanır.
 *
 * Girdinin saate göre sıralı geldiği varsayılır (repository `orderBy` ile
 * öyle döndürüyor); `Map` ekleme sırasını koruduğu için günler de sıralı
 * çıkar ve ayrıca sıralamaya gerek kalmaz.
 */
export function groupSlotsByIstanbulDay<T extends { startsAt: Date }>(
  slots: readonly T[],
): { dayKey: string; date: Date; slots: T[] }[] {
  const days = new Map<string, { dayKey: string; date: Date; slots: T[] }>();

  for (const slot of slots) {
    const dayKey = istanbulDayKey(slot.startsAt);
    const existing = days.get(dayKey);

    if (existing) {
      existing.slots.push(slot);
    } else {
      // `date` o günün İLK saatidir, gün başı değil: ekran yalnızca
      // biçimlendirmek için kullanıyor ve iki değer aynı güne düşüyor.
      days.set(dayKey, { dayKey, date: slot.startsAt, slots: [slot] });
    }
  }

  return [...days.values()];
}
