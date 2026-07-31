import { DISPLAY_TIME_ZONE, MIN_REGISTRATION_AGE_YEARS } from "@/config/constants";

/**
 * 18 yaş kontrolü (PRD §5.0 adım 4b).
 *
 * "KPS'ten gelen doğum tarihi SUNUCUDA kontrol edilir; istemcinin gönderdiği
 * yaşa güvenilmez." Bu dosya saf bir fonksiyondur ve yalnızca KPS'ten gelen
 * tarihi alır — istemciden gelen bir tarih buraya hiç ulaşmaz.
 *
 * SINIR DURUMU: PRD "kayıt sırasında 18 yaşını dolduran (bugün doğum günü)
 * KABUL EDİLİR" diyor.
 *
 * NEDEN UTC DEĞİL İSTANBUL SAATİ: doğum tarihi bir TAKVİM tarihidir, bir an
 * değil. Türkiye UTC+3; İstanbul'da 30 Temmuz saat 01:00 iken UTC'de hâlâ
 * 29 Temmuz'dur. Kontrol UTC'ye göre yapılsaydı, doğum gününde kayıt olmaya
 * çalışan biri gecenin ilk üç saatinde haksız yere reddedilirdi.
 *
 * `date-fns` yerine `Intl` kullanılıyor: saat dilimi desteği `date-fns-tz`
 * adında AYRI bir paket gerektiriyor ve bu tek fonksiyon için paket eklemek
 * `00-stack.md`'ye aykırı olurdu.
 */

type CivilDate = { year: number; month: number; day: number };

export function isAdultOn(birthDate: Date, now: Date): boolean {
  const today = toIstanbulCivilDate(now);
  const birth = toUtcCivilDate(birthDate);

  return computeAge(birth, today) >= MIN_REGISTRATION_AGE_YEARS;
}

export function computeAge(birth: CivilDate, today: CivilDate): number {
  const rawAge = today.year - birth.year;
  const hadBirthdayThisYear =
    today.month > birth.month || (today.month === birth.month && today.day >= birth.day);

  return hadBirthdayThisYear ? rawAge : rawAge - 1;
}

/** "Bugün" — kullanıcının yaşadığı takvim günü, sunucunun saat dilimi değil. */
export function toIstanbulCivilDate(instant: Date): CivilDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: read("year"), month: read("month"), day: read("day") };
}

/**
 * Doğum tarihi Postgres'te `@db.Date` olarak duruyor ve Prisma onu gece yarısı
 * UTC olarak veriyor. Bu yüzden takvim alanları UTC'den OKUNMALI — yerel
 * saatten okunursa UTC+3'te tarih bir gün ileri kayar.
 */
export function toUtcCivilDate(date: Date): CivilDate {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}
