import { requireAccess } from "@/features/auth/services/api-guard";
import { markAllNotificationsRead } from "@/features/notifications/repositories/notification.repository";
import { ok, fail } from "@/lib/http";

/**
 * PATCH /api/notifications — kullanıcının okunmamış bildirimlerini okundu
 * işaretler (PRD §5.5).
 *
 * NEDEN GÖVDESİZ VE KOLEKSİYON ÜZERİNDE: yapılabilecek tek değişiklik bu.
 * Gövdede `{ isRead: true }` istemek, istemciye `false` gönderme ihtimalini
 * de açardı — "okunmuşu okunmamış yapmak" diye bir gereksinim yok ve olmayan
 * bir yeteneği doğrulamak zorunda kalmak gereksiz yüzey demek (YAGNI).
 * Bu yüzden ucun DOĞRULANACAK BİR GİRDİSİ YOK; tek girdi oturum.
 *
 * KAPSAM OTURUMDAN GELİR: hangi bildirimlerin işaretleneceğini istemci
 * seçmiyor, sorgu `userId` ile sınırlı. Kimlik listesi alsaydı her kimliğin
 * sahipliğini ayrıca kontrol etmek gerekirdi (IDOR).
 */
export const dynamic = "force-dynamic";

export async function PATCH() {
  try {
    const session = await requireAccess("authenticated");

    const updated = await markAllNotificationsRead(session.userId);

    return ok({ updated }, { noStore: true });
  } catch (error) {
    return fail(error);
  }
}
