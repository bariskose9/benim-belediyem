import { messages } from "@/config/messages";
import { AppError } from "@/lib/errors";

/**
 * Ödemeye özel hatalar (PRD §6.2).
 *
 * ⛔ HİÇBİRİ KART NUMARASI TAŞIMAZ. Hata sınıflarının imzasında kart numarası
 * için parametre YOKTUR; böylece yanlışlıkla da olsa mesaja veya log'a
 * yazılamaz (`lib/audit.ts` ile aynı disiplin).
 */

const copy = messages.payment.errors;

/**
 * Sahte sağlayıcı kartı reddetti (PRD §6.2 adım 5).
 *
 * 402 DEĞİL 409: 402 "Payment Required" bu projede kullanılmıyor ve
 * `03-api-guidelines.md`'nin durum kodu listesinde yok. Reddedilen ödeme,
 * isteğin kendisinin geçerli olduğu ama kaynağın o an o işleme izin
 * vermediği bir çakışmadır.
 */
export class PaymentDeclinedError extends AppError {
  readonly code = "PAYMENT_DECLINED";
  readonly status = 409;

  constructor() {
    super(copy.declined);
  }
}

export class InsufficientFundsError extends AppError {
  readonly code = "INSUFFICIENT_FUNDS";
  readonly status = 409;

  constructor() {
    super(copy.insufficientFunds);
  }
}

/** Kart numarası Luhn'dan geçmedi veya markası tanınmadı. */
export class InvalidCardNumberError extends AppError {
  readonly code = "INVALID_CARD_NUMBER";
  readonly status = 422;

  constructor() {
    super(copy.invalidNumber);
  }
}

export class InvalidCardExpiryError extends AppError {
  readonly code = "INVALID_CARD_EXPIRY";
  readonly status = 422;

  constructor() {
    super(copy.invalidExpiry);
  }
}

/** Kayıtlı kart bulunamadı — VEYA başkasına ait (IDOR: iki durum aynı yanıt). */
export class SavedCardNotFoundError extends AppError {
  readonly code = "SAVED_CARD_NOT_FOUND";
  readonly status = 404;

  constructor() {
    super(copy.savedCardNotFound);
  }
}

/** Market/restoran siparişi için teslimat adresi seçilmedi (PRD §6.1). */
export class DeliveryAddressRequiredError extends AppError {
  readonly code = "DELIVERY_ADDRESS_REQUIRED";
  readonly status = 422;

  constructor() {
    super(copy.addressRequired);
  }
}

export class DeliverySlotRequiredError extends AppError {
  readonly code = "DELIVERY_SLOT_REQUIRED";
  readonly status = 422;

  constructor() {
    super(copy.slotRequired);
  }
}

/**
 * Ekranda gösterilen tutar ile sunucunun hesapladığı tutar tutmuyor.
 *
 * İstemci beklediği toplamı gönderiyor; sunucu kendi hesabıyla karşılaştırıp
 * ayrışma varsa DURUYOR. Bu bir güvenlik kontrolü DEĞİL (tutarı zaten sunucu
 * belirliyor), bir DÜRÜSTLÜK kontrolü: kullanıcı 250 TL yazan ekrana bakıp
 * onayladıysa 310 TL çekilmemeli. Sepet başka bir sekmede değişmiş olabilir.
 */
export class CartChangedError extends AppError {
  readonly code = "CART_CHANGED";
  readonly status = 409;

  constructor() {
    super(copy.cartChanged);
  }
}

/**
 * Aynı idempotency anahtarıyla ikinci ödeme denemesi.
 *
 * Çift tıklama, yeniden deneme veya ağ kopması sonrası tekrarlanan istek
 * İKİNCİ KEZ TAHSİLAT YAPAMAZ. Kontrol uygulamada değil veritabanında:
 * `payments.idempotency_key` benzersiz (data-model.md).
 */
export class DuplicatePaymentError extends AppError {
  readonly code = "DUPLICATE_PAYMENT";
  readonly status = 409;

  constructor() {
    super(copy.alreadyPaid);
  }
}

export class PaymentRateLimitedError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(copy.tooManyAttempts);
  }
}

/** Sahte sağlayıcıya ulaşılamadı — dış servis çökerse sayfa ayakta kalır. */
export class PaymentProviderUnavailableError extends AppError {
  readonly code = "PAYMENT_PROVIDER_UNAVAILABLE";
  readonly status = 503;

  constructor() {
    super(copy.providerUnavailable);
  }
}

/**
 * Ödeme isteği şemaya uymuyor.
 *
 * ⛔ ZOD'UN HATA AYRINTISI YANITA KONMUYOR. Diğer uçlarda bu bir "iç detay
 * sızdırma" meselesi; burada daha ağır: gövdede KART NUMARASI var ve Zod'un
 * ürettiği hata nesnesi girdinin parçalarını taşıyabiliyor. Tek tip, içerik
 * taşımayan bir mesaj dönülüyor.
 *
 * MESAJ "KART NUMARASI GEÇERSİZ" DEĞİL. Eskiden öyleydi ve fiilen yanılttı:
 * son kullanma alanlarını boş bırakan kullanıcıya kart numarasını kontrol
 * ettirdi, oysa numara doğruydu. Hangi alanın hatalı olduğunu söyleyemiyoruz
 * ama YANLIŞ alanı göstermemek elimizde.
 */
export class InvalidCheckoutRequestError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly status = 422;

  constructor() {
    super(copy.invalidRequest);
  }
}
