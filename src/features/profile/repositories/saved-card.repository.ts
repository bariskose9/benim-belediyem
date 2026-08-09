import type { Prisma } from "@/generated/prisma/client";
import type { CardBrand } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * Kayıtlı kartlar — `saved_cards` tablosuna dokunan TEK yer.
 *
 * NEDEN PROFİL ÖZELLİĞİNDE: adres repository'siyle aynı gerekçe. Kayıtlı kart
 * kullanıcıya ait bir kayıttır; ödeme onu KULLANIR ama sahibi değildir. Adım
 * 15'te ikinci çağıran (profil) gelince ait olduğu yere taşındı.
 *
 * ⛔ BU DOSYADA TAM KART NUMARASI İÇİN PARAMETRE YOKTUR ve olmayacak.
 * Saklanan tek şey marka + son 4 hane + son kullanma + kart sahibi adı
 * (PRD §6.2 adım 4, data-model.md). Numara sahte sağlayıcıya gidip unutuluyor.
 *
 * ⛔ SİLME YUMUŞAKTIR (`deletedAt`). Sert silme mümkün DEĞİL: `payments` ve
 * `memberships` tabloları bu satıra `onDelete: Restrict` ile bağlı — geçmiş
 * bir tahsilatın hangi kartla yapıldığı bilgisi kaybolamaz. Kullanıcı açısından
 * kart listeden çıkar; mali kayıt bütünlüğü korunur (PRD §5.11'in
 * "mali kayıtlar kişiselleştirilmeden korunur" ilkesiyle aynı çizgi).
 */

type Client = Prisma.TransactionClient | typeof prisma;

export type SavedCardRow = {
  id: string;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
};

const savedCardFields = {
  id: true,
  brand: true,
  last4: true,
  expMonth: true,
  expYear: true,
} as const;

/** Kullanıcının kayıtlı kartları — silinenler hariç. */
export async function listSavedCards(
  userId: string,
  client: Client = prisma,
): Promise<SavedCardRow[]> {
  return client.savedCard.findMany({
    where: { userId, deletedAt: null },
    select: savedCardFields,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Kayıtlı kartı getirir — YALNIZCA sahibine.
 *
 * Sahiplik sorgunun içinde (`userId`), sonradan kontrol edilen bir `if`
 * değil: başkasının kartıyla ödeme yapılması IDOR açığı olurdu.
 */
export async function findOwnedSavedCard(
  input: { savedCardId: string; userId: string },
  client: Client = prisma,
): Promise<SavedCardRow | null> {
  return client.savedCard.findFirst({
    where: { id: input.savedCardId, userId: input.userId, deletedAt: null },
    select: savedCardFields,
  });
}

/** Yeni kartı kaydeder. Numara DEĞİL, yalnızca marka + son 4 hane + son kullanma. */
export async function saveCard(
  input: {
    userId: string;
    brand: CardBrand;
    last4: string;
    expMonth: number;
    expYear: number;
    holderName: string;
  },
  client: Client = prisma,
): Promise<{ id: string }> {
  return client.savedCard.create({ data: input, select: { id: true } });
}

/**
 * Kartı yumuşak siler — KOŞULLU (adres silmedeki desenin aynısı).
 *
 * `deletedAt: null` koşulu ikinci kez silmeyi engelliyor ve `userId` koşulu
 * başkasının kartına dokunmayı. Dönen sayı 0 ise kart yok, başkasına ait ya da
 * bu arada silinmiş.
 */
export async function softDeleteOwnedSavedCard(
  input: { savedCardId: string; userId: string; deletedAt: Date },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.savedCard.updateMany({
    where: { id: input.savedCardId, userId: input.userId, deletedAt: null },
    data: { deletedAt: input.deletedAt },
  });

  return result.count === 1;
}

/**
 * Bu kart AKTİF bir üyeliğe bağlı mı?
 *
 * NEDEN SORULUYOR: spor salonu üyeliği her ay bu karttan tahsilat yapıyor
 * (PRD §5.6). Kart sessizce silinirse bir sonraki tahsilat başarısız olur ve
 * kullanıcı üyeliğini neden kaybettiğini anlamaz. Silmeyi ENGELLEMİYORUZ —
 * kullanıcının kendi kartı — ama kararı bilerek vermesi için uyarıyoruz.
 *
 * ⛔ ÖLÇÜT `status` DEĞİL `activeUserId`. Üyeliğin YAŞADIĞINI söyleyen tek
 * kaynak bu kolon: "aynı anda tek üyelik" kuralını veritabanına söyleten
 * benzersiz indeks onun üzerinde ve üyelik sona erdiğinde `NULL`'a düşüyor
 * (schema.prisma). `status` üzerinden saymak, oradaki durum listesi
 * genişlediğinde sessizce yanlışlaşırdı.
 */
export async function countLiveMembershipsUsingCard(
  input: { savedCardId: string; userId: string },
  client: Client = prisma,
): Promise<number> {
  return client.membership.count({
    where: { savedCardId: input.savedCardId, activeUserId: input.userId },
  });
}
