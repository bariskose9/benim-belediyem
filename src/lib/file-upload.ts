/**
 * Yüklenen dosyanın GÜVENLİK DOĞRULAMASI (CLAUDE.md §5.5 · 05-auth-security.md
 * "Dosya yükleme": tip + boyut + uzantı doğrulanır, dosya adı sanitize edilir).
 *
 * ═══ İSTEMCİNİN SÖYLEDİĞİNE İNANILMAZ ═══
 *
 * Tarayıcının gönderdiği `Content-Type` ve dosya adı **kullanıcı girdisidir**;
 * ikisi de elle değiştirilebilir. Bir `.png` uzantısı ve `image/png` başlığıyla
 * gelen dosyanın içi pekâlâ HTML olabilir. Bu yüzden tür BAYTLARIN İMZASINDAN
 * (magic bytes) okunuyor ve dosya adının uzantısı **bizim** tespitimize göre
 * yeniden yazılıyor.
 *
 * SVG BİLEREK YOK: SVG bir XML belgesidir, içine `<script>` yazılabilir ve
 * tarayıcı onu görsel değil sayfa olarak çalıştırır. Kendi alan adımızdan
 * servis edilen bir SVG doğrudan XSS demektir.
 */

/** İzin verilen görsel türleri — imzası tanınmayan hiçbir dosya kabul edilmez. */
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** Ekranda "hangi dosyaları seçebilirim" ipucu ve `<input accept>` için. */
export const ALLOWED_IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

const EXTENSION_BY_TYPE: Readonly<Record<AllowedImageType, string>> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Sanitize edilmiş adın en fazla uzunluğu (uzantı dahil). */
const MAX_FILE_NAME_LENGTH = 80;

/** Adı tamamen elenen dosyaya verilecek yedek isim. */
const FALLBACK_BASE_NAME = "ek";

/**
 * Baytların imzasına bakarak gerçek türü söyler; tanımadıysa `null`.
 *
 * Yalnızca ilk 12 bayta bakılıyor — üç formatın da imzası orada bitiyor ve
 * dosyanın tamamını taramak hiçbir şey eklemezdi.
 */
export function detectImageType(bytes: Uint8Array): AllowedImageType | null {
  if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";

  // JPEG: FF D8 FF — sonrası (APP0/APP1) üreticiye göre değişir, bakılmaz.
  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";

  // WebP: "RIFF" ile başlar, 8. bayttan itibaren "WEBP" yazar. Araya dosya
  // uzunluğu giriyor, bu yüzden tek parça bir önek kontrolü yetmiyor.
  if (hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) && hasPrefixAt(bytes, 8, [0x57, 0x45, 0x42, 0x50]))
    return "image/webp";

  return null;
}

/**
 * Kullanıcının gönderdiği adı güvenli bir ada çevirir.
 *
 * Yapılanlar ve nedenleri:
 *  · yol ayıracından sonrası alınır → `../../etc/passwd` gibi bir ad, dizin
 *    dışına çıkma denemesi olmaktan çıkar
 *  · yalnızca harf, rakam, nokta, tire ve alt çizgi bırakılır → kabuk, HTML ve
 *    başlık enjeksiyonuna yarayacak karakter kalmaz
 *  · UZANTIYI BİZ YAZARIZ, kullanıcıdan almayız → `resim.png.html` gibi çift
 *    uzantılı adlar imkânsız
 *
 * Türkçe karakterler ASCII karşılıklarına indirgenmiyor, **atılıyor**: ad
 * yalnızca kullanıcıya gösterilen bir etikettir, kaybolan harf bir şeyi bozmaz;
 * karakter kümesini dar tutmak ise saldırı yüzeyini daraltır.
 */
export function sanitizeFileName(rawName: string, type: AllowedImageType): string {
  const withoutPath = rawName.split(/[\\/]/).pop() ?? "";
  const withoutExtension = withoutPath.replace(/\.[^.]*$/, "");

  const cleaned = withoutExtension
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[.-]+/, "")
    .replace(/[.-]+$/, "");

  const extension = EXTENSION_BY_TYPE[type];
  const base = (cleaned || FALLBACK_BASE_NAME).slice(
    0,
    MAX_FILE_NAME_LENGTH - extension.length - 1,
  );

  return `${base}.${extension}`;
}

function hasPrefix(bytes: Uint8Array, signature: readonly number[]): boolean {
  return hasPrefixAt(bytes, 0, signature);
}

function hasPrefixAt(bytes: Uint8Array, offset: number, signature: readonly number[]): boolean {
  if (bytes.length < offset + signature.length) return false;

  return signature.every((byte, index) => bytes[offset + index] === byte);
}
