import { z } from "zod";

import { PASSWORD_MAX_LENGTH } from "@/config/constants";
import { messages } from "@/config/messages";
import { isValidNationalId } from "@/lib/crypto";

/**
 * Giriş ucunun girdi şeması (`03-api-guidelines.md`: her uç Zod ile doğrulanır).
 *
 * TÜM HATA MESAJLARI AYNI: hangi alanın tutmadığı söylenmez ve route katmanı
 * şema hatasını da `InvalidCredentialsError` (401) olarak döndürür. Ayrı bir
 * 422 dönseydi, durum kodunun kendisi "numaranın biçimi bozuk" ile "şifre
 * yanlış" arasındaki farkı ele verirdi.
 *
 * BURADA ŞİFRE POLİTİKASI UYGULANMAZ (uzunluk alt sınırı, yaygın şifre
 * listesi). Politika kayıt ve şifre değişimi içindir; girişte uygulamak,
 * kuralları sıkılaştırdığımız gün eski şifresiyle giren kullanıcıyı kapıda
 * bırakırdı. Tek istisna üst sınır: argon2 girdiyi kesmediği için sınırsız
 * uzun şifre sınırsız CPU demektir (hizmet dışı bırakma yolu).
 */

const copy = messages.auth.login.errors;

export const loginSchema = z.object({
  nationalId: z.string().trim().refine(isValidNationalId, { error: copy.invalidCredentials }),
  password: z.string().min(1, { error: copy.invalidCredentials }).max(PASSWORD_MAX_LENGTH, {
    error: copy.invalidCredentials,
  }),
  /**
   * Boş string kabul ediliyor ki "hiç gönderilmedi" durumu şema hatası değil,
   * `BOT_CHECK_REQUIRED` (403) olarak dönsün — ekran kutuyu buna göre açıyor.
   */
  turnstileToken: z.string().default(""),
});

export type LoginPayload = z.infer<typeof loginSchema>;

/**
 * ═══ YANIT SÖZLEŞMESİ (borç #107 · adım 107b · ADR-021) ═══
 *
 * ⛔ OTURUM JETONU GÖVDEDE DÖNMÜYOR ve şemanın bunu göstermesi bir güvence:
 * jeton `httpOnly` çerezle taşınıyor (ADR-002, ADR-005). Gövdede yalnızca
 * oturumun ne zaman biteceği var — arayüz buna göre uyarı gösteriyor.
 */
export const sessionCreatedResponseSchema = z.object({
  expiresAt: z.iso.datetime(),
});
