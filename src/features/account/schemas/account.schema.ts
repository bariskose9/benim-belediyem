import { z } from "zod";

import { PASSWORD_MAX_LENGTH } from "@/config/constants";
import { messages } from "@/config/messages";
import { turkishPhoneSchema } from "@/features/auth/schemas/registration.schema";

/**
 * Hesap yönetimi uçlarının girdi şemaları (PRD §5.11 · ADR-017).
 *
 * ⛔ `userId` HİÇBİR ŞEMADA YOK. Kimlik oturumdan geliyor; istemcinin gövdeye
 * yazacağı bir kullanıcı kimliği sonuca hiç ulaşamaz (05-auth-security.md).
 *
 * ⛔ "NEYİN SİLİNECEĞİ" DE İSTEMCİDEN GELMİYOR. Silmenin kapsamı sunucuda
 * sabittir (`account-erasure.repository.ts`); istemciye "şu tabloyu da sil"
 * dedirtecek bir alan yok. Aksi hâlde mali kayıt saklama yükümlülüğü
 * (TTK m.82) bir istek gövdesiyle delinebilirdi.
 */

const copy = messages.account.errors;

/**
 * Şifre alanı — geri alınamaz işlemlerin ikinci kanıtı.
 *
 * OPSİYONEL ve bu bilinçli: Google ile açılmış hesapların şifresi YOKTUR
 * (`google-account.repository.ts`). Zorunlu kılmak, o kullanıcıların hesabını
 * hiç silememesi demek olurdu. "Şifresi olan hesap şifre vermek zorunda"
 * kuralı şemada değil SERVİSTE uygulanıyor — çünkü şema hesabın şifresi olup
 * olmadığını bilemez.
 *
 * ⛔ ALT SINIR YOK (`min(1)` bile yok, boş string kabul ediliyor): burada
 * şifre POLİTİKASI uygulanmaz, giriş şemasındaki gerekçenin aynısı. Kurallar
 * sıkılaştığında eski şifresini doğru yazan kullanıcı kapıda kalmamalı.
 * Üst sınır ise ŞART: argon2 girdiyi kesmiyor, sınırsız uzun şifre sınırsız
 * CPU demek (hizmet dışı bırakma yolu).
 */
const confirmationPasswordSchema = z.string().max(PASSWORD_MAX_LENGTH, {
  error: copy.passwordMismatch,
});

/**
 * Hesap silme gövdesi.
 *
 * `confirmation` alanı BİLEREK YOK: kullanıcıya "HESABIMI SİL yaz" dedirten
 * desen değerlendirildi ve seçilmedi. Ekranda zaten satır içi bir onay paneli
 * var (shadcn'de Dialog yok — 07-ui-design-system.md) ve şifresi olan hesapta
 * ikinci kanıt zaten isteniyor. Üçüncü bir sürtünme, kararı daha bilinçli
 * yapmadan yalnızca erişilebilirliği düşürürdü.
 */
export const accountDeletionSchema = z.object({
  password: confirmationPasswordSchema.optional(),
});

export type AccountDeletionPayload = z.infer<typeof accountDeletionSchema>;

/** Kimlik bağını çözme gövdesi — silmeyle aynı kanıt, aynı gerekçe. */
export const identityUnlinkSchema = z.object({
  password: confirmationPasswordSchema.optional(),
});

export type IdentityUnlinkPayload = z.infer<typeof identityUnlinkSchema>;

/**
 * Telefon güncelleme gövdesi (teknik borç #80).
 *
 * Kayıt akışıyla AYNI şemayı kullanıyor (`turkishPhoneSchema`): numaranın
 * biçimi iki yerde ayrı tanımlansaydı, biri `+90` önekini kabul ederken
 * diğeri reddeder ve kullanıcı aynı numarayı bir yerde yazıp diğerinde
 * yazamazdı.
 */
export const accountPhoneSchema = z.object({
  phone: turkishPhoneSchema,
});

export type AccountPhonePayload = z.infer<typeof accountPhoneSchema>;
