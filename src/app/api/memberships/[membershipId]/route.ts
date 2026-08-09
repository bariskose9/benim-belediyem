import { requireAccess } from "@/features/auth/services/api-guard";
import { InvalidMembershipRequestError } from "@/features/gym/errors";
import {
  cancelMembershipSchema,
  updateMembershipSchema,
} from "@/features/gym/schemas/membership.schema";
import {
  cancelUserMembership,
  changeMembershipPlan,
} from "@/features/gym/services/membership-change.service";
import { fail, ok } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * Tek bir üyeliğin uçları (PRD §5.6).
 *
 *  · PATCH  → paket değişimini sıraya alır ya da sıradakini temizler
 *  · DELETE → üyeliği iptal eder (gerekiyorsa erken çıkış farkını tahsil eder)
 *
 * NEDEN DELETE VE 200 (204 DEĞİL): iptal kaydı silmiyor, durumunu
 * değiştiriyor ve GERİYE BİLGİ DÖNÜYOR — tahsil edilen fark ve erişimin
 * biteceği tarih. Kullanıcı "ne kadar kesildi, ne zamana kadar girebilirim"
 * sorularının cevabını aynı yanıtta görmeli; boş bir 204 onu ikinci bir
 * isteğe zorlardı.
 *
 * SAHİPLİK SERVİSTE: adresteki kimlik kullanıcının üyeliğiyle eşleşmiyorsa
 * 404 dönüyor, 403 değil (05-auth-security.md → IDOR).
 */
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ membershipId: string }> },
) {
  try {
    const session = await requireAccess("staff");
    const { membershipId } = await context.params;

    const parsed = updateMembershipSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) throw new InvalidMembershipRequestError();

    const result = await changeMembershipPlan({
      userId: session.userId,
      membershipId,
      payload: parsed.data,
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    return ok(
      {
        pendingPlanId: result.pendingPlanId,
        effectiveAt: result.effectiveAt?.toISOString() ?? null,
        feeKurus: result.feeKurus,
      },
      { noStore: true },
    );
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ membershipId: string }> },
) {
  try {
    const session = await requireAccess("staff");
    const { membershipId } = await context.params;

    const parsed = cancelMembershipSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) throw new InvalidMembershipRequestError();

    const result = await cancelUserMembership({
      userId: session.userId,
      membershipId,
      payload: parsed.data,
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    return ok(
      {
        feeKurus: result.feeKurus,
        feeCharged: result.feeCharged,
        accessEndsAt: result.accessEndsAt?.toISOString() ?? null,
      },
      { noStore: true },
    );
  } catch (error) {
    return fail(error);
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
