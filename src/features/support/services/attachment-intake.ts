import { SUPPORT_ATTACHMENT_MAX_BYTES, SUPPORT_ATTACHMENT_MAX_COUNT } from "@/config/constants";
import { messages } from "@/config/messages";
import { AttachmentRejectedError } from "@/features/support/errors";
import type { NewAttachment } from "@/features/support/repositories/support-ticket.repository";
import { detectImageType, sanitizeFileName } from "@/lib/file-upload";
import { getFileStorage } from "@/lib/file-storage";

/**
 * Yüklenen dosyaların KABUL KAPISI (PRD §5.7: "yalnızca resim, en fazla 5
 * adet, dosya başına boyut sınırı" · CLAUDE.md §5.5).
 *
 * ═══ SIRA ÖNEMLİ, TESADÜF DEĞİL ═══
 *
 *  1. ADET  → en ucuz kontrol; 500 dosyalık bir istek hiç okunmadan reddedilir
 *  2. BOYUT → baytlar belleğe alınmadan ÖNCE, `File.size` üzerinden
 *  3. İÇERİK → baytlar okunur ve tür İMZADAN doğrulanır
 *
 * 3. ADIM 2. ADIMDAN SONRA GELMEK ZORUNDA: türü doğrulamak için dosyayı
 * belleğe almak gerekiyor, dolayısıyla boyut sınırı ondan önce geçilmezse
 * sunucu istediği kadar büyük bir dosyayı belleğe alırdı.
 *
 * `File.type` (tarayıcının beyanı) HİÇBİR YERDE KULLANILMIYOR — kullanıcı
 * girdisidir ve elle değiştirilebilir.
 */

const copy = messages.support.errors;

/** Sınırı kullanıcının anlayacağı biçimde yazar: "2 MB". */
export function formatMaxAttachmentSize(): string {
  return `${Math.round(SUPPORT_ATTACHMENT_MAX_BYTES / (1024 * 1024))} MB`;
}

/**
 * Formdan gelen dosyaları doğrular ve depolamaya hazır satırlara çevirir.
 *
 * Dosya YOKSA boş dizi döner: ek isteğe bağlı (PRD §5.7 "yükleyebilir").
 */
export async function intakeAttachments(files: readonly File[]): Promise<NewAttachment[]> {
  // Boş dosya girişi tarayıcıda "hiç seçilmedi" anlamına da gelebiliyor;
  // sıfır baytlıkları sayıma katmadan önce eliyoruz.
  const candidates = files.filter((file) => file.size > 0 || file.name.length > 0);

  if (candidates.length > SUPPORT_ATTACHMENT_MAX_COUNT) {
    throw new AttachmentRejectedError(copy.tooManyAttachments(SUPPORT_ATTACHMENT_MAX_COUNT));
  }

  const storage = getFileStorage();
  const prepared: NewAttachment[] = [];

  for (const file of candidates) {
    if (file.size === 0) throw new AttachmentRejectedError(copy.attachmentEmpty);

    if (file.size > SUPPORT_ATTACHMENT_MAX_BYTES) {
      throw new AttachmentRejectedError(copy.attachmentTooLarge(formatMaxAttachmentSize()));
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    // İkinci boyut kontrolü tesadüf değil: `File.size` da istemciden gelen bir
    // beyandır. Gerçek uzunluk ancak baytlar okunduktan sonra bilinir.
    if (bytes.byteLength > SUPPORT_ATTACHMENT_MAX_BYTES) {
      throw new AttachmentRejectedError(copy.attachmentTooLarge(formatMaxAttachmentSize()));
    }

    const contentType = detectImageType(bytes);

    if (!contentType) throw new AttachmentRejectedError(copy.attachmentType);

    const stored = await storage.put({
      fileName: sanitizeFileName(file.name, contentType),
      contentType,
      bytes,
    });

    prepared.push({
      reference: stored.reference,
      fileName: sanitizeFileName(file.name, contentType),
      contentType,
      sizeBytes: bytes.byteLength,
      inlineData: stored.inlineData,
    });
  }

  return prepared;
}
