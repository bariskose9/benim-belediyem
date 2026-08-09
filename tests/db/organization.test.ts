import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { listOrgUnits } from "@/features/organization/repositories/org-unit.repository";
import { listStaffMembers } from "@/features/organization/repositories/staff.repository";
import { buildOrgTree, collectUnitIds, findUnit } from "@/features/organization/services/org-tree";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ═══ PRD §5.9 — TEŞKİLAT ŞEMASI VE PERSONEL REHBERİNİN OKUMA TARAFI ═══
 *
 * GERÇEK PostgreSQL'e karşı yazıldı, iki sebeple:
 *   1. "ŞAHİN" ve "sahin" aynı kişiyi bulmalı — bu tamamen veritabanının harf
 *      kurallarına ve `unaccent` eklentisine bağlı. Taklit bir istemci sorgunun
 *      yapıldığını doğrular, EŞLEŞTİĞİNİ değil
 *   2. Rehber sorgusunun `national_id_hash` kolonunu HİÇ OKUMADIĞI ancak
 *      gerçek satır dönerken kanıtlanabilir
 */

const UNIT_PRESIDENCY = testId("org", "baskanlik");
const UNIT_IT = testId("org", "bilgi-islem");
const UNIT_BRANCH = testId("org", "sube");
const UNIT_SECTION = testId("org", "seflik");
const UNIT_EMPTY = testId("org", "itfaiye");
const UNIT_DELETED = testId("org", "kapatilmis");

const STAFF_HEAD = testId("staff", "daire-baskani");
const STAFF_MANAGER = testId("staff", "sube-muduru");
const STAFF_ENGINEER = testId("staff", "muhendis");
const STAFF_TECHNICIAN = testId("staff", "tekniker");
const STAFF_DELETED = testId("staff", "ayrilmis");

/** Dahili numara bloğu tohum verisiyle çakışmasın: tohum 1000-1999 kullanıyor. */
const EXTENSION_BASE = 9100;

beforeEach(async () => {
  await cleanupTestData();

  await prisma.orgUnit.createMany({
    data: [
      { id: UNIT_PRESIDENCY, name: "Test Başkanlığı", unitType: "presidency", sortOrder: 0 },
      {
        id: UNIT_IT,
        name: "Test Bilgi İşlem Dairesi",
        unitType: "directorate",
        parentId: UNIT_PRESIDENCY,
        sortOrder: 0,
      },
      {
        id: UNIT_EMPTY,
        name: "Test İtfaiye Dairesi",
        unitType: "directorate",
        parentId: UNIT_PRESIDENCY,
        sortOrder: 1,
      },
      {
        id: UNIT_BRANCH,
        name: "Test Yazılım Şubesi",
        unitType: "branch",
        parentId: UNIT_IT,
        sortOrder: 0,
      },
      {
        id: UNIT_SECTION,
        name: "Test Web Şefliği",
        unitType: "section",
        parentId: UNIT_BRANCH,
        sortOrder: 0,
      },
      {
        id: UNIT_DELETED,
        name: "Test Kapatılmış Şeflik",
        unitType: "section",
        parentId: UNIT_BRANCH,
        sortOrder: 1,
        deletedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
  });

  await prisma.staffMember.createMany({
    data: [
      {
        id: STAFF_HEAD,
        orgUnitId: UNIT_IT,
        fullName: "Şahin Çağlar",
        title: "department_head",
        workEmail: "sahin.caglar@test.ornek.test",
        extensionNumber: EXTENSION_BASE,
        startYear: 2010,
      },
      {
        id: STAFF_MANAGER,
        orgUnitId: UNIT_BRANCH,
        fullName: "Gülşah Öztürk",
        title: "branch_manager",
        workEmail: "gulsah.ozturk@test.ornek.test",
        extensionNumber: EXTENSION_BASE + 1,
        startYear: 2012,
      },
      {
        id: STAFF_ENGINEER,
        orgUnitId: UNIT_SECTION,
        fullName: "İlknur Yıldız",
        title: "engineer",
        workEmail: "ilknur.yildiz@test.ornek.test",
        extensionNumber: EXTENSION_BASE + 2,
        startYear: 2018,
        // Personel eşleştirmesi için tutulan alan — rehbere ÇIKMAMALI.
        nationalIdHash: testId("hash", "ilknur"),
      },
      {
        id: STAFF_TECHNICIAN,
        orgUnitId: UNIT_SECTION,
        fullName: "Ahmet Şen",
        title: "technician",
        workEmail: "ahmet.sen@test.ornek.test",
        extensionNumber: EXTENSION_BASE + 3,
        startYear: 2021,
      },
      {
        id: STAFF_DELETED,
        orgUnitId: UNIT_SECTION,
        fullName: "Ayrılmış Personel",
        title: "officer",
        workEmail: "ayrilmis.personel@test.ornek.test",
        extensionNumber: EXTENSION_BASE + 4,
        startYear: 2015,
        deletedAt: new Date("2026-02-01T00:00:00.000Z"),
      },
    ],
  });
});

afterEach(async () => {
  await cleanupTestData();
});

/** Test kayıtlarını tohumlanmış teşkilattan ayırır. */
function onlyTestRows<T extends { id: string }>(rows: readonly T[]): T[] {
  return rows.filter((row) => row.id.startsWith("test-db-"));
}

describe("listOrgUnits", () => {
  it("birimleri doğrudan personel sayısıyla döndürür", async () => {
    const units = onlyTestRows(await listOrgUnits());
    const section = units.find((unit) => unit.id === UNIT_SECTION);

    // Şeflikte üç kayıt var ama biri yumuşak silinmiş.
    expect(section?.directStaffCount).toBe(2);
  });

  it("yumuşak silinmiş birimi hiç göstermez", async () => {
    const units = onlyTestRows(await listOrgUnits());

    expect(units.map((unit) => unit.id)).not.toContain(UNIT_DELETED);
  });

  it("personeli olmayan birimi sıfır sayaçla döndürür", async () => {
    const units = onlyTestRows(await listOrgUnits());
    const empty = units.find((unit) => unit.id === UNIT_EMPTY);

    // Boş daire listeden DÜŞMÜYOR: şemada ismen görünmeli (PRD §5.9).
    expect(empty).toBeDefined();
    expect(empty?.directStaffCount).toBe(0);
  });

  /** Sıralama sorgudan geliyor; ağaç kurucusu ona güveniyor. */
  it("birimleri sortOrder'a göre sıralar", async () => {
    const units = onlyTestRows(await listOrgUnits());
    const directorates = units.filter((unit) => unit.parentId === UNIT_PRESIDENCY);

    expect(directorates.map((unit) => unit.id)).toEqual([UNIT_IT, UNIT_EMPTY]);
  });
});

describe("listStaffMembers — süzgeçler", () => {
  it("birim ve alt birimlerinin personelini listeler", async () => {
    const tree = buildOrgTree(await listOrgUnits());
    const directorate = findUnit(tree, UNIT_IT);
    const staff = onlyTestRows(await listStaffMembers({ unitIds: collectUnitIds(directorate!) }));

    // Daireye doğrudan 1 kişi bağlı; alt birimlerle birlikte 4 kişi.
    expect(staff.map((entry) => entry.id).sort()).toEqual(
      [STAFF_HEAD, STAFF_MANAGER, STAFF_ENGINEER, STAFF_TECHNICIAN].sort(),
    );
  });

  it("yaprak birimde yalnızca o birimin personelini listeler", async () => {
    const staff = onlyTestRows(await listStaffMembers({ unitIds: [UNIT_SECTION] }));

    expect(staff.map((entry) => entry.id).sort()).toEqual(
      [STAFF_ENGINEER, STAFF_TECHNICIAN].sort(),
    );
  });

  it("yumuşak silinmiş personeli hiç göstermez", async () => {
    const staff = onlyTestRows(await listStaffMembers({}));

    expect(staff.map((entry) => entry.id)).not.toContain(STAFF_DELETED);
  });

  it("unvana göre süzer", async () => {
    const staff = onlyTestRows(await listStaffMembers({ title: "engineer" }));

    expect(staff.map((entry) => entry.id)).toEqual([STAFF_ENGINEER]);
  });

  it("birim ve unvan süzgecini birlikte uygular", async () => {
    const staff = onlyTestRows(
      await listStaffMembers({ unitIds: [UNIT_SECTION], title: "technician" }),
    );

    expect(staff.map((entry) => entry.id)).toEqual([STAFF_TECHNICIAN]);
  });

  /**
   * Rehber alfabetik değil TEŞKİLAT SIRASINDA: PostgreSQL enum'ları tanımlanma
   * sırasına göre sıraladığı ve `StaffTitle` hiyerarşi sırasıyla tanımlı olduğu
   * için daire başkanı listenin başında geliyor.
   */
  it("personeli unvan hiyerarşisine göre sıralar", async () => {
    const staff = onlyTestRows(await listStaffMembers({ unitIds: [UNIT_IT, UNIT_BRANCH] }));

    expect(staff.map((entry) => entry.id)).toEqual([STAFF_HEAD, STAFF_MANAGER]);
  });

  it("personelin bağlı olduğu birimin adını da döndürür", async () => {
    const staff = onlyTestRows(await listStaffMembers({ unitIds: [UNIT_SECTION] }));

    expect(staff[0]?.unitName).toBe("Test Web Şefliği");
  });
});

describe("listStaffMembers — arama", () => {
  it("ada göre arar", async () => {
    const staff = onlyTestRows(await listStaffMembers({ query: "Çağlar" }));

    expect(staff.map((entry) => entry.id)).toEqual([STAFF_HEAD]);
  });

  /**
   * ═══ TÜRKÇE ARAMA — market kataloğunda ölçülmüş hatanın rehberdeki karşılığı ═══
   * Veritabanının kendi büyük/küçük harf araması `I` harfini `i`'ye çeviriyor
   * (Türkçe karşılığı `ı`) ve aksanları eşlemiyor. `unaccent` eklentisi üç
   * yazımı da aynı yere düşürüyor.
   */
  it("büyük harfle yazılan Türkçe aramayı eşler", async () => {
    const staff = onlyTestRows(await listStaffMembers({ query: "ŞAHİN" }));

    expect(staff.map((entry) => entry.id)).toEqual([STAFF_HEAD]);
  });

  it("aksansız yazılan aramayı eşler", async () => {
    const sahin = onlyTestRows(await listStaffMembers({ query: "sahin" }));
    const gulsah = onlyTestRows(await listStaffMembers({ query: "gulsah" }));
    const ilknur = onlyTestRows(await listStaffMembers({ query: "ilknur yildiz" }));

    expect(sahin.map((entry) => entry.id)).toEqual([STAFF_HEAD]);
    expect(gulsah.map((entry) => entry.id)).toEqual([STAFF_MANAGER]);
    expect(ilknur.map((entry) => entry.id)).toEqual([STAFF_ENGINEER]);
  });

  it("soyada göre de arar", async () => {
    const staff = onlyTestRows(await listStaffMembers({ query: "Şen" }));

    expect(staff.map((entry) => entry.id)).toEqual([STAFF_TECHNICIAN]);
  });

  /**
   * KURUMSAL E-POSTA ARANMIYOR (PRD §5.9 "ada göre arama"): adres listede
   * görünüyor ama arama kutusu bir e-posta doğrulayıcısına dönüşmemeli.
   */
  it("kurumsal e-posta ile arama yapılamaz", async () => {
    const staff = onlyTestRows(await listStaffMembers({ query: "ahmet.sen@test.ornek.test" }));

    expect(staff).toEqual([]);
  });

  it("arama ve birim süzgeci birlikte uygulanır", async () => {
    const staff = onlyTestRows(await listStaffMembers({ unitIds: [UNIT_SECTION], query: "Şahin" }));

    // Şahin dairede, şeflikte değil: iki süzgeç birlikte çalışıyor.
    expect(staff).toEqual([]);
  });

  /** `%` ve `_` `LIKE` içinde joker; kaçırılmasaydı `%` tüm rehberi getirirdi. */
  it("kullanıcının yazdığı % işaretini joker saymaz", async () => {
    expect(onlyTestRows(await listStaffMembers({ query: "%" }))).toEqual([]);
  });

  it("eşleşme yoksa boş liste döner", async () => {
    expect(onlyTestRows(await listStaffMembers({ query: "boylebirpersonelyok" }))).toEqual([]);
  });
});

describe("listStaffMembers — gizlilik", () => {
  /**
   * ═══ BU ADIMIN EN KRİTİK TESTİ ═══
   *
   * Rehber herkese açık bir sayfa. `staff_members.national_id_hash` personelin
   * kimlik numarasının tuzlanmış özeti; ekrana çıkmamalı, istemciye HİÇ
   * gitmemeli (05-auth-security.md). Sorgu alan alan yazıldığı için dönen
   * nesnede o alan HİÇ BULUNMAMALI — arayüzde gizlemek yetmezdi, veri yine
   * tarayıcıya inerdi.
   */
  it("kimlik özetini hiçbir koşulda döndürmez", async () => {
    const staff = onlyTestRows(await listStaffMembers({}));
    const withHash = staff.find((entry) => entry.id === STAFF_ENGINEER);

    expect(withHash).toBeDefined();
    // Alanın veritabanında dolu olduğunu önce doğruluyoruz ki test boşa geçmesin.
    const stored = await prisma.staffMember.findUniqueOrThrow({
      where: { id: STAFF_ENGINEER },
      select: { nationalIdHash: true },
    });
    expect(stored.nationalIdHash).not.toBeNull();

    // Buna rağmen rehber kaydında böyle bir alan yok.
    expect(Object.hasOwn(withHash as object, "nationalIdHash")).toBe(false);
  });

  /** Rehber yalnızca kurumsal iletişim bilgisi taşır (PRD §5.9). */
  it("yalnızca beklenen alanları döndürür", async () => {
    const staff = onlyTestRows(await listStaffMembers({ unitIds: [UNIT_SECTION] }));

    expect(Object.keys(staff[0] ?? {}).sort()).toEqual(
      ["extensionNumber", "fullName", "id", "title", "unitId", "unitName", "workEmail"].sort(),
    );
  });
});
