/**
 * Tema (açık / koyu) altyapısı — tek kaynak.
 *
 * NEDEN KÜTÜPHANE YOK: `next-themes` gibi bir paket eklemek yeni bir bağımlılık
 * demekti (CLAUDE.md §7). İhtiyacımız üç satır: sınıfı değiştir, tercihi sakla,
 * sayfa boyanmadan önce uygula. Bu dosya o üçünü tutuyor.
 *
 * NEDEN SINIF TABANLI: `docs/standards/07-ui-design-system.md` `.dark` sınıfı
 * istiyor. `prefers-color-scheme` medya sorgusuyla çalışsaydı kullanıcı sistem
 * tercihinin tersini seçemezdi.
 */

export const THEME_STORAGE_KEY = "benim-belediyem:tema";
export const DARK_CLASS = "dark";

export type Theme = "light" | "dark";

/**
 * Sayfa BOYANMADAN ÖNCE çalışan betik.
 *
 * NEDEN SATIR İÇİ VE `<head>` İÇİNDE: tema sınıfı React yüklendikten sonra
 * eklenseydi, koyu tema kullanıcısı her sayfa açılışında bir anlık beyaz
 * parlama görürdü ("flash of wrong theme"). Bu betik ilk boyamadan önce
 * çalıştığı için parlama hiç oluşmaz.
 *
 * `try/catch` şart: gizli sekmede veya çerez/depolama kapalıyken
 * `localStorage` erişimi istisna fırlatır. O durumda tema sistem tercihine
 * düşer, sayfa yine açılır — bir tema tercihi yüzünden site çökmez.
 *
 * Sabitler string'e ELLE gömülmüyor, aşağıda birleştiriliyor; iki yerde
 * yazılan bir anahtar er ya da geç ayrışır.
 */
export const themeInitScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle(${JSON.stringify(
  DARK_CLASS,
)},d);}catch(e){}})();`;

/**
 * Temayı ters çevirir, yeni temayı döndürür ve tercihi kalıcı saklar.
 *
 * Kaynak doğruluk DOM'un kendisinde (`<html>` üzerindeki sınıf), React
 * durumunda değil. Sebebi: yukarıdaki betik sınıfı React'ten önce koyuyor;
 * ikinci bir kopya durum tutulsaydı ikisi ayrışabilirdi.
 */
export function toggleTheme(): Theme {
  const isDark = document.documentElement.classList.toggle(DARK_CLASS);
  const theme: Theme = isDark ? "dark" : "light";

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Depolama kapalıysa tercih o sekmede yaşar, kalıcı olmaz. Sessizce
    // yutulan bir hata değil: kullanıcı için görünür sonuç yok, tema yine değişti.
  }

  return theme;
}
