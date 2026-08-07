import { InvalidCartRequestError, OutOfStockError } from "@/features/cart/errors";
import { getCartContext } from "@/features/cart/services/cart-context";
import {
  changeItemNote,
  changeItemQuantity,
  removeItemFromCart,
} from "@/features/cart/services/cart.service";
import { updateCartItemSchema } from "@/features/payment/schemas/checkout.schema";
import { fail, ok } from "@/lib/http";

/**
 * PATCH /api/carts/current/items/{itemId} — adedi veya mutfak notunu değiştirir
 * DELETE /api/carts/current/items/{itemId} — satırı çıkarır
 *
 * SAHİPLİK SORGUNUN İÇİNDE: satır kimliği tahmin edilse bile servis onu
 * yalnızca isteği atanın sepetinde arıyor (`where: { id, cartId }`).
 * Başkasının sepet satırı "bulunamadı" alır.
 *
 * `PATCH` KULLANILIYOR, `PUT` DEĞİL: satırın tamamı değil yalnızca adedi
 * değişiyor (03-api-guidelines.md).
 */
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ itemId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { itemId } = await context.params;
    const parsed = updateCartItemSchema.safeParse(await readJsonBody(request));

    if (!parsed.success || !itemId.trim()) throw new InvalidCartRequestError();

    const cart = await getCartContext();
    const actor = { owner: cart.owner, anonymousId: cart.anonymousId, now: new Date(), itemId };

    /**
     * NOT VE ADET AYRI İŞLEMLER, ayrı isteklerle geliyor: adet düğmeleri her
     * tıklamada, not ise "kaydet"e basıldığında. İkisini tek istekte
     * birleştirmek, notu kaydeden kullanıcının o sırada değişen adedi geri
     * almasına yol açardı.
     */
    const summary =
      parsed.data.note !== undefined
        ? await changeItemNote({ ...actor, note: parsed.data.note })
        : await changeItemQuantity({ ...actor, quantity: parsed.data.quantity ?? 0 });

    return ok(summary, { noStore: true });
  } catch (error) {
    return fail(error, stockDetails(error));
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { itemId } = await context.params;

    if (!itemId.trim()) throw new InvalidCartRequestError();

    const cart = await getCartContext();

    const summary = await removeItemFromCart({
      owner: cart.owner,
      anonymousId: cart.anonymousId,
      now: new Date(),
      itemId,
    });

    // 204 DEĞİL 200: istemcinin güncel sepet özetine ihtiyacı var (tutarlar,
    // teslimat ücreti). Boş yanıt dönseydi ekran ikinci bir istek atardı.
    return ok(summary, { noStore: true });
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

function stockDetails(error: unknown): { availableQuantity: number } | undefined {
  return error instanceof OutOfStockError
    ? { availableQuantity: error.availableQuantity }
    : undefined;
}
