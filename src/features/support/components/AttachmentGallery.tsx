import Image from "next/image";

import { messages } from "@/config/messages";
import type { AttachmentView } from "@/features/support/services/support-ticket-view";

/**
 * Talebe eklenen ekran görüntüleri.
 *
 * ═══ NEDEN `unoptimized` ═══
 *
 * Görseller `/api/support-tickets/…` altındaki YETKİLİ uçtan geliyor.
 * Next.js'in görsel optimizasyoncusu kaynağı kendi sunucusundan çeker ve o
 * istekte kullanıcının oturum çerezi YOKTUR — optimizasyon açık kalsaydı her
 * ek 404 dönerdi. `unoptimized` ile tarayıcı adresi doğrudan ister ve çerez
 * gider, yani yetki kapısı çalışır.
 *
 * Bunun bedeli: ek görseller yeniden boyutlandırılmıyor. Sınır zaten 2 MB ve
 * ekran görüntüsü sayısı en fazla 5 (ADR-014).
 *
 * `object-contain`: ekran görüntüsü kırpılırsa kullanıcının göstermek istediği
 * ayrıntı kaybolabilir. Boşluk bırakmak, bilgi kesmekten iyidir.
 */

const copy = messages.support;

export function AttachmentGallery({ attachments }: { attachments: readonly AttachmentView[] }) {
  if (attachments.length === 0) {
    return <p className="text-sm text-muted-foreground">{copy.noAttachments}</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {attachments.map((attachment) => (
        <li key={attachment.id} className="flex flex-col gap-2">
          <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            className="relative aspect-4/3 overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Image
              src={attachment.url}
              alt={copy.attachmentAlt(attachment.fileName)}
              fill
              unoptimized
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-contain"
            />
          </a>
          <span className="truncate text-sm text-muted-foreground">{attachment.fileName}</span>
        </li>
      ))}
    </ul>
  );
}
