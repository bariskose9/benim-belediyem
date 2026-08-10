import { messages } from "@/config/messages";
import { resolveDataController } from "@/features/legal/services/data-controller";

const copy = messages.legal.controller;

/**
 * Veri sorumlusu ve başvuru kanalı — dört yasal sayfanın da sonunda (adım 17).
 *
 * ⛔ E-POSTA ADRESİ ORTAM DEĞİŞKENİNDEN GELİYOR, KODDA YOK. Gerekçe
 * `data-controller.ts` içinde.
 *
 * E-POSTA `mailto:` OLARAK VERİLİYOR ama gizlenmiyor: adresi JavaScript ile
 * gizlemek botları durdurmuyor, yalnızca ekran okuyucuyu ve betikleri kapalı
 * kullanıcıyı engelliyor. KVKK başvuru kanalının ulaşılabilir olması, spam
 * riskinden daha ağır basıyor.
 */
export function DataControllerCard() {
  const controller = resolveDataController();

  return (
    <section
      aria-labelledby="veri-sorumlusu"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 id="veri-sorumlusu" className="font-heading text-xl font-semibold tracking-tight">
        {copy.heading}
      </h2>

      <dl className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-sm font-medium text-muted-foreground">{copy.nameLabel}</dt>
          <dd className="text-base wrap-break-word">{controller.displayName}</dd>
        </div>

        {controller.contactEmail ? (
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm font-medium text-muted-foreground">{copy.emailLabel}</dt>
            <dd>
              <a
                href={`mailto:${controller.contactEmail}`}
                className="inline-flex min-h-11 items-center font-medium wrap-break-word text-primary underline underline-offset-4"
              >
                {controller.contactEmail}
              </a>
            </dd>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm font-medium text-muted-foreground">
              {copy.fallbackChannelLabel}
            </dt>
            <dd className="max-w-prose text-base">{copy.fallbackChannel}</dd>
          </div>
        )}

        <div className="flex flex-col gap-0.5">
          <dt className="text-sm font-medium text-muted-foreground">{copy.repositoryLabel}</dt>
          <dd>
            <a
              href={controller.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center font-medium wrap-break-word text-primary underline underline-offset-4"
            >
              {controller.repositoryUrl}
            </a>
          </dd>
        </div>
      </dl>
    </section>
  );
}
