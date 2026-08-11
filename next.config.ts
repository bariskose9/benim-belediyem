import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Baseline güvenlik başlıkları (docs/standards/05-auth-security.md §5.5).
 *
 * CSP şu an 'unsafe-inline' içeriyor: Next.js hidrasyon için satır içi script
 * enjekte ediyor ve bunu nonce ile imzalamak middleware gerektiriyor. Sıkı
 * (nonce tabanlı) CSP adım 18'de yapılacak — roadmap.md teknik borç #9.
 */
/**
 * Cloudflare Turnstile (ADR-004) üç ayrı CSP yönergesine ihtiyaç duyuyor:
 * betiği bu alan adından yükleniyor, bulmacayı bir iframe içinde gösteriyor
 * ve doğrulama için aynı alan adına XHR atıyor.
 *
 * Bu satırlar olmadan widget SESSİZCE bozulur: testler geçer, sunucu hata
 * vermez, yalnızca tarayıcıda kutu hiç görünmez ve kayıt formu gönderilemez.
 * Tarayıcıda fiilen tıklanarak doğrulanmasının sebebi budur.
 */
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

const contentSecurityPolicy = [
  "default-src 'self'",
  // dev sunucusu hot reload için eval kullanıyor; üretimde kapalı
  `script-src 'self' 'unsafe-inline' ${TURNSTILE_ORIGIN}${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${TURNSTILE_ORIGIN}`,
  // Yalnızca Turnstile'a izin veriliyor; `frame-ancestors 'none'` aşağıda
  // duruyor, yani bizim sayfamız hâlâ hiçbir yere gömülemez.
  `frame-src 'self' ${TURNSTILE_ORIGIN}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // `standalone` çıktısı yalnızca Docker imajı için açılır (Dockerfile bunu
  // `NEXT_OUTPUT=standalone` ile ister). Kalıcı açık bırakılmıyor çünkü
  // `next start` bu modda çalışmıyor — local ve CI o komutu kullanıyor.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

/**
 * Sentry sarmalayıcısı (adım 18a).
 *
 * ⭐ `tunnelRoute` NEDEN AÇIK — İKİ AYRI KAZANÇ:
 *
 *  1. **CSP'ye dokunmak gerekmiyor.** Olaylar `ingest.sentry.io` yerine kendi
 *     alan adımızdaki bir yola POST ediliyor, yani yukarıdaki
 *     `connect-src 'self'` satırı olduğu gibi kalıyor. Alternatifte CSP'ye
 *     üçüncü bir dış kaynak eklemek gerekirdi.
 *  2. **Reklam engelleyiciler olayları düşürmüyor.** Engelleyicilerin çoğu
 *     `sentry.io` adresini listeliyor; engellenen bir hata takibi, hiç
 *     kurulmamış bir hata takibiyle aynı şeydir.
 *
 * Bedeli dokümanda yazılı ve kabul edildi: olaylar kendi sunucumuzdan geçtiği
 * için sunucu yükü bir miktar artıyor. Bu projede gerçek kullanıcı 0 ve olay
 * hacmi ücretsiz katmanın 5.000/ay sınırında.
 */
export default withSentryConfig(nextConfig, {
  // Vercel entegrasyonu enjekte ediyor; local'de tanımsız ve bu sorun değil.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Derleme çıktısını CI dışında sessiz tut; local `npm run build` gürültüsü olmasın.
  silent: !process.env.CI,

  tunnelRoute: "/sentry-tunnel",

  /**
   * Kaynak haritaları Sentry'ye yüklenip yayından SİLİNİYOR.
   *
   * Depo zaten herkese açık, yani harita bir sır saklamıyor; silinmesinin
   * sebebi gizlilik değil, dağıtım boyutu. Sentry'deki yığın izi yine
   * okunabilir kalıyor çünkü harita oraya yüklendi.
   */
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});

/**
 * ⛔ `automaticVercelMonitors` DENENDİ VE KALDIRILDI — teknik borç #96.
 *
 * Seçenek `vercel.json`'daki planlı görev için Sentry'de bir cron izleyicisi
 * kuruyor ve bu projede duran gerçek bir soruna cevap olurdu: adım 16'nın
 * cron'u canlıda hiç çalışmadı, üstelik bunu ancak günler sonra veritabanını
 * elle sorgulayarak fark ettik.
 *
 * Ama SDK'nın tip tanımında yazdığı gibi seçenek `webpack.` altında ve
 * **bu proje Turbopack ile derleniyor** (`npm run build` çıktısı:
 * "Next.js 16.2.12 (Turbopack)"). Turbopack'te derleme zamanı enstrümantasyonu
 * çalışmıyor, yani seçenek SESSİZCE etkisiz kalırdı.
 *
 * ⛔ Yapılandırmada bırakmak, olmayan bir alarmı VAR sanmak demekti — cron
 * körlüğünün bu projeye zaten bir kez pahalıya patlamış olması tam olarak bu
 * yüzden. Kurulacaksa Sentry'de izleyici ELLE oluşturulur.
 */
