/**
 * Performans ve erişilebilirlik bütçeleri — TEK KAYNAK (adım 18c).
 *
 * `docs/standards/09-ci-cd-deploy.md` bu üç kapıyı yazılı olarak istiyordu ama
 * CI'da hiçbiri ölçülmüyordu. Ölçüm yoksa kapı da yoktur; bu dosya kapının
 * sayısal tarafı.
 */

/**
 * ⛔⛔ NEDEN İKİ SÜTUN VAR: "cırcır" (ratchet) ilkesi.
 *
 * 2026-08-11'de ÖLÇÜLDÜ ve iki bütçe zaten aşılmış durumdaydı: ilk yük JS
 * 281 KB (hedef 200) ve anasayfa LCP'si canlıda 2844 ms (hedef 2500). Kapıyı
 * doğrudan HEDEF değerle kurmak CI'ı ilk günden kırmızıya çevirir ve hiçbir
 * şey merge edilemez hâle gelirdi.
 *
 * İki yanlış çözüm vardı ve ikisi de reddedildi:
 *   1. Kapıyı hiç kurmamak → bugünkü durum: bütçe yalnızca yazılı bir dilek
 *   2. Kapıyı kurup "şimdilik" devre dışı bırakmak → CLAUDE.md §7 açıkça yasak
 *
 * Seçilen: kapı BUGÜNKÜ ÖLÇÜLEN değere kilitlenir. Bugünden kötüye gidiş
 * merge edilemez; hedefe olan fark teknik borç olarak açıkça yazılır
 * (roadmap #108, #109). Bu bir gevşetme değildir — bugün hiç kapı yok,
 * bundan sonra var. Cırcır yalnızca SIKILIR: bir ölçüm hedefe yaklaşırsa
 * `current` düşürülür, asla yükseltilmez.
 */

/** Bir sayfanın ilk yükünde inen JS (gzip, KB). */
export const FIRST_LOAD_JS_KB = {
  /**
   * Ölçülen en yüksek değer 281,7 KB (`/restoran`, local üretim yapısı).
   * ~%2 pay bırakıldı: aynı kaynak farklı Node/npm sürümüyle derlendiğinde
   * birkaç bayt oynayabiliyor ve kapı bunun için kırmızıya dönmemeli.
   */
  current: 288,
  /** `docs/standards/07-ui-design-system.md` bütçesi. */
  target: 200,
};

/**
 * Largest Contentful Paint (ms).
 *
 * ⚠️ BU KAPININ ÖLÇTÜĞÜ ŞEY SINIRLIDIR — ve bunu bilerek yazıyoruz.
 * CI localhost'a bakıyor. Chrome'un ağ kısıtı ALT KAYNAKLARA uygulanıyor
 * (2026-08-11'de ölçüldü: en yavaş kaynak 32 ms → 15 059 ms) ama ANA BELGEYE
 * uygulanmıyor (TTFB 10 ms → 6 ms, yani değişmiyor). Sunucu da aynı makinede.
 *
 * Sonuç: buradaki sayı GERÇEK KULLANICININ gördüğü LCP değil. Aynı sayfa
 * canlıda 2844 ms ölçüldü, local'de 664 ms. Bu kapı bir REGRESYON TELİ:
 * "bugün geçen bir sayfa yarın belirgin şekilde yavaşlarsa yakala" der,
 * "bütçeyi tutuyoruz" DEMEZ. Gerçek ağ ölçümü teknik borç #109.
 *
 * Bu yüzden eşik cırcır değil, standardın hedefi: local ölçüm (en kötü
 * 1688 ms, `/restoran`) hedefin altında ve dar bir cırcır CI donanımında
 * kararsız kırmızı üretirdi — testi kırılgan yapmak onu ölçüm olmaktan çıkarır.
 *
 * ⚠️ AÇIK RİSK: GitHub'ın koşucusu bu makineden yavaş ve üstüne 4 kat CPU
 * kısıtı biniyor. 1688 ms ile 2500 ms arasındaki payın orada da yeterli olup
 * olmadığı BU DEPODAN ÖLÇÜLEMEZ; ilk CI koşusunda görülecek. Kararsız çıkarsa
 * çözüm eşiği yükseltmek DEĞİL, önce ölçüp sebebini yazmaktır.
 */
export const LCP_MS = { current: 2500, target: 2500 };

/** Cumulative Layout Shift. Ölçülen en kötü değer 0,0099 — hedefin çok altında. */
export const CLS = { current: 0.1, target: 0.1 };

/**
 * Bütçe ölçülen sayfalar.
 *
 * Hepsi GİRİŞ GEREKTİRMEYEN sayfalar: kapı bir oturum kurmak zorunda kalsaydı
 * ölçüm, ölçmek istediği şey yerine oturum akışının hızına bağlanırdı. Liste
 * kasıtlı olarak dar — her sayfayı ölçmek CI süresini ölçtüğü değerden daha
 * fazla artırır.
 *
 * ⛔ BURAYA GİRİŞ GEREKTİREN BİR SAYFA YAZMA. İlk denemede `/spor-salonu` ve
 * `/hastane` yazılmıştı; ikisi de PERSONELE ÖZEL. `page.goto` bu sayfalarda
 * 200 döndürüyor, yönlendirme hidrasyondan SONRA uygulanıyor — yani ölçüm
 * sessizce GİRİŞ SAYFASINI ölçüyordu ve `/spor-salonu` bu yüzden en hızlı
 * sayfa gibi görünüyordu (240 ms). Testler bunu `expectRoute` ile yakalıyor.
 */
export const MEASURED_ROUTES = [
  "/",
  "/market",
  "/etkinlikler",
  "/giris",
  "/gizlilik",
  "/restoran",
] as const;

/**
 * Lighthouse'un "mobil" laboratuvar profili. Kısıt olmadan ölçüm anlamsız:
 * kısıtsız localhost'ta anasayfanın LCP'si 40 ms çıkıyor ve kapı hiçbir
 * zaman kırmızıya dönmüyor — yani hiçbir şey ölçmüyor.
 */
export const THROTTLING = {
  cpuSlowdownRate: 4,
  latencyMs: 150,
  downloadBps: (1.6 * 1024 * 1024) / 8,
  uploadBps: (750 * 1024) / 8,
};
