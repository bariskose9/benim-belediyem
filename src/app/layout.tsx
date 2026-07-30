import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { EnvBanner } from "@/components/layout/EnvBanner";
import { isProductionEnv, publicEnv } from "@/config/env";
import { messages } from "@/config/messages";
import { cn } from "@/lib/utils";

import "./globals.css";

// next/font yazı tipini derleme sırasında indirip kendi sunucumuzdan servis eder;
// çalışma anında Google'a istek gitmez (gizlilik + düzen kayması olmaması için).
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  title: messages.app.title,
  description: messages.app.description,
  // Local ve preview arama motoruna düşmez (docs/standards/13-environments.md)
  robots: isProductionEnv ? { index: true, follow: true } : { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className="min-h-dvh">
        <EnvBanner />
        {children}
      </body>
    </html>
  );
}
