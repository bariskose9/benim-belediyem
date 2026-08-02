import { isProductionEnv, serverEnv } from "@/config/env";

/**
 * E-postayla kod göndermeye DAYANAN akışların açık olup olmadığı.
 *
 * İki akış var ve ikisi de aynı koşula bağlı: kayıt (4b-1) ve şifre sıfırlama
 * (4b-3). Bu yüzden kural tek yerde duruyor — biri açılıp diğeri unutulursa
 * kullanıcı gelmeyecek bir kodu bekler.
 */

/**
 * Production'da doğrulama kodu GERÇEKTEN gönderilmek zorunda; kod ekranda
 * gösterilemiyor (05-auth-security.md). E-posta sağlayıcısı yapılandırılmamışsa
 * akış en baştan kapatılır ve sebebi kullanıcıya açıkça yazılır.
 *
 * NEDEN AÇILIŞTA PATLATMIYORUZ: uygulamanın tamamının açılmaması `main`'i
 * deploy edilemez hale getirir ve CLAUDE.md §6.1'i ("main her zaman çalışır ve
 * deploy edilebilir") kırardı. Anasayfa, sağlık ucu ve diğer sayfalar ayakta
 * kalıyor; yalnızca bu iki akış kapalı.
 *
 * Local ve preview'da sahte kanal kullanıldığı için her zaman açık.
 */
function isEmailDeliveryConfigured(): boolean {
  if (!isProductionEnv) return true;

  return Boolean(serverEnv.EMAIL_API_KEY && serverEnv.EMAIL_FROM);
}

/** Kayıt akışı şu an açık mı (4b-1). */
export function isRegistrationOpen(): boolean {
  return isEmailDeliveryConfigured();
}

/**
 * Şifre sıfırlama şu an açık mı (4b-3).
 *
 * KAPI AKIŞIN EN BAŞINDA çalışır, hesap arandıktan sonra değil: sıra ters
 * olsaydı kayıtlı numara "gönderemedim" (503), kayıtsız numara "gönderdik"
 * (201) alır ve hesap sayımı koruması delinirdi.
 */
export function isPasswordResetOpen(): boolean {
  return isEmailDeliveryConfigured();
}
