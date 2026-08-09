import { messages } from "@/config/messages";
import { AppError } from "@/lib/errors";

/**
 * Profil ekranına özel hatalar (PRD §4 · §5.11 · adım 15).
 *
 * ═══ NEDEN 404, 403 DEĞİL ═══
 *
 * Destek talebindeki kararın aynısı. Adres kullanıcının kendi yazdığı bir
 * metindir ve ev adresi taşır; kayıtlı kart ise son 4 hane ve son kullanma
 * tarihi. "Bu kimlikte bir kayıt VAR ama senin değil" demek, bir saldırganın
 * geçerli kimlikleri eleyerek listelemesine izin verirdi.
 *
 * Sonuç: var olmayan kayıt ile başkasının kaydı DIŞARIDAN AYIRT EDİLEMEZ.
 */

const copy = messages.profile.errors;

/** Böyle bir adres yok — ya da bu kullanıcıya ait değil. İkisi ayırt edilmez. */
export class AddressNotFoundError extends AppError {
  readonly code = "ADDRESS_NOT_FOUND";
  readonly status = 404;

  constructor() {
    super(copy.addressNotFound);
  }
}

/** Böyle bir kart yok — ya da bu kullanıcıya ait değil. */
export class SavedCardNotFoundError extends AppError {
  readonly code = "SAVED_CARD_NOT_FOUND";
  readonly status = 404;

  constructor() {
    super(copy.cardNotFound);
  }
}

/**
 * Adres üst sınırına ulaşıldı.
 *
 * 409 (çakışma) seçildi, 422 değil: gönderilen veri geçerli, mevcut DURUM
 * kabul etmiyor. Kullanıcı formu düzelterek değil, bir adres silerek çözer.
 */
export class AddressLimitReachedError extends AppError {
  readonly code = "ADDRESS_LIMIT_REACHED";
  readonly status = 409;

  constructor(limit: number) {
    super(copy.addressLimitReached(limit));
  }
}

/**
 * Form alanları şemaya uymuyor.
 *
 * Zod'un alan yolu ve beklenen tipi yanıta KONMUYOR: iç detay sızdırmama
 * kuralı şema hatalarını da kapsar (03-api-guidelines.md).
 */
export class InvalidProfileRequestError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly status = 422;

  constructor(userMessage: string = copy.invalidRequest) {
    super(userMessage);
  }
}

/**
 * Yazma bütçesi aşıldı (CLAUDE.md §5.5: "yazma endpoint'lerinde rate limit").
 * Sayaç KULLANICI başına — aynı kurumun personeli aynı dış IP'nin arkasından
 * gelebiliyor (destek ve üyelik modülleriyle aynı gerekçe).
 */
export class ProfileRateLimitedError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(copy.tooManyAttempts);
  }
}
