import argon2 from "argon2";

import { ARGON2_MEMORY_COST_KIB, ARGON2_PARALLELISM, ARGON2_TIME_COST } from "@/config/constants";

/**
 * Şifre özetleme — argon2id (ADR-011 · 05-auth-security.md).
 *
 * Parametreler `src/config/constants.ts` içinde; donanım hızlanınca
 * yükseltilecek TEK yer orasıdır.
 *
 * BU DOSYA HİÇBİR KİMLİK DOĞRULAMA KÜTÜPHANESİNE BAĞLI DEĞİL ve bu bilinçli:
 * adım 4b-2'de oturum kararı verilirken (Auth.js mi, elle yazılmış veritabanı
 * oturumu mu) bu seçim serbest kalsın diye. Sade iki fonksiyon, sade bir
 * `passwordHash` string'i.
 *
 * ÖZET LOG'A YAZILMAZ, düz şifre hiçbir yerde saklanmaz.
 */

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: ARGON2_MEMORY_COST_KIB,
  timeCost: ARGON2_TIME_COST,
  parallelism: ARGON2_PARALLELISM,
} as const;

export async function hashPassword(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, ARGON2_OPTIONS);
}

/**
 * Şifreyi özetle karşılaştırır.
 *
 * Bozuk veya tanınmayan bir özet için `false` döner, HATA FIRLATMAZ: giriş
 * akışında bir hesabın özeti bozuksa istisna fırlatmak "bu hesap var ama
 * bozuk" bilgisini 500 hatasıyla sızdırırdı. Sessizce eşleşmemiş sayılır.
 */
export async function verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainPassword);
  } catch {
    return false;
  }
}
