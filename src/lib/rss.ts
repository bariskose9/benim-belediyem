/**
 * RSS 2.0 akışından haber kalemlerini çıkaran MİNİMAL okuyucu (ADR-016).
 *
 * ⛔ BU BİR XML AYRIŞTIRICI DEĞİLDİR ve olmaya çalışmıyor. Yalnızca RSS 2.0'ın
 * `<item>` listesini ve üç alanını (`title`, `link`, `pubDate`) tanır. Atom,
 * RSS 1.0 veya bozuk bir belge verilirse BOŞ LİSTE döner — çağıran bunu hata
 * durumu sayar (`news.service.ts`).
 *
 * NEDEN PAKET DEĞİL: ihtiyaç üç alanla sınırlıyken genel amaçlı bir XML
 * ayrıştırıcı eklemek bağımlılık ve denetim (`npm audit`) yüzeyini büyütürdü
 * (CLAUDE.md §7 — istenmeyen kütüphane eklenmez). Gerekçenin tamamı ADR-016'da.
 *
 * GÜVENLİK: metin ÇIKARILIR, hiçbir yerde HTML olarak yorumlanmaz. Etiketler
 * varlık çözümlemesinden ÖNCE siliniyor; böylece `&lt;script&gt;` içeren bir
 * başlık çözüldükten sonra tekrar etiket hâline gelemiyor.
 */

export type RssItem = {
  title: string;
  link: string;
  /** Akıştaki `pubDate`; ayrıştırılamazsa `null` — kalem yine de kullanılır. */
  publishedAt: Date | null;
};

const ITEM_PATTERN = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;

/** Adı verilen alanı bir `<item>` gövdesinden çıkarır. */
function readField(itemXml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(itemXml);

  return match ? toPlainText(match[1]) : null;
}

/**
 * Ham XML parçasını görüntülenebilir düz metne çevirir.
 * Sıra ÖNEMLİ: CDATA → yorum → etiket → varlık → boşluk.
 */
export function toPlainText(raw: string): string {
  return raw
    .replaceAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replaceAll(/<!--[\s\S]*?-->/g, "")
    .replaceAll(/<[^>]*>/g, "")
    .replaceAll(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, decodeEntity)
    .replaceAll(/\s+/g, " ")
    .trim();
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntity(match: string, body: string): string {
  const named = NAMED_ENTITIES[body.toLowerCase()];

  if (named !== undefined) return named;

  const codePoint = body.startsWith("#x")
    ? Number.parseInt(body.slice(2), 16)
    : body.startsWith("#")
      ? Number.parseInt(body.slice(1), 10)
      : Number.NaN;

  // Tanınmayan varlık OLDUĞU GİBİ bırakılır: uydurulmuş bir karakter yerine
  // ham metin görmek hem daha dürüst hem de hatayı görünür kılıyor.
  if (!Number.isInteger(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) {
    return match;
  }

  return String.fromCodePoint(codePoint);
}

/**
 * Akıştaki kalemleri sırayla döndürür.
 *
 * Başlığı veya bağlantısı olmayan kalem ATLANIR, liste düşmez: tek bozuk
 * satır yüzünden bütün widget'ı kaybetmek gereksiz olurdu.
 *
 * @param allowedHosts izinli alan adları — başka bir sunucuya giden bağlantı
 *   sessizce atılır (ADR-016 güvenlik notu).
 */
export function parseRssItems(xml: string, allowedHosts: readonly string[]): RssItem[] {
  const items: RssItem[] = [];

  for (const match of xml.matchAll(ITEM_PATTERN)) {
    const title = readField(match[1], "title");
    const link = readField(match[1], "link");

    if (!title || !link || !isAllowedLink(link, allowedHosts)) continue;

    const pubDate = readField(match[1], "pubDate");
    const parsedDate = pubDate ? new Date(pubDate) : null;

    items.push({
      title,
      link,
      publishedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
    });
  }

  return items;
}

/**
 * Bağlantı hem `https` olmalı hem de izinli alan adına ait olmalı.
 *
 * `https` şartı `javascript:` ve `data:` gibi şemaları baştan eliyor; alan adı
 * listesi ise akış ele geçirilse bile kullanıcının rastgele bir siteye
 * götürülmesini engelliyor.
 */
function isAllowedLink(link: string, allowedHosts: readonly string[]): boolean {
  let url: URL;

  try {
    url = new URL(link);
  } catch {
    return false;
  }

  return url.protocol === "https:" && allowedHosts.includes(url.hostname);
}
