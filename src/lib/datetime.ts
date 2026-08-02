import { DISPLAY_TIME_ZONE, LOCALE } from "@/config/constants";

/**
 * Tarih ve saatin GÖSTERİM tarafı (02-coding-standards.md · data-model.md:
 * "Tüm tarihler UTC saklanır, ekranda Europe/Istanbul'a çevrilir").
 *
 * SUNUCUNUN KENDİ SAAT DİLİMİNE GÜVENİLMEZ. Vercel fonksiyonları UTC'de,
 * geliştiricinin makinesi Türkiye saatinde çalışıyor; `date.getHours()` gibi
 * yerel saate bakan her çağrı bu ikisinde farklı sonuç verir. Bu dosyadaki
 * fonksiyonların hepsi saat dilimini AÇIKÇA belirtir, dolayısıyla nerede
 * çalıştıklarından bağımsız aynı cevabı üretir.
 *
 * Modülden bağımsızdır: hastane randevusu bugün, etkinlik koltuk kilidi
 * (PRD §5.2) ve teslimat zaman aralığı (PRD §5.3) yarın aynı yardımcıları
 * kullanacak.
 */

/**
 * Bir anın, İstanbul takvimine göre hangi güne düştüğünü `YYYY-MM-DD` olarak verir.
 *
 * Neden `toISOString().slice(0, 10)` DEĞİL: o, UTC gününü verir. Gece
 * 00:30'daki (İstanbul) bir randevu UTC'de hâlâ bir önceki gündür ve "aynı gün
 * ikinci randevu" kuralı yanlış günü karşılaştırırdı.
 */
export function istanbulDayKey(instant: Date): string {
  // `en-CA` yerel ayarı ISO düzeninde (YYYY-MM-DD) biçimlendirir; elle parça
  // birleştirmeye gerek bırakmaz.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/**
 * Verilen anın düştüğü İSTANBUL GÜNÜNÜN sınırlarını UTC olarak verir.
 *
 * `start` o günün 00:00'ı, `end` ERTESİ günün 00:00'ıdır; yani aralık
 * `[start, end)` biçiminde yarı açıktır. Kapalı aralık kullanmak, tam gece
 * yarısına denk gelen bir kaydı iki güne birden saydırırdı.
 *
 * Veritabanı sorgusu bu sınırlarla yazılır (`gte` / `lt`): günü SQL tarafında
 * hesaplatmak `starts_at` üzerindeki index'i kullanılamaz hale getirirdi.
 */
export function istanbulDayBoundsUtc(instant: Date): { start: Date; end: Date } {
  const start = startOfIstanbulDay(instant);

  // Bir sonraki günün başlangıcı 24 saat eklenerek DEĞİL, 36 saat ileri
  // gidilip yeniden gün başına yuvarlanarak bulunuyor. Türkiye 2016'dan beri
  // sabit UTC+03 kullanıyor, ama yaz saati yeniden gelirse 24 saatlik toplama
  // yılda iki kez yanlış sınır üretirdi; bu yol o durumda da doğru kalır.
  const end = startOfIstanbulDay(new Date(start.getTime() + 36 * 60 * 60_000));

  return { start, end };
}

/** Ekranda gösterilecek saat: `09:20`. */
export function formatIstanbulTime(instant: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: DISPLAY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}

/** Ekranda gösterilecek tam tarih: `4 Ağustos 2026 Salı`. */
export function formatIstanbulDate(instant: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: DISPLAY_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  }).format(instant);
}

/** Gün şeridi için kısa etiket: `4 Ağu Sal`. */
export function formatIstanbulShortDay(instant: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: DISPLAY_TIME_ZONE,
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(instant);
}

/** Tarih ve saat birlikte: `4 Ağustos 2026 Salı 09:20`. */
export function formatIstanbulDateTime(instant: Date): string {
  return `${formatIstanbulDate(instant)} ${formatIstanbulTime(instant)}`;
}

/**
 * `<time>` etiketinin makine tarafı. Ekran okuyucular ve arama motorları
 * biçimlendirilmiş Türkçe metni değil bunu okur.
 */
export function toMachineDateTime(instant: Date): string {
  return instant.toISOString();
}

/** Verilen anın düştüğü İstanbul gününün 00:00'ı, UTC olarak. */
function startOfIstanbulDay(instant: Date): Date {
  const offsetMs = istanbulOffsetMs(instant);

  // Anı İstanbul duvar saatine taşı, günün başına yuvarla, sonra UTC'ye
  // geri döndür. Yuvarlama UTC yardımcılarıyla yapılıyor çünkü `setHours`
  // sunucunun kendi saat dilimini kullanır.
  const wallClock = new Date(instant.getTime() + offsetMs);
  const wallClockDayStart = Date.UTC(
    wallClock.getUTCFullYear(),
    wallClock.getUTCMonth(),
    wallClock.getUTCDate(),
  );

  return new Date(wallClockDayStart - offsetMs);
}

/**
 * İstanbul'un o andaki UTC farkı, milisaniye cinsinden (bugün sabit +3 saat).
 *
 * Sabit `3 * 60 * 60_000` yazmak daha kısa olurdu ama 2016 öncesinde Türkiye
 * yaz saati uyguluyordu ve karar geri alınabilir. Farkı çalışma anında
 * sormak, o gün kodun hiç değişmemesi demek.
 */
function istanbulOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  // `hour12: false` bazı ortamlarda gece yarısını 24 olarak veriyor; 0'a çekmek
  // gerekiyor, yoksa fark bir gün kayar.
  const hour = read("hour") % 24;

  const asIfUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    hour,
    read("minute"),
    read("second"),
  );

  // Saniye altı bilgi biçimlendirmede kayboluyor; farkın kendisi her zaman tam
  // dakika olduğu için bunu geri eklemek gerekiyor, yoksa yuvarlama hatası olur.
  return asIfUtc - (instant.getTime() - instant.getMilliseconds());
}
