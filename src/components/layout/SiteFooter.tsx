import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { messages } from "@/config/messages";
import { LEGAL_PAGES } from "@/features/legal/legal-pages";

/**
 * Alt bilgi — her sayfada görünür.
 *
 * İKİ İŞİ VAR: kalıcı feragat metni ve yasal sayfalara erişim. Site canlı ve
 * depo herkese açık; ziyaretçi hangi sayfaya düşerse düşsün buranın gerçek bir
 * belediye olmadığını görmeli. Bu yüzden metin ana sayfaya değil, çerçeveye
 * konuldu.
 *
 * YASAL BAĞLANTILAR `LEGAL_PAGES` KATALOĞUNDAN ÇİZİLİYOR (adım 17): aynı liste
 * `sitemap.xml`'i ve belgelerin birbirine verdiği bağlantıları da besliyor.
 * Elle yazılsaydı yeni bir belge eklendiğinde alt bilgi güncellenmeden kalırdı
 * ve "yasal sayfalar footer'dan erişilir" kuralı (PRD §5.10) sessizce bozulurdu.
 */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t bg-muted/40">
      <div className="page-shell flex flex-col gap-3 py-8 text-sm text-muted-foreground">
        <Logo />

        <p className="max-w-prose">{messages.footer.disclaimer}</p>

        {/*
          `<nav>` + erişilebilir ad: ekran okuyucu kullanıcısı bu bağlantı
          öbeğini "yasal bilgiler" diye bulup doğrudan içine atlayabilsin.
        */}
        <nav aria-label={messages.footer.legalNavLabel}>
          <ul className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-6">
            <li>
              <Link
                href="/hakkimizda"
                className="flex min-h-11 items-center font-medium text-primary underline underline-offset-4"
              >
                {messages.footer.about}
              </Link>
            </li>

            {LEGAL_PAGES.map((page) => (
              <li key={page.slug}>
                <Link
                  href={page.slug}
                  className="flex min-h-11 items-center font-medium text-primary underline underline-offset-4"
                >
                  {page.linkLabel}
                </Link>
              </li>
            ))}

            <li>
              <a
                href={messages.footer.sourceCodeUrl}
                // Dış bağlantı: `noopener` açılan sayfanın bizim sekmemize
                // erişmesini engeller, `noreferrer` nereden geldiğimizi sızdırmaz.
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center font-medium text-primary underline underline-offset-4"
              >
                {messages.footer.sourceCode}
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
