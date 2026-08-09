import { requireAccess } from "@/features/auth/services/api-guard";
import { InvalidMembershipRequestError } from "@/features/gym/errors";
import { createMembershipSchema } from "@/features/gym/schemas/membership.schema";
import { startMembership } from "@/features/gym/services/membership-purchase.service";
import { created, fail } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * POST /api/memberships — spor salonu üyeliği başlatır (PRD §5.6).
 *
 * KAYNAK ADI ÇOĞUL VE FİİLSİZ (03-api-guidelines.md): "üye olmak" bir üyelik
 * KAYNAĞI oluşturmaktır, `/api/startMembership` değil.
 *
 * ERİŞİM: `requireAccess("staff")` — tesis kurum personeline özeldir
 * (PRD §5.0 erişim kademeleri). Kapı GÖVDE AYRIŞTIRILMADAN ÖNCE: yetkisiz
 * istek şema doğrulamasına bile girmez.
 *
 * BU DOSYADA İŞ MANTIĞI YOKTUR: kapıyı geçirir, girdiyi doğrular, servisi
 * çağırır, hatayı tek tip zarfa çevirir. Taahhüt, tahsilat ve "tek üyelik"
 * kuralları `membership-purchase.service.ts` içinde — böylece adım 16'daki
 * planlı görev aynı kuralların etrafından dolaşamaz.
 *
 * `userId` GÖVDEDEN OKUNMAZ; oturumdan gelir.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireAccess("staff");

    const parsed = createMembershipSchema.safeParse(await readJsonBody(request));

    // Zod'un hata nesnesi istemciye VERİLMEZ: gövdede kart numarası var.
    if (!parsed.success) throw new InvalidMembershipRequestError();

    const result = await startMembership({
      userId: session.userId,
      payload: parsed.data,
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    return created({
      id: result.membershipId,
      chargedKurus: result.chargedKurus,
      nextBillingAt: result.nextBillingAt.toISOString(),
      commitmentEndsAt: result.commitmentEndsAt?.toISOString() ?? null,
    });
  } catch (error) {
    return fail(error);
  }
}

/** Gövdesi bozuk istekte JSON ayrıştırma hatası sızdırmadan boş nesne döner. */
async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
