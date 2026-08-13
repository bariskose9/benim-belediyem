import Link from "next/link";

import { messages } from "@/config/messages";
import { Button } from "@/components/ui/button";
import { hasConsentRequiringStorage } from "@/features/legal/cookie-registry";
import { shouldShowCookieNotice } from "@/features/legal/services/cookie-notice-cookie";
import { ConsentType } from "@/generated/prisma/enums";

const copy = messages.legal.cookieNotice;

/**
 * Çerez bildirimi bandı — her sayfanın altında (adım 17 · PRD §5.10).
 *
 * ⛔ SIFIR JAVASCRIPT. Bu bir SUNUCU bileşeni ve tek etkileşimi düz bir
 * `<form method="post">`. İstemci bileşeni olsaydı bandın kodu SİTENİN
 * TAMAMINA yüklenirdi — bant her sayfada çiziliyor. Bedeli bir tam sayfa
 * yenilemesi; kazancı, sitenin en çok çizilen bileşeninin tarayıcıya hiç
 * JavaScript göndermemesi (adım 18 performans bütçesi).
 *
 * ⛔ "KABUL ET / REDDET" DEĞİL, BİLGİLENDİRME. Bugün zorunlu olmayan tek bir
 * çerez bile yok (`cookie-registry.ts`); reddedilebilecek bir şey olmadığı
 * hâlde "reddet" düğmesi koymak kullanıcıyı yanıltır. Kataloğa bir gün
 * `analytics` satırı eklenirse `hasConsentRequiringStorage()` `true` döner ve
 * BURASI KIRMIZI OLUR — testi de bunu ölçüyor, yani onay arayüzü yazılmadan
 * analitik eklenemez.
 *
 * Rızası olan ziyaretçiye HİÇ ÇİZİLMİYOR: `null` dönüyor, yani işaretleme de
 * yok, düzen kayması da.
 */
export async function CookieNotice() {
  if (!(await shouldShowCookieNotice())) return null;

  /**
   * ⛔ GÜVENLİK AĞI: onay gerektiren bir depolama eklendiği anda bant hâlâ
   * "bilgilendirme" metnini gösterirse yayımladığımız beyan yanlış olur.
   * Geliştirme ve test ortamında bu, testte yakalanır; burada da açıkça
   * belgeleniyor ki gözden kaçmasın.
   */
  const informationalOnly = !hasConsentRequiringStorage();

  return (
    <aside
      aria-label={copy.regionLabel}
      className="sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm"
    >
      <div className="page-shell flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="font-medium">{copy.title}</p>
          <p className="max-w-prose text-sm text-muted-foreground">{copy.body}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href="/cerez-politikasi"
            className="flex min-h-11 items-center justify-center font-medium text-primary underline underline-offset-4"
          >
            {copy.detailsAction}
          </Link>

          {informationalOnly ? (
            <form action="/api/v1/consents" method="post">
              <input type="hidden" name="consentType" value={ConsentType.necessary_cookies} />
              <input type="hidden" name="isGranted" value="1" />

              <Button type="submit" className="min-h-11 w-full px-6 sm:w-auto">
                {copy.acknowledgeAction}
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
