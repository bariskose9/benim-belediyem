import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/**
 * Teslimat adresleri — `addresses` tablosuna dokunan TEK yer.
 *
 * NEDEN PROFİL ÖZELLİĞİNDE, ÖDEMEDE DEĞİL: adres kullanıcıya ait bir kayıt,
 * bir ödeme detayı değil. Adım 7'de bu fonksiyonlar `payment.repository.ts`
 * içindeydi çünkü tek çağıran ödeme ekranıydı; adım 15'te ikinci çağıran
 * (profil) gelince ait oldukları yere taşındılar. Ödeme artık buradan okuyor —
 * "sepeti teslim edeceğim adres" bir profil kaydına yapılan başvurudur.
 *
 * ⛔ HER SORGUDA `userId` VAR ve bu tesadüf değil: adres kişisel veri, yani
 * "önce getir, sonra sahibi mi diye bak" yaklaşımı bir `if` unutulduğunda IDOR
 * açığına dönüşür (05-auth-security.md). Sahiplik `WHERE`'in içinde olduğu
 * sürece unutulacak bir kontrol kalmıyor.
 *
 * ⛔ SİLME YUMUŞAKTIR (`deletedAt`). Sert silme mümkün DEĞİL: `orders`
 * tablosundaki `delivery_address_id` bu satırı `onDelete: Restrict` ile
 * tutuyor — geçmiş bir siparişin teslim edildiği adres kaybolamaz
 * (data-model.md: denetim gereği kaybolmaması gereken 8 tablodan biri).
 */

type Client = Prisma.TransactionClient | typeof prisma;

export type AddressRow = {
  id: string;
  title: string;
  fullAddress: string;
  district: string;
};

const addressFields = {
  id: true,
  title: true,
  fullAddress: true,
  district: true,
} as const;

/** Kullanıcının teslimat adresleri — silinenler hariç. */
export async function listAddresses(
  userId: string,
  client: Client = prisma,
): Promise<AddressRow[]> {
  return client.address.findMany({
    where: { userId, deletedAt: null },
    select: addressFields,
    orderBy: { createdAt: "asc" },
  });
}

/** Adresin sahibi bu kullanıcı mı — IDOR kontrolü sorgunun içinde. */
export async function findOwnedAddress(
  input: { addressId: string; userId: string },
  client: Client = prisma,
): Promise<AddressRow | null> {
  return client.address.findFirst({
    where: { id: input.addressId, userId: input.userId, deletedAt: null },
    select: addressFields,
  });
}

/** Kullanıcının silinmemiş adres sayısı — üst sınır kontrolü için. */
export async function countAddresses(userId: string, client: Client = prisma): Promise<number> {
  return client.address.count({ where: { userId, deletedAt: null } });
}

export async function createAddress(
  input: { userId: string; title: string; fullAddress: string; district: string },
  client: Client = prisma,
): Promise<{ id: string }> {
  return client.address.create({ data: input, select: { id: true } });
}

/**
 * Adresi günceller — KOŞULLU.
 *
 * `updateMany` + sahiplik koşulu kullanılıyor, `findFirst` + `update` değil:
 * ikincisi iki adımdır ve arada satır silinebilir. Dönen sayı 0 ise adres yok,
 * başkasına ait ya da bu arada silinmiş — üçü de çağıran için aynı sonuç
 * (bkz. `errors.ts`: varlık bilgisi sızdırılmaz).
 */
export async function updateOwnedAddress(
  input: {
    addressId: string;
    userId: string;
    title: string;
    fullAddress: string;
    district: string;
  },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.address.updateMany({
    where: { id: input.addressId, userId: input.userId, deletedAt: null },
    data: { title: input.title, fullAddress: input.fullAddress, district: input.district },
  });

  return result.count === 1;
}

/**
 * Adresi yumuşak siler — KOŞULLU, aynı gerekçeyle.
 *
 * `deletedAt: null` koşulu ikinci kez silmeyi de engelliyor: iki kez tıklayan
 * kullanıcının ikinci isteği 0 satır etkiler ve servis bunu ayırt edebilir.
 */
export async function softDeleteOwnedAddress(
  input: { addressId: string; userId: string; deletedAt: Date },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.address.updateMany({
    where: { id: input.addressId, userId: input.userId, deletedAt: null },
    data: { deletedAt: input.deletedAt },
  });

  return result.count === 1;
}
