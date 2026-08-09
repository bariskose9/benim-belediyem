import Link from "next/link";
import { ChevronRightIcon, UsersIcon } from "lucide-react";

import { messages } from "@/config/messages";
import type { StaffTitle } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

import { buildDirectoryHref } from "../schemas/directory-search.schema";
import type { OrgUnitNode } from "../types";

const copy = messages.about.chart;

/**
 * Teşkilat şeması — açılıp kapanabilen ağaç (PRD §5.9).
 *
 * ═══ NEDEN `<details>`, NEDEN İSTEMCİ BİLEŞENİ DEĞİL ═══
 * Açma/kapama tarayıcının kendi işi: `<details>` klavyeyle çalışıyor, ekran
 * okuyucu durumu okuyor, JavaScript kapalıyken bile açılıyor ve tek satır
 * durum yönetimi gerektirmiyor. Kendi düğmemizi yazsaydık odak yönetimini,
 * `aria-expanded` bayrağını ve klavye kısayollarını elle üstlenirdik.
 * `role="tree"` DE KULLANILMADI: gerçek bir ağaç rolü ok tuşlarıyla gezinme
 * yükümlülüğü doğurur; onu üstlenmeden rolü yazmak ekran okuyucuya yalan
 * söylemek olurdu (07-ui-design-system.md · WCAG 2.1 AA).
 *
 * MOBİLDE LİSTE, MASAÜSTÜNDE AĞAÇ: yapı aynı, girinti ve dikey çizgi geniş
 * ekranda belirginleşiyor. İki ayrı bileşen yazmak aynı şemayı iki kez
 * bakımı gereken hâle getirirdi.
 *
 * SEÇİLİ BİRİME GİDEN DALLAR AÇIK ÇİZİLİYOR (`openUnitIds`): sayfa her tıkta
 * sunucuda yeniden çiziliyor; yol açık gelmeseydi ağaç kapanır ve kullanıcı
 * nerede olduğunu kaybederdi.
 */
export function OrgChart({
  nodes,
  selectedUnitId,
  openUnitIds,
  filters,
}: {
  nodes: readonly OrgUnitNode[];
  selectedUnitId?: string;
  openUnitIds: ReadonlySet<string>;
  filters: { title?: StaffTitle; query?: string };
}) {
  return (
    <ul aria-label={copy.listLabel} className="flex flex-col gap-1">
      {nodes.map((node) => (
        <OrgBranch
          key={node.id}
          node={node}
          selectedUnitId={selectedUnitId}
          openUnitIds={openUnitIds}
          filters={filters}
        />
      ))}
    </ul>
  );
}

function OrgBranch({
  node,
  selectedUnitId,
  openUnitIds,
  filters,
}: {
  node: OrgUnitNode;
  selectedUnitId?: string;
  openUnitIds: ReadonlySet<string>;
  filters: { title?: StaffTitle; query?: string };
}) {
  const isSelected = node.id === selectedUnitId;

  // Alt birimi olmayan birimde açılır ok çizmenin anlamı yok: açıldığında
  // gösterecek bir şey olmayan bir ok kullanıcıyı boşuna tıklatır.
  if (node.children.length === 0) {
    return (
      <li>
        <UnitLink
          node={node}
          isSelected={isSelected}
          filters={filters}
          label={node.name}
          showCount
        />
      </li>
    );
  }

  return (
    <li>
      <details open={openUnitIds.has(node.id)} className="group">
        <summary
          className={cn(
            "flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-2 text-base font-medium",
            "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            // Tarayıcının varsayılan üçgeni gizleniyor; yerine dönen kendi okumuz.
            "[&::-webkit-details-marker]:hidden",
          )}
        >
          <ChevronRightIcon
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform group-open:rotate-90"
          />
          <span>{node.name}</span>
          <StaffCountBadge count={node.totalStaffCount} />
        </summary>

        {/* Girinti ve dikey çizgi hiyerarşiyi GÖRSEL olarak anlatıyor; yapıyı
            iç içe listeler zaten anlatıyor, yani ekran okuyucu çizgiye
            muhtaç değil. */}
        <div className="ml-4 flex flex-col gap-1 border-l border-border pl-2 md:ml-6 md:pl-4">
          {/*
            ÜST BİRİMİN KENDİ BAĞLANTISI EYLEM OLARAK YAZILIYOR ("… personelini
            listele"), birim adı olarak DEĞİL. Tarayıcıda ölçüldü: adı ikinci kez
            yazmak satırın kopyalanmış gibi görünmesine yol açıyordu — kullanıcı
            iki satırın farkını anlamıyor, ekran okuyucu da aynı adı iki kez
            okuyordu.
          */}
          <UnitLink
            node={node}
            isSelected={isSelected}
            filters={filters}
            label={copy.showStaff(node.name)}
          />
          <ul className="flex flex-col gap-1">
            {node.children.map((child) => (
              <OrgBranch
                key={child.id}
                node={child}
                selectedUnitId={selectedUnitId}
                openUnitIds={openUnitIds}
                filters={filters}
              />
            ))}
          </ul>
        </div>
      </details>
    </li>
  );
}

/**
 * Birimi seçen bağlantı.
 *
 * ADRES ÇAPALI (`#personel-rehberi`): mobilde liste şemanın altında kalıyor,
 * çapa olmasa tıklayan kullanıcı ekranın üstünde kalır ve hiçbir şey olmamış
 * sanırdı.
 */
function UnitLink({
  node,
  isSelected,
  filters,
  label,
  showCount = false,
}: {
  node: OrgUnitNode;
  isSelected: boolean;
  filters: { title?: StaffTitle; query?: string };
  label: string;
  /** Sayaç yalnızca satırın KENDİSİ olan bağlantıda; eylem bağlantısında değil. */
  showCount?: boolean;
}) {
  return (
    <Link
      href={buildDirectoryHref({ unitId: node.id, ...filters }, { anchor: true })}
      // Seçili birimi ekran okuyucu da bilmeli; rengi göremez.
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-md px-2 text-base",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isSelected
          ? "bg-primary font-medium text-primary-foreground"
          : "text-foreground hover:bg-muted",
      )}
    >
      <UsersIcon aria-hidden="true" className="size-4 shrink-0" />
      <span>{label}</span>
      {isSelected ? <span className="sr-only">({copy.selected})</span> : null}
      {showCount ? <StaffCountBadge count={node.totalStaffCount} /> : null}
    </Link>
  );
}

/**
 * Personel sayısı — birim VE alt birimleri dahil.
 *
 * Sayı ikincil bilgi olduğu için 14px kalabiliyor (gövde metni 16px kuralı
 * etiket ve sayaçları kapsamıyor — adım 15'te borç #35 böyle kapandı).
 */
function StaffCountBadge({ count }: { count: number }) {
  return <span className="text-sm opacity-75">{copy.staffCount(count)}</span>;
}
