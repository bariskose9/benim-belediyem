import { z } from "zod";

import type { StaffTitle } from "@/generated/prisma/enums";

/**
 * Hakkımızda sayfasının adres çubuğu parametreleri (`?birim=…&unvan=…&arama=…`).
 *
 * ADRES ÇUBUĞU DA BİR GİRDİ NOKTASIDIR ve doğrulanır: buradan gelen değerler
 * doğrudan veritabanı sorgusuna gidiyor (03-api-guidelines.md). Prisma
 * sorguları parametreli olduğu için SQL enjeksiyonu riski yok; doğrulamanın
 * işi sınırsız uzunlukta bir değerin sorguya taşınmasını engellemek ve
 * `unvan` parametresinin gerçekten bir unvan olduğundan emin olmak.
 *
 * SÜZGEÇ NEDEN ADRESTE: market ve restoran ekranlarındaki desenin aynısı —
 * geri tuşu bir adım geri alıyor, seçim paylaşılabiliyor ve sayfa sunucuda
 * çizildiği için JavaScript kapalıyken de çalışıyor.
 *
 * Parametre adları TÜRKÇE (kullanıcıya görünen adresin parçası), alan adları
 * İngilizce (kod) — CLAUDE.md §0 dil kuralı.
 */

export const ABOUT_PATH = "/hakkimizda";

/**
 * Personel listesinin çapası.
 *
 * Şemadan bir birime tıklandığında liste sayfanın altında güncelleniyor;
 * çapa olmasa mobilde kullanıcı ekranın üstünde kalır ve hiçbir şey olmamış
 * gibi görünürdü.
 */
export const DIRECTORY_ANCHOR = "personel-rehberi";

/** Unvan değerleri — `StaffTitle` enum'ının tamamı. */
const staffTitles = [
  "department_head",
  "branch_manager",
  "chief",
  "engineer",
  "specialist",
  "technician",
  "officer",
  "contracted",
] as const;

/**
 * `satisfies`: şemaya yeni bir unvan eklenirse bu liste eksik kaldığında
 * derleme HATA VERİR. Sessizce süzgeçten düşen bir unvan, fark edilmesi zor
 * bir hata olurdu.
 */
export const STAFF_TITLES: readonly StaffTitle[] = staffTitles satisfies readonly StaffTitle[];

const recordId = z.string().trim().min(1).max(128);

/** Arama metni — katalog aramasıyla aynı 80 karakter sınırı. */
const searchQuery = z
  .string()
  .trim()
  .max(80)
  .transform((value) => (value.length === 0 ? undefined : value));

export const directorySearchParamsSchema = z.object({
  unitId: recordId.optional().catch(undefined),
  title: z.enum(staffTitles).optional().catch(undefined),
  query: searchQuery.optional().catch(undefined),
});

export type DirectorySearchParams = z.infer<typeof directorySearchParamsSchema>;

/**
 * Ham `searchParams` nesnesini güvenli bir süzgece çevirir.
 *
 * BOZUK PARAMETRE HATA DEĞİL, YOK SAYILIR (`.catch(undefined)`): adresi elle
 * kurcalayan kullanıcıya 500 göstermek yerine süzgeçsiz listeye dönüyoruz —
 * market ve hastane ekranlarındaki davranışın aynısı.
 */
export function parseDirectoryParams(
  raw: Record<string, string | string[] | undefined>,
): DirectorySearchParams {
  return directorySearchParamsSchema.parse({
    unitId: firstValue(raw.birim),
    title: firstValue(raw.unvan),
    query: firstValue(raw.arama),
  });
}

/** `?birim=a&birim=b` gibi tekrarlı parametrede ilk değeri alır. */
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Süzgeç adresini kurar; boş parametreler adrese hiç yazılmaz.
 *
 * Üç süzgeç de (birim · unvan · arama) tek bir yerden kuruluyor: ayrı ayrı
 * kurulsalardı biri diğerini korumayı unuttuğunda kullanıcı bir süzgeci
 * değiştirirken diğerini sessizce kaybederdi.
 */
export function buildDirectoryHref(
  filters: { unitId?: string; title?: StaffTitle; query?: string },
  options: { anchor?: boolean } = {},
): string {
  const params = new URLSearchParams();

  if (filters.unitId) params.set("birim", filters.unitId);
  if (filters.title) params.set("unvan", filters.title);
  if (filters.query) params.set("arama", filters.query);

  const search = params.toString();
  const anchor = options.anchor ? `#${DIRECTORY_ANCHOR}` : "";

  return search ? `${ABOUT_PATH}?${search}${anchor}` : `${ABOUT_PATH}${anchor}`;
}
