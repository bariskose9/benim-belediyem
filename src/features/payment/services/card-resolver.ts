import {
  InvalidCardExpiryError,
  InvalidCardNumberError,
  SavedCardNotFoundError,
} from "@/features/payment/errors";
import { findOwnedSavedCard } from "@/features/payment/repositories/payment.repository";
import type { CheckoutCardPayload } from "@/features/payment/schemas/checkout.schema";
import {
  detectCardBrand,
  isExpired,
  isValidLuhn,
  lastFourDigits,
  normalizeCardNumber,
} from "@/features/payment/services/card-rules";
import type { CardBrand } from "@/generated/prisma/enums";

/**
 * "Hangi kartla ödenecek" sorusunu tek bir şekle indirger.
 *
 * İki giriş yolu var — yeni kart ve kayıtlı kart — ama ödeme servisinin
 * ikisini ayrı ayrı bilmesine gerek yok. Bu dosya farkı burada kapatıyor;
 * `checkout.service.ts` yalnızca `ResolvedCard` görüyor.
 *
 * ⛔ `cardNumber` ALANI YALNIZCA SAĞLAYICIYA GİDER. Veritabanına yazan
 * `payment.repository.ts` bu alanı hiç almıyor (imzasında yok), dolayısıyla
 * yanlışlıkla saklanması mümkün değil.
 */
export type ResolvedCard = {
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string;
  /** Kayıtlı kartla ödendiyse o kartın kimliği, yeni kartsa `null`. */
  savedCardId: string | null;
  /** "Kartımı kaydet" işaretlendiyse `true` (yalnızca yeni kartta anlamlı). */
  shouldSave: boolean;
  /**
   * Sahte sağlayıcıya verilecek numara.
   *
   * Kayıtlı kartta `null`: numara zaten hiç saklanmadı, dolayısıyla
   * gösterilemez. Sağlayıcı o durumda varsayılan "başarılı" yolunu izler —
   * gerçek bir entegrasyonda bunun karşılığı sağlayıcıdaki kart jetonudur.
   */
  cardNumber: string | null;
};

export async function resolveCard(input: {
  userId: string;
  card: CheckoutCardPayload;
  now: Date;
}): Promise<ResolvedCard> {
  if (input.card.kind === "saved") {
    const saved = await findOwnedSavedCard({
      savedCardId: input.card.savedCardId,
      userId: input.userId,
    });

    // Başkasının kartı "bulunamadı" ile AYNI yanıtı alır (IDOR).
    if (!saved) throw new SavedCardNotFoundError();
    if (isExpired(saved.expMonth, saved.expYear, input.now)) throw new InvalidCardExpiryError();

    return {
      brand: saved.brand,
      last4: saved.last4,
      expMonth: saved.expMonth,
      expYear: saved.expYear,
      holderName: "",
      savedCardId: saved.id,
      shouldSave: false,
      cardNumber: null,
    };
  }

  const number = normalizeCardNumber(input.card.number);

  if (!isValidLuhn(number)) throw new InvalidCardNumberError();

  const brand = detectCardBrand(number);

  // Marka tanınmıyorsa reddediliyor: şemada yalnızca Visa ve Mastercard var
  // ve yanlış marka etiketiyle kart kaydetmek kullanıcıyı yanıltırdı.
  if (!brand) throw new InvalidCardNumberError();

  if (isExpired(input.card.expMonth, input.card.expYear, input.now)) {
    throw new InvalidCardExpiryError();
  }

  return {
    brand,
    last4: lastFourDigits(number),
    expMonth: input.card.expMonth,
    expYear: input.card.expYear,
    holderName: input.card.holderName,
    savedCardId: null,
    shouldSave: input.card.save,
    cardNumber: number,
  };
}
