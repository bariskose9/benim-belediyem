import { z } from "zod";

/**
 * Para alanının Zod şeması — TAM SAYI KURUŞ (borç #107 · adım 107c).
 *
 * NEREDEN : src/lib/money.ts → kural: uygulama içinde para tam sayı kuruş (veri girdisi yok)
 * NE      : Belgeye ve çalışma anı kontrolüne giren para şeması — `integer`, sıfır ve üzeri, açıklamalı
 * NEREYE  : src/features/cart/schemas/cart-summary.schema.ts · src/features/payment/schemas/checkout.schema.ts
 *           · src/features/gym/schemas/membership.schema.ts → yanıt şemalarındaki her `…Kurus` alanı
 * SONUÇ   : `/api/docs` belgesinde para alanları `"type": "integer"` + "Tam sayı kuruş" açıklamasıyla görünür
 * KAYNAK  : ADR-021 · docs/standards/03-api-guidelines.md → "Yanıt gövdesi de belgelenir"
 *           · docs/project/data-model.md → para alanları (Decimal(10,2), float yok)
 * NEDEN   : Aşağıda — `z.number()` belgeye "ondalık olabilir" yazardı
 * DİKKAT  : tests/unit/api-docs-response.test.ts → "para alanları belgede tam sayı" kapısı bu şemayı ölçüyor;
 *           `nonnegative()` gevşetilmez, eksi tutar gerekirse ayrı şema açılır
 *
 * ⛔ NEDEN `z.int()`, `z.number()` DEĞİL. İkisi de TypeScript'te `number`;
 * derleme farkı görmez. Fark BELGEDE çıkıyor: `z.number()` JSON Schema'ya
 * `"type": "number"` yazar, yani "ondalık olabilir". Belgeden tip üreten bir
 * mobil istemci (adım 19) `45900`'ü `45.900 TL` sanabilir ya da tersine —
 * tutarı ondalık gönderir. `z.int()` ise `"type": "integer"` yazar ve tek yorum
 * kalır. Kural yorumda değil kapıda: `tests/unit/api-docs-response.test.ts`
 * adı `Kurus` ile biten her alanın belgede `integer` olduğunu ölçüyor.
 *
 * ⚠️ NEDEN `money.ts` İÇİNDE DEĞİL. `money.ts` beş istemci bileşeninden
 * (`formatTry`) içe aktarılıyor; oraya `zod` girse her sayfanın tarayıcı
 * paketine girerdi ve `tests/quality` bütçesini boşuna şişirirdi. Şema
 * yalnızca sunucu tarafında (route + belge) okunuyor.
 *
 * `nonnegative()`: bu projede telde giden hiçbir tutar eksi değil — iade ayrı bir
 * kayıt, fark ayrı bir alan. Eksi tutar bir gün gerekirse ayrı bir şema olur;
 * bu şema gevşetilmez.
 */
// kurusSchema (kuruş şeması) — 02-coding-standards.md → "Para" bölümündeki
// kanonik biçim: `z.int().nonnegative().describe("Tam sayı KURUŞ — 1250 = 12,50 TL")`.
export const kurusSchema = z
  .int()
  .nonnegative()
  .describe("Tam sayı KURUŞ — 1250 = 12,50 TL. Ondalık DEĞİL.");
