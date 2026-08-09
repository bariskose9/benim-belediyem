import type { OrgUnitNode, OrgUnitRow } from "../types";

/**
 * Düz birim listesini ağaca çevirir — SAF FONKSİYON, veritabanına dokunmaz.
 *
 * ═══ NEDEN TEK SORGU + BELLEKTE AĞAÇ ═══
 * `parentId` kendine referans veriyor, yani hiyerarşi veritabanında özyineleme
 * ister. Üç yol vardı:
 *   1. Her seviye için ayrı sorgu → 35 birim için düzine sorgu (N+1)
 *   2. Özyinelemeli SQL (`WITH RECURSIVE`) → ham SQL, tip güvenliği yok
 *   3. TEK sorgu + bellekte kurma → seçilen bu
 * Teşkilat 35 satır; hepsini tek seferde çekmek bir sorgu ve birkaç kilobayt.
 * Bellekte kurmanın ikinci faydası: bu mantık veritabanı olmadan test edilebilir.
 *
 * SIRALAMA SORGUDAN GELİR (`sortOrder`, sonra ad). Burada yeniden sıralamıyoruz:
 * iki ayrı sıralama kuralı zamanla birbirinden ayrılır ve ekranda hangisinin
 * kazandığı belirsizleşir.
 */

export function buildOrgTree(rows: readonly OrgUnitRow[]): readonly OrgUnitNode[] {
  const childrenByParent = new Map<string, OrgUnitRow[]>();
  const knownIds = new Set(rows.map((row) => row.id));

  for (const row of rows) {
    if (row.parentId === null) continue;

    const siblings = childrenByParent.get(row.parentId);

    if (siblings) siblings.push(row);
    else childrenByParent.set(row.parentId, [row]);
  }

  /**
   * ÖKSÜZ KAYIT KAYBOLMUYOR, KÖK SAYILIYOR: üst birimi yumuşak silinmiş bir
   * birim listeden düşseydi altındaki personel de ekrandan sessizce kaybolurdu.
   * Yanlış yerde görünmek, hiç görünmemekten iyidir.
   */
  const roots = rows.filter((row) => row.parentId === null || !knownIds.has(row.parentId));

  /**
   * `visited`: bozuk veri bir döngü kurarsa (A'nın üstü B, B'nin üstü A)
   * özyineleme sonsuza gitmesin. Şemadaki yabancı anahtar bunu engellemiyor —
   * ucuz bir koruma, çökmeyi sessiz bir yanlıştan iyi kılıyor.
   */
  const visited = new Set<string>();

  return roots.map((root) => toNode(root, childrenByParent, visited));
}

function toNode(
  row: OrgUnitRow,
  childrenByParent: ReadonlyMap<string, readonly OrgUnitRow[]>,
  visited: Set<string>,
): OrgUnitNode {
  visited.add(row.id);

  const children = (childrenByParent.get(row.id) ?? [])
    .filter((child) => !visited.has(child.id))
    .map((child) => toNode(child, childrenByParent, visited));

  const totalStaffCount = children.reduce(
    (sum, child) => sum + child.totalStaffCount,
    row.directStaffCount,
  );

  return { ...row, children, totalStaffCount };
}

/** Ağaçta bir birimi kimliğiyle bulur; yoksa `null`. */
export function findUnit(nodes: readonly OrgUnitNode[], unitId: string): OrgUnitNode | null {
  for (const node of nodes) {
    if (node.id === unitId) return node;

    const found = findUnit(node.children, unitId);

    if (found) return found;
  }

  return null;
}

/**
 * Bir birimin KENDİSİ ve tüm alt birimlerinin kimlikleri.
 *
 * Personel sorgusu bunu kullanıyor: kullanıcı "Bilgi İşlem Dairesi
 * Başkanlığı"na tıkladığında yalnızca daireye doğrudan bağlı 1 kişiyi değil,
 * altındaki 100 kişinin tamamını görmeli. Alt birim kimlikleri zaten bellekteki
 * ağaçta olduğu için bunun veritabanına ek maliyeti yok.
 */
export function collectUnitIds(node: OrgUnitNode): string[] {
  return [node.id, ...node.children.flatMap(collectUnitIds)];
}

/**
 * Kökten hedef birime giden yol (hedef dahil).
 *
 * Ekranda tek işi var: seçili birime giden dalların AÇIK çizilmesi. Kullanıcı
 * şemanın derinindeki bir şefliğe tıkladığında sayfa yeniden çiziliyor; yol
 * bilinmeseydi ağaç kapanır ve kullanıcı nerede olduğunu kaybederdi.
 */
export function findUnitPath(nodes: readonly OrgUnitNode[], unitId: string): readonly string[] {
  for (const node of nodes) {
    if (node.id === unitId) return [node.id];

    const childPath = findUnitPath(node.children, unitId);

    if (childPath.length > 0) return [node.id, ...childPath];
  }

  return [];
}
