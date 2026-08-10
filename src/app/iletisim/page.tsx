import type { Metadata } from "next";

import { messages } from "@/config/messages";
import { LegalDocument } from "@/features/legal/components/LegalDocument";

/**
 * İletişim ve KVKK başvuru kanalı (PRD §5.10 · adım 17).
 *
 * ⛔ `/hakkimizda`'DAKİ KURUM BİLGİLERİYLE AYNI ŞEY DEĞİL ve bu ayrım sayfanın
 * varlık sebebi: orada UYDURMA bir kurumun adresi ve çağrı merkezi duruyor,
 * burada uygulamayı GERÇEKTEN işleten kişinin başvuru kanalı. İkisi tek sayfada
 * birleştirilseydi kullanıcı hangi adresin gerçek olduğunu ayırt edemezdi.
 */
const copy = messages.legal.contact;

export const metadata: Metadata = {
  title: copy.pageTitle,
  description: copy.description,
  alternates: { canonical: "/iletisim" },
};

export default function ContactPage() {
  return (
    <LegalDocument
      slug="/iletisim"
      title={copy.title}
      intro={copy.intro}
      sections={copy.sections}
    />
  );
}
