import { isProductionEnv, serverEnv } from "@/config/env";

/**
 * Kayıt akışı şu an açık mı.
 *
 * Production'da doğrulama kodu GERÇEKTEN gönderilmek zorunda; kod ekranda
 * gösterilemiyor (05-auth-security.md). E-posta sağlayıcısı yapılandırılmamışsa
 * kullanıcı kimliğini doğrulayıp şifresini girer, sonra hiç gelmeyecek bir kodu
 * bekler. Bu yüzden akış en baştan kapatılıyor ve sebebi açıkça yazılıyor.
 *
 * NEDEN AÇILIŞTA PATLATMIYORUZ: uygulamanın tamamının açılmaması `main`'i
 * deploy edilemez hale getirir ve CLAUDE.md §6.1'i ("main her zaman çalışır ve
 * deploy edilebilir") kırardı. Anasayfa, sağlık ucu ve diğer sayfalar ayakta
 * kalıyor; yalnızca kayıt kapalı.
 *
 * Local ve preview'da sahte kanal kullanıldığı için her zaman açık.
 */
export function isRegistrationOpen(): boolean {
  if (!isProductionEnv) return true;

  return Boolean(serverEnv.EMAIL_API_KEY && serverEnv.EMAIL_FROM);
}
