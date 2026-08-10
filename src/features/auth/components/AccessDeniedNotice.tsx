import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { messages } from "@/config/messages";

/**
 * Erişimi olmayan kullanıcıya EKSİĞİNE GÖRE mesaj (PRD §5.0).
 *
 * İki durumun farkı bilinçli:
 *  · `identity_required` → kullanıcı bunu KENDİ TAMAMLAYABİLİR, o yüzden
 *    kimlik doğrulama adımına bir bağlantı var
 *  · `staff_only`        → personel olmak kullanıcının tamamlayabileceği bir
 *    adım değil. Bağlantı koymak, tıklayınca hiçbir şey olmayan bir umut
 *    vermek olurdu; PRD de "yönlendirme yapılmaz" diyor
 *
 * ⛔ BAĞLANTI `/kayit` DEĞİL `/kimlik-dogrulama` (adım 15c-2 · teknik borç #32).
 * Buraya düşen kullanıcı ZATEN GİRİŞ YAPMIŞTIR — `guardPage` girişsizi bu
 * bileşene hiç ulaştırmıyor, giriş ekranına yolluyor. Onu kayıt ekranına
 * göndermek, hesabı olan birine "yeni hesap aç" demekti; adım 15c-2'ye kadar
 * gidilecek bir sayfa olmadığı için öyle duruyordu.
 */

const copy = messages.auth.access;

export function AccessDeniedNotice({
  decision,
  returnTo,
}: {
  decision: "identity_required" | "staff_only";
  /** Doğrulama bitince kullanıcının geri döneceği sayfa — bulunduğu sayfa. */
  returnTo?: string;
}) {
  const text = decision === "identity_required" ? copy.identityRequired : copy.staffOnly;

  return (
    <Alert role="status" variant="destructive">
      <AlertCircleIcon aria-hidden="true" />
      <AlertTitle>{text.title}</AlertTitle>
      <AlertDescription>{text.description}</AlertDescription>
      {decision === "identity_required" ? (
        <Link
          href={identityVerificationHref(returnTo)}
          className="mt-2 font-medium underline underline-offset-4"
        >
          {copy.identityRequired.cta}
        </Link>
      ) : null}
    </Alert>
  );
}

/**
 * Dönüş adresi bağlantıya ekleniyor ki kullanıcı doğrulamadan sonra baktığı
 * hizmete geri dönsün. Adres SUNUCUDA da temizleniyor
 * (`sanitizeRedirectPath`); buradaki kodlama yalnızca doğru bir URL üretmek
 * için — güvenlik kararı istemcide verilmiyor.
 */
function identityVerificationHref(returnTo: string | undefined): string {
  if (!returnTo) return "/kimlik-dogrulama";

  return `/kimlik-dogrulama?donus=${encodeURIComponent(returnTo)}`;
}
