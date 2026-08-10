import { z } from "zod";

import { ConsentType } from "@/generated/prisma/enums";

/**
 * Rıza yazma isteğinin şeması (adım 17).
 *
 * ⛔ ÖZNE GÖVDEDEN GELMİYOR: `userId` ve `anonymousId` şemada YOK. İkisi de
 * sunucuda, oturumdan ve çerezden okunuyor. İstemci gönderse bile buradan
 * geçemez, dolayısıyla kimse bir başkasının adına rıza kaydı yazdıramaz
 * (05-auth-security.md → IDOR).
 *
 * ⛔ HANGİ RIZA TÜRÜNÜN YAZILABİLECEĞİ SINIRLI: bant yalnızca çerez
 * bildirimini yönetiyor. `terms_of_use` ve `privacy_notice` kayıtları kayıt
 * akışında SUNUCUDA yazılıyor; bir uçtan tetiklenebilseydi kullanıcı hiç
 * görmediği bir metni kabul etmiş görünebilirdi.
 */
export const WRITABLE_CONSENT_TYPES = [ConsentType.necessary_cookies] as const;

export const consentInputSchema = z.object({
  consentType: z.enum(WRITABLE_CONSENT_TYPES),
  /**
   * `"1"` / `"0"` biçiminde geliyor çünkü bandı JavaScript'siz bir form
   * gönderiyor; form alanları her zaman metindir. Zod'un `coerce.boolean()`
   * kullanılmadı: o, `"0"` dizesini de `true` sayardı ("boş olmayan metin").
   */
  isGranted: z.enum(["0", "1"]).transform((value) => value === "1"),
  /** Kullanıcının geri döneceği yol. Değeri `sanitizeRedirectPath` temizler. */
  returnTo: z.string().max(2048).optional(),
});

export type ConsentInput = z.infer<typeof consentInputSchema>;
