import {
  CART_MAX_LINES,
  CART_MAX_QUANTITY_PER_ITEM,
  CART_WRITE_RATE_LIMIT_MAX,
  CART_WRITE_RATE_LIMIT_WINDOW_MS,
} from "@/config/constants";
import {
  CartItemNotFoundError,
  CartRateLimitedError,
  CartTooLargeError,
  ItemUnavailableError,
  OutOfStockError,
  QuantityTooHighError,
} from "@/features/cart/errors";
import {
  addOrIncrementItem,
  countCartLines,
  findActiveCart,
  findOrCreateActiveCart,
  listCartItems,
  removeItem as removeItemRow,
  setItemNote,
  setItemQuantity,
  toCartLines,
  type CartOwner,
} from "@/features/cart/repositories/cart.repository";
import { findCatalogItem } from "@/features/cart/repositories/catalog.repository";
import { summarizeCart } from "@/features/cart/services/cart-pricing";
import type { CartSummary } from "@/features/cart/types";
import { releaseSeatHold } from "@/features/events/repositories/seat-reservation.repository";
import { dropExpiredSeatLines } from "@/features/events/services/seat-expiry.service";
import type { CartItemType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";

/**
 * Ortak sepetin iş kuralları (PRD §4 "Ortak sepet" · §5.3 stok kuralı).
 *
 * Kurallar burada, ekranda ya da uçta değil: sepet hem `/sepet` sayfasından
 * hem uçlardan hem de ileride mobil uygulamadan (adım 19) değiştirilecek.
 *
 * STOK KONTROLÜ BURADA "SEPETE EKLENEBİLİR Mİ" SORUSUNU CEVAPLAR, stoğu
 * REZERVE ETMEZ. Gerçek düşüm ödeme anında, transaction içinde ve koşullu
 * güncellemeyle yapılır (`payment.service.ts`) — sepete atmak stoğu kimseden
 * saklamamalı, yoksa dolu sepetler ürünleri kilitlerdi.
 */

export type CartActor = {
  owner: CartOwner;
  /** Hız sınırı anahtarı — ziyaretçi de sepete yazabildiği için ziyaretçi kimliği. */
  anonymousId: string;
  now: Date;
};

/** Sepeti özetiyle birlikte okur. Sepet yoksa boş özet döner, satır AÇILMAZ. */
export async function getCartSummary(owner: CartOwner, now: Date): Promise<CartSummary> {
  const cart = await findActiveCart(owner);

  if (!cart) return summarizeCart("", []);

  /**
   * SÜRESİ DOLMUŞ KOLTUKLAR OKUMA ANINDA DÜŞÜYOR (PRD §5.2 · ADR-007).
   *
   * Ziyaretçi sepetinde atlanıyor çünkü orada bilet satırı olamaz: koltuk
   * kilidi bir kullanıcı kimliği gerektiriyor (`seat_reservations.user_id`
   * zorunlu), yani ziyaretçi hiç koltuk tutamıyor.
   */
  if ("userId" in owner) {
    await dropExpiredSeatLines({ cartId: cart.id, userId: owner.userId, now });
  }

  const items = await listCartItems(cart.id);
  const lines = await toCartLines(items, now);

  return summarizeCart(cart.id, lines);
}

export type AddItemInput = CartActor & {
  itemType: CartItemType;
  refId: string;
  quantity: number;
  note?: string | null;
};

/**
 * Sepete ürün ekler (veya adedini artırır).
 *
 * KONTROL SIRASI: hız sınırı → katalog → satışta mı → adet sınırı → stok →
 * satır sayısı. Ucuz kontroller önce; veritabanına en son yazılıyor.
 */
export async function addItemToCart(input: AddItemInput): Promise<CartSummary> {
  await enforceWriteBudget(input);

  const item = await findCatalogItem(input.itemType, input.refId, input.now);

  if (!item) throw new CartItemNotFoundError();
  if (!item.isPurchasable && item.availableStock === null) throw new ItemUnavailableError();

  const cart = await findOrCreateActiveCart(input.owner);
  const existing = await listCartItems(cart.id);
  const current = existing.find(
    (row) => row.itemType === input.itemType && row.refId === input.refId,
  );
  const nextQuantity = (current?.quantity ?? 0) + input.quantity;

  if (nextQuantity > CART_MAX_QUANTITY_PER_ITEM) throw new QuantityTooHighError();

  // Stok kontrolü TOPLAM adede bakar: 3 tane varken 5 daha eklemek, stoğu 8
  // olmayan bir üründe reddedilmeli.
  if (item.availableStock !== null && nextQuantity > item.availableStock) {
    throw new OutOfStockError(item.availableStock);
  }

  if (!current && existing.length >= CART_MAX_LINES) throw new CartTooLargeError();

  await addOrIncrementItem({
    cartId: cart.id,
    itemType: input.itemType,
    refId: input.refId,
    quantity: input.quantity,
    unitPriceKurus: item.unitPriceKurus,
    note: input.note,
  });

  return getCartSummary(input.owner, input.now);
}

export type ChangeQuantityInput = CartActor & { itemId: string; quantity: number };

/**
 * Satırın adedini değiştirir. Adet 0 ise satır silinir — kullanıcı için
 * "sıfır adet" ile "sepetten çıkar" aynı şey.
 */
export async function changeItemQuantity(input: ChangeQuantityInput): Promise<CartSummary> {
  await enforceWriteBudget(input);

  if (input.quantity > CART_MAX_QUANTITY_PER_ITEM) throw new QuantityTooHighError();

  const cart = await findActiveCart(input.owner);

  if (!cart) throw new CartItemNotFoundError();

  const items = await listCartItems(cart.id);
  const row = items.find((item) => item.id === input.itemId);

  if (!row) throw new CartItemNotFoundError();

  if (input.quantity <= 0) {
    if (!(await removeItemRow({ cartId: cart.id, itemId: input.itemId }))) {
      throw new CartItemNotFoundError();
    }

    await releaseSeatIfTicketLine(input.owner, row);

    return getCartSummary(input.owner, input.now);
  }

  const item = await findCatalogItem(row.itemType, row.refId, input.now);

  if (!item) throw new CartItemNotFoundError();
  if (item.availableStock !== null && input.quantity > item.availableStock) {
    throw new OutOfStockError(item.availableStock);
  }

  await setItemQuantity({ cartId: cart.id, itemId: input.itemId, quantity: input.quantity });

  return getCartSummary(input.owner, input.now);
}

export type ChangeNoteInput = CartActor & { itemId: string; note: string | null };

/**
 * Satırın mutfak notunu değiştirir (PRD §5.4).
 *
 * KATALOG SORGULANMIYOR ve bu bilinçli: not fiyatı, stoğu veya satın
 * alınabilirliği etkilemiyor. Tükenmiş bir kalemin notunu düzeltmek de
 * serbest — engel ödemede zaten var (`assertCartIsPayable`), notu
 * düzeltemeyen kullanıcı satırı silmek zorunda kalırdı.
 *
 * Not YALNIZCA restoran satırlarında anlamlı ama servis bunu KISITLAMIYOR:
 * kısıt ekranda (yalnızca restoran bölümünde alan gösteriliyor). Sunucuda
 * reddetseydik, ileride markete "kapıda zili çalmayın" notu eklemek şemayı
 * değil kuralı değiştirmeyi gerektirirdi.
 */
export async function changeItemNote(input: ChangeNoteInput): Promise<CartSummary> {
  await enforceWriteBudget(input);

  const cart = await findActiveCart(input.owner);

  if (!cart) throw new CartItemNotFoundError();

  if (!(await setItemNote({ cartId: cart.id, itemId: input.itemId, note: input.note }))) {
    throw new CartItemNotFoundError();
  }

  return getCartSummary(input.owner, input.now);
}

export async function removeItemFromCart(
  input: CartActor & { itemId: string },
): Promise<CartSummary> {
  await enforceWriteBudget(input);

  const cart = await findActiveCart(input.owner);

  if (!cart) throw new CartItemNotFoundError();

  const items = await listCartItems(cart.id);
  const row = items.find((item) => item.id === input.itemId);

  if (!row) throw new CartItemNotFoundError();
  if (!(await removeItemRow({ cartId: cart.id, itemId: input.itemId }))) {
    throw new CartItemNotFoundError();
  }

  await releaseSeatIfTicketLine(input.owner, row);

  return getCartSummary(input.owner, input.now);
}

/**
 * Bilet satırı sepetten çıkarıldığında KOLTUK KİLİDİ DE BIRAKILIR (PRD §5.2).
 *
 * Bırakılmasaydı koltuk 10 dakika daha kimseye görünmezdi: kullanıcı vazgeçmiş
 * ama koltuk hâlâ satılamıyor olurdu. Kilidi bırakmak "satılabilir" demek
 * değil, "beklemeyi bırak" demek.
 *
 * SATILMIŞ BİLET ETKİLENMEZ: `releaseSeatHold` yalnızca `status = held`
 * satırını siliyor ve sahiplik koşulu da sorgunun içinde (IDOR).
 */
async function releaseSeatIfTicketLine(
  owner: CartOwner,
  row: { itemType: CartItemType; refId: string },
): Promise<void> {
  if (row.itemType !== "event") return;
  if (!("userId" in owner)) return;

  await releaseSeatHold({ reservationId: row.refId, userId: owner.userId });
}

/**
 * Ziyaretçi sepetini kullanıcının sepetiyle BİRLEŞTİRİR (PRD §4).
 *
 * "Aynı ürün varsa adetler toplanır, stok sınırı aşılmaz" kuralı burada.
 * Giriş akışı bunu çağırır; ziyaretçiyken sepete atıp sonra giriş yapan
 * kullanıcı sepetini kaybetmez — PRD §3'ün "kaldığı yerden devam eder"
 * sözünün karşılığı bu.
 *
 * TEK TRANSACTION: yarıda kalırsa ziyaretçi sepeti de kullanıcı sepeti de
 * bozulmadan kalır. Ziyaretçi sepeti sonunda `converted` işaretlenir ki
 * aynı çerezle ikinci kez birleştirme yapılmasın (çift adet olurdu).
 */
export async function mergeGuestCartIntoUserCart(input: {
  userId: string;
  anonymousId: string;
  now: Date;
}): Promise<{ mergedLineCount: number }> {
  const guestCart = await findActiveCart({ anonymousId: input.anonymousId });

  if (!guestCart) return { mergedLineCount: 0 };

  const guestItems = await listCartItems(guestCart.id);

  if (guestItems.length === 0) return { mergedLineCount: 0 };

  return prisma.$transaction(async (tx) => {
    const userCart = await findOrCreateActiveCart({ userId: input.userId }, tx);
    const userItems = await listCartItems(userCart.id, tx);
    const existingByKey = new Map(
      userItems.map((item) => [`${item.itemType}:${item.refId}`, item] as const),
    );

    let merged = 0;

    for (const guestItem of guestItems) {
      const catalog = await findCatalogItem(guestItem.itemType, guestItem.refId, input.now, tx);

      // Katalogdan düşmüş ürün taşınmaz: kullanıcıya satın alamayacağı bir
      // satır devretmenin anlamı yok.
      if (!catalog) continue;

      const current = existingByKey.get(`${guestItem.itemType}:${guestItem.refId}`);
      const desired = (current?.quantity ?? 0) + guestItem.quantity;

      // İki tavan birden uygulanıyor: satır başı adet sınırı ve gerçek stok.
      const capped = Math.min(
        desired,
        CART_MAX_QUANTITY_PER_ITEM,
        catalog.availableStock ?? CART_MAX_QUANTITY_PER_ITEM,
      );

      if (capped <= 0) continue;

      if (current) {
        await setItemQuantity({ cartId: userCart.id, itemId: current.id, quantity: capped }, tx);
      } else {
        if ((await countCartLines(userCart.id, tx)) >= CART_MAX_LINES) continue;

        await addOrIncrementItem(
          {
            cartId: userCart.id,
            itemType: guestItem.itemType,
            refId: guestItem.refId,
            quantity: capped,
            unitPriceKurus: catalog.unitPriceKurus,
            note: guestItem.note,
          },
          tx,
        );
      }

      merged += 1;
    }

    // Ziyaretçi sepeti kapatılıyor: aynı çerezle ikinci birleştirme adetleri
    // ikinci kez toplardı.
    await tx.cart.updateMany({ where: { id: guestCart.id }, data: { status: "converted" } });

    return { mergedLineCount: merged };
  });
}

/**
 * Yazma bütçesi — ZİYARETÇİ kimliği başına.
 *
 * Kullanıcı başına olamaz: sepete ekleme girişsiz de yapılabiliyor (PRD §4)
 * ve o durumda bir kullanıcı kimliği yok. Ziyaretçi çerezi hem girişli hem
 * girişsiz akışta bulunuyor, dolayısıyla ucun tamamını kapsıyor.
 */
async function enforceWriteBudget(actor: CartActor): Promise<void> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("cart_write", "session", actor.anonymousId),
    limit: CART_WRITE_RATE_LIMIT_MAX,
    windowMs: CART_WRITE_RATE_LIMIT_WINDOW_MS,
    now: actor.now,
  });

  if (!decision.allowed) throw new CartRateLimitedError();
}
