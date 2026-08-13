import {
  addressIdSchema,
  addressInputSchema,
  savedCardIdSchema,
} from "@/features/profile/schemas/profile.schema";
import type { ApiOperation } from "@/features/api-docs/types";

/** Adres, kayıtlı kart ve bildirim uçları (adım 18b). */

const TAG_PROFILE = "Profil";
const TAG_NOTIFICATIONS = "Bildirimler";

/**
 * ⛔ ADRES VE KART İÇİN `GET` UCU BİLEREK YOK.
 *
 * Listeleri sayfa SUNUCUDA okuyor; HTTP üzerinden döndüren bir uca ihtiyaç yok.
 * Açık duran her uç bakılması, test edilmesi ve korunması gereken bir yüzeydir
 * (CLAUDE.md §5.2 YAGNI). Mobil uygulama (adım 19) gerektirdiğinde kendi
 * testiyle birlikte eklenir.
 */
export const profileOperations: ApiOperation[] = [
  {
    path: "/api/v1/addresses",
    method: "post",
    tag: TAG_PROFILE,
    summary: "Teslimat adresi ekler.",
    description: "⛔ `userId` gövdeden okunmaz, oturumdan gelir — şemada böyle bir alan yoktur.",
    access: "authenticated",
    requestBody: { schema: addressInputSchema },
    success: { status: 201, description: "Oluşturulan adresin kimliği." },
    errors: ["ADDRESS_LIMIT_REACHED"],
    rateLimited: true,
  },
  {
    path: "/api/v1/addresses/{addressId}",
    method: "patch",
    tag: TAG_PROFILE,
    summary: "Teslimat adresini günceller.",
    access: "authenticated",
    pathParams: [
      { name: "addressId", description: "Adres kimliği.", schema: addressIdSchema.shape.addressId },
    ],
    requestBody: { schema: addressInputSchema },
    success: { status: 204, description: "Adres güncellendi." },
    errors: ["ADDRESS_NOT_FOUND"],
    rateLimited: true,
  },
  {
    path: "/api/v1/addresses/{addressId}",
    method: "delete",
    tag: TAG_PROFILE,
    summary: "Teslimat adresini siler.",
    access: "authenticated",
    pathParams: [
      { name: "addressId", description: "Adres kimliği.", schema: addressIdSchema.shape.addressId },
    ],
    success: { status: 204, description: "Adres silindi." },
    errors: ["ADDRESS_NOT_FOUND"],
    rateLimited: true,
  },
  {
    path: "/api/v1/saved-cards/{savedCardId}",
    method: "delete",
    tag: TAG_PROFILE,
    summary: "Kayıtlı kartı kaldırır.",
    description:
      "Kart numarası hiçbir zaman saklanmadı — kayıtta yalnızca son 4 hane ve sahte işlem kimliği var.",
    access: "authenticated",
    pathParams: [
      {
        name: "savedCardId",
        description: "Kayıtlı kart kimliği.",
        schema: savedCardIdSchema.shape.savedCardId,
      },
    ],
    success: { status: 204, description: "Kart kaldırıldı." },
    errors: ["SAVED_CARD_NOT_FOUND"],
    rateLimited: true,
  },
  {
    path: "/api/v1/notifications",
    method: "patch",
    tag: TAG_NOTIFICATIONS,
    summary: "Kullanıcının okunmamış bildirimlerinin tamamını okundu işaretler.",
    description: "Gövde almaz: işlem tek anlamlıdır ve hedefi oturumdan belirlenir.",
    access: "authenticated",
    success: { status: 200, description: "Okundu işaretlenen bildirim sayısı (`updated`)." },
    errors: [],
  },
];
