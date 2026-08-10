import Link from "next/link";

import type { LegalSection } from "@/config/messages-legal";
import { messages } from "@/config/messages";
import { DataControllerCard } from "@/features/legal/components/DataControllerCard";
import { LEGAL_PAGES, type LegalSlug } from "@/features/legal/legal-pages";

const copy = messages.legal;

/**
 * Yasal belgelerin ORTAK KABUĞU (adım 17).
 *
 * NEDEN ORTAK: dört sayfanın da başlığı, yürürlük tarihi, feragat kutusu,
 * veri sorumlusu bloğu ve diğer belgelere giden bağlantıları AYNI. Dört kez
 * yazılsaydı biri güncellenip diğerleri unutulurdu — üstelik güncellenmesi
 * gereken şey yasal bir metin olurdu.
 *
 * Okunabilirlik için gövde `max-w-prose` ile sınırlı: uzun satırlar geniş
 * ekranda gözün satır başını kaybetmesine yol açıyor (07-ui-design-system.md).
 */
export function LegalDocument({
  slug,
  title,
  intro,
  sections,
  children,
}: {
  slug: LegalSlug;
  title: string;
  intro: string;
  sections: readonly LegalSection[];
  /** Sayfaya özel ek içerik (çerez tablosu gibi) — bölümlerin ARDINDAN çizilir. */
  children?: React.ReactNode;
}) {
  const others = LEGAL_PAGES.filter((page) => page.slug !== slug);

  return (
    <main className="page-shell flex flex-col gap-8 py-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{title}</h1>

        <p className="max-w-prose text-base text-muted-foreground">{intro}</p>

        <p className="text-sm text-muted-foreground">
          {copy.common.effectiveDateLabel}: {copy.common.effectiveDate}
        </p>
      </header>

      {/*
        Feragat her yasal sayfada tekrarlanıyor: bu sayfalar arama sonucundan
        DOĞRUDAN açılabilir ve o kullanıcı alt bilgideki uyarıyı hiç görmemiş olur.
      */}
      <aside
        aria-labelledby="yasal-feragat"
        className="rounded-lg border border-border bg-muted/40 p-4"
      >
        <h2 id="yasal-feragat" className="font-heading text-base font-semibold">
          {copy.common.disclaimerHeading}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">{copy.common.disclaimer}</p>
      </aside>

      {sections.map((section) => (
        <LegalSectionBlock key={section.heading} section={section} />
      ))}

      {children}

      <DataControllerCard />

      <nav aria-labelledby="diger-belgeler" className="flex flex-col gap-2 border-t pt-6">
        <h2 id="diger-belgeler" className="font-heading text-lg font-semibold tracking-tight">
          {copy.common.otherDocumentsHeading}
        </h2>

        <ul className="flex flex-col gap-1">
          {others.map((page) => (
            <li key={page.slug}>
              <Link
                href={page.slug}
                className="flex min-h-11 items-center font-medium text-primary underline underline-offset-4"
              >
                {page.linkLabel}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}

function LegalSectionBlock({ section }: { section: LegalSection }) {
  /**
   * Başlık `id`'si metinden türetilmiyor, React'in `useId`'si de kullanılmıyor:
   * bu bir sunucu bileşeni ve `aria-labelledby` yerine `<section>` içindeki
   * başlığın kendisi yeterli. Fazladan kimlik üretmek, iki bölümün aynı adı
   * taşıması hâlinde çakışan `id` üretme riskini getirirdi.
   */
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-semibold tracking-tight">{section.heading}</h2>

      {section.body.map((paragraph) => (
        <p key={paragraph} className="max-w-prose text-base wrap-break-word">
          {paragraph}
        </p>
      ))}

      {section.bullets ? (
        <ul className="flex max-w-prose list-disc flex-col gap-2 pl-5">
          {section.bullets.map((bullet) => (
            <li key={bullet} className="text-base wrap-break-word">
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
