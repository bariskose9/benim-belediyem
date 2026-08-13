import { z } from "zod";

import { TURNSTILE_TOKEN_MAX_LENGTH } from "@/config/constants";
import { messages } from "@/config/messages";
import { isValidNationalId } from "@/lib/crypto";

/**
 * "Kimliğini kanıtla" girdisi — T.C. kimlik numarası + doğum yılı + bot jetonu.
 *
 * ═══ NEDEN ORTAK BİR ŞEMA ═══
 * Bu üçlüyü İKİ akış soruyor: kayıt (yeni hesap açarken) ve kimlik doğrulama
 * (Google ile açılmış MEVCUT hesaba kimlik bağlarken). İkisi farklı şey yapar
 * ama SORDUĞU SORU aynı. İki kopya olsaydı, birinde sıkılaştırılan bir kural
 * (ör. kontrol basamağı) diğerinde sessizce gevşek kalırdı.
 *
 * Şema İSTEMCİYE GÜVENMEZ: yaş, personel durumu, kimlik durumu gibi yetki
 * belirleyici hiçbir alan burada YOKTUR — hepsi sunucuda hesaplanır.
 */

const copy = messages.auth.register.errors;

/**
 * Kimlik numarası. Kontrol basamağı BURADA da doğrulanıyor ama asıl kapı
 * `lookupIdentity` içinde; buradaki kontrol yalnızca geçersiz numaralar için
 * gereksiz bir dış servis çağrısını önlüyor.
 *
 * Hata mesajı TEK TİP: hangi kuralın tutmadığı söylenmiyor
 * (05-auth-security.md → numara taraması koruması).
 */
const nationalIdSchema = z
  .string()
  .trim()
  .refine(isValidNationalId, { error: messages.identity.lookupFailed });

/**
 * ⚠️ BURADAKİ MESAJLAR KULLANICIYA ULAŞMIYOR ve bu BİLİNÇLİ.
 *
 * İki uç da (`/api/v1/registrations`, `/api/v1/identity-verifications`) şema hatasını
 * yakalayıp TEK TİP `IDENTITY_CHECK_FAILED` döndürüyor; `parsed.error` hiç
 * okunmuyor. Gerekçe 05-auth-security.md: "hangi alanın tutmadığı söylenmez" —
 * "doğum yılın bozuk" demek, numara taraması yapan birine hangi alanı
 * düzeltmesi gerektiğini söylerdi.
 *
 * Mesajlar yine de yazılı: şema başka bir akıştan (ör. alan bazlı hata
 * gösteren bir yönetim ekranı) kullanılırsa hazır olsun ve boş bir Zod
 * varsayılanı ("Invalid input") İngilizce sızmasın.
 */
const birthYearSchema = z.coerce
  .number({ error: copy.invalidBirthYear })
  .int({ error: copy.invalidBirthYear })
  .min(1900, { error: copy.invalidBirthYear })
  .max(new Date().getUTCFullYear(), { error: copy.invalidBirthYear });

/**
 * Bot doğrulama jetonu. Boş string kabul ediliyor ki "hiç gönderilmedi"
 * durumu şema hatası (422) değil, BOT_CHECK_REQUIRED (403) olarak dönsün —
 * PRD kabul kriteri bu uçlar için 403 istiyor.
 *
 * ÜST SINIR VAR (2026-08-10 güvenlik denetimi): jeton doğrulanmak için
 * Cloudflare'a gönderiliyor, yani sınırsız uzunluk hem bizim hem dış servisin
 * kaynağını tüketen bedava bir yük demekti. Cloudflare jetonu 2048 karakteri
 * geçmiyor; sınır iki katına konuldu ki sağlayıcı biçimi büyütürse akış
 * sessizce kırılmasın.
 */
export const turnstileTokenSchema = z.string().max(TURNSTILE_TOKEN_MAX_LENGTH).default("");

export const identityChallengeSchema = z.object({
  nationalId: nationalIdSchema,
  birthYear: birthYearSchema,
  turnstileToken: turnstileTokenSchema,
});

export type IdentityChallengePayload = z.infer<typeof identityChallengeSchema>;
