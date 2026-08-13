import { requireAccess } from "@/features/auth/services/api-guard";
import { InvalidSupportTicketError } from "@/features/support/errors";
import { createSupportTicketSchema } from "@/features/support/schemas/support-ticket.schema";
import { createSupportTicket } from "@/features/support/services/support-ticket.service";
import { created, fail } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * POST /api/v1/support-tickets — destek talebi oluşturur (PRD §5.7).
 *
 * KAYNAK ADI ÇOĞUL VE FİİLSİZ (03-api-guidelines.md).
 *
 * ERİŞİM: `requireAccess("authenticated")` — destek, giriş yapan HERKESE açık
 * (PRD §5.0 erişim kademeleri tablosu: "Gezinme, listeler, sipariş, bilet,
 * destek" üç kademede de ✔). Kimlik doğrulaması veya personel şartı YOK.
 *
 * ⚠️ GÖVDE `multipart/form-data`, JSON DEĞİL: istek dosya taşıyor. Metin
 * alanları yine Zod'dan geçiyor; dosyalar `attachment-intake.ts` içinde
 * imzalarından doğrulanıyor — ikisi ayrı yerde çünkü biri şekil, diğeri
 * içerik denetimi.
 *
 * BU DOSYADA İŞ MANTIĞI YOKTUR: kapıyı geçirir, girdiyi doğrular, servisi
 * çağırır, hatayı tek tip zarfa çevirir.
 *
 * `userId` GÖVDEDEN OKUNMAZ; oturumdan gelir.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireAccess("authenticated");

    const form = await readFormData(request);

    /**
     * `FormData.get` alan yoksa `null` döner, `undefined` değil — ve Zod'un
     * `.default("")` değeri yalnızca `undefined` için devreye girer. Jeton
     * alanı bu yüzden çevriliyor: aksi hâlde "jeton hiç gönderilmedi" durumu
     * 400 (bot doğrulaması) yerine 422 (şema) dönerdi ve kullanıcı yanlış
     * alanı düzeltmeye çalışırdı.
     */
    const parsed = createSupportTicketSchema.safeParse({
      subject: form.get("subject"),
      description: form.get("description"),
      turnstileToken: form.get("turnstileToken") ?? undefined,
    });

    // Zod'un hata nesnesi istemciye VERİLMEZ (03-api-guidelines.md).
    if (!parsed.success) throw new InvalidSupportTicketError();

    const ticket = await createSupportTicket({
      userId: session.userId,
      payload: parsed.data,
      files: form.getAll("attachments").filter(isFile),
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    return created({ id: ticket.id });
  } catch (error) {
    return fail(error);
  }
}

/** Gövdesi bozuk istekte ayrıştırma hatası sızdırmadan boş form döner. */
async function readFormData(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch {
    return new FormData();
  }
}

/**
 * `FormData.getAll` metin de dönebiliyor; yalnızca gerçek dosyalar geçer.
 *
 * `instanceof File` yerine ördek tipi kontrolü yok: Node 24'te `File` global
 * ve `formData()` bu sınıfı üretiyor.
 */
function isFile(value: FormDataEntryValue): value is File {
  return value instanceof File;
}
