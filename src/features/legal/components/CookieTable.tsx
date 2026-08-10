import { messages } from "@/config/messages";
import {
  COOKIE_REGISTRY,
  groupByCategory,
  type CookieCategory,
  type CookieEntry,
} from "@/features/legal/cookie-registry";

const copy = messages.legal.cookies;

/** Sınıfların gösterim sırası — zorunlu olan önce, çünkü bugün tek dolu grup o. */
const CATEGORY_ORDER: readonly CookieCategory[] = ["necessary", "analytics", "marketing"];

const CATEGORY_COPY: Record<CookieCategory, { title: string; intro: string }> = {
  necessary: { title: copy.categories.necessary, intro: copy.categories.necessaryIntro },
  analytics: { title: copy.categories.analytics, intro: copy.categories.analyticsIntro },
  marketing: { title: copy.categories.marketing, intro: copy.categories.marketingIntro },
};

/**
 * Çerez tablosu — `cookie-registry.ts`'ten çizilir, ELLE YAZILMAZ (adım 17).
 *
 * ⛔ TABLO GENİŞ ve mobilde taşar. `overflow-x-auto` sarmalayıcı ŞART: onsuz
 * SAYFANIN TAMAMI yana kayar ve 375px'te düzen bozulur (07-ui-design-system.md).
 * Kaydırılabilir bölgeye `tabIndex` veriliyor ki klavye kullanıcısı da
 * kaydırabilsin — yoksa fare olmadan tablonun sağı görülemez.
 */
export function CookieTable() {
  const grouped = groupByCategory();

  return (
    <section aria-labelledby="cerez-tablosu" className="flex flex-col gap-6">
      <h2 id="cerez-tablosu" className="font-heading text-xl font-semibold tracking-tight">
        {copy.table.caption}
      </h2>

      {CATEGORY_ORDER.map((category) => {
        const entries = grouped.get(category) ?? [];

        return (
          <div key={category} className="flex flex-col gap-2">
            <h3 className="font-heading text-lg font-semibold tracking-tight">
              {CATEGORY_COPY[category].title}
            </h3>

            <p className="max-w-prose text-sm text-muted-foreground">
              {CATEGORY_COPY[category].intro}
            </p>

            {entries.length === 0 ? (
              <p className="text-base">{copy.categories.emptyGroup}</p>
            ) : (
              <div tabIndex={0} className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
                  <caption className="sr-only">
                    {CATEGORY_COPY[category].title} — {copy.table.caption}
                  </caption>

                  <thead className="bg-muted/40">
                    <tr>
                      <HeaderCell>{copy.table.nameHeader}</HeaderCell>
                      <HeaderCell>{copy.table.kindHeader}</HeaderCell>
                      <HeaderCell>{copy.table.purposeHeader}</HeaderCell>
                      <HeaderCell>{copy.table.lifetimeHeader}</HeaderCell>
                      <HeaderCell>{copy.table.partyHeader}</HeaderCell>
                    </tr>
                  </thead>

                  <tbody>
                    {entries.map((entry) => (
                      <CookieRow key={entry.name} entry={entry} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      <p className="text-sm text-muted-foreground">{COOKIE_REGISTRY.length} kayıt listeleniyor.</p>
    </section>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="border-b border-border px-3 py-2 font-semibold">
      {children}
    </th>
  );
}

function CookieRow({ entry }: { entry: CookieEntry }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      {/* Ad bir TANIMLAYICI: `<code>` ile tarayıcıda gördüğü yazımla eşleşiyor. */}
      <th scope="row" className="px-3 py-2 text-left align-top font-normal">
        <code className="wrap-break-word">{entry.name}</code>
      </th>
      <td className="px-3 py-2 align-top">
        {entry.kind === "cookie" ? copy.table.kindCookie : copy.table.kindLocalStorage}
      </td>
      <td className="px-3 py-2 align-top">{entry.purpose}</td>
      <td className="px-3 py-2 align-top">{copy.table.formatLifetime(entry.lifetimeMs)}</td>
      <td className="px-3 py-2 align-top">
        {entry.firstParty ? copy.table.firstParty : copy.table.thirdParty}
      </td>
    </tr>
  );
}
