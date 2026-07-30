import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Baseline güvenlik başlıkları (docs/standards/05-auth-security.md §5.5).
 *
 * CSP şu an 'unsafe-inline' içeriyor: Next.js hidrasyon için satır içi script
 * enjekte ediyor ve bunu nonce ile imzalamak middleware gerektiriyor. Sıkı
 * (nonce tabanlı) CSP adım 18'de yapılacak — roadmap.md teknik borç #9.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // dev sunucusu hot reload için eval kullanıyor; üretimde kapalı
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
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

export default nextConfig;
