import { messages } from "@/config/messages";
import { AppError } from "@/lib/errors";

/**
 * Etkinlik ve koltuk kilidine özel hatalar (PRD §5.2).
 *
 * KODLAR AYRI ÇÜNKÜ EKRAN FARKLI DAVRANIYOR: "koltuk kapıldı" salon planını
 * tazeleyip başka koltuk seçtirir, "etkinlik başladı" ise sayfadan çıkartır.
 * Tek tip bir "olmadı" mesajı kullanıcıyı aynı düğmeye tekrar bastırırdı
 * (03-api-guidelines.md → `code` makine için sabit ve anlamlı).
 */

const copy = messages.events.errors;

export class EventNotFoundError extends AppError {
  readonly code = "EVENT_NOT_FOUND";
  readonly status = 404;

  constructor() {
    super(copy.notFound);
  }
}

/**
 * Koltuk bu etkinliğin salonunda yok.
 *
 * İstemciden gelen koltuk kimliği doğrulanmadan kullanılsaydı, başka bir
 * salonun koltuğu için bu etkinliğe rezervasyon yazılabilirdi — kayıt tutarlı
 * görünür ama salon planında hiç görünmezdi.
 */
export class SeatNotFoundError extends AppError {
  readonly code = "SEAT_NOT_FOUND";
  readonly status = 404;

  constructor() {
    super(copy.seatNotFound);
  }
}

/** Başlamış etkinliğe bilet satılmaz. */
export class EventStartedError extends AppError {
  readonly code = "EVENT_STARTED";
  readonly status = 409;

  constructor() {
    super(copy.eventStarted);
  }
}

/**
 * PRD §5.2 BİRİNCİ KABUL KRİTERİ: "Aynı koltuk iki kez satılamaz — iki
 * kullanıcı aynı anda denerse biri 409 alır." Bu sınıf o 409'un kendisi.
 */
export class SeatTakenError extends AppError {
  readonly code = "SEAT_TAKEN";
  readonly status = 409;

  constructor() {
    super(copy.seatTaken);
  }
}

/**
 * Bırakılmak istenen kilit yok (süresi dolmuş, başkasına ait ya da hiç olmamış).
 *
 * BAŞKASININ KİLİDİ DE BU HATAYI ALIR, 403 DEĞİL: "böyle bir kayıt var ama
 * senin değil" demek kaydın varlığını sızdırırdı (05-auth-security.md → IDOR).
 * Randevu iptalindeki desenin aynısı.
 */
export class SeatHoldNotFoundError extends AppError {
  readonly code = "SEAT_HOLD_NOT_FOUND";
  readonly status = 404;

  constructor() {
    super(copy.holdNotFound);
  }
}

/** Aynı anda tutulabilecek kilit sayısı aşıldı (`SEAT_HOLD_MAX_PER_USER`). */
export class TooManySeatHoldsError extends AppError {
  readonly code = "TOO_MANY_SEAT_HOLDS";
  readonly status = 409;

  constructor() {
    super(copy.tooManyHolds);
  }
}

export class SeatHoldRateLimitedError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(copy.tooManyAttempts);
  }
}

/**
 * İstek şemaya uymuyor.
 *
 * Zod'un alan yolu ve beklenen tipi yanıta KONMUYOR: iç detay sızdırmama
 * kuralı şema hatalarını da kapsar (03-api-guidelines.md).
 */
export class InvalidSeatRequestError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly status = 422;

  constructor() {
    super(copy.seatNotFound);
  }
}
