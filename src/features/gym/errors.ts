import { messages } from "@/config/messages";
import { AppError } from "@/lib/errors";

/**
 * Spor salonu üyeliğine özel hatalar (PRD §5.6).
 *
 * KODLAR AYRI ÇÜNKÜ EKRANIN YAPACAĞI İŞ FARKLI: "zaten üyesiniz" kullanıcıyı
 * paket değiştirme ekranına yollar, "kart reddedildi" aynı ekranda başka kart
 * denetir, "fark değişti" ise sayfayı yenilettirir. Hepsine tek bir "olmadı"
 * demek, kullanıcıyı aynı düğmeye tekrar bastırmak olurdu
 * (03-api-guidelines.md → `code` makine için sabit ve anlamlı).
 */

const copy = messages.gym.errors;

export class MembershipPlanNotFoundError extends AppError {
  readonly code = "MEMBERSHIP_PLAN_NOT_FOUND";
  readonly status = 404;

  constructor() {
    super(copy.planNotFound);
  }
}

/**
 * Üyelik yok ya da BAŞKASININ.
 *
 * Başkasının üyeliği 403 değil 404 alıyor: "böyle bir kayıt var ama senin
 * değil" demek kaydın varlığını sızdırırdı (05-auth-security.md → IDOR).
 * Randevu ve koltuk kilidi iptalindeki desenin aynısı.
 */
export class MembershipNotFoundError extends AppError {
  readonly code = "MEMBERSHIP_NOT_FOUND";
  readonly status = 404;

  constructor() {
    super(copy.membershipNotFound);
  }
}

/** PRD §5.6: "Aktif üyelik varken ikinci üyelik alınamaz — paket değiştir önerilir." */
export class AlreadyMemberError extends AppError {
  readonly code = "ALREADY_MEMBER";
  readonly status = 409;

  constructor() {
    super(copy.alreadyMember);
  }
}

export class NoActiveMembershipError extends AppError {
  readonly code = "NO_ACTIVE_MEMBERSHIP";
  readonly status = 409;

  constructor() {
    super(copy.noMembership);
  }
}

/**
 * Taahhüt ve erken çıkış kuralı onaylanmadı.
 *
 * SUNUCU DA KONTROL EDİYOR, yalnızca ekrandaki kutu değil: PRD §5.6 kuralın
 * satın alma öncesi onaylanmasını istiyor ve istemciye güvenilmez. Kutuyu
 * atlayan bir istek 422 alır.
 */
export class MembershipTermsNotAcceptedError extends AppError {
  readonly code = "TERMS_NOT_ACCEPTED";
  readonly status = 422;

  constructor() {
    super(copy.termsNotAccepted);
  }
}

export class SamePlanError extends AppError {
  readonly code = "SAME_PLAN";
  readonly status = 409;

  constructor() {
    super(copy.samePlan);
  }
}

/**
 * Kullanıcının onayladığı erken çıkış farkı, sunucunun hesapladığından farklı.
 *
 * Sepetteki `CartChangedError` ile aynı gerekçe: tutar SUNUCUDA hesaplanır,
 * istemcinin gönderdiği sayı tahsil edilmez — yalnızca "kullanıcının gördüğü
 * ekran güncel miydi" diye karşılaştırılır. Eski bir sekmeden gelen onay,
 * kullanıcının hiç görmediği bir tutarı onaylamış saymak olurdu.
 */
export class EarlyExitFeeChangedError extends AppError {
  readonly code = "EARLY_EXIT_FEE_CHANGED";
  readonly status = 409;

  constructor() {
    super(copy.feeChanged);
  }
}

export class MembershipPaymentDeclinedError extends AppError {
  readonly code = "PAYMENT_DECLINED";
  readonly status = 402;

  constructor() {
    super(copy.declined);
  }
}

export class MembershipInsufficientFundsError extends AppError {
  readonly code = "INSUFFICIENT_FUNDS";
  readonly status = 402;

  constructor() {
    super(copy.insufficientFunds);
  }
}

/** Aynı işlem ikinci kez geldi (`idempotencyKey` çakıştı ya da koşullu yazma tutmadı). */
export class MembershipAlreadyProcessedError extends AppError {
  readonly code = "ALREADY_PROCESSED";
  readonly status = 409;

  constructor() {
    super(copy.alreadyProcessed);
  }
}

export class MembershipRateLimitedError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(copy.tooManyAttempts);
  }
}

/** Yenileme için kayıtlı kart yok — üyelik kartsız yürütülemez. */
export class MembershipCardRequiredError extends AppError {
  readonly code = "MEMBERSHIP_CARD_REQUIRED";
  readonly status = 422;

  constructor() {
    super(copy.cardRequired);
  }
}

/**
 * İstek şemaya uymuyor.
 *
 * Zod'un alan yolu ve beklenen tipi yanıta KONMUYOR: gövdede kart numarası
 * var ve Zod'un hata nesnesi girdinin parçalarını taşıyabiliyor
 * (`InvalidCheckoutRequestError` ile aynı gerekçe).
 */
export class InvalidMembershipRequestError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly status = 422;

  constructor() {
    super(copy.invalidRequest);
  }
}
