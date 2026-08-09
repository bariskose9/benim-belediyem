/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
  buildOrgTree,
  collectUnitIds,
  findUnit,
  findUnitPath,
} from "@/features/organization/services/org-tree";
import type { OrgUnitRow } from "@/features/organization/types";

/**
 * Teşkilat ağacının kurulması (PRD §5.9).
 *
 * Mantık SAF olduğu için tamamı veritabanı olmadan kanıtlanabiliyor: düz bir
 * satır listesi girer, hiyerarşi çıkar. Sorgunun gerçekten bu satırları
 * getirdiği `tests/db/organization.test.ts` içinde ayrıca doğrulanıyor.
 */

function unit(overrides: Partial<OrgUnitRow> & { id: string }): OrgUnitRow {
  return {
    name: `Birim ${overrides.id}`,
    unitType: "section",
    parentId: null,
    directStaffCount: 0,
    ...overrides,
  };
}

/** Küçük ama gerçek şemanın aynı biçimi: kök → daire → şube → şeflik. */
const rows: OrgUnitRow[] = [
  unit({ id: "baskanlik", name: "Başkanlık", unitType: "presidency" }),
  unit({
    id: "daire",
    name: "Bilgi İşlem Dairesi",
    unitType: "directorate",
    parentId: "baskanlik",
    directStaffCount: 1,
  }),
  unit({
    id: "sube",
    name: "Yazılım Şubesi",
    unitType: "branch",
    parentId: "daire",
    directStaffCount: 2,
  }),
  unit({ id: "seflik", name: "Web Şefliği", parentId: "sube", directStaffCount: 5 }),
  unit({
    id: "bos-daire",
    name: "İtfaiye Dairesi",
    unitType: "directorate",
    parentId: "baskanlik",
  }),
];

describe("buildOrgTree", () => {
  it("düz listeden hiyerarşi kurar", () => {
    const tree = buildOrgTree(rows);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe("baskanlik");
    expect(tree[0]?.children.map((child) => child.id)).toEqual(["daire", "bos-daire"]);
    expect(tree[0]?.children[0]?.children[0]?.children[0]?.id).toBe("seflik");
  });

  it("sorgudan gelen sırayı korur", () => {
    // `bos-daire` listede sonra geliyor; ağaç kurucusu yeniden sıralamıyor.
    const reversed = buildOrgTree([...rows].reverse());

    expect(reversed[0]?.children.map((child) => child.id)).toEqual(["bos-daire", "daire"]);
  });

  /**
   * ═══ ASIL KORUNAN DAVRANIŞ ═══
   * Ekranda gösterilen sayı "bu birim + altındakiler". Yalnızca doğrudan bağlı
   * personel sayılsaydı Bilgi İşlem Dairesi "1 personel" derdi — teknik olarak
   * doğru, kullanıcı için yanlış.
   */
  it("personel sayısını alt birimlerden yukarı toplar", () => {
    const tree = buildOrgTree(rows);
    const presidency = tree[0];
    const directorate = presidency?.children[0];

    expect(directorate?.directStaffCount).toBe(1);
    expect(directorate?.totalStaffCount).toBe(8); // 1 + 2 + 5
    expect(presidency?.totalStaffCount).toBe(8);
  });

  it("personeli olmayan birimde toplamı sıfır bırakır", () => {
    const tree = buildOrgTree(rows);
    const emptyDirectorate = tree[0]?.children[1];

    expect(emptyDirectorate?.totalStaffCount).toBe(0);
  });

  /**
   * Üst birimi listede olmayan (ör. yumuşak silinmiş) bir birim KAYBOLMAMALI:
   * altındaki personel de ekrandan sessizce düşerdi.
   */
  it("üst birimi bulunmayan kaydı kök sayar", () => {
    const tree = buildOrgTree([unit({ id: "oksuz", parentId: "olmayan-birim" })]);

    expect(tree.map((node) => node.id)).toEqual(["oksuz"]);
  });

  /** Bozuk veri döngü kurarsa özyineleme sonsuza gitmemeli. */
  it("döngüde takılıp kalmaz", () => {
    const cyclic = [
      unit({ id: "a", parentId: "b" }),
      unit({ id: "b", parentId: "a" }),
      unit({ id: "kok" }),
    ];

    const tree = buildOrgTree(cyclic);

    expect(tree.map((node) => node.id)).toEqual(["kok"]);
  });

  it("boş listede boş ağaç döner", () => {
    expect(buildOrgTree([])).toEqual([]);
  });
});

describe("findUnit", () => {
  it("derindeki birimi bulur", () => {
    expect(findUnit(buildOrgTree(rows), "seflik")?.name).toBe("Web Şefliği");
  });

  it("olmayan birimde null döner", () => {
    expect(findUnit(buildOrgTree(rows), "yok")).toBeNull();
  });
});

describe("collectUnitIds", () => {
  /**
   * Personel sorgusu bu listeyi kullanıyor: daire seçildiğinde altındaki
   * şube ve şefliklerin personeli de listelenmeli.
   */
  it("birimi ve tüm alt birimlerini toplar", () => {
    const directorate = findUnit(buildOrgTree(rows), "daire");

    expect(collectUnitIds(directorate!)).toEqual(["daire", "sube", "seflik"]);
  });

  it("yaprak birimde yalnızca kendisini döner", () => {
    const section = findUnit(buildOrgTree(rows), "seflik");

    expect(collectUnitIds(section!)).toEqual(["seflik"]);
  });
});

describe("findUnitPath", () => {
  it("kökten hedefe giden yolu döner", () => {
    expect(findUnitPath(buildOrgTree(rows), "seflik")).toEqual([
      "baskanlik",
      "daire",
      "sube",
      "seflik",
    ]);
  });

  it("olmayan birimde boş yol döner", () => {
    expect(findUnitPath(buildOrgTree(rows), "yok")).toEqual([]);
  });
});
