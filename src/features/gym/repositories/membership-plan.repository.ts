import type { MembershipPlanRow } from "@/features/gym/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { toKurus } from "@/lib/money";

/**
 * `membership_plans` tablosunun OKUMA tarafı.
 *
 * Paketler yalnızca tohumlamayla geliyor (yönetici paneli yok, teknik borç
 * #4), bu yüzden yazma fonksiyonu YOK — olmayan bir ekran için yazma yolu
 * açmak, kullanılmayan bir saldırı yüzeyi bırakmak olurdu.
 *
 * `Decimal` bu dosyanın dışına ÇIKMAZ: sınırda `toKurus` uygulanıyor
 * (`lib/money.ts`).
 */

type Client = Prisma.TransactionClient | typeof prisma;

/** Ucuzdan pahalıya değil, TAAHHÜT SÜRESİNE göre: ekranda paketler artan taahhütle diziliyor. */
export async function listMembershipPlans(client: Client = prisma): Promise<MembershipPlanRow[]> {
  const rows = await client.membershipPlan.findMany({
    select: { id: true, name: true, commitmentMonths: true, monthlyPrice: true },
    orderBy: { commitmentMonths: "asc" },
  });

  return rows.map(toPlanRow);
}

export async function findMembershipPlan(
  planId: string,
  client: Client = prisma,
): Promise<MembershipPlanRow | null> {
  const row = await client.membershipPlan.findUnique({
    where: { id: planId },
    select: { id: true, name: true, commitmentMonths: true, monthlyPrice: true },
  });

  return row ? toPlanRow(row) : null;
}

function toPlanRow(row: {
  id: string;
  name: string;
  commitmentMonths: number;
  monthlyPrice: Prisma.Decimal;
}): MembershipPlanRow {
  return {
    id: row.id,
    name: row.name,
    commitmentMonths: row.commitmentMonths,
    monthlyPriceKurus: toKurus(row.monthlyPrice),
  };
}
