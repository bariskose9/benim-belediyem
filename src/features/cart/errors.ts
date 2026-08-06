import { messages } from "@/config/messages";
import { AppError } from "@/lib/errors";

/**
 * Ortak sepete özel hatalar (PRD §4 "Ortak sepet").
 *
 * Kodlar ayrı çünkü ekranın hangi duvara çarptığını bilmesi gerekiyor:
 * "stok yetmedi" satırı kırmızıya boyayıp adedi düşürtür, "ürün artık
 * satışta değil" ise satırı çıkarttırır (03-api-guidelines.md → `code`
 * makine için sabit ve anlamlı).
 */

const copy = messages.cart.errors;

/** Sepete eklenmek istenen ürün katalogda yok (silinmiş veya hiç olmamış). */
export class CartItemNotFoundError extends AppError {
  readonly code = "CART_ITEM_NOT_FOUND";
  readonly status = 404;

  constructor() {
    super(copy.itemNotFound);
  }
}

/**
 * Stok yetersiz (PRD §5.3: "Stok yetersizse sepete eklenemez").
 *
 * KALAN ADET İSTEMCİYE SÖYLENİYOR: kullanıcı kaç tane alabileceğini bilmeden
 * deneme yanılma yapardı. Stok gizli bir bilgi değil, zaten ürün sayfasında
 * görünüyor.
 */
export class OutOfStockError extends AppError {
  readonly code = "OUT_OF_STOCK";
  readonly status = 409;

  constructor(readonly availableQuantity: number) {
    super(copy.outOfStock);
  }
}

/** Ürün satışta değil (`isAvailable = false` restoran kalemi gibi). */
export class ItemUnavailableError extends AppError {
  readonly code = "ITEM_UNAVAILABLE";
  readonly status = 409;

  constructor() {
    super(copy.unavailable);
  }
}

export class QuantityTooHighError extends AppError {
  readonly code = "QUANTITY_TOO_HIGH";
  readonly status = 422;

  constructor() {
    super(copy.quantityTooHigh);
  }
}

export class CartTooLargeError extends AppError {
  readonly code = "CART_TOO_LARGE";
  readonly status = 409;

  constructor() {
    super(copy.cartTooLarge);
  }
}

/** Ödeme boş sepetle başlatılamaz. */
export class CartEmptyError extends AppError {
  readonly code = "CART_EMPTY";
  readonly status = 409;

  constructor() {
    super(copy.cartEmpty);
  }
}

export class CartRateLimitedError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(copy.tooManyAttempts);
  }
}

/**
 * Sepet isteği şemaya uymuyor.
 *
 * Kullanıcı arayüzü bu hatayı üretemez — ürün kimliğini ve adedi kullanıcı elle
 * yazmıyor, listeden seçiyor. Zod'un alan yolu ve beklenen tipi yanıta
 * KONMUYOR: iç detay sızdırmama kuralı şema hatalarını da kapsar
 * (03-api-guidelines.md).
 */
export class InvalidCartRequestError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly status = 422;

  constructor() {
    super(copy.itemNotFound);
  }
}
