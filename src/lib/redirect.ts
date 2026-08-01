/**
 * "Giriş yaptıktan sonra nereye dönülecek" adresinin temizlenmesi.
 *
 * AÇIK YÖNLENDİRME (open redirect) KORUMASI: adres kullanıcıdan, yani adres
 * çubuğundan geliyor. Denetlenmeden kullanılırsa saldırgan
 * `/giris?donus=https://sahte-belediye.example` bağlantısını dağıtır; kullanıcı
 * gerçek siteye giriş yapar ve kimlik avı sayfasında bulur kendini. Bağlantı
 * gerçekten bizim alan adımıza gittiği için de şüphelenmez.
 *
 * KURAL: yalnızca tek eğik çizgiyle başlayan, kendi sitemizdeki YOLLAR kabul
 * edilir. Şema, alan adı ve protokole benzeyen her şey reddedilir; şüpheli
 * girdi hata vermez, sessizce güvenli varsayılana düşer.
 */
export const DEFAULT_REDIRECT_PATH = "/hesabim";

export function sanitizeRedirectPath(
  value: string | undefined,
  fallback: string = DEFAULT_REDIRECT_PATH,
): string {
  if (!value) return fallback;

  // `//ornek.test` ve `/\ornek.test` tarayıcıda ŞEMASIZ MUTLAK ADRESTİR:
  // tek eğik çizgiyle başladığı için "yol" sanılır ama başka siteye gider.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;

  // `/giris` ve `/kayit` dönüş hedefi olamaz: giriş sonrası tekrar giriş
  // ekranına düşen kullanıcı halkaya girer.
  if (value.startsWith("/giris") || value.startsWith("/kayit")) return fallback;

  return value;
}
