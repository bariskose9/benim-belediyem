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
 */

const copy = messages.auth.access;

export function AccessDeniedNotice({ decision }: { decision: "identity_required" | "staff_only" }) {
  const text = decision === "identity_required" ? copy.identityRequired : copy.staffOnly;

  return (
    <Alert role="status" variant="destructive">
      <AlertCircleIcon aria-hidden="true" />
      <AlertTitle>{text.title}</AlertTitle>
      <AlertDescription>{text.description}</AlertDescription>
      {decision === "identity_required" ? (
        <Link href="/kayit" className="mt-2 font-medium underline underline-offset-4">
          {copy.identityRequired.cta}
        </Link>
      ) : null}
    </Alert>
  );
}
