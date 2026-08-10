import type { Metadata } from "next";

import { messages } from "@/config/messages";
import { LegalDocument } from "@/features/legal/components/LegalDocument";

/**
 * Kullanım şartları (PRD §5.10 · adım 17). Ziyaretçiye açık, veritabanına
 * gitmiyor. Neden yine de istek anında çizildiği `/gizlilik` sayfasında yazılı.
 */
const copy = messages.legal.terms;

export const metadata: Metadata = {
  title: copy.pageTitle,
  description: copy.description,
  alternates: { canonical: "/kullanim-sartlari" },
};

export default function TermsPage() {
  return (
    <LegalDocument
      slug="/kullanim-sartlari"
      title={copy.title}
      intro={copy.intro}
      sections={copy.sections}
    />
  );
}
