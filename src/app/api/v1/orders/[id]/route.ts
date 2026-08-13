import { requireAccess } from "@/features/auth/services/api-guard";
import { InvalidOrderRequestError } from "@/features/orders/errors";
import { orderIdSchema } from "@/features/orders/schemas/order.schema";
import { cancelOrder } from "@/features/orders/services/order.service";
import { fail, noContent } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * DELETE /api/v1/orders/{id} — siparişi iptal eder (PRD §5.5).
 *
 * NEDEN `DELETE`, SATIR SİLİNMEDİĞİ HÂLDE: kullanıcı açısından sipariş
 * ortadan kalkıyor. Kayıt veritabanında `status = cancelled` olarak 10 yıl
 * duruyor (mali kayıt — data-model.md), ama bu bir SAKLAMA ayrıntısı.
 * `PATCH ... {status: "cancelled"}` istemciye durum makinesini dayatırdı ve
 * istemcinin gönderebileceği tek geçiş zaten bu.
 *
 * ÜÇ KABUL KRİTERİ BU UCUN ARKASINDA (PRD §5.5):
 *  · `Hazırlanıyor` durumundaki siparişe iptal isteği → 409
 *  · Başkasının siparişine iptal isteği → 403
 *  · İptal sonrası market stoğu sipariş öncesi değerine döner
 *
 * Üçünün de kararı SERVİSTE, bu dosyada değil: ikinci bir çağıran (mobil
 * uygulama, planlı görev) eklendiğinde kuralların atlanması mümkün olmasın.
 *
 * KADEME `authenticated`: sipariş vermek kimlik doğrulaması gerektirmiyor
 * (PRD §5.0 erişim tablosu), dolayısıyla iptal de gerektirmez.
 */
export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAccess("authenticated");

    // Yol parametresi de bir GİRDİDİR ve doğrulanır (03-api-guidelines.md).
    const parsed = orderIdSchema.safeParse(await context.params);

    if (!parsed.success) throw new InvalidOrderRequestError();

    await cancelOrder({
      userId: session.userId,
      orderId: parsed.data.id,
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    // 204: gövdesi yok. İade tutarı zaten kullanıcının ekranındaki siparişin
    // toplamı; ikinci kez taşımanın bir faydası olmazdı.
    return noContent();
  } catch (error) {
    return fail(error);
  }
}
