import { messages } from "@/config/messages";
import { AppError } from "@/lib/errors";

/**
 * Sipariş takibi ve iptaline özel hatalar (PRD §5.5).
 *
 * ═══ NEDEN 403, RANDEVUDAKİ GİBİ 404 DEĞİL ═══
 *
 * Randevu modülünde "başkasının kaydı" bilerek 404 döner: 403 dönmek "böyle
 * bir randevu var ama senin değil" bilgisini sızdırırdı. Siparişte PRD §5.5
 * kabul kriteri açıkça 403 istiyor, dolayısıyla karar orada verilmiş durumda.
 *
 * Sızıntı riski de burada daha küçük: sipariş kimliği hiçbir listede, hiçbir
 * adres çubuğunda başkasına görünmüyor — tahmin etmesi gereken bir saldırgan
 * 25 karakterlik bir cuid'i bilmek zorunda. Yine de fark bilinçli; iki modülün
 * farklı davranması kopyalama hatası değil.
 */

const copy = messages.orders.errors;

/** Böyle bir sipariş yok. */
export class OrderNotFoundError extends AppError {
  readonly code = "ORDER_NOT_FOUND";
  readonly status = 404;

  constructor() {
    super(copy.notFound);
  }
}

/** Sipariş var ama BAŞKASINA ait (PRD §5.5 kabul kriteri: 403). */
export class OrderForbiddenError extends AppError {
  readonly code = "FORBIDDEN";
  readonly status = 403;

  constructor() {
    super(copy.forbidden);
  }
}

/**
 * İptal penceresi kapandı (PRD §5.5 kabul kriteri: `Hazırlanıyor` durumundaki
 * siparişe gelen iptal isteği 409).
 *
 * KARARI EKRAN DEĞİL SUNUCU VERİR: istemci düğmeyi hiç göstermese bile ucu
 * doğrudan çağıran bir istek aynı duvara çarpar (05-auth-security.md).
 */
export class OrderNotCancellableError extends AppError {
  readonly code = "ORDER_NOT_CANCELLABLE";
  readonly status = 409;

  constructor() {
    super(copy.tooLate);
  }
}

/** Etkinlik bileti hiç iptal edilemez — koltuk satılmış sayılır (PRD §5.5). */
export class TicketNotCancellableError extends AppError {
  readonly code = "TICKET_NOT_CANCELLABLE";
  readonly status = 409;

  constructor() {
    super(copy.notCancellable);
  }
}

/** Zaten iptal edilmiş sipariş yeniden iptal edilemez. */
export class OrderAlreadyCancelledError extends AppError {
  readonly code = "ORDER_ALREADY_CANCELLED";
  readonly status = 409;

  constructor() {
    super(copy.alreadyCancelled);
  }
}

/**
 * Yazma bütçesi aşıldı (CLAUDE.md §5.5: "login ve yazma endpoint'lerinde
 * rate limit"). Sayaç kullanıcı başına — aynı kurumun personeli aynı dış
 * IP'nin arkasından gelebiliyor (randevu modülüyle aynı gerekçe).
 */
export class OrderCancelRateLimitedError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(copy.tooManyAttempts);
  }
}

/**
 * Yol parametresi şemaya uymuyor.
 *
 * Zod'un alan yolu ve beklenen tipi yanıta KONMUYOR: iç detay sızdırmama
 * kuralı şema hatalarını da kapsar (03-api-guidelines.md).
 */
export class InvalidOrderRequestError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly status = 422;

  constructor() {
    super(copy.invalidRequest);
  }
}
