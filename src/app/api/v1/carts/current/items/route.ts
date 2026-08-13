import { InvalidCartRequestError, OutOfStockError } from "@/features/cart/errors";
import { getCartContext } from "@/features/cart/services/cart-context";
import { addItemToCart } from "@/features/cart/services/cart.service";
import { addCartItemSchema } from "@/features/payment/schemas/checkout.schema";
import { created, fail } from "@/lib/http";

/**
 * POST /api/v1/carts/current/items — sepete ürün ekler (PRD §4 "Ortak sepet").
 *
 * `current` NEDEN YOL PARÇASI: sepet kimliği adreste GEÇMİYOR. Geçseydi
 * başkasının sepetinin kimliğini deneyerek içeriğini değiştirmek mümkün
 * olurdu (IDOR). Sepet her zaman "isteği atanın sepeti"; sahibi oturumdan
 * veya ziyaretçi çerezinden geliyor — `/hesabim` sayfasındaki desenin aynısı.
 *
 * GİRİŞ ZORUNLU DEĞİL: PRD §4 ziyaretçinin de sepete ekleyebilmesini istiyor.
 * Giriş zorunluluğu ödeme adımında başlıyor.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = addCartItemSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) throw new InvalidCartRequestError();

    const context = await getCartContext();

    const summary = await addItemToCart({
      owner: context.owner,
      anonymousId: context.anonymousId,
      now: new Date(),
      itemType: parsed.data.itemType,
      refId: parsed.data.refId,
      quantity: parsed.data.quantity,
      note: parsed.data.note,
    });

    return created(summary);
  } catch (error) {
    return fail(error, stockDetails(error));
  }
}

/** Gövdesi bozuk istekte ayrıştırma hatası sızdırmadan boş nesne döner. */
async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

/**
 * Stok hatasında kalan adedi istemciye bildirir.
 *
 * Bilgi sızıntısı değil: stok zaten ürün ekranında görünüyor. Bildirmemek
 * kullanıcıyı deneme yanılmaya iterdi.
 */
function stockDetails(error: unknown): { availableQuantity: number } | undefined {
  return error instanceof OutOfStockError
    ? { availableQuantity: error.availableQuantity }
    : undefined;
}
