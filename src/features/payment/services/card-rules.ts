import {
  CARD_CVV_MAX_DIGITS,
  CARD_CVV_MIN_DIGITS,
  CARD_NUMBER_MAX_DIGITS,
  CARD_NUMBER_MIN_DIGITS,
} from "@/config/constants";
import type { CardBrand } from "@/generated/prisma/enums";

/**
 * Kart doğrulamasının SAF kuralları (PRD §6.2 adım 3).
 *
 * Bu dosya veritabanı, HTTP ve ödeme sağlayıcısı bilmez; girdi olarak metin
 * alır, çıktı olarak karar döner. `access-control.ts` ve `appointment-rules.ts`
 * ile aynı gerekçe: kural tek bir birim testiyle, hiçbir şey ayağa
 * kaldırmadan tam olarak kanıtlanabiliyor.
 *
 * ⛔ BU DOSYADAKİ HİÇBİR FONKSİYON KART NUMARASINI SAKLAMAZ, LOG'A YAZMAZ
 * VEYA HATA MESAJINA KOYMAZ. Numara yalnızca parametre olarak gelir, karar
 * üretilir ve unutulur (05-auth-security.md → "log'a, hata takip aracına,
 * analitiğe ASLA yazılmaz").
 */

/** Kart numarasından boşluk ve tireleri atar. Kullanıcı `4111 1111 ...` yazabilir. */
export function normalizeCardNumber(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

/**
 * Luhn kontrol algoritması (PRD §6.2 adım 3).
 *
 * NE YAPAR: numaranın kendi içinde tutarlı olup olmadığına bakar — yazım
 * hatası ve rastgele uydurulmuş numara buradan geçemez.
 * NE YAPMAZ: kartın gerçekten var olduğunu ya da bakiyesi olduğunu söylemez.
 * O sahte sağlayıcının işi.
 *
 * Sağdan sola gidilir; bir atlayarak her rakam iki katına çıkarılır, 9'u
 * aşarsa 9 çıkarılır (rakamları toplamakla aynı şey), toplam 10'a bölünür.
 */
export function isValidLuhn(cardNumber: string): boolean {
  const digits = normalizeCardNumber(cardNumber);

  if (!/^\d+$/.test(digits)) return false;
  if (digits.length < CARD_NUMBER_MIN_DIGITS || digits.length > CARD_NUMBER_MAX_DIGITS) {
    return false;
  }

  let sum = 0;
  let double = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);

    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
}

/**
 * Kart markasını numaranın ön ekinden çıkarır.
 *
 * Marka bilgisi SAKLANIR (numara saklanmaz): kullanıcı kayıtlı kartını
 * "Visa •••• 1111" diye tanır.
 *
 * YALNIZCA VISA VE MASTERCARD TANINIYOR ve bu bilinçli bir sınır:
 * `CardBrand` enum'ında (adım 3'te kurulan şema) başka değer yok ve
 * `fake-data-guide.md`'deki dört test kartının dördü de bu iki markadan.
 * Amex veya Troy eklemek şema değişikliği + migration demekti ve hiçbir
 * doküman bunu istemiyor (YAGNI).
 *
 * Tanınmayan numara `visa`'ya DÜŞMEZ, `null` döner ve çağıran reddeder —
 * yanlış marka etiketi kullanıcıyı kendi kartı hakkında yanıltırdı.
 */
export function detectCardBrand(cardNumber: string): CardBrand | null {
  const digits = normalizeCardNumber(cardNumber);

  if (/^4/.test(digits)) return "visa";
  // Mastercard: 51-55 ve 2221-2720 aralıkları.
  if (/^5[1-5]/.test(digits)) return "mastercard";
  if (/^2(2[2-9]\d|[3-6]\d{2}|7[01]\d|720)/.test(digits)) return "mastercard";

  return null;
}

/** Kartın son 4 hanesi — veritabanına yazılan TEK numara parçası. */
export function lastFourDigits(cardNumber: string): string {
  return normalizeCardNumber(cardNumber).slice(-4);
}

/**
 * Son kullanma tarihi geçmiş mi (PRD §6.2 adım 3).
 *
 * KART, SON KULLANMA AYININ SONUNA KADAR GEÇERLİDİR. `12/2030` yazan bir kart
 * 31 Aralık 2030'da hâlâ çalışır; ayın ilkinde geçersiz saymak kullanıcıyı bir
 * ay erken reddederdi. Karşılaştırma bu yüzden "bir sonraki ayın başı" ile
 * yapılıyor.
 *
 * Ölçüt SUNUCUNUN ANI, istemcinin gönderdiği tarih değil.
 */
export function isExpired(expMonth: number, expYear: number, now: Date): boolean {
  if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) return true;
  if (!Number.isInteger(expYear) || expYear < 1970) return true;

  // `Date.UTC` ay parametresi 0 tabanlı; `expMonth` vermek doğrudan BİR SONRAKİ
  // ayın başını üretir — tam olarak istediğimiz sınır.
  const expiresAfter = Date.UTC(expYear, expMonth, 1);

  return now.getTime() >= expiresAfter;
}

/** CVV yalnızca rakam ve 3-4 hane olmalı. Hiçbir yere yazılmaz, yalnızca doğrulanır. */
export function isValidCvv(cvv: string): boolean {
  return new RegExp(`^\\d{${CARD_CVV_MIN_DIGITS},${CARD_CVV_MAX_DIGITS}}$`).test(cvv);
}
