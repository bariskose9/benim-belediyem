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

/**
 * Giriş başarısız — İKİ FARKLI SEBEP AYNI YANITI ÜRETİR:
 * böyle bir hesap yok · şifre yanlış.
 *
 * HESAP SAYIMI KORUMASI (PRD §5.0 · 05-auth-security.md). Ayrı bir kod ya da
 * ayrı bir durum kodu dönseydi, yanıtın KENDİSİ "bu numarayla hesap var"
 * bilgisini verirdi. Kayıt akışındaki 409 (`IdentityAlreadyRegisteredError`)
 * PRD'nin açıkça istediği bilinçli bir istisnaydı ve BURAYA KOPYALANMADI.
 *
 * Yanıt SÜRESİ de eşitleniyor — `login.service.ts` içindeki sahte argon2
 * doğrulaması. Mesajı eşitleyip süreyi eşitlememek korumayı işe yaramaz kılar.
 */
export class InvalidCredentialsError extends AppError {
  readonly code = "INVALID_CREDENTIALS";
  readonly status = 401;

  /**
   * @param botCheckRequired Bir sonraki denemede bot doğrulaması gerekiyor mu.
   *   Ekranın kutuyu ne zaman göstereceğini bilmesi için. Bu bilgi IP'ye
   *   bağlıdır, hesaba değil — dolayısıyla hesap sayımına yol açmaz.
   */
  constructor(readonly botCheckRequired: boolean = false) {
    super(messages.auth.login.errors.invalidCredentials);
  }
}

/** Giriş denemesi hız sınırına takıldı (05-auth-security.md: 5 deneme / 15 dk). */
export class LoginRateLimitedError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(messages.auth.login.errors.tooManyAttempts);
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

/**
 * Şifre sıfırlama akışı bulunamadı: çerez yok, süresi doldu ya da kodun
 * kaydı kalmadı (adım 4b-3).
 *
 * HESAP SAYIMI KORUMASI: bu hata kayıtlı ve kayıtsız numarada TAM OLARAK aynı
 * koşullarda çıkar. Kayıtsız numarada da bir sahte kod kaydı açıldığı için
 * "kaydın yok" ile "hesabın yok" ayrımı istemciye hiç ulaşmaz
 * (`password-reset.service.ts`).
 */
export class PasswordResetExpiredError extends AppError {
  readonly code = "PASSWORD_RESET_EXPIRED";
  readonly status = 404;

  constructor() {
    super(messages.auth.passwordReset.errors.resetExpired);
  }
}

/** Sıfırlama denemesi hız sınırına takıldı (5 deneme / 15 dk, IP + ziyaretçi). */
export class PasswordResetRateLimitedError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(messages.auth.passwordReset.errors.tooManyAttempts);
  }
}

/**
 * Aynı kimlik numarasına 15 dakikada 3'ten fazla kod istendi.
 *
 * Sayaç KİMLİK NUMARASININ ÖZETİNE bağlı, hedef e-postaya değil: kayıtsız
 * numarada gönderilecek bir hedef olmadığı için hedefe göre sayan bir sınır
 * yalnızca gerçek hesaplarda tetiklenir ve hesabın varlığını ele verirdi.
 */
export class PasswordResetSendRateLimitedError extends AppError {
  readonly code = "PASSWORD_RESET_SEND_RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(messages.auth.passwordReset.errors.sendRateLimited);
  }
}

/**
 * Şifre sıfırlama production'da kapalı — e-posta sağlayıcısı yapılandırılmamış.
 *
 * KAPI EN BAŞTA: hesap arandıktan SONRA "gönderemedim" denseydi, kayıtlı numara
 * 503, kayıtsız numara 201 alırdı ve hesap sayımı koruması delinirdi.
 */
export class PasswordResetClosedError extends AppError {
  readonly code = "PASSWORD_RESET_CLOSED";
  readonly status = 503;

  constructor() {
    super(messages.auth.passwordReset.errors.closed);
  }
}

/**
 * ═══ GİRİŞ YÖNTEMİ HATALARI (adım 15c · teknik borç #33) ═══
 *
 * Hepsi 409 (çakışma) ya da 422 (doğrulanamayan girdi): istek biçimsel olarak
 * geçerli, kabul edilmemesinin sebebi hesabın MEVCUT DURUMU. Kullanıcı formu
 * düzelterek değil, durumu değiştirerek (şifre belirleyerek, başka hesaptan
 * bağlantıyı kaldırarak) çözer.
 */

/** Google bağlantısı zaten kurulu — ikinci kez bağlanacak bir şey yok. */
export class GoogleAlreadyLinkedError extends AppError {
  readonly code = "GOOGLE_ALREADY_LINKED";
  readonly status = 409;

  constructor() {
    super(messages.profile.loginMethods.errors.alreadyLinked);
  }
}

/**
 * Şifre doğrulaması tutmadı.
 *
 * ⛔ MESAJ "ŞİFRE YANLIŞ" DEMİYOR, "doğrulanamadı" diyor: aynı cümle, şifresi
 * hiç olmayan hesapta da dönüyor. İkisini ayırmak, bir hesabın şifresi olup
 * olmadığını dışarıdan ölçülebilir kılardı.
 */
export class LinkPasswordCheckFailedError extends AppError {
  readonly code = "LINK_PASSWORD_CHECK_FAILED";
  readonly status = 422;

  constructor() {
    super(messages.profile.loginMethods.errors.passwordCheckFailed);
  }
}

/**
 * Bu Google hesabı BAŞKA bir kullanıcıya bağlı.
 *
 * Hangi hesaba bağlı olduğu SÖYLENMEZ: bir saldırgan kendi Google hesabıyla
 * deneyerek başkalarının hesap bilgilerini eşleştiremesin.
 */
export class GoogleLinkedToOtherAccountError extends AppError {
  readonly code = "GOOGLE_LINKED_TO_OTHER_ACCOUNT";
  readonly status = 409;

  constructor() {
    super(messages.profile.loginMethods.errors.linkedToOtherAccount);
  }
}

/** Kaldırılacak bağlantı yok. */
export class GoogleNotLinkedError extends AppError {
  readonly code = "GOOGLE_NOT_LINKED";
  readonly status = 409;

  constructor() {
    super(messages.profile.loginMethods.errors.notLinked);
  }
}

/**
 * Son giriş yöntemi kaldırılamaz (PRD §5.0).
 *
 * KİLİTLENME KORUMASI: şifresi olmayan kullanıcı Google'ı kaldırırsa hesabına
 * bir daha giremez ve bunu kendi kendine geri alamaz.
 */
export class LastLoginMethodError extends AppError {
  readonly code = "LAST_LOGIN_METHOD";
  readonly status = 409;

  constructor() {
    super(messages.profile.loginMethods.errors.lastLoginMethod);
  }
}

/**
 * Google girişi bu ortamda yapılandırılmamış (`GOOGLE_CLIENT_ID` yok).
 *
 * 503 çünkü sorun istekte değil sunucu yapılandırmasında; kullanıcı aynı isteği
 * yarın tekrar gönderdiğinde çalışabilir. Ekrandaki düğme zaten yapılandırma
 * varken çiziliyor — buraya yalnızca elle istek atan biri düşer.
 */
export class GoogleLinkUnavailableError extends AppError {
  readonly code = "GOOGLE_LINK_UNAVAILABLE";
  readonly status = 503;

  constructor() {
    super(messages.profile.loginMethods.errors.unavailable);
  }
}
