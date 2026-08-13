import {
  accountDeletionSchema,
  accountPhoneSchema,
  identityUnlinkSchema,
} from "@/features/account/schemas/account.schema";
import {
  identityChallengeSchema,
  identityVerifiedResponseSchema,
} from "@/features/identity/schemas/identity-challenge.schema";
import { consentInputSchema } from "@/features/legal/schemas/consent.schema";
import {
  staffVerificationConfirmedResponseSchema,
  staffVerificationConfirmSchema,
  staffVerificationRequestSchema,
  staffVerificationStartedResponseSchema,
} from "@/features/staff-verification/schemas/staff-verification.schema";
import type { ApiOperation } from "@/features/api-docs/types";

/** Hesap yönetimi, veri hakları, kimlik ve personel doğrulaması (adım 18b). */

const TAG_ACCOUNT = "Hesap ve veri hakları";
const TAG_IDENTITY = "Kimlik doğrulama";
const TAG_STAFF = "Personel doğrulama";
const TAG_LEGAL = "Yasal ve rıza";

export const accountOperations: ApiOperation[] = [
  {
    path: "/api/v1/account/export",
    method: "get",
    tag: TAG_ACCOUNT,
    summary: "Kullanıcının kendi verisini JSON dosyası olarak indirir (KVKK m.11).",
    description:
      "⛔ Dosyada şifre özeti veya oturum jetonu GEÇMEZ; kimlik numarası maskeli çıkar. " +
      "Dosya adı `Content-Disposition` başlığından gelir.",
    access: "authenticated",
    success: {
      status: 200,
      description: "İndirilebilir JSON dosyası (profil, siparişler, rıza kayıtları).",
    },
    errors: [],
    rateLimited: true,
  },
  {
    path: "/api/v1/account/phone",
    method: "put",
    tag: TAG_ACCOUNT,
    summary: "Cep telefonu numarasını değiştirir.",
    description:
      "Numara değişince doğrulama rozeti 'Doğrulanmadı'ya döner — arıza değil, kasıtlı davranış (borç #80).",
    access: "authenticated",
    requestBody: { schema: accountPhoneSchema },
    success: { status: 204, description: "Numara güncellendi." },
    errors: [],
    rateLimited: true,
  },
  {
    path: "/api/v1/account/identity-unlinks",
    method: "post",
    tag: TAG_ACCOUNT,
    summary: "Hesaba bağlı kimlik kaydını çözer; numarayı serbest bırakır.",
    description:
      "⛔ Yalnızca bağı KURAN hesap çözebilir. Çözme sonrası hesaba giriş yolu kalmıyorsa reddedilir. " +
      "Bu akış ADR-017'deki zaafı kapatmaz (teknik borç #90).",
    access: "authenticated",
    requestBody: { schema: identityUnlinkSchema },
    success: { status: 204, description: "Kimlik bağı çözüldü." },
    errors: [
      "IDENTITY_NOT_LINKED",
      "IDENTITY_UNLINK_WOULD_LOCK_ACCOUNT",
      "ACCOUNT_PASSWORD_MISMATCH",
      "ACCOUNT_PASSWORD_REQUIRED",
    ],
    rateLimited: true,
  },
  {
    path: "/api/v1/account/deletions",
    method: "post",
    tag: TAG_ACCOUNT,
    summary: "Hesabı siler (KVKK m.7 — geri alınamaz).",
    description:
      "⛔ GERİ ALINAMAZ. Kişisel veri gerçekten silinir/anonimleştirilir; ticari kayıtlar " +
      "Türk Ticaret Kanunu m.82 gereği kişiye bağı koparılarak saklanmaya devam eder. " +
      "Silme işleminin denetim kaydı, silmenin bir parçasıdır ve hesapla birlikte silinmez. " +
      "⚠️ `users.email` NULL'a çekildiği için silinmiş hesap e-postasından bulunamaz.",
    access: "authenticated",
    requestBody: { schema: accountDeletionSchema },
    success: { status: 204, description: "Hesap silindi; oturum düşürüldü." },
    errors: ["ACCOUNT_ALREADY_DELETED", "ACCOUNT_PASSWORD_MISMATCH", "ACCOUNT_PASSWORD_REQUIRED"],
    rateLimited: true,
  },

  {
    path: "/api/v1/identity-verifications",
    method: "post",
    tag: TAG_IDENTITY,
    summary: "Kimlik numarası ve doğum yılıyla kimliği doğrular.",
    description:
      "⛔ **KİMLİK DOĞRULAMASI YETKİ VERMEZ** (ADR-017 · 05-auth-security.md). Hesabı yalnızca " +
      "'doğrulanmış kimlik' kademesine taşır; kurum personeli yetkisi AYRI bir akıştan gelir. " +
      "Hangi alanın tutmadığı söylenmez ve yanıt süresi sabitlenir — ikisi de numara taraması " +
      "saldırısını engellemek için. Sorgu denetim kaydına yazılır, **sorgulanan numara yazılmadan**.",
    access: "authenticated",
    requestBody: { schema: identityChallengeSchema },
    success: {
      status: 201,
      description: "Doğrulanan kişinin ad soyadı.",
      body: { schema: identityVerifiedResponseSchema },
    },
    errors: [
      "IDENTITY_CHECK_FAILED",
      "IDENTITY_ALREADY_VERIFIED",
      "IDENTITY_ALREADY_REGISTERED",
      "IDENTITY_SERVICE_UNAVAILABLE",
      "AGE_RESTRICTED",
      "BOT_CHECK_REQUIRED",
      "BOT_CHECK_FAILED",
      "BOT_CHECK_UNAVAILABLE",
    ],
    rateLimited: true,
  },

  {
    path: "/api/v1/staff-verifications",
    method: "post",
    tag: TAG_STAFF,
    summary: "Kurumsal e-posta adresine personel doğrulama kodu gönderir.",
    description:
      "⭐ Kanıtın kanalı kanıtın kendisidir: kod, kullanıcının kendi adresine değil **kurumun " +
      "rehberindeki** adrese gider. Kimlik doğrulaması ÖN KOŞULdur, yeterli koşul değildir. " +
      "⛔ Adresin rehberde kayıtlı olup olmadığı yanıttan ANLAŞILMAZ — var olan ve olmayan adres " +
      "aynı cümleyi alır (hesap sayımı koruması). " +
      "⚠️ Canlıda tohum adresleri `@ornek.test` olduğu için kod teslim edilemiyor (borç #92) ve " +
      "gönderim hatası kullanıcıya söylenmiyor (borç #93).",
    access: "authenticated",
    requestBody: { schema: staffVerificationRequestSchema },
    success: {
      status: 201,
      description: "Local/preview'da açığa çıkarılan kod; production'da boş.",
      body: { schema: staffVerificationStartedResponseSchema },
    },
    errors: ["STAFF_IDENTITY_REQUIRED", "STAFF_ALREADY_VERIFIED", "OTP_SEND_RATE_LIMITED"],
    rateLimited: true,
  },
  {
    path: "/api/v1/staff-verifications/confirmations",
    method: "post",
    tag: TAG_STAFF,
    summary: "Personel doğrulama kodunu kontrol eder ve yetkiyi verir.",
    description:
      "Yetki alanına yazan TEK katman burasıdır; kayıt ve kimlik akışlarında o alan hiç bulunmaz.",
    access: "authenticated",
    requestBody: { schema: staffVerificationConfirmSchema },
    success: {
      status: 201,
      description: "Personel yetkisi verildi.",
      body: { schema: staffVerificationConfirmedResponseSchema },
    },
    errors: [
      "STAFF_VERIFICATION_CODE_INVALID",
      "STAFF_VERIFICATION_TOO_MANY_ATTEMPTS",
      "STAFF_ALREADY_VERIFIED",
      "STAFF_IDENTITY_REQUIRED",
    ],
    rateLimited: true,
  },

  {
    path: "/api/v1/consents",
    method: "post",
    tag: TAG_LEGAL,
    summary: "Çerez bildirimi rızasını kaydeder.",
    description:
      "⛔ Özne gövdeden GELMEZ: `userId` ve `anonymousId` sunucuda okunur, şemada böyle bir alan yoktur. " +
      "Yalnızca `necessary_cookies` yazılabilir — `terms_of_use` ve `privacy_notice` kayıt akışında " +
      "sunucuda yazılır, bir uçtan tetiklenebilseydi kullanıcı hiç görmediği bir metni kabul etmiş görünürdü. " +
      "⛔ Farklı kaynaktan gelen istek reddedilir (CSRF).",
    access: "public",
    requestBody: { schema: consentInputSchema, contentType: "multipart/form-data" },
    success: { status: 303, description: "Kullanıcının geldiği sayfaya geri yönlendirme." },
    errors: ["INVALID_CONSENT_REQUEST", "CONSENT_RATE_LIMITED"],
    rateLimited: true,
  },
];
