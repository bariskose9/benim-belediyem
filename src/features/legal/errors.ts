import { messages } from "@/config/messages";
import { AppError } from "@/lib/errors";

const copy = messages.legal.consentErrors;

/**
 * Rıza isteği anlaşılamadı (adım 17).
 *
 * Zod'un alan yolu istemciye GİTMİYOR — kullanıcı tek ve anlaşılır bir Türkçe
 * cümle görüyor (03-api-guidelines.md).
 */
export class InvalidConsentRequestError extends AppError {
  readonly code = "INVALID_CONSENT_REQUEST";
  readonly status = 400;

  constructor() {
    super(copy.invalidRequest);
  }
}

/** Hız sınırı — `consent_records` tablosunu şişiren döngüyü durdurur. */
export class ConsentRateLimitedError extends AppError {
  readonly code = "CONSENT_RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(copy.tooManyRequests);
  }
}
