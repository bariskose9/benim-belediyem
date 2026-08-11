import type { SessionUserRow } from "@/features/auth/repositories/session.repository";

/**
 * Erişim kademeleri (PRD §5.0 "Erişim kademeleri" tablosu).
 *
 * | İşlem | Doğrulanmamış | KPS doğrulanmış | KPS + Personel |
 * | Gezinme, listeler, sipariş, bilet, destek | ✔ | ✔ | ✔ |
 * | Hastane randevusu · Spor salonu üyeliği   | ✘ | ✘ | ✔ |
 *
 * BU DOSYA SAF: veritabanı, çerez ve HTTP bilmez. Girdi olarak oturumu alır,
 * çıktı olarak kararı döner. Böylece kuralın kendisi tek bir birim testiyle
 * tam olarak kanıtlanabiliyor — sayfa render etmeden.
 *
 * KARAR HER ZAMAN SUNUCUDA VERİLİR. UI'da menü öğesini gizlemek yetkilendirme
 * değildir (05-auth-security.md); sayfalar da aynı kapıdan geçer.
 */

/** Bir sayfanın/ucun istediği en düşük kademe. */
export type AccessRequirement = "authenticated" | "identity_verified" | "staff";

/**
 * Kararın sonucu.
 *
 * Üç ayrı ret sebebi var çünkü PRD kullanıcıya EKSİĞİNE GÖRE FARKLI MESAJ
 * gösterilmesini istiyor: "giriş yap", "kimliğini doğrula" ve "burası
 * personele özel" birbirinin yerine geçmez. Tek tip bir "yetkiniz yok"
 * mesajı, kimliğini doğrulayarak erişebilecek kullanıcıyı da geri çevirirdi.
 */
export type AccessDecision = "allowed" | "sign_in_required" | "identity_required" | "staff_only";

export function evaluateAccess(
  session: SessionUserRow | null,
  requirement: AccessRequirement,
): AccessDecision {
  if (!session) return "sign_in_required";

  if (requirement === "authenticated") return "allowed";

  /**
   * Personel kademesi kimlik kademesini KAPSAR.
   *
   * ⚠️ GEREKÇE ADIM 17c'DE DEĞİŞTİ. Eskiden personel kaydı kimlik numarası
   * eşleşmesiyle kurulduğu için "doğrulanmamış personel" zaten imkânsızdı.
   * Artık yetki ayrı bir akıştan geliyor (ADR-017 ilke 2) ve kapsama
   * KENDİLİĞİNDEN doğru değil, KURAL olarak sağlanıyor: personel doğrulaması
   * `kps_verified` olmayan hesabı reddediyor
   * (`staff-verification.service.ts` → `assertEligible`).
   *
   * Bu satır o kuralın ikinci katmanı: veri elle bozulsa bile kullanıcı
   * doğru mesajı görür ve personel ekranı kimliği belirsiz bir hesaba açılmaz.
   */
  if (session.identityStatus !== "kps_verified") return "identity_required";

  if (requirement === "identity_verified") return "allowed";

  return session.isStaff ? "allowed" : "staff_only";
}
