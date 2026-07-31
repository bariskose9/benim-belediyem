import { z } from "zod";

import { isValidNationalId } from "@/lib/crypto";

/**
 * Kimlik sorgusu girdisi (03-api-guidelines.md → "her endpoint girişi Zod ile").
 *
 * İKİ ALAN DA ZORUNLU. Kimlik numarası tek başına kabul edilmiyor: ikinci
 * doğrulama alanı olmadan dönen bir uç, elindeki numara listesini isim/adres
 * listesine çeviren bir servise dönüşür (05-auth-security.md → "tek alanla
 * veri dönülmez"). Şema seviyesinde zorunlu kılınması bilinçli: ileride biri
 * bu servisi başka bir akıştan çağırırsa alanı atlayamaz.
 */
export const identityLookupSchema = z.object({
  nationalId: z
    .string()
    .trim()
    // Kontrol basamağı algoritması SUNUCUDA doğrulanıyor (PRD §5.0 kayıt akışı
    // adım 2). Uydurma numaralarla dış servisi yormanın önüne geçer.
    .refine(isValidNationalId),

  /**
   * Doğum YILI — tam tarih değil. Kayıt formunda kullanıcıdan tam doğum tarihi
   * istemek gereksiz veri toplamak olurdu; doğrulama için yıl yeterli
   * (14-privacy-and-compliance.md → veri minimizasyonu).
   *
   * Üst sınır sabit değil, "içinde bulunulan yıl": sabit bir yıl yazılsaydı
   * kod birkaç yıl sonra sessizce yanlış davranırdı.
   */
  birthYear: z.coerce.number().int().min(1900).max(new Date().getUTCFullYear()),
});

export type IdentityLookupPayload = z.infer<typeof identityLookupSchema>;
