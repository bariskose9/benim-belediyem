/**
 * Tahsilat dönemi aritmetiği (PRD §5.6 "Otomatik tahsilat zamanı").
 *
 * SAF FONKSİYONLAR: veritabanı, saat veya oturum bilmezler. Zaman dışarıdan
 * verilir; böylece testler sahte saatle ileri sarabilir (ADR-013'ün üzerine
 * kurulduğu disiplin).
 */

/**
 * Bir tarihe takvim ayı ekler ve ayın karşılığı olmayan günlerde AY SONUNA çeker.
 *
 * ═══ NEDEN "30 GÜN EKLE" DEĞİL ═══
 *
 * Sabit gün eklemek tahsilat gününü her ay biraz kaydırır: 1 Ocak'ta başlayan
 * bir üyelik 31 Ocak, 2 Mart, 1 Nisan diye ilerler ve bir yıl sonra kullanıcı
 * "ayın kaçında para çekiliyor" sorusuna cevap veremez. Takvim ayı, insanın
 * beklediği davranıştır: 15'inde başlayan üyelik her ayın 15'inde yenilenir.
 *
 * ═══ NEDEN UTC ÜZERİNDEN ═══
 *
 * Türkiye 2016'dan beri yaz saati uygulamıyor ve sabit UTC+3 kullanıyor;
 * dolayısıyla UTC'de ay eklemek İstanbul'daki saat dilimini AYNEN korur
 * (03:00'te başlayan tahsilat her ay 03:00'te kalır). Yerel saate göre
 * hesaplamak sunucunun saat dilimine bağımlılık yaratırdı — `datetime.ts`
 * tam da bunu yasaklıyor.
 *
 * AY SONUNA ÇEKME: 31 Ocak + 1 ay = 28 Şubat (artık yılda 29). `Date`'in
 * kendi davranışı 3 Mart'a taşardı ve tahsilat günü sessizce kayardı.
 */
export function addCalendarMonths(from: Date, months: number): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const day = from.getUTCDate();

  const targetMonthLastDay = new Date(Date.UTC(year, month + months + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(
      year,
      month + months,
      Math.min(day, targetMonthLastDay),
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds(),
    ),
  );
}

/** Gün ekler — hatırlatma ve ödeme süresi pencerelerinde kullanılır. */
export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60_000);
}
