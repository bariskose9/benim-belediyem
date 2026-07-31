import { randomInt, timingSafeEqual } from "node:crypto";

import { OTP_CODE_LENGTH } from "@/config/constants";
import { serverEnv } from "@/config/env";
import { hashPseudonym } from "@/lib/crypto";

/**
 * Doğrulama kodunun üretimi ve özetlenmesi.
 *
 * `05-auth-security.md`: "6 hane... veritabanında ÖZETLENEREK saklanır;
 * düz kod ve hedef adres tutulmaz."
 */

const CODE_UPPER_BOUND = 10 ** OTP_CODE_LENGTH;

/**
 * Kriptografik olarak güvenli 6 haneli kod.
 *
 * `Math.random()` KULLANILMAZ: tahmin edilebilir bir üreteç, kodu deneyerek
 * bulunabilir hale getirir. `randomInt` işletim sisteminin entropi havuzunu
 * kullanır.
 *
 * Baştaki sıfırlar korunur — `000123` geçerli bir koddur ve kod uzayını
 * 900.000'e düşürmek yerine tam 1.000.000'da tutar.
 */
export function generateOtpCode(): string {
  return String(randomInt(0, CODE_UPPER_BOUND)).padStart(OTP_CODE_LENGTH, "0");
}

/**
 * Kodun özeti.
 *
 * `scope` KAPSAM AYIRICIDIR: aynı kod (örn. `123456`) farklı kayıtlar için
 * farklı özet üretsin diye. Aksi hâlde `code_hash` kolonu bir gökkuşağı
 * tablosuna dönüşürdü — saldırgan 1.000.000 özeti önceden hesaplayıp tabloda
 * arayarak herkesin kodunu okuyabilirdi.
 */
export function hashOtpCode(code: string, scope: string): string {
  return hashPseudonym(code, serverEnv.NATIONAL_ID_HASH_SALT, `otp:${scope}`);
}

/**
 * Kod karşılaştırması — SABİT ZAMANLI.
 *
 * Düz `===` karşılaştırması ilk farklı karakterde durur; saldırgan yanıt
 * süresini ölçerek kodu hane hane bulabilir. Özetler aynı uzunlukta olduğu
 * için `timingSafeEqual` doğrudan kullanılabilir.
 */
export function otpCodeMatches(code: string, scope: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashOtpCode(code, scope), "hex");
  const stored = Buffer.from(storedHash, "hex");

  if (candidate.length !== stored.length || stored.length === 0) return false;

  return timingSafeEqual(candidate, stored);
}
