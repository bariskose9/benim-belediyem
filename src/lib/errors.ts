import { messages } from "@/config/messages";

/**
 * Beklenen hatalar tiplenmiş sınıfla fırlatılır (docs/standards/02-coding-standards.md).
 *
 * Her hatanın iki yüzü var ve bu ayrım bilinçli:
 *  - `code`    → makine için, sabit ve İngilizce. İstemci buna göre dallanır
 *  - `message` → kullanıcı için, Türkçe ve NE YAPILACAĞINI söyler
 *
 * `cause` içindeki teknik ayrıntı (stack, SQL, dosya yolu) istemciye ASLA gitmez;
 * yalnızca sunucu log'una yazılır (docs/standards/03-api-guidelines.md).
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly status: number;

  /** Kullanıcıya gösterilecek Türkçe metin. */
  readonly userMessage: string;

  constructor(userMessage: string, options?: { cause?: unknown }) {
    super(userMessage, options);
    this.name = new.target.name;
    this.userMessage = userMessage;
  }
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly status = 422;
}

export class UnauthorizedError extends AppError {
  readonly code = "UNAUTHORIZED";
  readonly status = 401;
}

export class ForbiddenError extends AppError {
  readonly code = "FORBIDDEN";
  readonly status = 403;
}

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
  readonly status = 404;
}

export class ConflictError extends AppError {
  readonly code = "CONFLICT";
  readonly status = 409;
}

export class RateLimitError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly status = 429;
}

/** Dış servis veya veritabanı geçici olarak erişilemediğinde. */
export class ServiceUnavailableError extends AppError {
  readonly code = "SERVICE_UNAVAILABLE";
  readonly status = 503;
}

/**
 * Beklenmeyen hata: iç detay sızdırmadan genel bir mesaja çevrilir.
 * Çağıran taraf orijinal hatayı `cause` üzerinden loglar.
 */
export class InternalError extends AppError {
  readonly code = "INTERNAL_ERROR";
  readonly status = 500;

  constructor(options?: { cause?: unknown }) {
    super(messages.errors.unexpected, options);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Her türlü fırlatılmış değeri istemciye gösterilebilir bir hataya çevirir.
 * Tanımadığımız hatalar `InternalError`'a düşer — böylece hiçbir iç detay kaçmaz.
 */
export function toAppError(error: unknown): AppError {
  return isAppError(error) ? error : new InternalError({ cause: error });
}
