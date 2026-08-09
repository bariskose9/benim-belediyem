/** @vitest-environment node */
import { describe, expect, it } from "vitest";

import { detectImageType, sanitizeFileName } from "@/lib/file-upload";

/**
 * Dosya yükleme güvenlik kontrollerinin birim testi
 * (CLAUDE.md §5.5 · 05-auth-security.md "Dosya yükleme").
 *
 * ⛔ BU TESTİN ASIL AMACI: istemcinin SÖYLEDİĞİNE değil dosyanın İÇİNDEKİNE
 * bakıldığını kanıtlamak. Uzantısı `.png` olan bir HTML dosyası kabul
 * edilirse, kendi alan adımızdan servis edilen bir XSS yüzeyi açılır.
 */

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

/** "RIFF" + 4 bayt uzunluk + "WEBP" */
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe("detectImageType", () => {
  it("PNG, JPEG ve WebP imzalarını tanır", () => {
    expect(detectImageType(PNG)).toBe("image/png");
    expect(detectImageType(JPEG)).toBe("image/jpeg");
    expect(detectImageType(WEBP)).toBe("image/webp");
  });

  it("HTML İÇERİĞİNİ REDDEDER — uzantı ne olursa olsun", () => {
    const html = new TextEncoder().encode("<script>alert(1)</script>");

    expect(detectImageType(html)).toBeNull();
  });

  it("SVG'yi reddeder: XML'dir ve içine betik yazılabilir", () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    expect(detectImageType(svg)).toBeNull();
  });

  it("'RIFF' ile başlayan ama WebP OLMAYAN dosyayı reddeder", () => {
    // RIFF kapsayıcısı WAV ses dosyalarında da kullanılıyor.
    const wav = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    ]);

    expect(detectImageType(wav)).toBeNull();
  });

  it("imzadan kısa dosyada patlamaz, null döner", () => {
    expect(detectImageType(new Uint8Array([0x89, 0x50]))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});

describe("sanitizeFileName", () => {
  it("DİZİN DIŞINA ÇIKMA denemesini adın parçası olmaktan çıkarır", () => {
    expect(sanitizeFileName("../../etc/passwd", "image/png")).toBe("passwd.png");
    expect(sanitizeFileName("C:\\Users\\gizli\\rapor.png", "image/png")).toBe("rapor.png");
  });

  it("UZANTIYI KENDİ YAZAR: çift uzantı bırakmaz", () => {
    expect(sanitizeFileName("resim.png.html", "image/png")).toBe("resim.png.png");
    expect(sanitizeFileName("belge.exe", "image/jpeg")).toBe("belge.jpg");
  });

  it("tehlikeli karakterleri temizler", () => {
    // Sondaki tire de düşüyor: ad "ek-script-" değil "ek-script" olur.
    expect(sanitizeFileName('ek";<script>.png', "image/webp")).toBe("ek-script.webp");
  });

  it("adı tamamen elenen dosyaya yedek isim verir", () => {
    expect(sanitizeFileName("...", "image/png")).toBe("ek.png");
    expect(sanitizeFileName("", "image/png")).toBe("ek.png");
  });

  it("çok uzun adı kırpar", () => {
    const result = sanitizeFileName(`${"a".repeat(300)}.png`, "image/png");

    expect(result.length).toBeLessThanOrEqual(80);
    expect(result.endsWith(".png")).toBe(true);
  });
});
