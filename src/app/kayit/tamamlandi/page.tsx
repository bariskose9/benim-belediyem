import { CheckCircle2Icon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";

/**
 * ADIM 4 — kayıt tamamlandı.
 *
 * Bu sayfa taslağa BAKMAZ: hesap açıldığı anda taslak siliniyor ve çerez
 * temizleniyor, dolayısıyla doğrulanacak bir durum kalmıyor. Sayfa yenilense
 * de aynı mesaj görünür.
 *
 * Giriş ekranı adım 4b-2'de geliyor; metin bunu açıkça söylüyor ki kullanıcı
 * olmayan bir düğmeyi aramasın.
 */
const copy = messages.auth.register.success;

export default function RegisterDonePage() {
  return (
    <div className="flex flex-col items-start gap-4">
      <CheckCircle2Icon aria-hidden="true" className="size-10 text-primary" />
      <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
      <p className="text-muted-foreground">{copy.body}</p>

      <Button asChild>
        <Link href="/">{copy.cta}</Link>
      </Button>
    </div>
  );
}
