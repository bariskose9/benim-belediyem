import { NEWS_ALLOWED_HOSTS, NEWS_FEED_URL, NEWS_ITEM_LIMIT } from "@/config/constants";
import { type ExternalFetchResult, fetchExternalText } from "@/lib/external-fetch";
import { parseRssItems } from "@/lib/rss";

import { newsSnapshotSchema, type NewsSnapshot } from "../schemas/snapshots";

/**
 * Haber sağlayıcısı — anahtar gerektirmeyen RSS akışı (ADR-016).
 *
 * Akış adresi ve izinli alan adları `constants.ts` içinde; sağlayıcı değişimi
 * tek satır. XML ayrıştırma `src/lib/rss.ts` içinde ve saf — yani ağ olmadan,
 * fikstür dosyalarıyla test ediliyor.
 */
export async function fetchNews(): Promise<ExternalFetchResult<NewsSnapshot>> {
  const result = await fetchExternalText({ name: "news-rss", url: NEWS_FEED_URL });

  if (!result.ok) return { ok: false };

  const items = parseRssItems(result.data, NEWS_ALLOWED_HOSTS)
    .slice(0, NEWS_ITEM_LIMIT)
    .map((item) => ({
      title: item.title,
      link: item.link,
      publishedAt: item.publishedAt?.toISOString() ?? null,
    }));

  /**
   * Şema burada TEKRAR çalıştırılıyor.
   *
   * Ayrıştırıcı zaten süzüyor; ama önbelleğe yazılan her şeklin aynı kapıdan
   * geçmesi, ileride ayrıştırıcı değişse bile tabloya geçersiz bir bağlantının
   * girememesini garanti ediyor. Kural tek yerde durursa, o yer değiştiğinde
   * kural da sessizce kaybolur.
   */
  const parsed = newsSnapshotSchema.safeParse({ items });

  // Akış geldi ama içinden tek bir kullanılabilir başlık çıkmadı: biçim
  // değişmiş olabilir (ADR-016 bedel 1). Boş kart göstermek yerine başarısız
  // sayılıyor, böylece bayat veri veya dürüst bir hata durumu devreye giriyor.
  if (!parsed.success || parsed.data.items.length === 0) {
    console.error("[EXTERNAL:news-rss] akıştan kullanılabilir başlık çıkarılamadı");

    return { ok: false };
  }

  return { ok: true, data: parsed.data };
}
