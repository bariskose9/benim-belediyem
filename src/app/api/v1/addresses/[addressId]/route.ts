import { requireAccess } from "@/features/auth/services/api-guard";
import { InvalidProfileRequestError } from "@/features/profile/errors";
import { addressIdSchema, addressInputSchema } from "@/features/profile/schemas/profile.schema";
import { deleteUserAddress, updateUserAddress } from "@/features/profile/services/address.service";
import { fail, noContent } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * `/api/v1/addresses/{addressId}` — tek adres (adım 15).
 *
 * NEDEN `PUT` DEĞİL `PATCH`: kaynak URL'i istemci tarafından belirlenmiyor ve
 * gövde kaydın tamamını değil, kullanıcının düzenleyebildiği ÜÇ alanı taşıyor
 * (`userId`, `createdAt`, `deletedAt` istemcinin işi değil). `PUT` "gönderdiğim
 * temsil kaydın tamamıdır" demek olurdu ve bu doğru değil.
 *
 * NEDEN `DELETE`, SATIR SİLİNMEDİĞİ HÂLDE: destek talebini kapatmadaki
 * gerekçenin aynısı — kullanıcı açısından adres siliniyor, veritabanında
 * `deleted_at` damgalanıyor. Geçmiş siparişler bu satıra bağlı
 * (`onDelete: Restrict`), yani sert silme zaten mümkün değil.
 *
 * SAHİPLİK KARARINI SERVİS/DEPO VERİR, BU DOSYA DEĞİL: başkasının adresi 404.
 */
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ addressId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAccess("authenticated");

    // Yol parametresi de bir GİRDİDİR ve doğrulanır (03-api-guidelines.md).
    const path = addressIdSchema.safeParse(await context.params);
    const body = addressInputSchema.safeParse(await readJsonBody(request));

    if (!path.success || !body.success) throw new InvalidProfileRequestError();

    await updateUserAddress({
      userId: session.userId,
      addressId: path.data.addressId,
      payload: body.data,
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    return noContent();
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await requireAccess("authenticated");

    const path = addressIdSchema.safeParse(await context.params);

    if (!path.success) throw new InvalidProfileRequestError();

    await deleteUserAddress({
      userId: session.userId,
      addressId: path.data.addressId,
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    return noContent();
  } catch (error) {
    return fail(error);
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
