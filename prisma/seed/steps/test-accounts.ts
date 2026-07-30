import { writeFile } from "node:fs/promises";

import type { SeedContext, SeededCitizen, SeededUser } from "../types.js";
import { CITIZEN_INDEX } from "./kps-citizens.js";
import { DEMO_PASSWORD } from "./users.js";

/**
 * `docs/project/test-hesaplari.md` dosyasını üretir (fake-data-guide.md:
 * "özel kayıtların numaraları seed çıktısına ve test-hesaplari.md dosyasına yazılır").
 *
 * Dosya YALNIZCA sentetik numara içerir. Proje sahibinin hiçbir bilgisi buraya
 * girmez. Production ortamında hiç üretilmez — orada test hesabı listesi
 * yayınlamak, hazır hesap listesini herkese vermek olurdu.
 */

const OUTPUT_PATH = new URL("../../../docs/project/test-hesaplari.md", import.meta.url);

export async function writeTestAccountsDoc(
  context: SeedContext,
  input: {
    readonly citizens: readonly SeededCitizen[];
    readonly demoUsers: readonly SeededUser[];
    readonly notFoundNationalId: string;
  },
): Promise<boolean> {
  if (process.env.NEXT_PUBLIC_ENV_LABEL === "production") {
    context.log("test-hesaplari.md: production ortamında üretilmedi (bilinçli)");

    return false;
  }

  const { citizens, demoUsers, notFoundNationalId } = input;
  const byIndex = (index: number): SeededCitizen => citizens[index];

  const lines = [
    "# Test Hesapları (otomatik üretilir)",
    "",
    "> ⚠️ **BU DOSYA ELLE DÜZENLENMEZ.** `prisma/seed.ts` her çalıştığında",
    "> yeniden yazar. Numaralar sabit tohumla üretildiği için her kurulumda aynıdır.",
    "",
    "> Buradaki kimlik numaralarının **tamamı sentetiktir**: kontrol basamağı",
    "> algoritmasına uyar ve `9` ile başlar; hiçbiri gerçek bir kişiye ait değildir.",
    "> Proje sahibinin bilgileri bu dosyaya **hiçbir koşulda yazılmaz** —",
    "> onlar yalnızca ortam değişkenlerinde durur.",
    "",
    "## Kayıt akışı sınır durumları",
    "",
    "| Senaryo | Kimlik numarası | Doğum tarihi | Beklenen sonuç |",
    "|---|---|---|---|",
    ...CITIZEN_INDEX.minors.map((index) => {
      const citizen = byIndex(index);

      return `| 18 yaş altı | \`${citizen.nationalId}\` | ${isoDate(citizen.birthDate)} | Kayıt **reddedilir** |`;
    }),
    (() => {
      const citizen = byIndex(CITIZEN_INDEX.turnsEighteenToday);

      return `| Bugün 18 oluyor | \`${citizen.nationalId}\` | ${isoDate(citizen.birthDate)} | Kayıt **kabul edilir** |`;
    })(),
    (() => {
      const citizen = byIndex(CITIZEN_INDEX.timeout);

      return `| KPS zaman aşımı | \`${citizen.nationalId}\` | ${isoDate(citizen.birthDate)} | Sorgu **timeout** döner |`;
    })(),
    (() => {
      const citizen = byIndex(CITIZEN_INDEX.serverError);

      return `| KPS sunucu hatası | \`${citizen.nationalId}\` | ${isoDate(citizen.birthDate)} | Sorgu **error** döner |`;
    })(),
    `| KPS'te kayıt yok | \`${notFoundNationalId}\` | — | Sorgu **not_found** döner |`,
    "",
    "## Örnek üye hesapları",
    "",
    `Şifre (adım 4b'de yazılacak): \`${DEMO_PASSWORD}\``,
    "",
    "> Şu an `password_hash` alanı **boştur**: şifre özetleme kütüphanesi",
    "> (argon2/bcrypt) kimlik doğrulama adımında seçilecek. O adıma kadar bu",
    "> hesaplarla giriş yapılamaz; kayıtlar veri sahipliği için vardır.",
    "",
    "| # | Ad Soyad | Kimlik numarası | E-posta | Personel mi? |",
    "|---|---|---|---|---|",
    ...demoUsers.map((user, order) => {
      const citizen = byIndex(user.citizenIndex);

      return `| ${order + 1} | ${user.fullName} | \`${citizen.nationalId}\` | ${user.email} | ${user.isStaff ? "✔ evet" : "✘ hayır"} |`;
    }),
    "",
    "Personel olan hesaplar hastane randevusu ve spor salonu üyeliğine erişebilir;",
    "diğerleri erişemez (PRD §5.0 erişim kademeleri).",
    "",
  ];

  await writeFile(OUTPUT_PATH, `${lines.join("\n")}\n`, "utf8");
  context.log("test-hesaplari.md: güncellendi");

  return true;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
