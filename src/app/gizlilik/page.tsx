import type { Metadata } from "next";

import { messages } from "@/config/messages";
import { LegalDocument } from "@/features/legal/components/LegalDocument";

/**
 * KVKK aydınlatma metni (PRD §5.10 · 14-privacy-and-compliance.md · adım 17).
 *
 * ZİYARETÇİYE AÇIK ve giriş gerektirmiyor: aydınlatma yükümlülüğü, kişi hesap
 * açmadan ÖNCE de geçerli. Giriş isteseydi metni yalnızca verisi zaten
 * işlenmeye başlamış kişiler okuyabilirdi.
 *
 * ⛔ VERİTABANINA HİÇ GİTMİYOR: içerik sabit metin ve ortam değişkeninden
 * okunan veri sorumlusu bilgisinden ibaret.
 *
 * ⚠️ YİNE DE İSTEK ANINDA ÇİZİLİYOR ve bu sayfanın kendi tercihi değil: kök
 * yerleşimdeki çerez bandı `cookies()` okuyor, bu da uygulamanın TAMAMINI
 * dinamik yapıyor (`npm run build` çıktısında ƒ). Bedeli ölçülmedi; ölçülürse
 * ve sorun çıkarsa çözüm bandı yerleşimden çıkarmak değil, `next/headers`
 * yerine bir ara katman (middleware) kullanmak olur. Teknik borç olarak
 * `roadmap.md`'de.
 */
const copy = messages.legal.privacy;

export const metadata: Metadata = {
  title: copy.pageTitle,
  description: copy.description,
  alternates: { canonical: "/gizlilik" },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      slug="/gizlilik"
      title={copy.title}
      intro={copy.intro}
      sections={copy.sections}
    />
  );
}
