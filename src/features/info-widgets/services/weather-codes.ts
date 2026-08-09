/**
 * WMO hava kodunun Türkçe karşılığı (Open-Meteo `weather_code`).
 *
 * NEDEN SAF BİR FONKSİYON: ağ, veritabanı ve React bilmiyor — yani ekrana hiç
 * çıkmadan test edilebiliyor. Metin `messages.ts` yerine burada, çünkü bu bir
 * cümle değil KOD EŞLEMESİ: 30 küsur sayının hangi aralığa düştüğü bir arayüz
 * metni değil, sağlayıcının sözleşmesinin çevirisi.
 *
 * Kaynak: Open-Meteo dokümantasyonundaki WMO 4677 kod tablosu.
 */

/** İkon seçimi arayüz katmanında yapılır; burada yalnızca hangi aile olduğu. */
export type WeatherIconKey =
  "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "thunder";

export type WeatherCondition = { label: string; icon: WeatherIconKey };

const CONDITIONS = new Map<number, WeatherCondition>([
  [0, { label: "Açık", icon: "clear" }],
  [1, { label: "Az bulutlu", icon: "partly" }],
  [2, { label: "Parçalı bulutlu", icon: "partly" }],
  [3, { label: "Çok bulutlu", icon: "cloudy" }],
  [45, { label: "Sisli", icon: "fog" }],
  [48, { label: "Kırağılı sis", icon: "fog" }],
  [51, { label: "Hafif çisenti", icon: "drizzle" }],
  [53, { label: "Çisenti", icon: "drizzle" }],
  [55, { label: "Yoğun çisenti", icon: "drizzle" }],
  [56, { label: "Dondurucu çisenti", icon: "drizzle" }],
  [57, { label: "Yoğun dondurucu çisenti", icon: "drizzle" }],
  [61, { label: "Hafif yağmurlu", icon: "rain" }],
  [63, { label: "Yağmurlu", icon: "rain" }],
  [65, { label: "Kuvvetli yağmurlu", icon: "rain" }],
  [66, { label: "Dondurucu yağmur", icon: "rain" }],
  [67, { label: "Kuvvetli dondurucu yağmur", icon: "rain" }],
  [71, { label: "Hafif kar yağışlı", icon: "snow" }],
  [73, { label: "Kar yağışlı", icon: "snow" }],
  [75, { label: "Yoğun kar yağışlı", icon: "snow" }],
  [77, { label: "Kar taneleri", icon: "snow" }],
  [80, { label: "Hafif sağanak yağışlı", icon: "rain" }],
  [81, { label: "Sağanak yağışlı", icon: "rain" }],
  [82, { label: "Kuvvetli sağanak yağışlı", icon: "rain" }],
  [85, { label: "Hafif kar sağanağı", icon: "snow" }],
  [86, { label: "Yoğun kar sağanağı", icon: "snow" }],
  [95, { label: "Gök gürültülü fırtına", icon: "thunder" }],
  [96, { label: "Dolulu gök gürültülü fırtına", icon: "thunder" }],
  [99, { label: "Kuvvetli dolulu fırtına", icon: "thunder" }],
]);

/**
 * Tanınmayan kod için NÖTR bir karşılık döner.
 *
 * Sağlayıcı tabloya yeni bir kod eklerse widget'ın çökmesi ya da boş kalması
 * kabul edilemez; "Bilinmiyor" demek dürüst ve zararsız.
 */
export function describeWeatherCode(code: number): WeatherCondition {
  return CONDITIONS.get(code) ?? { label: "Bilinmiyor", icon: "cloudy" };
}
