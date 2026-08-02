import type { GoogleIdentity } from "@/features/auth/services/google-oauth.service";

/**
 * HESAP BİRLEŞTİRME KURALI — 4c'nin güvenlik açısından en kritik parçası
 * (PRD §5.0 "Hesap birleştirme kuralı").
 *
 * Buradaki soru şu: Google'dan `ahmet@ornek.com` diye biri geldi. Bu adrese
 * sahip bir hesabımız zaten varsa ne yapacağız?
 *
 * YANLIŞ CEVAP — "aynı e-posta, aynı kişidir, birleştir." Bu, hesap ele
 * geçirmenin klasik yoludur: saldırgan kurbanın e-postasıyla bir Google hesabı
 * açar (ya da doğrulanmamış bir adres girer), bizim sitede o adresle kayıtlı
 * hesaba Google ile girer ve hesabı devralır. Kurbanın şifresini hiç bilmesine
 * gerek kalmaz.
 *
 * DOĞRU CEVAP — birleştirme yalnızca İKİ TARAF DA e-posta sahipliğini
 * kanıtlamışsa yapılır:
 *   · Google `email_verified: true` diyorsa (o adresin sahibi bu Google hesabı)
 *   · VE bizdeki hesabın e-postası daha önce doğrulanmışsa
 * Aksi hâlde kullanıcıdan şifre veya OTP istenir — yani hesabı gerçekten
 * kontrol ettiğini ayrıca kanıtlar.
 *
 * KATMAN: bu dosya SAF. Veritabanı, çerez ve HTTP bilmez; kendisine verilen
 * üç bilgiye bakıp bir karar döner. Kural bu sayede taklit kurmadan, her dalı
 * ayrı ayrı test edilebiliyor — güvenlik kuralının test edilebilir olması,
 * doğru olmasının ön şartı.
 */

/** Birleştirme kararı verilirken bakılan, bizdeki mevcut hesap. */
export type ExistingAccountForLinking = {
  userId: string;
  /** E-posta sahipliği bizde daha önce kanıtlanmış mı (kayıt akışındaki OTP). */
  emailVerified: boolean;
};

export type GoogleLinkDecision =
  /** Bu Google hesabı zaten bir kullanıcıya bağlı — normal giriş. */
  | { kind: "login"; userId: string }
  /** İki taraf da e-postayı doğrulamış — bağlantı kurulup giriş yapılabilir. */
  | { kind: "link_and_login"; userId: string }
  /** Aynı e-postalı hesap var ama doğrulama eksik — kimlik kanıtı isteniyor. */
  | { kind: "verification_required"; userId: string; reason: LinkBlockedReason }
  /** Bu e-postayla hesabımız yok — doğrulanmamış yeni hesap açılır. */
  | { kind: "create_unverified" };

export type LinkBlockedReason =
  /** Google bu adresin sahipliğini doğrulamamış. */
  | "google_email_unverified"
  /** Bizdeki hesabın e-postası hiç doğrulanmamış. */
  | "local_email_unverified";

/**
 * Google'dan dönen kimliğe ve bizdeki kayıtlara bakıp ne yapılacağına karar verir.
 *
 * SIRA ÖNEMLİ: önce "bu Google hesabı zaten bağlı mı" sorulur. Bağlıysa
 * e-posta doğrulama durumuna hiç bakılmaz — kullanıcı bu bağlantıyı daha önce
 * kurmuş, her girişte yeniden kanıt istemek anlamsız olurdu. Google kullanıcının
 * e-posta adresini sonradan değiştirmiş olsa bile bağlantı `sub` üzerinden
 * kurulu ve `sub` değişmez.
 */
export function decideGoogleLink(input: {
  identity: GoogleIdentity;
  /** `accounts` tablosunda (google, sub) ile eşleşen kullanıcı — yoksa null. */
  linkedUserId: string | null;
  /** Aynı e-postaya sahip mevcut hesap — yoksa null. */
  existingAccount: ExistingAccountForLinking | null;
}): GoogleLinkDecision {
  const { identity, linkedUserId, existingAccount } = input;

  if (linkedUserId) return { kind: "login", userId: linkedUserId };

  if (!existingAccount) return { kind: "create_unverified" };

  // İki koşul AYRI AYRI raporlanıyor: kullanıcıya "neyi kanıtlaman gerekiyor"
  // diye anlamlı bir mesaj gösterebilmek için. Karar yine de aynı — engel.
  if (!identity.emailVerified) {
    return {
      kind: "verification_required",
      userId: existingAccount.userId,
      reason: "google_email_unverified",
    };
  }

  if (!existingAccount.emailVerified) {
    return {
      kind: "verification_required",
      userId: existingAccount.userId,
      reason: "local_email_unverified",
    };
  }

  return { kind: "link_and_login", userId: existingAccount.userId };
}
