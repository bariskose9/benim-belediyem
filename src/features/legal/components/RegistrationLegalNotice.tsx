import Link from "next/link";

import { messages } from "@/config/messages";

const copy = messages.legal.registrationNotice;

/**
 * Kayıt akışının son adımında görünen yasal bildirim (adım 17).
 *
 * ⛔ SON ADIMDA, BAŞTA DEĞİL: hesap kayıt akışının BU adımında açılıyor
 * (iki doğrulama kodu da girildiğinde). Cümle ilk ekranda dursaydı, kullanıcı
 * onu gördükten sonra iki adım daha geçer ve hesabın hangi anda açıldığını
 * bilmezdi.
 *
 * Bağlantılar YENİ SEKMEDE açılıyor: aynı sekmede açılsaydı kullanıcı yasal
 * metni okumak için yarım kalan kayıt akışından çıkardı ve doğrulama kodları
 * boşa giderdi.
 */
export function RegistrationLegalNotice() {
  return (
    <p className="max-w-prose text-sm text-muted-foreground">
      {copy.prefix}
      <LegalLink href="/kullanim-sartlari">{copy.termsLabel}</LegalLink>
      {copy.middle}
      <LegalLink href="/gizlilik">{copy.privacyLabel}</LegalLink>
      {copy.suffix}
    </p>
  );
}

function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline underline-offset-4"
    >
      {children}
    </Link>
  );
}
