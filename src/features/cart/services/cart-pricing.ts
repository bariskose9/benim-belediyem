import {
  MARKET_DELIVERY_FEE_KURUS,
  MARKET_FREE_DELIVERY_THRESHOLD_KURUS,
  RESTAURANT_DELIVERY_FEE_KURUS,
  RESTAURANT_FREE_DELIVERY_THRESHOLD_KURUS,
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
 * Modül başına teslimat kuralı. `null` = o modül hiç teslim edilmiyor.
 *
 * TABLO HÂLİNDE ÇÜNKÜ KURAL AYNI, SAYILAR FARKLI: market ve restoran ikisi de
 * "sabit ücret, eşik üstü ücretsiz" mantığıyla çalışıyor. İki ayrı `if` dalı
 * yazılsaydı üçüncü modül geldiğinde üçüncü dal yazılır ve biri eşik
 * kontrolünü unutmuş olurdu.
 */
const DELIVERY_RULES: Readonly<
  Record<CartItemType, { feeKurus: number; freeThresholdKurus: number } | null>
> = {
  market: {
    feeKurus: MARKET_DELIVERY_FEE_KURUS,
    freeThresholdKurus: MARKET_FREE_DELIVERY_THRESHOLD_KURUS,
  },
  restaurant: {
    feeKurus: RESTAURANT_DELIVERY_FEE_KURUS,
    freeThresholdKurus: RESTAURANT_FREE_DELIVERY_THRESHOLD_KURUS,
  },
  // Bilet teslim edilmediği için ücreti yoktur — sıfır değil, "hiç yok"tur;
  // ekran o satırı da göstermez.
  event: null,
};

/**
 * Bir modülün teslimat ücreti.
 *
 * EŞİK YALNIZCA O MODÜLÜN TUTARINA BAKAR (PRD §6.1). Sepetin tamamına
 * bakılsaydı, restoran siparişi ekleyerek market teslimatı bedavaya
 * getirilebilirdi.
 */
export function deliveryFeeKurus(itemType: CartItemType, subtotalKurus: number): number {
  if (subtotalKurus <= 0) return 0;

  const rule = DELIVERY_RULES[itemType];

  if (!rule) return 0;

  return subtotalKurus >= rule.freeThresholdKurus ? 0 : rule.feeKurus;
}

/** Ücretsiz teslimata kalan tutar; teslimat yoksa veya eşik aşıldıysa `null`. */
function freeDeliveryRemainingKurus(itemType: CartItemType, subtotalKurus: number): number | null {
  const rule = DELIVERY_RULES[itemType];

  if (!rule) return null;
  if (subtotalKurus <= 0) return null;
  if (subtotalKurus >= rule.freeThresholdKurus) return null;

  return rule.freeThresholdKurus - subtotalKurus;
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
