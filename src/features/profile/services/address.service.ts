import { ADDRESS_MAX_PER_USER } from "@/config/constants";
import { AddressLimitReachedError, AddressNotFoundError } from "@/features/profile/errors";
import {
  countAddresses,
  createAddress,
  listAddresses,
  softDeleteOwnedAddress,
  updateOwnedAddress,
  type AddressRow,
} from "@/features/profile/repositories/address.repository";
import type { AddressInput } from "@/features/profile/schemas/profile.schema";
import { enforceProfileWriteBudget } from "@/features/profile/services/write-budget";
import { recordAuditLog } from "@/lib/audit";
import { hashActorIp } from "@/lib/rate-limit";

/**
 * Teslimat adresi yönetimi — PRD §5.0 "Nüfus adresi ile teslimat adresi
 * ayrıdır; teslimat adresini kullanıcı kendi girer".
 *
 * İŞ KURALLARININ UYGULANDIĞI TEK YER. Kural route dosyasına yazılsaydı ikinci
 * bir çağıran eklendiğinde sessizce atlanırdı (01-architecture.md).
 *
 * "ŞİMDİ" DIŞARIDAN GELİR: hız sınırı penceresi ve silme damgası aynı ana göre
 * hesaplanır ve testler sahte saatle çalışabilir (06-testing.md).
 *
 * ⛔ HER FONKSİYON `userId` ALIYOR VE ONU DEPOYA GEÇİRİYOR. Sahiplik kontrolü
 * burada bir `if` değil, sorgunun `WHERE` koşulu — unutulabilecek bir adım yok.
 */

export type { AddressRow };

/** Kullanıcının kendi adresleri. Başkasınınkini isteyebileceği bir yüzey yok. */
export async function listUserAddresses(userId: string): Promise<AddressRow[]> {
  return listAddresses(userId);
}

export type AddressWriteInput = {
  /** Oturumdan gelir. İstemcinin gönderdiği bir değer ASLA buraya ulaşmaz. */
  userId: string;
  payload: AddressInput;
  actorIp: string;
  now: Date;
};

/**
 * Adres ekler.
 *
 * ═══ KONTROL SIRASI TESADÜF DEĞİL ═══
 *  1. Hız sınırı → en ucuz kapı, veritabanına sayım sorgusu bile atılmadan
 *  2. Üst sınır  → tabloyu tek hesabın şişirmesini engeller
 *  3. Yazma
 *  4. Denetim    → yazmanın DIŞINDA
 *
 * ⚠️ 2. ADIM BİR YARIŞA AÇIK: "önce say, sınırın altındaysa yaz" iki adımdır
 * ve aynı anda gelen iki istek ikisinde de sınırın altını görebilir. Bu
 * BİLİNÇLİ bir kabul: koltuk kilidi veya stok düşümünün aksine burada yarışın
 * bedeli, bir kullanıcının kendi hesabında 20 yerine 21 adres görmesi — para,
 * yer veya başkasının hakkı kaybolmuyor. Veritabanı seviyesinde kısıt kurmak
 * (sayaç kolonu + koşullu artırma) bu bedele değmez (YAGNI).
 */
export async function createUserAddress(input: AddressWriteInput): Promise<{ id: string }> {
  await enforceProfileWriteBudget(input.userId, input.now);

  const existing = await countAddresses(input.userId);

  if (existing >= ADDRESS_MAX_PER_USER) throw new AddressLimitReachedError(ADDRESS_MAX_PER_USER);

  const address = await createAddress({
    userId: input.userId,
    title: input.payload.title,
    fullAddress: input.payload.fullAddress,
    district: input.payload.district,
  });

  // Denetim kaydı yazmanın DIŞINDA: adres yazılamazsa kayıt da olmamalı,
  // yazıldıysa denetim kaydının başarısızlığı adresi geri almamalı.
  await recordAuditLog({
    userId: input.userId,
    action: "address_create",
    entityType: "address",
    entityId: address.id,
    ipHash: hashActorIp(input.actorIp),
  });

  return address;
}

/**
 * Adresi günceller — YALNIZCA SAHİBİ.
 *
 * ⚠️ BİLİNEN DAVRANIŞ: `orders.delivery_address_id` bu satırı gösteriyor,
 * yani adres düzeltilince geçmiş siparişin teslim adresi de değişmiş görünür.
 * Sipariş anında adresin bir kopyası ALINMIYOR (data-model.md'de böyle bir
 * alan yok). Bugün kullanıcıya görünür bir etkisi yok — sipariş ekranları
 * adresi çizmiyor — ama gerçek bir borç ve roadmap'e yazıldı.
 */
export async function updateUserAddress(
  input: AddressWriteInput & { addressId: string },
): Promise<void> {
  await enforceProfileWriteBudget(input.userId, input.now);

  const updated = await updateOwnedAddress({
    addressId: input.addressId,
    userId: input.userId,
    title: input.payload.title,
    fullAddress: input.payload.fullAddress,
    district: input.payload.district,
  });

  // 0 satır etkilendi: adres yok, başkasının ya da bu arada silinmiş.
  // Üçü de dışarıdan aynı görünür (`errors.ts`).
  if (!updated) throw new AddressNotFoundError();

  await recordAuditLog({
    userId: input.userId,
    action: "address_update",
    entityType: "address",
    entityId: input.addressId,
    ipHash: hashActorIp(input.actorIp),
  });
}

/**
 * Adresi siler — YUMUŞAK silme (`deletedAt`).
 *
 * Satır kalıyor çünkü geçmiş siparişler ona bağlı (`onDelete: Restrict`).
 * Kullanıcı açısından adres listeden çıkıyor; denetim ve sipariş geçmişi
 * bozulmuyor (data-model.md).
 */
export async function deleteUserAddress(input: {
  userId: string;
  addressId: string;
  actorIp: string;
  now: Date;
}): Promise<void> {
  await enforceProfileWriteBudget(input.userId, input.now);

  const deleted = await softDeleteOwnedAddress({
    addressId: input.addressId,
    userId: input.userId,
    deletedAt: input.now,
  });

  if (!deleted) throw new AddressNotFoundError();

  await recordAuditLog({
    userId: input.userId,
    action: "address_delete",
    entityType: "address",
    entityId: input.addressId,
    ipHash: hashActorIp(input.actorIp),
  });
}
