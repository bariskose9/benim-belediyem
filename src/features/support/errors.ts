import { messages } from "@/config/messages";
import { AppError } from "@/lib/errors";

/**
 * Destek talebine özel hatalar (PRD §5.7).
 *
 * ═══ NEDEN 404, SİPARİŞTEKİ GİBİ 403 DEĞİL ═══
 *
 * Siparişte "başkasının kaydı" 403 döner çünkü PRD §5.5 kabul kriteri açıkça
 * 403 istiyor. Destekte böyle bir cümle yok ve içerik daha hassas: talebin
 * başlığı ve açıklaması kullanıcının kendi yazdığı, kişisel olabilecek bir
 * metin. 403 dönmek "bu kimlikte bir talep VAR ama senin değil" bilgisini
 * sızdırırdı — randevu modülünde aynı gerekçeyle 404 seçilmişti.
 *
 * Sonuç: var olmayan talep ile başkasının talebi DIŞARIDAN AYIRT EDİLEMEZ.
 */

const copy = messages.support.errors;

/** Böyle bir talep yok — ya da bu kullanıcıya ait değil. İkisi ayırt edilmez. */
export class SupportTicketNotFoundError extends AppError {
  readonly code = "SUPPORT_TICKET_NOT_FOUND";
  readonly status = 404;

  constructor() {
    super(copy.notFound);
  }
}

/**
 * Talep zaten kapalı.
 *
 * KARARI EKRAN DEĞİL SUNUCU VERİR: istemci düğmeyi hiç göstermese bile ucu
 * doğrudan çağıran bir istek aynı duvara çarpar (05-auth-security.md).
 */
export class SupportTicketAlreadyClosedError extends AppError {
  readonly code = "SUPPORT_TICKET_ALREADY_CLOSED";
  readonly status = 409;

  constructor() {
    super(copy.alreadyClosed);
  }
}

/**
 * Form alanları şemaya uymuyor.
 *
 * Zod'un alan yolu ve beklenen tipi yanıta KONMUYOR: iç detay sızdırmama
 * kuralı şema hatalarını da kapsar (03-api-guidelines.md).
 */
export class InvalidSupportTicketError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly status = 422;

  constructor(userMessage: string = copy.invalidRequest) {
    super(userMessage);
  }
}

/**
 * Dosya reddedildi: tür, boyut veya adet sınırı.
 *
 * Mesaj HANGİ KURALIN çiğnendiğini söyler ama dosyanın adını yankılamaz —
 * kullanıcı girdisini hata metnine geri koymak gereksiz bir yüzeydir.
 */
export class AttachmentRejectedError extends AppError {
  readonly code = "ATTACHMENT_REJECTED";
  readonly status = 422;

  constructor(userMessage: string) {
    super(userMessage);
  }
}

/**
 * Ek bulunamadı — ya da bu kullanıcının talebine ait değil.
 *
 * `cause` alabiliyor: depolama sürücüsü içeriği okuyamadığında asıl hata
 * buraya sarılıp sunucu log'una düşüyor, istemci yalnızca 404 görüyor
 * (03-api-guidelines.md → iç detay sızdırılmaz).
 */
export class AttachmentNotFoundError extends AppError {
  readonly code = "ATTACHMENT_NOT_FOUND";
  readonly status = 404;

  constructor(options?: { cause?: unknown }) {
    super(copy.attachmentNotFound, options);
  }
}

/**
 * Yazma bütçesi aşıldı (CLAUDE.md §5.5: "yazma endpoint'lerinde rate limit").
 * Sayaç kullanıcı başına — aynı kurumun personeli aynı dış IP'nin arkasından
 * gelebiliyor (randevu ve sipariş modülleriyle aynı gerekçe).
 */
export class SupportRateLimitedError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(copy.tooManyAttempts);
  }
}

/** Bot doğrulaması geçilemedi veya Cloudflare'a ulaşılamadı (ADR-004). */
export class SupportBotCheckFailedError extends AppError {
  readonly code = "BOT_CHECK_FAILED";
  readonly status = 400;

  constructor() {
    super(copy.botCheckFailed);
  }
}

export class SupportBotCheckUnavailableError extends AppError {
  readonly code = "BOT_CHECK_UNAVAILABLE";
  readonly status = 503;

  constructor() {
    super(copy.botCheckUnavailable);
  }
}
