import { prisma } from "@/lib/db";

import type { OrgUnitRow } from "../types";

/**
 * Teşkilat şemasının okuma tarafı (PRD §5.9).
 *
 * BU DOSYA YALNIZCA OKUR. Hakkımızda bölümü salt okunur bir kurumsal bilgi
 * ekranı; birim ve personel kayıtları tohum verisiyle geliyor, uygulama
 * içinden değiştirilmiyor (PRD §5.9 — yönetim Faz 2).
 */

/**
 * Tüm birimler + her birimin DOĞRUDAN personel sayısı — iki sorgu, sabit sayıda.
 *
 * NEDEN AYRI BİR SAYIM SORGUSU: birim başına `_count` ile ilişki saydırmak da
 * mümkündü, ama sayım yalnızca yumuşak silinmemiş personeli kapsamalı ve
 * toplam yine bellekte alt birimlere yayılacaktı. Tek bir `groupBy` hem daha
 * ucuz hem de "silinmiş personel sayılmaz" kuralını tek yerde tutuyor.
 *
 * SİLİNMİŞ BİRİM VE PERSONEL HİÇ OKUNMUYOR (`deletedAt: null`): ikisi de
 * yumuşak silinen tablolardan (data-model.md).
 */
export async function listOrgUnits(): Promise<OrgUnitRow[]> {
  const [units, staffCounts] = await Promise.all([
    prisma.orgUnit.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, unitType: true, parentId: true },
      // Sıralama TEK YERDE: ağaç kurucusu yeniden sıralamıyor.
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.staffMember.groupBy({
      by: ["orgUnitId"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const countByUnit = new Map(staffCounts.map((row) => [row.orgUnitId, row._count._all]));

  return units.map((unit) => ({
    id: unit.id,
    name: unit.name,
    unitType: unit.unitType,
    parentId: unit.parentId,
    directStaffCount: countByUnit.get(unit.id) ?? 0,
  }));
}
