import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Lisans kapısı — `docs/standards/16-yeni-proje-kurulumu.md`.
 *
 * ⛔⛔ BU TEST BİR TÖREN DEĞİL, BİR MEKANİZMA.
 *
 * Depo, `package.json` içinde `"license": "MIT"` diyor ama kökte `LICENSE`
 * dosyası **yoktu** (2026-08-11, adım 18c'de fark edildi). O hâlde depo kendi
 * kendisiyle çelişiyordu: makine "MIT" okuyor, hukuken geçerli olan ise
 * lisans dosyasının yokluğu — yani "her hakkı saklı". Public bir depoda bu,
 * kodu görülebilir ama kullanılamaz yapar.
 *
 * Kural zaten yazılıydı ve yine de ihlal edildi. Teknik borç #100'ün dersi
 * burada da geçerli: **bir kural, mekanizması olmadan niyettir.** Bu test o
 * mekanizmadır — kural bir daha sessizce ihlal edilemez.
 */

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { license?: string };

/**
 * Lisansın ADI ile dosyanın İÇERİĞİ arasındaki bağ. Yalnızca dosyanın VAR
 * olmasını aramak yetmez: `package.json` "MIT" derken kökte Apache-2.0 metni
 * durabilirdi ve kapı yine yeşil kalırdı.
 */
const LICENSE_HEADINGS: Record<string, string> = {
  MIT: "MIT License",
  "Apache-2.0": "Apache License",
  "BSD-3-Clause": "BSD 3-Clause",
  ISC: "ISC License",
};

describe("lisans", () => {
  it("package.json bir lisans BEYAN EDİYOR", () => {
    // Beyan yoksa aşağıdaki kontrollerin hiçbiri anlamlı olmaz.
    expect(packageJson.license, "package.json içinde `license` alanı yok").toBeTruthy();
  });

  it("beyan edilen lisansın DOSYASI kökte duruyor", () => {
    let contents: string;

    try {
      contents = readFileSync("LICENSE", "utf8");
    } catch {
      throw new Error(
        `package.json "${packageJson.license}" diyor ama kökte LICENSE dosyası yok. ` +
          `Lisanssız depo hukuken "her hakkı saklı"dır.`,
      );
    }

    expect(contents.trim().length, "LICENSE dosyası boş").toBeGreaterThan(0);
  });

  it("LICENSE dosyasının içeriği beyan edilen lisansla AYNI", () => {
    const declared = packageJson.license ?? "";
    const heading = LICENSE_HEADINGS[declared];

    // Tanımadığımız bir lisans seçilirse kapı sessizce geçmez, çünkü o zaman
    // içeriği kimse doğrulamıyor demektir.
    expect(
      heading,
      `"${declared}" bu testin tanıdığı lisanslar arasında değil — ` +
        `LICENSE_HEADINGS tablosuna eklenmeli`,
    ).toBeTruthy();

    const contents = readFileSync("LICENSE", "utf8");

    expect(
      contents.includes(heading),
      `package.json "${declared}" diyor ama LICENSE dosyasında "${heading}" başlığı yok`,
    ).toBe(true);
  });

  it("telif satırı bir yıl ve bir sahip taşıyor", () => {
    const contents = readFileSync("LICENSE", "utf8");

    // Şablondan kopyalanmış "Copyright (c) <year> <name>" satırı, olmayan bir
    // lisans kadar kötüdür: hak sahibi belirsizse lisans kimin adına verilmiş
    // olduğunu söylemez.
    expect(
      /Copyright \(c\) \d{4} \S+/.test(contents),
      "LICENSE dosyasında geçerli bir telif satırı yok (yıl + sahip)",
    ).toBe(true);
  });
});
