import type { Metadata } from "next";

import { messages } from "@/config/messages";

export const metadata: Metadata = {
  title: messages.auth.register.pageTitle,
};

/**
 * Kayıt akışının ortak çerçevesi.
 *
 * Her adım GERÇEK BİR ADRES (`/kayit`, `/kayit/bilgiler`, `/kayit/dogrulama`).
 * Tek sayfada durum tutan bir sihirbaz yerine bu seçildi çünkü geri tuşu
 * çalışıyor, her adımın kendi `loading` durumu olabiliyor ve sayfa yenilenince
 * kullanıcı kaldığı yerde kalıyor (durum sunucudaki taslakta).
 */
export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">{children}</main>;
}
