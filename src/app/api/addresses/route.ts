import { requireAccess } from "@/features/auth/services/api-guard";
import { InvalidCheckoutRequestError } from "@/features/payment/errors";
import { createAddress } from "@/features/payment/repositories/payment.repository";
import { newAddressSchema } from "@/features/payment/schemas/checkout.schema";
import { created, fail } from "@/lib/http";

/**
 * POST /api/addresses — teslimat adresi ekler.
 *
 * NEDEN BU ADIMDA: market ve restoran siparişi adres olmadan tamamlanamıyor
 * (PRD §6.1) ve adresi olmayan bir kullanıcı ödeme ekranında kilitli kalırdı.
 * Adres YÖNETİMİ (listeleme, düzenleme, silme) profil sayfasının işi
 * (adım 15); burada yalnızca ekleme var.
 *
 * `userId` GÖVDEDEN OKUNMAZ, oturumdan gelir — istemci gönderse bile şema
 * onu sonuca taşımıyor.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireAccess("authenticated");

    const parsed = newAddressSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) throw new InvalidCheckoutRequestError();

    const address = await createAddress({
      userId: session.userId,
      title: parsed.data.title,
      fullAddress: parsed.data.fullAddress,
      district: parsed.data.district,
    });

    return created({ id: address.id });
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
