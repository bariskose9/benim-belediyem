import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import { EnvBanner } from "@/components/layout/EnvBanner";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { isProductionEnv, publicEnv } from "@/config/env";
import { messages } from "@/config/messages";
import { themeInitScript } from "@/lib/theme";
import { cn } from "@/lib/utils";

import "./globals.css";

// next/font yazı tipini derleme sırasında indirip kendi sunucumuzdan servis eder;
// çalışma anında Google'a istek gitmez (gizlilik + düzen kayması olmaması için).
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

/** Skip link'in hedefi; `<main>` etiketleri sayfaların kendi içinde. */
const CONTENT_ID = "icerik";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  title: messages.app.title,
  description: messages.app.description,
  // Local ve preview arama motoruna düşmez (docs/standards/13-environments.md)
  robots: isProductionEnv ? { index: true, follow: true } : { index: false, follow: false },
};

/**
 * Tarayıcı arayüzü (mobilde adres çubuğu) da temaya uysun diye iki değer.
 * Sayfanın kendi teması sınıf tabanlı; bu yalnızca tarayıcı kabuğu için.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0d12" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        {/*
          Tema sınıfı sayfa BOYANMADAN ÖNCE uygulanıyor (`src/lib/theme.ts`).
          React'ten sonra çalışsaydı koyu tema kullanıcısı her açılışta bir
          anlık beyaz parlama görürdü.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        {/*
          Klavye ile gezenin ilk odağı: menüyü tek tek geçmeden içeriğe atlar
          (WCAG 2.1 AA "Bypass Blocks"). Normalde görünmez, odaklanınca çıkar.
        */}
        <a
          href={`#${CONTENT_ID}`}
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          {messages.nav.skipToContent}
        </a>

        <EnvBanner />
        <SiteHeader />

        {/*
          `flex-1`: içerik kısa olsa bile alt bilgi ekranın altına yapışır,
          sayfanın ortasında asılı kalmaz.
          `tabIndex={-1}`: skip link buraya odaklanabilsin diye; halkası
          gizleniyor çünkü bu bir kontrol değil, yalnızca atlama hedefi.
        */}
        <div id={CONTENT_ID} tabIndex={-1} className="flex-1 outline-none">
          {children}
        </div>

        <SiteFooter />
      </body>
    </html>
  );
}
