import type { Metadata } from "next";

import { messages } from "@/config/messages";
import { DirectoryFilters } from "@/features/organization/components/DirectoryFilters";
import { OrgChart } from "@/features/organization/components/OrgChart";
import { StaffDirectory } from "@/features/organization/components/StaffDirectory";
import { listOrgUnits } from "@/features/organization/repositories/org-unit.repository";
import { listStaffMembers } from "@/features/organization/repositories/staff.repository";
import {
  DIRECTORY_ANCHOR,
  parseDirectoryParams,
} from "@/features/organization/schemas/directory-search.schema";
import {
  buildOrgTree,
  collectUnitIds,
  findUnit,
  findUnitPath,
} from "@/features/organization/services/org-tree";
import type { OrgUnitNode } from "@/features/organization/types";

/**
 * Hakkımızda — kurum bilgileri, teşkilat şeması ve personel rehberi (PRD §5.9).
 *
 * GİRİŞ GEREKTİRMİYOR ve bu bilinçli: PRD §3'e göre ziyaretçi tüm sayfaları
 * görebilir ve listeleri okuyabilir; bu sayfa hiçbir kayıt oluşturmuyor,
 * yalnızca kurumsal bilgi gösteriyor. Bu yüzden `guardPage` YOK — market
 * ekranındaki desenin aynısı.
 *
 * SÜZGEÇLER ADRESTE (`?birim=…&unvan=…&arama=…`): her durum sunucuda çiziliyor,
 * geri tuşu bir adım geri alıyor ve kullanıcı bağlantıyı paylaşabiliyor.
 *
 * İKİ SORGU, SABİT SAYIDA: birimler tek sorguda okunup ağaç bellekte kuruluyor
 * (`org-tree.ts`), personel ikinci sorguda. Şema derinliği arttıkça sorgu
 * sayısı değişmiyor.
 */
export const dynamic = "force-dynamic";

const copy = messages.about;

export const metadata: Metadata = { title: copy.pageTitle };

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseDirectoryParams(await searchParams);

  const tree = buildOrgTree(await listOrgUnits());

  /**
   * Adrese elle yazılmış olmayan bir birim kimliği süzgeci DÜŞÜRÜYOR, hata
   * vermiyor: kurcalayan kişiye bilgi vermeyen, meşru kullanıcıyı da bir hata
   * ekranıyla karşılamayan davranış bu (market ekranındaki karar).
   */
  const selectedUnit = filters.unitId ? findUnit(tree, filters.unitId) : null;

  /**
   * Seçili birimin KENDİSİ ve tüm alt birimleri.
   *
   * Yalnızca doğrudan bağlı personel gösterilseydi "Bilgi İşlem Dairesi
   * Başkanlığı" seçildiğinde tek kişi çıkardı — kullanıcı için arıza gibi
   * görünen, teknik olarak doğru bir cevap.
   */
  const unitIds = selectedUnit ? collectUnitIds(selectedUnit) : undefined;

  const staff = await listStaffMembers({
    unitIds,
    title: filters.title,
    query: filters.query,
  });

  /** Seçili birime giden dallar açık çizilir; seçim yoksa ilk üç kademe açılır. */
  const openUnitIds = selectedUnit
    ? new Set(findUnitPath(tree, selectedUnit.id))
    : defaultOpenUnitIds(tree);

  /**
   * Personeli HİÇ OLMAYAN birim ile SÜZGECE TAKILMIŞ birim farklı iki durum:
   * ilkinde kullanıcı hata yapmadı (PRD §5.9 → "henüz yayınlanmadı"), ikincisinde
   * süzgeci gevşetmesi gerekiyor. Ayrımı burada yapıp bileşene taşıyoruz.
   */
  const unpublishedUnitName =
    selectedUnit && selectedUnit.totalStaffCount === 0 ? selectedUnit.name : undefined;

  return (
    <main className="page-shell flex flex-col gap-10 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
      </header>

      <section aria-labelledby="kurum-bilgileri" className="flex flex-col gap-4">
        <h2 id="kurum-bilgileri" className="font-heading text-xl font-semibold tracking-tight">
          {copy.contact.heading}
        </h2>

        <dl className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <ContactItem label={copy.contact.addressLabel} value={copy.contact.addressValue} />
          <ContactItem label={copy.contact.phoneLabel} value={copy.contact.phoneValue} />
          <ContactItem label={copy.contact.emailLabel} value={copy.contact.emailValue} />
          <ContactItem label={copy.contact.hoursLabel} value={copy.contact.hoursValue} />
        </dl>

        <p className="text-sm text-muted-foreground">{copy.contact.note}</p>
      </section>

      <section aria-labelledby="teskilat-semasi" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="teskilat-semasi" className="font-heading text-xl font-semibold tracking-tight">
            {copy.chart.heading}
          </h2>
          <p className="max-w-prose text-base text-muted-foreground">{copy.chart.intro}</p>
        </div>

        <OrgChart
          nodes={tree}
          selectedUnitId={selectedUnit?.id}
          openUnitIds={openUnitIds}
          filters={{ title: filters.title, query: filters.query }}
        />
      </section>

      {/* Çapa: şemadan bir birime tıklandığında tarayıcı doğrudan buraya iner. */}
      <section
        id={DIRECTORY_ANCHOR}
        aria-labelledby="personel-rehberi-baslik"
        className="flex scroll-mt-20 flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h2
            id="personel-rehberi-baslik"
            className="font-heading text-xl font-semibold tracking-tight"
          >
            {copy.directory.heading}
          </h2>
          <p className="max-w-prose text-base text-muted-foreground">{copy.directory.intro}</p>
        </div>

        <DirectoryFilters
          filters={{ unitId: selectedUnit?.id, title: filters.title, query: filters.query }}
          selectedUnitName={selectedUnit?.name}
        />

        <StaffDirectory
          entries={staff}
          query={filters.query}
          unpublishedUnitName={unpublishedUnitName}
        />

        <p className="max-w-prose text-sm text-muted-foreground">{copy.directory.privacyNote}</p>
      </section>
    </main>
  );
}

function ContactItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-base wrap-break-word">{value}</dd>
    </div>
  );
}

/**
 * Seçim yokken açık gelen dallar: üst yapı + daire başkanlıkları.
 *
 * ═══ BU SAYI TARAYICIDA ÖLÇÜLEREK SEÇİLDİ ═══
 * Önce üç kademe açılıyordu (başkanlık → genel sekreterlik → yardımcılık) ve
 * daireler kapalı geliyordu. Sonuç ekranda görüldü: dolu dairenin "personelini
 * listele" bağlantısı KAPALI kutunun içinde kalıyor, yani ziyaretçi rehbere
 * ulaşmak için önce ne olduğunu bilmediği bir oku açmak zorunda kalıyordu.
 *
 * NEDEN DAHA DERİN DEĞİL: şube müdürlükleri de açık gelseydi 35 birimin
 * tamamı ekrana yayılır ve şema mobilde uzun bir duvara dönerdi. Dört kademe,
 * "kurumda hangi daireler var" sorusunu cevaplıyor; ayrıntıyı kullanıcının
 * isteğine bırakıyor.
 */
function defaultOpenUnitIds(nodes: readonly OrgUnitNode[], depth = 0): Set<string> {
  const open = new Set<string>();

  if (depth >= 4) return open;

  for (const node of nodes) {
    open.add(node.id);

    for (const id of defaultOpenUnitIds(node.children, depth + 1)) open.add(id);
  }

  return open;
}
