import { messages } from "@/config/messages";
import { AppError } from "@/lib/errors";

/**
 * Hesap yönetimi ve veri haklarına özel hatalar (PRD §5.11 · ADR-017).
 *
 * ═══ NEDEN AYRI BİR HATA AİLESİ ═══
 * `profile/errors.ts` kullanıcının KAYITLARINI (adres, kart) yönetiyor ve
 * oradaki karar "var olmayan kayıt ile başkasının kaydı ayırt edilemez" idi.
 * Buradaki kaynak hesabın KENDİSİ ve kimliği oturumdan geliyor — istemcinin
 * gösterebileceği bir kayıt kimliği yok, dolayısıyla IDOR yüzeyi de yok.
 * Bu ailenin cevapladığı soru farklı: "bu geri alınamaz işlemi yapmaya
 * yetkin ve durumun uygun mu?"
 */

const copy = messages.account.errors;

/**
 * Şifre doğrulanamadı.
 *
 * 403 seçildi, 401 DEĞİL: kullanıcı zaten giriş yapmış ve oturumu geçerli.
 * 401 dönmek istemciye "oturumun düştü" dedirtir ve kullanıcıyı giriş
 * ekranına atardı; oysa eksik olan tek şey ikinci kanıt.
 */
export class AccountPasswordMismatchError extends AppError {
  readonly code = "ACCOUNT_PASSWORD_MISMATCH";
  readonly status = 403;

  constructor() {
    super(copy.passwordMismatch);
  }
}

/**
 * Hesabın şifresi var ama istekte şifre gönderilmedi.
 *
 * Ayrı bir koddur çünkü ekran buna göre davranıyor: alanı zorunlu işaretleyip
 * odağı oraya taşıyor. "Şifre yanlış" demek, hiç yazmamış kullanıcıya yanlış
 * bilgi vermek olurdu.
 */
export class AccountPasswordRequiredError extends AppError {
  readonly code = "ACCOUNT_PASSWORD_REQUIRED";
  readonly status = 422;

  constructor() {
    super(copy.passwordRequired);
  }
}

/** Hesap zaten silinmiş (arada gelen ikinci istek) veya oturum bayat. */
export class AccountAlreadyDeletedError extends AppError {
  readonly code = "ACCOUNT_ALREADY_DELETED";
  readonly status = 409;

  constructor() {
    super(copy.alreadyDeleted);
  }
}

/** Hesaba bağlı bir KPS kimliği yok — çözülecek bir bağ da yok. */
export class IdentityNotLinkedError extends AppError {
  readonly code = "IDENTITY_NOT_LINKED";
  readonly status = 409;

  constructor() {
    super(copy.identityNotLinked);
  }
}

/**
 * Kimlik çözülürse hesaba GİRİŞ KALMIYOR (ADR-017 · PRD §5.0).
 *
 * ⛔ BU KURAL BİR KİLİTLENME KORUMASIDIR, kolaylık değil. Bu projede şifreyle
 * giriş kullanıcıyı T.C. kimlik numarasının özetinden buluyor
 * (`findAuthUserByNationalIdHash`). Kimlik bağı koparıldığı anda o yol kapanır;
 * hesapta Google bağlantısı da yoksa kullanıcı kendi hesabına bir daha
 * giremez ve bunu kendi kendine geri alamaz. `login-methods.ts`'teki
 * "son giriş yöntemi kaldırılamaz" kuralının aynısı, başka bir kapıda.
 */
export class IdentityUnlinkWouldLockAccountError extends AppError {
  readonly code = "IDENTITY_UNLINK_WOULD_LOCK_ACCOUNT";
  readonly status = 409;

  constructor() {
    super(copy.identityUnlinkWouldLock);
  }
}

/**
 * Form alanları şemaya uymuyor.
 *
 * Zod'un alan yolu ve beklenen tipi yanıta KONMUYOR (03-api-guidelines.md).
 */
export class InvalidAccountRequestError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly status = 422;

  constructor(userMessage: string = copy.invalidRequest) {
    super(userMessage);
  }
}

/**
 * Yazma/indirme bütçesi aşıldı.
 *
 * ⚠️ VERİ İNDİRME DE BÜTÇEYE TABİ ve bu bilinçli: uç kullanıcının TÜM
 * kayıtlarını tek yanıtta üretiyor, yani en pahalı okuma yolumuz. Sınırsız
 * bırakılsaydı girişli tek bir hesap art arda istek atarak veritabanını
 * meşgul edebilirdi (CLAUDE.md §5.5).
 */
export class AccountRateLimitedError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(copy.tooManyAttempts);
  }
}
