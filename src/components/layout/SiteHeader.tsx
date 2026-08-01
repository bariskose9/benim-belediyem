import Link from "next/link";

import { messages } from "@/config/messages";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { getCurrentSession } from "@/features/auth/services/session-context";

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
 * `12-operations-and-scaling.md` sırası izlenir.
 *
 * MENÜDE ÖĞE GİZLEMEK KORUMA DEĞİLDİR: personele özel bağlantılar burada
 * herkese görünür, kapı sayfanın kendisindedir (`page-guard.ts`).
 */
export async function SiteHeader() {
  const session = await getCurrentSession();

  return (
    <header className="border-b">
      <nav
        aria-label={messages.nav.label}
        className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
      >
        <Link href="/" className="font-semibold">
          {messages.app.name}
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {session ? (
            <>
              <Link href="/hesabim" className="underline-offset-4 hover:underline">
                {messages.nav.account}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/kayit" className="underline-offset-4 hover:underline">
                {messages.nav.register}
              </Link>
              <Link href="/giris" className="underline-offset-4 hover:underline">
                {messages.nav.login}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
