import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

/**
 * Baseline güvenlik başlıkları (docs/standards/05-auth-security.md §5.5).
 *
 * ⛔ CONTENT-SECURITY-POLICY BU LİSTEDE YOK — BİLEREK. Adım 18d'de sıkı
 * (nonce tabanlı) CSP'ye geçildi ve nonce her istekte yeniden üretilmek
 * zorunda olduğu için politika `src/proxy.ts`'e taşındı. Buradaki başlıklar
 * derleme anında sabitlenir; sabit bir nonce nonce değildir.
 *
 * ⚠️ BURAYA İKİNCİ BİR CSP SATIRI EKLEME. İki `Content-Security-Policy`
 * başlığı gönderildiğinde tarayıcı ikisini de ayrı ayrı uygular ve KESİŞİMİ
 * alır: buradaki gevşek politika sıkı olanı gevşetmez ama proxy'nin izin
 * verdiği kaynakları sessizce bloklar. Hata da yalnızca tarayıcı konsolunda
 * görünür — sunucu hiçbir şey söylemez.
 */
const securityHeaders = [
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
