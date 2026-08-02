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
