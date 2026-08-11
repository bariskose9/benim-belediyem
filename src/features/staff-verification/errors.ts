import { messages } from "@/config/messages";
import { AppError } from "@/lib/errors";

/**
 * Personel yetkisi doğrulamasına özel hatalar (adım 17c · ADR-017 ilke 2).
 *
 * ═══ NEDEN AYRI BİR HATA AİLESİ ═══
 * `auth/errors.ts` KİMLİK sorularını cevaplıyor ("bu kişi kim, numarası
 * geçerli mi"). Buradaki sorular YETKİ soruları ("bu hesap kurum personeli
 * olduğunu kanıtlayabildi mi"). ADR-017'nin bütün konusu bu ikisinin ayrı
 * tutulması; hataları aynı dosyaya koymak, ayırdığımız şeyi kodun içinde geri
 * birleştirmek olurdu.
 */

const copy = messages.staffVerification.errors;

/**
 * Kod hatalı, süresi dolmuş, hiç istenmemiş VEYA ilk adımdaki adresle
 * eşleşmiyor — hepsi TEK bir mesaj.
 *
 * ⛔ AYRIŞTIRILMAMASI BİLİNÇLİ. "Kod yanlış" ile "bu kod başka bir adrese
 * gönderilmişti" ayrı ayrı söylenseydi, saldırgan ikinci mesajı görerek
 * hedefinin rehberde bulunduğunu ve akışın hangi noktasında takıldığını
 * öğrenirdi. Kullanıcı için ikisi de aynı işi yapıyor: kodu yeniden iste.
 *
 * Kalan deneme sayısı yanıtta AYRICA dönüyor (`remainingAttempts`) — o bilgi
 * kullanıcının kendi denemesine ait, hedefe dair bir şey söylemiyor.
 */
export class StaffVerificationCodeInvalidError extends AppError {
  readonly code = "STAFF_VERIFICATION_CODE_INVALID";
  readonly status = 400;

  constructor(userMessage: string = copy.codeInvalid) {
    super(userMessage);
  }
}

/** Üç kez yanlış girildi; bu kod öldü, yenisi istenmeli. */
export class StaffVerificationTooManyAttemptsError extends AppError {
  readonly code = "STAFF_VERIFICATION_TOO_MANY_ATTEMPTS";
  readonly status = 429;

  constructor() {
    super(copy.tooManyAttempts);
  }
}

/**
 * Hesap zaten personel.
 *
 * 409 seçildi: istek biçimsel olarak geçerli, hesabın DURUMU uygun değil.
 * Ekran bunu formu hiç göstermeden söylüyor; bu hata doğrudan uca istek
 * atan istemci için var.
 */
export class StaffAlreadyVerifiedError extends AppError {
  readonly code = "STAFF_ALREADY_VERIFIED";
  readonly status = 409;

  constructor() {
    super(copy.alreadyVerified);
  }
}

/**
 * Hesabın kimliği doğrulanmamış (ADR-017 ilke 2'nin sırası).
 *
 * ⛔ KİMLİK YETKİ VERMEZ — AMA YETKİNİN ÖN KOŞULUDUR. İkisi ayrı sorular:
 * "kim olduğun" ve "ne yapmaya yetkili olduğun". Kurum personeli olduğunu
 * kanıtlayan bir hesabın önce KİM olduğu bilinmek zorunda, yoksa yetki
 * kime verildiği belirsiz bir hesaba verilmiş olurdu.
 *
 * 403 seçildi, 401 DEĞİL: kullanıcı giriş yapmış ve oturumu geçerli; eksik
 * olan tek şey kimlik kademesi. 401 dönmek onu giriş ekranına atardı.
 */
export class StaffIdentityRequiredError extends AppError {
  readonly code = "STAFF_IDENTITY_REQUIRED";
  readonly status = 403;

  constructor() {
    super(copy.identityRequired);
  }
}

/** Kod gönderim bütçesi aşıldı (adres veya kullanıcı bacağı). */
export class StaffVerificationRateLimitedError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(copy.rateLimited);
  }
}

/**
 * Form alanları şemaya uymuyor.
 *
 * Zod'un alan yolu ve beklenen tipi yanıta KONMUYOR (03-api-guidelines.md).
 */
export class InvalidStaffVerificationRequestError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly status = 422;

  constructor(userMessage: string = copy.invalidRequest) {
    super(userMessage);
  }
}
