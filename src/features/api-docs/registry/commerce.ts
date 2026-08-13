import { z } from "zod";

import {
  cancelMembershipSchema,
  createMembershipSchema,
  updateMembershipSchema,
} from "@/features/gym/schemas/membership.schema";
import { orderIdSchema } from "@/features/orders/schemas/order.schema";
import {
  addCartItemSchema,
  checkoutSchema,
  updateCartItemSchema,
} from "@/features/payment/schemas/checkout.schema";
import type { ApiOperation } from "@/features/api-docs/types";

/** Sepet, ödeme, sipariş ve üyelik uçları (adım 18b). */

/**
 * ⚠️ BELGELEME SIRASINDA BULUNDU — teknik borç #106.
 *
 * `03-api-guidelines.md` "her endpoint girişi (body, query, **params**) Zod ile
 * doğrulanır, istisna yok" diyor. Sepet kalemi ve üyelik uçlarında yol
 * parametresi bir şemadan GEÇMİYOR: ham metin olarak servise gidiyor.
 *
 * Belge bunu gizlemiyor. Bugün pratik risk düşük çünkü değer parametreli
 * sorguya bağlanıyor ve sahiplik kontrolü ayrıca yapılıyor — ama kural ihlali
 * gerçek ve belgede görünür olması, düzeltilmesini kolaylaştırır.
 */
const UNVALIDATED_PATH_PARAM =
  "Kayıt kimliği. ⚠️ Bu parametre bugün Zod şemasından GEÇMİYOR (teknik borç #106).";

const TAG_CART = "Sepet";
const TAG_PAYMENT = "Ödeme ve sipariş";
const TAG_MEMBERSHIP = "Spor salonu üyeliği";

/**
 * ⚠️ SEPET UÇLARI GİRİŞ İSTEMİYOR ve bu bilinçli: ziyaretçi de sepet
 * kurabiliyor. Sahiplik anonim çerez kimliğinden (`bb_anon`) belirleniyor,
 * gövdeden gelen hiçbir kimlikten değil.
 */
export const commerceOperations: ApiOperation[] = [
  {
    path: "/api/v1/carts/current/items",
    method: "post",
    tag: TAG_CART,
    summary: "Sepete ürün ekler.",
    description: "Fiyat İSTEMCİDEN ALINMAZ — sunucuda katalogdan okunur ve tam sayı kuruş tutulur.",
    access: "public",
    requestBody: { schema: addCartItemSchema },
    success: { status: 201, description: "Güncel sepet özeti (kalemler, ara toplam, toplam)." },
    errors: [
      "CART_ITEM_NOT_FOUND",
      "OUT_OF_STOCK",
      "ITEM_UNAVAILABLE",
      "QUANTITY_TOO_HIGH",
      "CART_TOO_LARGE",
    ],
    rateLimited: true,
  },
  {
    path: "/api/v1/carts/current/items/{itemId}",
    method: "patch",
    tag: TAG_CART,
    summary: "Sepet kaleminin adedini değiştirir.",
    access: "public",
    pathParams: [{ name: "itemId", description: UNVALIDATED_PATH_PARAM, schema: z.string() }],
    requestBody: { schema: updateCartItemSchema },
    success: { status: 200, description: "Güncel sepet özeti." },
    errors: ["CART_ITEM_NOT_FOUND", "OUT_OF_STOCK", "QUANTITY_TOO_HIGH"],
    rateLimited: true,
  },
  {
    path: "/api/v1/carts/current/items/{itemId}",
    method: "delete",
    tag: TAG_CART,
    summary: "Sepet kalemini çıkarır.",
    access: "public",
    pathParams: [{ name: "itemId", description: UNVALIDATED_PATH_PARAM, schema: z.string() }],
    success: { status: 200, description: "Güncel sepet özeti." },
    errors: ["CART_ITEM_NOT_FOUND"],
    rateLimited: true,
  },

  {
    path: "/api/v1/payments",
    method: "post",
    tag: TAG_PAYMENT,
    summary: "Sepeti siparişe çevirir ve sahte ödemeyi alır.",
    description:
      "⛔ TUTAR İSTEMCİDEN ALINMAZ: sunucuda sepetten yeniden hesaplanır. Ekranda görülen tutar " +
      "ile hesaplanan tutar farklıysa `CART_CHANGED` döner. Kart numarası veritabanına YAZILMAZ — " +
      "yalnızca son 4 hane ve sahte işlem kimliği saklanır. Aynı istek iki kez gelirse " +
      "`DUPLICATE_PAYMENT` ile elenir (idempotency).",
    access: "authenticated",
    requestBody: { schema: checkoutSchema },
    success: { status: 201, description: "Oluşturulan siparişin kimliği ve ödeme sonucu." },
    errors: [
      "CART_EMPTY",
      "CART_CHANGED",
      "OUT_OF_STOCK",
      "ITEM_UNAVAILABLE",
      "DELIVERY_ADDRESS_REQUIRED",
      "DELIVERY_SLOT_REQUIRED",
      "INVALID_CARD_NUMBER",
      "INVALID_CARD_EXPIRY",
      "PAYMENT_DECLINED",
      "INSUFFICIENT_FUNDS",
      "DUPLICATE_PAYMENT",
      "PAYMENT_PROVIDER_UNAVAILABLE",
    ],
    rateLimited: true,
  },
  {
    path: "/api/v1/orders/{id}",
    method: "delete",
    tag: TAG_PAYMENT,
    summary: "Siparişi iptal eder.",
    description:
      "⭐ Sipariş durumu KOLONDA TUTULMAZ, okuma anında zamandan türetilir (ADR-013). " +
      "Bu yüzden iptal penceresi 'şu an' hesaplanır: restoranda 10, markette 20 dakika.",
    access: "authenticated",
    pathParams: [{ name: "id", description: "Sipariş kimliği.", schema: orderIdSchema.shape.id }],
    success: { status: 204, description: "Sipariş iptal edildi ve iade kaydı açıldı." },
    errors: ["ORDER_NOT_FOUND", "ORDER_ALREADY_CANCELLED", "ORDER_NOT_CANCELLABLE"],
    rateLimited: true,
  },

  {
    path: "/api/v1/memberships",
    method: "post",
    tag: TAG_MEMBERSHIP,
    summary: "Yeni üyelik başlatır.",
    description:
      "⛔ Yalnızca kurum personeline açıktır. Bitiş tarihi TAKVİM AYI eklenerek bulunur, " +
      "30 gün eklenerek değil.",
    access: "staff",
    requestBody: { schema: createMembershipSchema },
    success: { status: 201, description: "Oluşturulan üyeliğin kimliği ve bitiş tarihi." },
    errors: [
      "ALREADY_MEMBER",
      "MEMBERSHIP_PLAN_NOT_FOUND",
      "MEMBERSHIP_CARD_REQUIRED",
      "PAYMENT_DECLINED",
      "INSUFFICIENT_FUNDS",
      "PAYMENT_PROVIDER_UNAVAILABLE",
    ],
    rateLimited: true,
  },
  {
    path: "/api/v1/memberships/{membershipId}",
    method: "patch",
    tag: TAG_MEMBERSHIP,
    summary: "Üyelik planını değiştirir.",
    access: "staff",
    pathParams: [{ name: "membershipId", description: UNVALIDATED_PATH_PARAM, schema: z.string() }],
    requestBody: { schema: updateMembershipSchema },
    success: { status: 200, description: "Güncellenen üyeliğin yeni planı ve bitiş tarihi." },
    errors: [
      "MEMBERSHIP_NOT_FOUND",
      "MEMBERSHIP_PLAN_NOT_FOUND",
      "SAME_PLAN",
      "NO_ACTIVE_MEMBERSHIP",
      "PAYMENT_DECLINED",
      "INSUFFICIENT_FUNDS",
    ],
    rateLimited: true,
  },
  {
    path: "/api/v1/memberships/{membershipId}",
    method: "delete",
    tag: TAG_MEMBERSHIP,
    summary: "Üyeliği sonlandırır.",
    description: "Erken çıkış bedeli ekranda görülenden farklıysa reddedilir — onay yenilenmeli.",
    access: "staff",
    pathParams: [{ name: "membershipId", description: UNVALIDATED_PATH_PARAM, schema: z.string() }],
    requestBody: { schema: cancelMembershipSchema },
    success: { status: 200, description: "Sonlandırılan üyeliğin son durumu." },
    errors: ["MEMBERSHIP_NOT_FOUND", "NO_ACTIVE_MEMBERSHIP", "EARLY_EXIT_FEE_CHANGED"],
    rateLimited: true,
  },
];
