import { Logo } from "@/components/brand/Logo";
import { messages } from "@/config/messages";

/**
 * Alt bilgi — her sayfada görünür.
 *
 * TEK İŞİ FERAGAT METNİ. Site canlı ve depo herkese açık; ziyaretçi hangi
 * sayfaya düşerse düşsün buranın gerçek bir belediye olmadığını görmeli.
 * Bu yüzden metin ana sayfaya değil, çerçeveye konuldu.
 *
 * Henüz var olmayan sayfalara (KVKK, çerez, kullanım şartları — roadmap adım
 * 17) bağlantı verilmiyor: 404'e giden bir "yasal bilgi" bağlantısı,
 * bağlantının hiç olmamasından kötüdür.
 */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t bg-muted/40">
      <div className="page-shell flex flex-col gap-3 py-8 text-sm text-muted-foreground">
        <Logo />

        <p className="max-w-prose">{messages.footer.disclaimer}</p>

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
      </div>
    </footer>
  );
}
