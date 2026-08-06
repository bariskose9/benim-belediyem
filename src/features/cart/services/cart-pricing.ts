import {
  MARKET_DELIVERY_FEE_KURUS,
  MARKET_FREE_DELIVERY_THRESHOLD_KURUS,
  RESTAURANT_DELIVERY_FEE_KURUS,
} from "@/config/constants";
import type { CartLine, CartSection, CartSummary } from "@/features/cart/types";
import type { CartItemType } from "@/generated/prisma/enums";
import { lineTotalKurus, sumKurus } from "@/lib/money";

/**
 * Sepet tutarlarının hesabı — SAF FONKSİYONLAR (PRD §6.1).
 *
 * Veritabanı ve HTTP bilmez. Hem `/sepet` ekranı hem ödeme servisi BURAYI
 * çağırır; iki yerde ayrı ayrı hesaplansaydı ekranda görünen tutarla tahsil
 * edilen tutarın ayrışması an meselesiydi — parada kabul edilemez bir hata.
 *
 * ⛔ TUTAR İSTEMCİDEN ALINMAZ. Ödeme servisi toplamı yine buradan hesaplar;
 * istemcinin gönderdiği bir tutar olsaydı bile yok sayılırdı
 * (data-model.md → "İstemciden gelen price ... reddedilir").
 */

/** Modüllerin ekranda ve hesapta görünme sırası. */
const SECTION_ORDER: readonly CartItemType[] = ["market", "restaurant", "event"];

/**
 * Bir modülün teslimat ücreti.
 *
 * EŞİK YALNIZCA O MODÜLÜN TUTARINA BAKAR (PRD §6.1). Sepetin tamamına
 * bakılsaydı, restoran siparişi ekleyerek market teslimatı bedavaya
 * getirilebilirdi.
 *
 * Bilet teslim edilmediği için ücreti yoktur — sıfır değil, "hiç yok"tur;
 * ekran o satırı da göstermez.
 */
export function deliveryFeeKurus(itemType: CartItemType, subtotalKurus: number): number {
  if (subtotalKurus <= 0) return 0;

  switch (itemType) {
    case "market":
      return subtotalKurus >= MARKET_FREE_DELIVERY_THRESHOLD_KURUS ? 0 : MARKET_DELIVERY_FEE_KURUS;
    case "restaurant":
      return RESTAURANT_DELIVERY_FEE_KURUS;
    case "event":
      return 0;
  }
}

/** Ücretsiz teslimata kalan tutar; eşik yoksa veya aşıldıysa `null`. */
function freeDeliveryRemainingKurus(itemType: CartItemType, subtotalKurus: number): number | null {
  if (itemType !== "market") return null;
  if (subtotalKurus <= 0) return null;
  if (subtotalKurus >= MARKET_FREE_DELIVERY_THRESHOLD_KURUS) return null;

  return MARKET_FREE_DELIVERY_THRESHOLD_KURUS - subtotalKurus;
}

/**
 * Satırları modüllere böler ve tutarları hesaplar.
 *
 * Boş modül bölümü DÖNMEZ: ekranda "Belediye Restoran (boş)" başlığı
 * göstermenin kullanıcıya faydası yok.
 */
export function summarizeCart(cartId: string, lines: readonly CartLine[]): CartSummary {
  const sections: CartSection[] = [];

  for (const itemType of SECTION_ORDER) {
    const sectionLines = lines.filter((line) => line.itemType === itemType);

    if (sectionLines.length === 0) continue;

    const subtotalKurus = sumKurus(
      sectionLines.map((line) => lineTotalKurus(line.unitPriceKurus, line.quantity)),
    );

    sections.push({
      itemType,
      lines: sectionLines,
      subtotalKurus,
      deliveryFeeKurus: deliveryFeeKurus(itemType, subtotalKurus),
      freeDeliveryRemainingKurus: freeDeliveryRemainingKurus(itemType, subtotalKurus),
    });
  }

  const subtotalKurus = sumKurus(sections.map((section) => section.subtotalKurus));
  const feeKurus = sumKurus(sections.map((section) => section.deliveryFeeKurus));

  return {
    cartId,
    sections,
    subtotalKurus,
    deliveryFeeKurus: feeKurus,
    totalKurus: subtotalKurus + feeKurus,
    lineCount: lines.length,
    hasBlockedLines: lines.some((line) => !line.isPurchasable),
  };
}
