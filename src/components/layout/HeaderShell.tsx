"use client";

import { MenuIcon, XIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { cn } from "@/lib/utils";

/**
 * Üst menünün DÜZENİ ve mobil açılır menü davranışı.
 *
 * NEDEN AYRI (VE İSTEMCİ) BİLEŞEN: `SiteHeader` oturumu sunucuda okuyor, yani
 * sunucu bileşeni olmak zorunda; açılır menü ise tarayıcıda durum tutuyor.
 * İkisi tek dosyada olamazdı. Bağlantılar sunucuda üretilip buraya `children`
 * olarak geçiyor — oturum bilgisi istemciye bir bayrak olarak inmiyor.
 *
 * BAĞLANTILAR TEK KOPYA: masaüstü için ayrı, mobil için ayrı menü YAZILMADI.
 * Aynı bağlantı DOM'a iki kez girseydi ekran okuyucu her şeyi iki kez okur,
 * otomatik testler de "hangisini kastettin?" diye takılırdı. Tek liste var;
 * mobilde alta açılıyor, `md` üstünde satır içinde duruyor.
 *
 * GİRİŞ/ÇIKIŞ DÜĞMESİ MENÜNÜN İÇİNDE DEĞİL: en kritik eylem, menüyü açmayı
 * gerektirmeden her ekran boyutunda görünür kalmalı.
 */
export function HeaderShell({
  brand,
  nav,
  actions,
}: {
  brand: React.ReactNode;
  nav: React.ReactNode;
  actions: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();

  /*
    Bağlantıya basınca menü açık kalmamalı: kullanıcı yeni sayfayı değil hâlâ
    menüyü görürdü.

    Bu, React'in "adres değişince durumu ayarla" deseni — `useEffect` DEĞİL.
    Efektle yapılsaydı menü bir kare boyunca açık çizilip hemen kapanırdı
    (React bunu "cascading render" diye uyarıyor, lint kuralı da yasaklıyor).
    Render sırasında ayarlandığında kullanıcı ara kareyi hiç görmez.
  */
  const [renderedPathname, setRenderedPathname] = useState(pathname);
  if (pathname !== renderedPathname) {
    setRenderedPathname(pathname);
    setIsOpen(false);
  }

  return (
    <header className="border-b bg-background">
      <div className="page-shell flex flex-wrap items-center gap-x-1.5 gap-y-1 py-2 sm:gap-x-2">
        <div className="mr-auto md:mr-2">{brand}</div>

        <nav
          id={panelId}
          aria-label={messages.nav.label}
          className={cn(
            // Mobil: kendi satırında, tam genişlikte, kapalıyken hiç yok
            "order-last basis-full flex-col gap-1 pb-2",
            isOpen ? "flex" : "hidden",
            // Masaüstü: satır içinde ve her zaman açık
            "md:order-0 md:mr-auto md:flex md:basis-auto md:flex-row md:items-center md:pb-0",
          )}
        >
          {nav}
        </nav>

        {actions}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          // Dokunma hedefi en az 44x44px (07-ui-design-system.md)
          className="size-11 md:hidden"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <XIcon aria-hidden="true" /> : <MenuIcon aria-hidden="true" />}
          <span className="sr-only">{isOpen ? messages.nav.closeMenu : messages.nav.openMenu}</span>
        </Button>
      </div>
    </header>
  );
}
