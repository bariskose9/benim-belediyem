import { requireAccess } from "@/features/auth/services/api-guard";
import { InvalidCheckoutRequestError } from "@/features/payment/errors";
import { checkoutSchema } from "@/features/payment/schemas/checkout.schema";
import { checkout } from "@/features/payment/services/checkout.service";
import { created, fail } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * POST /api/payments — sepeti öder (PRD §6.1 · §6.2).
 *
 * ÖDEME ADIMI GİRİŞ ZORUNLU (PRD §4). Sepete ekleme ziyaretçiye açık, ama
 * tahsilat bir kullanıcıya bağlanmak zorunda: sipariş, adres ve kayıtlı kart
 * hepsi hesaba ait.
 *
 * `identity_verified` DEĞİL `authenticated` isteniyor: PRD §5.0'ın erişim
 * kademeleri tablosunda sipariş ve bilet "doğrulanmamış" kullanıcıya da açık.
 * Kimlik doğrulaması yalnızca hastane ve spor salonu için gerekiyor.
 *
 * ⛔ BU DOSYA KART NUMARASINI LOG'A YAZMAZ, HATA MESAJINA KOYMAZ. Gövde
 * doğrudan servise geçiyor; şema hatasında bile içerik yanıta konmuyor.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireAccess("authenticated");

    const parsed = checkoutSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) throw new InvalidCheckoutRequestError();

    const result = await checkout({
      userId: session.userId,
      payload: parsed.data,
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    return created({
      paymentId: result.paymentId,
      transactionId: result.transactionId,
      orderIds: result.orderIds,
      totalKurus: result.totalKurus,
    });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Gövdesi bozuk istekte boş nesne döner.
 *
 * Ayrıştırma hatasının METNİ yutuluyor: gövdede kart numarası olabilir ve
 * hata mesajı gövdenin bir parçasını taşıyabilirdi.
 */
async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
