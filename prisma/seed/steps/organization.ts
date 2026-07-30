import { hashNationalId } from "../../../src/lib/crypto.js";
import {
  DEPUTY_SECRETARIAT_NAME,
  DIRECTORATES,
  GENERAL_SECRETARIAT_NAME,
  IT_BRANCHES,
  IT_DIRECTORATE_NAME,
  PRESIDENCY_NAME,
  STAFF_QUOTA,
  TOTAL_STAFF,
} from "../data/organization.js";
import { createRng } from "../lib/rng.js";
import { seedId, slugify } from "../lib/seed-helpers.js";
import type { SeedContext, SeededCitizen, SeededStaff } from "../types.js";
import { CITIZEN_INDEX } from "./kps-citizens.js";

/**
 * Teşkilat şeması + 100 sahte personel (fake-data-guide.md · PRD §5.9).
 *
 * Personelin kimlik numarası sahte KPS havuzundan seçilir; böylece "KPS
 * doğrulandı → personel çıktı" akışı test edilebilir. Numara personel
 * tablosunda DÜZ TUTULMAZ, yalnızca tuzlanmış özeti yazılır
 * (05-auth-security.md "Kimlik verisinin saklanması").
 */

/** Dahili numara bloğu: 1000-1999 (fake-data-guide.md). Sahibin numarası en sonda. */
const EXTENSION_BASE = 1000;
export const OWNER_EXTENSION = 1999;

export interface OrganizationSeedResult {
  readonly staff: readonly SeededStaff[];
  /** Proje sahibi kaydının bağlanacağı müdürlük kimliği. */
  readonly ownerBranchUnitId: string;
  readonly orgUnitCount: number;
}

export async function seedOrganization(
  context: SeedContext,
  citizens: readonly SeededCitizen[],
): Promise<OrganizationSeedResult> {
  const rng = createRng(20260732);

  const presidencyId = seedId("org", "presidency");
  const secretariatId = seedId("org", "secretariat");
  const deputyId = seedId("org", "deputy");

  const units: {
    id: string;
    name: string;
    unitType:
      | "presidency"
      | "general_secretariat"
      | "deputy_general_secretariat"
      | "directorate"
      | "branch"
      | "section";
    parentId: string | null;
    sortOrder: number;
    isSeedData: boolean;
  }[] = [
    {
      id: presidencyId,
      name: PRESIDENCY_NAME,
      unitType: "presidency",
      parentId: null,
      sortOrder: 0,
      isSeedData: true,
    },
    {
      id: secretariatId,
      name: GENERAL_SECRETARIAT_NAME,
      unitType: "general_secretariat",
      parentId: presidencyId,
      sortOrder: 0,
      isSeedData: true,
    },
    {
      id: deputyId,
      name: DEPUTY_SECRETARIAT_NAME,
      unitType: "deputy_general_secretariat",
      parentId: secretariatId,
      sortOrder: 0,
      isSeedData: true,
    },
  ];

  let itDirectorateId = "";

  DIRECTORATES.forEach((name, order) => {
    const id = seedId("org", "dir", order + 1);

    if (name === IT_DIRECTORATE_NAME) itDirectorateId = id;

    units.push({
      id,
      name,
      unitType: "directorate",
      parentId: deputyId,
      sortOrder: order,
      isSeedData: true,
    });
  });

  /** Şeflik kimlikleri — personel dağıtımı bunlara yapılır. */
  const sectionUnitIds: string[] = [];
  const branchUnitIds: string[] = [];
  let ownerBranchUnitId = "";

  IT_BRANCHES.forEach((branch, branchOrder) => {
    const branchId = seedId("org", "branch", branchOrder + 1);

    branchUnitIds.push(branchId);
    if (branchOrder === 0) ownerBranchUnitId = branchId;

    units.push({
      id: branchId,
      name: branch.name,
      unitType: "branch",
      parentId: itDirectorateId,
      sortOrder: branchOrder,
      isSeedData: true,
    });

    branch.sections.forEach((sectionName, sectionOrder) => {
      const sectionId = seedId("org", "section", sectionUnitIds.length + 1);

      sectionUnitIds.push(sectionId);
      units.push({
        id: sectionId,
        name: sectionName,
        unitType: "section",
        parentId: branchId,
        sortOrder: sectionOrder,
        isSeedData: true,
      });
    });
  });

  // Ağaç kendine referanslıdır: üst birim yazılmadan alt birim yazılamaz.
  // `units` dizisi zaten üstten alta sıralı, tek createMany yeterli.
  await context.prisma.orgUnit.createMany({ data: units, skipDuplicates: true });

  const staff = await seedStaffMembers(context, citizens, {
    rng,
    itDirectorateId,
    branchUnitIds,
    sectionUnitIds,
  });

  context.log(`Teşkilat: ${units.length} birim · ${staff.length} personel`);

  return { staff, ownerBranchUnitId, orgUnitCount: units.length };
}

async function seedStaffMembers(
  context: SeedContext,
  citizens: readonly SeededCitizen[],
  layout: {
    rng: ReturnType<typeof createRng>;
    itDirectorateId: string;
    branchUnitIds: readonly string[];
    sectionUnitIds: readonly string[];
  },
): Promise<readonly SeededStaff[]> {
  const { rng, itDirectorateId, branchUnitIds, sectionUnitIds } = layout;

  // Personel havuzu: KPS kayıtlarının son 100'ü (hepsi yetişkin).
  const pool = citizens.slice(CITIZEN_INDEX.staffStart, CITIZEN_INDEX.staffEnd + 1);

  if (pool.length !== TOTAL_STAFF) {
    throw new Error(`Personel havuzu ${TOTAL_STAFF} kişi olmalı, ${pool.length} bulundu.`);
  }

  const usedEmails = new Set<string>();
  const titles = STAFF_QUOTA.flatMap((row) => Array.from({ length: row.count }, () => row.title));

  const rows = pool.map((citizen, offset) => {
    const title = titles[offset];

    return {
      id: seedId("staff", offset + 1),
      orgUnitId: resolveUnitId(title, offset, { itDirectorateId, branchUnitIds, sectionUnitIds }),
      fullName: citizen.fullName,
      title,
      workEmail: uniqueWorkEmail(citizen, usedEmails),
      extensionNumber: EXTENSION_BASE + offset,
      startYear: rng.int(2005, 2026),
      // Düz kimlik numarası YOK — yalnızca tuzlanmış özet.
      nationalIdHash: hashNationalId(citizen.nationalId, context.hashSalt),
      isSeedData: true,
    };
  });

  await context.prisma.staffMember.createMany({ data: rows, skipDuplicates: true });

  return rows.map((row, offset) => ({
    id: row.id,
    citizenIndex: CITIZEN_INDEX.staffStart + offset,
    fullName: row.fullName,
    title: row.title,
    workEmail: row.workEmail,
    extensionNumber: row.extensionNumber,
  }));
}

/**
 * Unvana göre bağlı birim:
 *   Daire Başkanı → daire başkanlığı
 *   Şube Müdürü   → kendi müdürlüğü
 *   Şef ve altı   → şeflikler (sırayla dağıtılır ki hiçbir şeflik boş kalmasın)
 */
function resolveUnitId(
  title: string,
  offset: number,
  units: {
    itDirectorateId: string;
    branchUnitIds: readonly string[];
    sectionUnitIds: readonly string[];
  },
): string {
  if (title === "department_head") return units.itDirectorateId;

  if (title === "branch_manager") {
    // İlk kayıt daire başkanı olduğu için müdür sırası 1'den başlar.
    return units.branchUnitIds[(offset - 1) % units.branchUnitIds.length];
  }

  return units.sectionUnitIds[offset % units.sectionUnitIds.length];
}

/**
 * Kurumsal e-posta `ad.soyad@ornek.test`. Ad-soyad ikilileri havuzda benzersizdir
 * ama Türkçe karakter sadeleştirmesi iki farklı adı aynı yazıma indirebilir;
 * o durumda sonuna sıra numarası eklenir.
 */
function uniqueWorkEmail(citizen: SeededCitizen, used: Set<string>): string {
  const base = `${slugify(citizen.firstName)}.${slugify(citizen.lastName)}`;
  let candidate = `${base}@ornek.test`;
  let suffix = 2;

  while (used.has(candidate)) {
    candidate = `${base}${suffix}@ornek.test`;
    suffix += 1;
  }

  used.add(candidate);

  return candidate;
}
