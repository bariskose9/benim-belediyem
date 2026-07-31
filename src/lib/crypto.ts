import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

/**
 * Kimlik numarası (T.C. kimlik no) işlemleri — doğrulama, maskeleme, özet, şifreleme.
 * Dosya adı `REPO-YAPISI.md`'de tanımlıdır: `src/lib/crypto.ts`.
 *
 * docs/standards/05-auth-security.md "Kimlik verisinin saklanması":
 *   · veritabanında ŞİFRELENEREK saklanır, düz metin kolon bulunmaz
 *   · aramak için ayrıca TUZLANMIŞ ÖZET tutulur
 *   · ekranda daima maskelenir
 *
 * Buradaki fonksiyonlar SAF'tır: anahtarı ve tuzu ortam değişkeninden kendileri
 * okumaz, çağıran verir. Neden: hem test edilebilirler hem de tohumlama betiği
 * (prisma/seed) Next.js ortam doğrulamasını yüklemeden kullanabilir.
 */

const NATIONAL_ID_LENGTH = 11;

/** Şifreli metnin biçim sürümü. İleride algoritma değişirse eski kayıtlar ayırt edilebilsin diye. */
const ENVELOPE_VERSION = "v1";

/** AES-256-GCM: 32 baytlık anahtar, 12 baytlık nonce (GCM için önerilen uzunluk). */
const KEY_BYTES = 32;
const IV_BYTES = 12;

/**
 * Kontrol basamağı algoritması. Yalnızca biçim doğrular — numaranın gerçekte
 * birine ait olduğunu SÖYLEMEZ. Kimlik doğrulaması KPS sorgusuyla yapılır.
 *
 * Kural: 11 hane, ilk hane 0 olamaz,
 *   10. hane = ((1,3,5,7,9. hanelerin toplamı) * 7 - (2,4,6,8. hanelerin toplamı)) mod 10
 *   11. hane = (ilk 10 hanenin toplamı) mod 10
 */
export function isValidNationalId(value: string): boolean {
  if (!/^[1-9][0-9]{10}$/.test(value)) return false;

  const digits = [...value].map(Number);
  const [tenth, eleventh] = computeCheckDigits(digits.slice(0, 9));

  return digits[9] === tenth && digits[10] === eleventh;
}

/** İlk 9 haneden son iki kontrol basamağını üretir (doğrulama ve sahte veri üretimi ortak kullanır). */
export function computeCheckDigits(firstNine: readonly number[]): [number, number] {
  if (firstNine.length !== 9) {
    throw new Error("Kontrol basamağı için tam 9 hane gerekli.");
  }

  const oddSum = firstNine[0] + firstNine[2] + firstNine[4] + firstNine[6] + firstNine[8];
  const evenSum = firstNine[1] + firstNine[3] + firstNine[5] + firstNine[7];

  // JS'te negatif sayının % operatörü negatif döner; +10 ile pozitife çekiliyor.
  const tenth = (((oddSum * 7 - evenSum) % 10) + 10) % 10;
  const eleventh = (firstNine.reduce((sum, digit) => sum + digit, 0) + tenth) % 10;

  return [tenth, eleventh];
}

/**
 * Ekranda gösterilecek maskeli hâl: ilk 3 ve son 2 hane açık, arası yıldız.
 * Uzunluk korunur ki maskeli değer gerçek numarayla aynı boyda görünsün.
 */
export function maskNationalId(value: string): string {
  if (value.length !== NATIONAL_ID_LENGTH) {
    throw new Error("Maskeleme için 11 haneli kimlik numarası gerekli.");
  }

  return `${value.slice(0, 3)}${"*".repeat(NATIONAL_ID_LENGTH - 5)}${value.slice(-2)}`;
}

/**
 * Aramak ve tekilliği zorlamak için tuzlanmış özet ("kör indeks").
 *
 * Neden HMAC ve neden tuz: düz SHA-256 özetinde 11 hanelik tüm numara uzayı
 * (10^10) kaba kuvvetle taranabilir; gizli tuzla bu saldırı, tuz sızmadıkça
 * çalışmaz. Aynı numara her zaman aynı özeti verir — unique index bu yüzden iş görür.
 */
export function hashNationalId(value: string, salt: string): string {
  if (!salt) {
    throw new Error("NATIONAL_ID_HASH_SALT tanımlı değil — kimlik özeti üretilemez.");
  }

  return createHmac("sha256", salt).update(value).digest("hex");
}

/**
 * Kimlik numarası DIŞINDAKİ tanımlayıcılar için takma ad (pseudonym) özeti —
 * bugün IP adresi, ileride benzeri alanlar.
 *
 * Neden `hashNationalId` ile aynı fonksiyon kullanılmıyor: `domain` parametresi
 * alan ayrımı yapar. Aynı tuzla özetlenen iki farklı alan (kimlik numarası ve
 * IP) alan adı karışmadan özetlenirse, bir alanın özet tablosu diğerine karşı
 * kullanılabilir. Alan adı önek olarak karıştığı için özetler artık kesişmez.
 *
 * `hashNationalId` bilerek dokunulmadı: onun ürettiği özetler veritabanında
 * duruyor ve girdisi değişirse tüm mevcut kayıtlar bulunamaz hale gelirdi.
 */
export function hashPseudonym(value: string, salt: string, domain: string): string {
  if (!salt) {
    throw new Error("NATIONAL_ID_HASH_SALT tanımlı değil — takma ad özeti üretilemez.");
  }

  return createHmac("sha256", salt).update(`${domain}:${value}`).digest("hex");
}

/**
 * AES-256-GCM ile şifreler. Her çağrıda RASTGELE nonce kullanılır, dolayısıyla
 * aynı numara her seferinde farklı şifreli metin üretir. Bu yüzden şifreli kolon
 * üzerinde unique index KURULAMAZ; tekilliği `hashNationalId` sağlar.
 *
 * GCM seçildi çünkü şifrelemeye ek olarak bütünlük etiketi üretir: kayıt
 * veritabanında kurcalanırsa çözme işlemi sessizce yanlış sonuç vermez, hata verir.
 */
export function encryptNationalId(value: string, keyBase64: string): string {
  const key = readKey(keyBase64);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);

  return [
    ENVELOPE_VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

/** Şifreli değeri çözer. Biçim bozuksa veya etiket tutmuyorsa hata fırlatır. */
export function decryptNationalId(envelope: string, keyBase64: string): string {
  const parts = envelope.split(".");

  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
    throw new Error("Şifreli kimlik numarasının biçimi tanınmıyor.");
  }

  const key = readKey(keyBase64);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(parts[1], "base64"));

  decipher.setAuthTag(Buffer.from(parts[2], "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(parts[3], "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function readKey(keyBase64: string): Buffer {
  if (!keyBase64) {
    throw new Error("NATIONAL_ID_ENCRYPTION_KEY tanımlı değil — kimlik numarası şifrelenemez.");
  }

  const key = Buffer.from(keyBase64, "base64");

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `NATIONAL_ID_ENCRYPTION_KEY 32 bayt olmalı (base64 kodlu), şu an ${key.length} bayt.\n` +
        "Yapılacak: openssl rand -base64 32",
    );
  }

  return key;
}
