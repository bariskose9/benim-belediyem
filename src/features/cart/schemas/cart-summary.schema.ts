import { z } from "zod";

import type { CartLine, CartSection, CartSummary } from "@/features/cart/types";
import { CartItemType } from "@/generated/prisma/enums";
import { kurusSchema } from "@/lib/money-schema";

/**
 * Sepet özetinin YANIT sözleşmesi (borç #107 · adım 107c · ADR-021).
 *
 * NEREDEN : src/features/cart/services/cart.service.ts → `CartSummary` (uygulama içi biçim; `holdExpiresAt` bir `Date`)
 * NE      : Tel biçiminin Zod şeması + `toCartSummaryResponse` çevirmeni (alan alan; `Date` → ISO metin)
 * NEREYE  : src/app/api/v1/carts/current/items/route.ts · src/app/api/v1/carts/current/items/[itemId]/route.ts
 *           → `created`/`ok` gövdesi · src/features/api-docs/registry/commerce.ts → `success.body.schema`
 * SONUÇ   : Üç sepet ucunun `{ data }` gövdesi; `/api/docs`'ta sepet özetinin tam şeması (belge = gerçek)
 * KAYNAK  : ADR-021 · docs/project/PRD.md → "4. Ortak özellikler" (ortak sepet)
 *           · docs/standards/03-api-guidelines.md → "Yanıt gövdesi de belgelenir"
 * NEDEN   : Aşağıda — tel biçimi uygulama içi biçimden farklı ve derleme bunu göremiyor
 * DİKKAT  : `cart/types.ts`'e eklenen alan buraya KENDİLİĞİNDEN yansımaz (bilerek) — API'ye çıkacaksa
 *           şema + çevirmen birlikte değişir; tests/unit/cart-summary-response.test.ts sızıntı deneyi bunu ölçüyor
 *
 * Üç sepet ucu da (ekle · adet/not değiştir · çıkar) aynı gövdeyi döndürüyor:
 * güncel sepet özeti. Şema hem route'un `ok()`/`created()` çağrısında hem API
 * belgesinde KULLANILIYOR — ikisi aynı nesne, elle yazılmış ikinci bir tarif
 * yok. Sepetin girdi şemaları ödeme modülünde (`checkout.schema.ts`); yanıt
 * şeması sepetin kendi tipini (`cart/types.ts`) tarif ettiği için burada.
 *
 * ⛔ TEL BİÇİMİ ≠ UYGULAMA İÇİ BİÇİM. `CartSummary` bir `Date` taşıyor
 * (`holdExpiresAt`); telde yalnızca metin gider. Derleme bu farkı göremez
 * (ADR-021'in ilk dersi), bu yüzden sınır `toCartSummaryResponse` ile AÇIKÇA
 * geçiliyor ve çalışma anı kontrolü gövdeyi telden geçmiş hâliyle doğruluyor.
 *
 * ⛔ Tarihler `z.iso.datetime()`, para `kurusSchema` (tam sayı kuruş), şemada
 * `.transform()` YOK — üçü de `tests/unit/api-docs-response.test.ts` kapıları.
 */

// cartLineResponseSchema (sepet satırı yanıt şeması) — bir kalem: ürün, adet, fiyat, stok durumu.
export const cartLineResponseSchema = z.object({
  id: z.string(),
  itemType: z.enum(CartItemType),
  refId: z
    .string()
    .describe(
      "İşaret ettiği katalog kaydının kimliği. Bilet satırında koltuk rezervasyonunun kimliğidir, etkinliğin değil.",
    ),
  quantity: z.int().min(1),
  unitPriceKurus: kurusSchema,
  note: z.string().nullable().describe("Mutfak notu; yalnızca restoran satırında dolu olabilir."),
  name: z.string(),
  imageUrl: z.string().nullable(),
  isPurchasable: z
    .boolean()
    .describe(
      "Satır hâlâ satın alınabilir mi. Stok bitmiş ya da ürün satıştan kalkmışsa false; satır sepette KALIR, ekran uyarı gösterir.",
    ),
  availableStock: z
    .int()
    .min(0)
    .nullable()
    .describe("Kalan stok. null = stok takibi yok (restoran kalemi). Bilet satırında her zaman 1."),
  holdExpiresAt: z.iso
    .datetime()
    .nullable()
    .describe(
      "Koltuk kilidinin bittiği an; yalnızca bilet satırında dolu. Süre sepette UZAMAZ — koltuk seçildiği anda belirlenmiştir.",
    ),
});

// cartSectionResponseSchema (sepet bölümü yanıt şeması) — bir modülün satırları ve ara toplamı.
export const cartSectionResponseSchema = z.object({
  itemType: z.enum(CartItemType),
  lines: z.array(cartLineResponseSchema),
  subtotalKurus: kurusSchema,
  deliveryFeeKurus: kurusSchema.describe(
    "Bu modülün teslimat ücreti — ücret modül başına hesaplanır.",
  ),
  freeDeliveryRemainingKurus: kurusSchema
    .nullable()
    .describe("Ücretsiz teslimat eşiğine kalan tutar; eşik yoksa veya aşıldıysa null."),
});

// cartSummaryResponseSchema (sepet özeti yanıt şeması) — üç sepet ucunun döndürdüğü gövde.
export const cartSummaryResponseSchema = z.object({
  cartId: z
    .string()
    .describe(
      "Bilgi amaçlı. Hiçbir uç bu kimliği adreste almaz; sepet her zaman isteği atanın sepetidir.",
    ),
  sections: z
    .array(cartSectionResponseSchema)
    .describe("Modül başına bir bölüm (market · restoran · etkinlik)."),
  subtotalKurus: kurusSchema,
  deliveryFeeKurus: kurusSchema,
  totalKurus: kurusSchema,
  lineCount: z.int().min(0),
  hasBlockedLines: z
    .boolean()
    .describe("Satın alınamaz satır varsa true — bu durumda ödeme başlatılamaz."),
});

export type CartSummaryResponse = z.infer<typeof cartSummaryResponseSchema>;

/**
 * Uygulama içi sepet özetini TEL biçimine çevirir.
 *
 * ⛔ ALANLAR TEK TEK SAYILIYOR, `...spread` KULLANILMIYOR — ve bu bilinçli.
 * Spread, sepet satırına ileride iç kullanım için eklenecek bir alanı (maliyet,
 * tedarikçi kodu…) belgeye yazılmadan API'ye taşırdı; belge "yok" derken telde
 * "var" olurdu. Tek tek sayınca yeni bir alan ancak biri bilerek hem şemaya hem
 * buraya yazınca dışarı çıkar. `tests/unit/cart-summary-response.test.ts`
 * bunu bir sızıntı deneyiyle ölçüyor.
 */
// toCartSummaryResponse (sepet özetini tel biçimine çevir) — CartSummary (uygulama içi özet) → CartSummaryResponse (telde giden gövde).
export function toCartSummaryResponse(summary: CartSummary): CartSummaryResponse {
  return {
    cartId: summary.cartId,
    sections: summary.sections.map(toSectionResponse),
    subtotalKurus: summary.subtotalKurus,
    deliveryFeeKurus: summary.deliveryFeeKurus,
    totalKurus: summary.totalKurus,
    lineCount: summary.lineCount,
    hasBlockedLines: summary.hasBlockedLines,
  };
}

function toSectionResponse(section: CartSection): CartSummaryResponse["sections"][number] {
  return {
    itemType: section.itemType,
    lines: section.lines.map(toLineResponse),
    subtotalKurus: section.subtotalKurus,
    deliveryFeeKurus: section.deliveryFeeKurus,
    freeDeliveryRemainingKurus: section.freeDeliveryRemainingKurus,
  };
}

function toLineResponse(line: CartLine): CartSummaryResponse["sections"][number]["lines"][number] {
  return {
    id: line.id,
    itemType: line.itemType,
    refId: line.refId,
    quantity: line.quantity,
    unitPriceKurus: line.unitPriceKurus,
    note: line.note,
    name: line.name,
    imageUrl: line.imageUrl,
    isPurchasable: line.isPurchasable,
    availableStock: line.availableStock,
    // Tek dönüşüm burada: `Date` → ISO metin. Tel zaten bunu yapardı (`toJSON`),
    // ama tipin de gerçeği söylemesi için sınır açıkça geçiliyor.
    holdExpiresAt: line.holdExpiresAt?.toISOString() ?? null,
  };
}
