import { findIdsMatchingQuery } from "@/features/catalog/repositories/catalog-search.repository";
import type { Prisma } from "@/generated/prisma/client";
import type { StaffTitle } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { normalizeSearchQuery } from "@/lib/search-text";

import type { StaffDirectoryEntry } from "../types";

/**
 * Personel rehberinin okuma tarafı (PRD §5.9).
 *
 * ═══ BU DOSYANIN ASIL İŞİ: NE OKUNMADIĞI ═══
 * `staff_members` tablosunda `national_id_hash` kolonu var — personelin kimlik
 * numarasının tuzlanmış özeti. Rehber herkese açık bir sayfa; o alan ekrana
 * çıkmamalı, istemciye HİÇ GİTMEMELİ. Bu yüzden sorgu `select` ile alan alan
 * yazıldı: tüm satırı çekip arayüzde gizlemek, veriyi yine de tarayıcıya
 * göndermek olurdu (05-auth-security.md · 09-privacy.md).
 * `types.ts` içindeki `StaffDirectoryEntry` de o alanı taşımıyor, yani bu kural
 * derleme zamanında da korunuyor.
 *
 * ARAMA ORTAK KATMANDAN (`features/catalog`): aksan ve büyük/küçük harf körü
 * eşleştirme market ve restoranla aynı yerde. İkinci bir kopya zamanla
 * ayrışırdı.
 */

/**
 * Tek listede gösterilecek en fazla personel.
 *
 * Bugün rehberde 100 kişi var, yani sınıra hiç değinilmiyor. Yine de duruyor:
 * `take` olmayan bir sorgu, tablo büyüdüğünde sessizce sayfayı boğar.
 */
const DIRECTORY_LIMIT = 200;

/**
 * Rehber sorgusunun OKUDUĞU ALANLAR — dışarı açık çünkü test edilebilir olmalı.
 *
 * ═══ NEDEN AYRI BİR SABİT ═══
 * Sorgunun içine gömülü bir `select` nesnesi hiçbir testin göremediği bir
 * yerdir: birisi araya `nationalIdHash: true` eklese testler yeşil kalırdı
 * (dönüş nesnesi yine alanı taşımıyor, çünkü aşağıda elle kuruluyor). Sabiti
 * dışarı açmak bu boşluğu kapatıyor — `tests/unit/staff-directory-select.test.ts`
 * kimlik özetinin sorguya eklenmesini yakalıyor.
 *
 * `satisfies`: yanlış bir alan adı yazılırsa derleme hata verir.
 */
export const DIRECTORY_SELECT = {
  id: true,
  fullName: true,
  title: true,
  workEmail: true,
  extensionNumber: true,
  orgUnit: { select: { id: true, name: true } },
  // national_id_hash BİLEREK YOK — dosyanın başındaki açıklamaya bakın.
} satisfies Prisma.StaffMemberSelect;

export async function listStaffMembers(filters: {
  /** Seçili birim VE alt birimlerinin kimlikleri; boşsa süzgeç uygulanmaz. */
  unitIds?: readonly string[];
  title?: StaffTitle;
  query?: string;
}): Promise<StaffDirectoryEntry[]> {
  const query = normalizeSearchQuery(filters.query);
  const matchingIds = query ? await findIdsMatchingQuery("staff_members", query) : null;

  // Arama hiçbir kişiyi tutmadıysa ikinci sorguya gerek yok: boş `IN ()`
  // listesi zaten hiçbir satır döndürmez.
  if (matchingIds?.length === 0) return [];

  const rows = await prisma.staffMember.findMany({
    where: {
      deletedAt: null,
      ...(filters.unitIds ? { orgUnitId: { in: [...filters.unitIds] } } : {}),
      title: filters.title,
      ...(matchingIds ? { id: { in: matchingIds } } : {}),
    },
    select: DIRECTORY_SELECT,
    /**
     * Önce unvan, sonra ad.
     *
     * PostgreSQL enum'ları TANIMLANMA SIRASINA göre sıralar ve `StaffTitle`
     * hiyerarşi sırasıyla tanımlı (daire başkanı → şube müdürü → şef → …).
     * Yani bu sıralama rehberi alfabetik değil, TEŞKİLAT SIRASINDA veriyor —
     * kurumsal bir rehberde beklenen budur.
     */
    orderBy: [{ title: "asc" }, { fullName: "asc" }],
    take: DIRECTORY_LIMIT,
  });

  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    title: row.title,
    workEmail: row.workEmail,
    extensionNumber: row.extensionNumber,
    unitId: row.orgUnit.id,
    unitName: row.orgUnit.name,
  }));
}
