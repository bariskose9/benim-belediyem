import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { HeaderShell } from "@/components/layout/HeaderShell";
import { ShoppingCartIcon } from "lucide-react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { buttonVariants } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { primaryNavItems, type PrimaryNavKey } from "@/config/navigation";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { getCurrentSession } from "@/features/auth/services/session-context";
import { cn } from "@/lib/utils";

/**
 * Menü bağlantısının stili tek yerde. `min-h-11` mobilde dokunma hedefini
 * 44px'e çıkarıyor; masaüstünde satır yüksekliği daha derli toplu olabilir.
 */
const navLinkClassName =
  "flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground " +
  "transition-colors hover:bg-muted hover:text-foreground md:min-h-9";

/** Yapılandırmadaki anahtar → görünen Türkçe metin. */
const navLabels: Record<PrimaryNavKey, string> = {
  home: messages.nav.home,
  market: messages.nav.market,
  restaurant: messages.nav.restaurant,
  hospital: messages.nav.hospital,
  gym: messages.nav.gym,
};

/**
 * Üst menü — oturum durumuna göre değişir.
 *
 * SUNUCU BİLEŞENİ: oturum durumu istemciye bir bayrak olarak GÖNDERİLMİYOR,
 * sunucuda okunup doğrudan doğru menü render ediliyor. İstemcinin elinde
 * "girişliyim" diye değiştirebileceği bir değer yok.
 *
 * BEDEL: `cookies()` okunduğu için bu bileşeni içeren her sayfa dinamik hâle
 * gelir, yani statik olarak önceden üretilemez. Girişin her sayfada görünmesi
 * gereken bir uygulamada bu kaçınılmaz; ölçüm gerektiğinde
 * `12-operations-and-scaling.md` sırası izlenir (roadmap teknik borç #27).
 *
 * MENÜDE ÖĞE GİZLEMEK KORUMA DEĞİLDİR: personele özel bağlantılar burada
 * herkese görünür, kapı sayfanın kendisindedir (`page-guard.ts`).
 */
export async function SiteHeader() {
  const session = await getCurrentSession();

  return (
    <HeaderShell
      brand={
        <Link href="/" className="flex min-h-11 items-center rounded-md">
          <Logo />
        </Link>
      }
      nav={
        <>
          {primaryNavItems.map((item) => (
            <Link key={item.key} href={item.href} className={navLinkClassName}>
              {navLabels[item.key]}
            </Link>
          ))}

          {/* Hesaba ait bağlantı menünün sonunda; giriş/çıkış eylemi ise
              `actions` içinde, yani mobilde menü açılmadan da görünür. */}
          {session ? (
            <>
              {/*
                SİPARİŞ VE BİLDİRİM BAĞLANTILARI YALNIZCA OTURUM VARKEN.
                Girişsiz kullanıcının siparişi olamaz; onu boş bir sayfaya
                yollamak yerine hiç göstermemek doğru. Bu bir KOLAYLIK,
                koruma değil — kapı sayfanın kendisinde (`guardPage`).

                BİLDİRİM SAYACI ROZETİ YOK ve bu sepet düğmesiyle aynı karar:
                rozeti doğru tutmak her sayfayı ikinci bir sorguya bağlardı.
                Sayı, bildirim ekranının kendisinde görünüyor.
              */}
              <Link href="/siparislerim" className={navLinkClassName}>
                {messages.nav.orders}
              </Link>
              <Link href="/bildirimler" className={navLinkClassName}>
                {messages.nav.notifications}
              </Link>
              <Link href="/hesabim" className={navLinkClassName}>
                {messages.nav.account}
              </Link>
            </>
          ) : (
            <Link href="/kayit" className={navLinkClassName}>
              {messages.nav.register}
            </Link>
          )}
        </>
      }
      actions={
        <>
          {/*
            SEPET SAĞDA, MENÜNÜN İÇİNDE DEĞİL (PRD §4: "sağda sepet, dark mode
            düğmesi, profil/giriş"). Menüye konsaydı mobilde hamburger'in
            arkasında kalırdı; sepet, giriş düğmesi gibi her ekran boyutunda
            tek dokunuş uzaklıkta olmalı.

            SAYI GÖSTERİLMİYOR ve bu bilinçli: rozeti doğru tutmak her sayfayı
            sepet sorgusuna bağlardı (üst menü zaten oturum okuduğu için
            dinamik — teknik borç #27 — ama ikinci bir sorgu eklemek ölçüm
            yapmadan optimizasyon bozmak olurdu). Sayı, sepet ekranında görünüyor.
          */}
          <Link
            href="/sepet"
            aria-label={messages.cart.navLabel}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11")}
          >
            <ShoppingCartIcon aria-hidden="true" />
          </Link>
          <ThemeToggle />
          {session ? (
            <LogoutButton />
          ) : (
            <Link
              href="/giris"
              className={cn(buttonVariants({ variant: "default", size: "lg" }), "min-h-11")}
            >
              {messages.nav.login}
            </Link>
          )}
        </>
      }
    />
  );
}
