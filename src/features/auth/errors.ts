import { messages } from "@/config/messages";
import { AppError } from "@/lib/errors";

/**
 * Kayıt akışına özel hatalar.
 *
 * `src/lib/errors.ts`'teki genel sınıflar yerine ayrı sınıflar var çünkü
 * `03-api-guidelines.md` `code` alanının makine için SABİT ve anlamlı olmasını
 * istiyor: istemci "VALIDATION_ERROR" ile "WEAK_PASSWORD" arasında dallanabilmeli.
 */

/**
 * Kimlik doğrulanamadı — ÜÇ FARKLI SEBEP AYNI YANITI ÜRETİR:
 * kontrol basamağı hatalı · numara kayıtlı değil · doğum yılı tutmuyor.
 *
 * PRD kabul kriteri "geçersiz kontrol basamağı → 400" diyor. Diğer iki sebep
 * için farklı bir kod dönseydi, DURUM KODUNUN KENDİSİ `lookupIdentity` ve
 * `messages.identity.lookupFailed`'in özenle sildiği ayrımı geri sızdırırdı
 * (05-auth-security.md → "hangi alanın tutmadığı söylenmez").
 */
export class IdentityCheckFailedError extends AppError {
  readonly code = "IDENTITY_CHECK_FAILED";
  readonly status = 400;

  constructor() {
    super(messages.identity.lookupFailed);
  }
}

/**
 * Kimlik sorgusu hız sınırına takıldı (PRD kabul kriteri: 6. denemede 429).
 * Mesaj adım 4a'dan aynen kullanılıyor; yeni bir metin yazmak iki farklı
 * yerde iki farklı ifade bırakırdı.
 */
export class IdentityRateLimitedError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(messages.identity.tooManyAttempts);
  }
}

/** Sahte KPS servisine ulaşılamadı — PRD: kayıt durur, giriş etkilenmez. */
export class IdentityServiceUnavailableError extends AppError {
  readonly code = "IDENTITY_SERVICE_UNAVAILABLE";
  readonly status = 503;

  constructor() {
    super(messages.identity.serviceUnavailable);
  }
}

/**
 * 18 yaş sınırı (PRD §5.0).
 *
 * BU MESAJ KİMLİĞİN VAR OLDUĞUNU SIZDIRIR ve bu bilinçli bir tavizdir:
 * PRD hem 403 durumunu hem mesajı açıkça istiyor. Saldırgan doğum yılını
 * zaten kendisi girdiği için ek bilgi kazanmıyor.
 */
export class AgeRestrictedError extends AppError {
  readonly code = "AGE_RESTRICTED";
  readonly status = 403;

  constructor() {
    super(messages.auth.register.errors.ageRestricted);
  }
}

/**
 * Aynı kimlik numarasıyla ikinci hesap (PRD kabul kriteri: 409).
 *
 * Hesabın varlığını sızdırır; PRD bunu açıkça istediği için kabul edildi.
 * Oraya gelmek için geçerli TCKN + doğum yılı + bot doğrulaması + hız sınırı
 * bütçesi gerekiyor. **4b-3'ün şifre sıfırlama akışına KOPYALANMAYACAK** —
 * PRD orada tam tersini (hesap sayımı koruması) şart koşuyor.
 */
export class IdentityAlreadyRegisteredError extends AppError {
  readonly code = "IDENTITY_ALREADY_REGISTERED";
  readonly status = 409;

  constructor() {
    super(messages.auth.register.errors.identityAlreadyRegistered);
  }
}

export class EmailAlreadyRegisteredError extends AppError {
  readonly code = "EMAIL_ALREADY_REGISTERED";
  readonly status = 409;

  constructor() {
    super(messages.auth.register.errors.emailAlreadyRegistered);
  }
}

/** Taslak yok veya 15 dakikalık süresi doldu. */
export class RegistrationExpiredError extends AppError {
  readonly code = "REGISTRATION_EXPIRED";
  readonly status = 404;

  constructor() {
    super(messages.auth.register.errors.registrationExpired);
  }
}

export class BotCheckRequiredError extends AppError {
  readonly code = "BOT_CHECK_REQUIRED";
  readonly status = 403;

  constructor() {
    super(messages.auth.register.errors.botCheckRequired);
  }
}

export class BotCheckFailedError extends AppError {
  readonly code = "BOT_CHECK_FAILED";
  readonly status = 403;

  constructor() {
    super(messages.auth.register.errors.botCheckFailed);
  }
}

/**
 * Turnstile'a ulaşılamadı → AKIŞ DURUR (ADR-004 bedel 2).
 * Kapı açık bırakılarak atlanmaz; bu, "dış servis çökerse sayfa ayakta kalır"
 * kuralının bilinçli istisnasıdır.
 */
export class BotCheckUnavailableError extends AppError {
  readonly code = "BOT_CHECK_UNAVAILABLE";
  readonly status = 503;

  constructor() {
    super(messages.auth.register.errors.botCheckUnavailable);
  }
}

export class OtpInvalidError extends AppError {
  readonly code = "OTP_INVALID";
  readonly status = 422;

  /** Kalan deneme hakkı istemciye gösterilir; kodun kendisi hakkında ipucu vermez. */
  constructor(readonly remainingAttempts: number) {
    super(messages.auth.register.errors.otpInvalid);
  }
}

export class OtpExpiredError extends AppError {
  readonly code = "OTP_EXPIRED";
  readonly status = 422;

  constructor() {
    super(messages.auth.register.errors.otpExpired);
  }
}

export class OtpTooManyAttemptsError extends AppError {
  readonly code = "OTP_TOO_MANY_ATTEMPTS";
  readonly status = 429;

  constructor() {
    super(messages.auth.register.errors.otpTooManyAttempts);
  }
}

export class OtpSendRateLimitedError extends AppError {
  readonly code = "OTP_SEND_RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(messages.auth.register.errors.otpResendRateLimited);
  }
}

export class WeakPasswordError extends AppError {
  readonly code = "WEAK_PASSWORD";
  readonly status = 422;
}

export class LeakedPasswordError extends AppError {
  readonly code = "LEAKED_PASSWORD";
  readonly status = 422;

  constructor() {
    super(messages.auth.register.errors.leakedPassword);
  }
}

/** Doğrulama kodu gönderilemedi (e-posta sağlayıcısı erişilemez veya yapılandırılmamış). */
export class OtpChannelUnavailableError extends AppError {
  readonly code = "OTP_CHANNEL_UNAVAILABLE";
  readonly status = 503;

  constructor() {
    super(messages.auth.register.errors.channelUnavailable);
  }
}

/**
 * Kayıt production'da henüz açılmadı — e-posta sağlayıcısı yapılandırılmamış.
 *
 * Ayrı bir hata olarak duruyor çünkü kullanıcıya "biraz sonra tekrar deneyin"
 * demek yanıltıcı olurdu: sorun geçici bir arıza değil, eksik yapılandırma.
 */
export class RegistrationClosedError extends AppError {
  readonly code = "REGISTRATION_CLOSED";
  readonly status = 503;

  constructor() {
    super(messages.auth.register.errors.registrationClosed);
  }
}
