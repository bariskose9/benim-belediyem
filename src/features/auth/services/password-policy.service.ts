import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/config/constants";
import { COMMON_PASSWORDS } from "@/features/auth/data/common-passwords";

/**
 * Şifre politikası (05-auth-security.md).
 *
 * "En az 8 karakter + sızmış şifre listesi kontrolü. Zorunlu periyodik
 * değişim yok."
 *
 * KARMAŞIKLIK KURALI (büyük harf + rakam + sembol zorunluluğu) BİLEREK YOK.
 * Standart istemiyor ve NIST 800-63B'den bu yana yaygın tavsiye bunun aleyhine:
 * karmaşıklık zorunluluğu kullanıcıyı `Sifre123!` gibi tahmin edilebilir
 * kalıplara itiyor. Uzunluk + sızmış liste kontrolü daha etkili.
 */

export type PasswordPolicyContext = {
  /** Şifrenin içinde geçmemesi gereken kişisel değerler. */
  nationalId?: string;
  email?: string;
  fullName?: string;
};

export type PasswordPolicyResult =
  | { outcome: "ok" }
  | { outcome: "too_short" }
  | { outcome: "too_long" }
  | { outcome: "leaked" }
  | { outcome: "contains_personal_data" };

export function checkPasswordPolicy(
  password: string,
  context: PasswordPolicyContext = {},
): PasswordPolicyResult {
  if (password.length < PASSWORD_MIN_LENGTH) return { outcome: "too_short" };

  // Üst sınır bir hizmet dışı bırakma korumasıdır: argon2 girdiyi kesmez,
  // sınırsız uzun şifre sınırsız CPU demektir.
  if (password.length > PASSWORD_MAX_LENGTH) return { outcome: "too_long" };

  if (COMMON_PASSWORDS.has(password.toLowerCase())) return { outcome: "leaked" };

  if (containsPersonalData(password, context)) return { outcome: "contains_personal_data" };

  return { outcome: "ok" };
}

/**
 * Türkçe harfleri ASCII karşılıklarına katlar ve küçük harfe çevirir.
 *
 * NEDEN GEREKLİ: Türkiye'de şifreye Türkçe karakter yazmak yaygın değil —
 * "Yılmaz" soyadlı biri şifresini `yilmaz2026` diye yazar. Katlama olmadan
 * "yılmaz" ile "yilmaz" eşleşmez ve kontrol tamamen atlanırdı.
 *
 * `toLocaleLowerCase("tr-TR")` tek başına yetmez: "İ" harfini "i̇" (birleşik
 * nokta) üretecek şekilde çeviriyor ve karşılaştırma yine tutmuyor. Bu yüzden
 * harf eşlemesi elle yapılıyor.
 */
function foldTurkish(value: string): string {
  return value
    .replace(/[İI]/g, "i")
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .toLowerCase();
}

/**
 * Şifre kişinin kendi verisini içeriyor mu.
 *
 * Kimlik numarası ve e-posta adresi hem tahmin edilebilir hem de zaten
 * saldırganın elinde olabilecek bilgiler; şifre olarak kullanılmaları
 * korumayı sıfırlar.
 *
 * Ad soyad için parça parça bakılıyor ve **3 harften kısa parçalar atlanıyor**:
 * "Ali Öz" gibi kısa bir soyadı, içinde "öz" geçen her şifreyi (`özgürlük42`)
 * haksız yere reddederdi.
 */
function containsPersonalData(password: string, context: PasswordPolicyContext): boolean {
  const folded = foldTurkish(password);

  if (context.nationalId && folded.includes(foldTurkish(context.nationalId))) return true;

  if (context.email) {
    const localPart = foldTurkish(context.email.split("@")[0] ?? "");

    if (localPart.length >= 3 && folded.includes(localPart)) return true;
  }

  if (context.fullName) {
    const parts = foldTurkish(context.fullName)
      .split(/\s+/)
      .filter((part) => part.length >= 3);

    if (parts.some((part) => folded.includes(part))) return true;
  }

  return false;
}
