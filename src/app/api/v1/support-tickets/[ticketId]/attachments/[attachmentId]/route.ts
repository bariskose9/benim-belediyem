import { requireAccess } from "@/features/auth/services/api-guard";
import { InvalidSupportTicketError } from "@/features/support/errors";
import { attachmentPathSchema } from "@/features/support/schemas/support-ticket.schema";
import { readAttachment } from "@/features/support/services/support-ticket.service";
import { fail } from "@/lib/http";

/**
 * GET /api/v1/support-tickets/{ticketId}/attachments/{attachmentId}
 * — ek görselin İÇERİĞİNİ servis eder (PRD §5.7).
 *
 * ═══ NEDEN EK DOSYA KENDİ UCUMUZDAN SERVİS EDİLİYOR ═══
 *
 * Ekran görüntüsü kullanıcının kendi yazışmasının parçası; başkası göremez
 * (PRD §5.7 kabul kriteri). Tahmin edilemez bir genel adres "gizlilik" değil
 * "belirsizlik"tir; adres bir kez paylaşıldığında koruma biter. Bu yüzden
 * baytlar her istekte OTURUM KONTROLÜNDEN geçiyor ve sahiplik sorgunun içinde
 * kontrol ediliyor. Depolama nesne deposuna taşındığında da bu uç kalacak
 * (ADR-014) — sürücü değişir, kapı değişmez.
 *
 * ═══ YANIT BAŞLIKLARI GÜVENLİK KARARIDIR ═══
 *
 *  · `X-Content-Type-Options: nosniff` → tarayıcı içeriği başka bir türmüş
 *    gibi yorumlayamaz. Kendi alan adımızdan servis edilen bir dosyanın HTML
 *    sanılması doğrudan XSS demektir
 *  · `Content-Disposition: inline; filename=…` → ad sanitize edilmiş hâliyle
 *    yazılıyor; ham kullanıcı adı başlığa hiç girmiyor (başlık enjeksiyonu)
 *  · `Cache-Control: private, no-store` → ara bir önbellek kişisel bir görseli
 *    tutup başkasına veremez
 *  · `Content-Type` VERİTABANINDAN, istemcinin beyanından değil: yüklenirken
 *    baytların imzasından tespit edilmişti (`file-upload.ts`)
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ ticketId: string; attachmentId: string }> },
) {
  try {
    const session = await requireAccess("authenticated");

    const parsed = attachmentPathSchema.safeParse(await context.params);

    if (!parsed.success) throw new InvalidSupportTicketError();

    const attachment = await readAttachment({
      userId: session.userId,
      ticketId: parsed.data.ticketId,
      attachmentId: parsed.data.attachmentId,
    });

    return new Response(new Uint8Array(attachment.bytes), {
      status: 200,
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Length": String(attachment.bytes.byteLength),
        "Content-Disposition": `inline; filename="${attachment.fileName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
