import { z } from "zod";

import {
  ADDRESS_DISTRICT_MAX_LENGTH,
  ADDRESS_DISTRICT_MIN_LENGTH,
  ADDRESS_FULL_MAX_LENGTH,
  ADDRESS_FULL_MIN_LENGTH,
  ADDRESS_TITLE_MAX_LENGTH,
  ADDRESS_TITLE_MIN_LENGTH,
} from "@/config/constants";
import { messages } from "@/config/messages";

/**
 * Profil uçlarının girdi şemaları (03-api-guidelines.md: her uç Zod ile
 * doğrulanır — istemciye asla güvenilmez).
 *
 * ⛔ `userId` HİÇBİR ŞEMADA YOK ve olmayacak. Kimlik oturumdan geliyor;
 * istemci gövdeye kullanıcı kimliği yazsa bile şema onu sonuca taşımadığı için
 * başkasının adına kayıt üretilemez (05-auth-security.md → IDOR).
 *
 * ⛔ `deletedAt`, `createdAt` GİBİ ALANLAR DA YOK: istemci bir kaydın
 * silinmişlik durumunu veya tarihini belirleyemez.
 */

const copy = messages.profile.errors;

/**
 * Adres gövdesi — ekleme ve düzenlemede AYNI şema.
 *
 * Düzenleme için ayrı bir "kısmi" şema YAZILMADI: form üç alanı da her zaman
 * gönderiyor ve alanların hepsi zorunlu. Kısmi şema, tek alanı boş gönderen
 * bir istemcinin adresi sessizce yarım bırakmasına izin verirdi.
 */
export const addressInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(ADDRESS_TITLE_MIN_LENGTH, { error: copy.invalidTitle })
    .max(ADDRESS_TITLE_MAX_LENGTH, { error: copy.invalidTitle }),
  fullAddress: z
    .string()
    .trim()
    .min(ADDRESS_FULL_MIN_LENGTH, { error: copy.invalidFullAddress })
    .max(ADDRESS_FULL_MAX_LENGTH, { error: copy.invalidFullAddress }),
  district: z
    .string()
    .trim()
    .min(ADDRESS_DISTRICT_MIN_LENGTH, { error: copy.invalidDistrict })
    .max(ADDRESS_DISTRICT_MAX_LENGTH, { error: copy.invalidDistrict }),
});

export type AddressInput = z.infer<typeof addressInputSchema>;

/**
 * Yol parametreleri de GİRDİDİR ve doğrulanır (03-api-guidelines.md).
 *
 * Üst sınır 128: kimlikler `cuid()` (25 karakter). Sınır, uzun bir yol
 * parçasının veritabanı sorgusuna kadar gitmesini engelliyor.
 */
export const addressIdSchema = z.object({
  addressId: z.string().trim().min(1).max(128),
});

export const savedCardIdSchema = z.object({
  savedCardId: z.string().trim().min(1).max(128),
});
