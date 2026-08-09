/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { parseRssItems, toPlainText } from "@/lib/rss";

/**
 * Minimal RSS okuyucu (ADR-016).
 *
 * Test edilen asıl şey İKİ SINIR:
 *  1. Gerçek akışın taşıdığı biçimler (CDATA, varlıklar, gereksiz boşluk)
 *     doğru metne çevriliyor mu
 *  2. Güvenlik süzgeci — izinsiz alan adı, `https` olmayan şema ve eksik alan
 *     taşıyan kalemler DIŞARIDA kalıyor mu
 *
 * Fikstürler TRT Haber akışının 2026-08-09'da canlıdan görülen biçimine göre
 * yazıldı; ağa çıkılmıyor.
 */

const ALLOWED = ["www.trthaber.com"] as const;

function feed(items: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>TRT Haber</title>
<link>https://www.trthaber.com/</link>
${items}
</channel></rss>`;
}

const ITEM = `<item>
<title>Kamuda yapay zeka dönemi</title>
<link>https://www.trthaber.com/haber/bilim/kamuda-yapay-zeka-953467.html</link>
<description><![CDATA[ Uzun açıklama metni ]]></description>
<pubDate>Sun, 09 Aug 2026 14:03:00 +0300</pubDate>
</item>`;

describe("RSS okuyucu", () => {
  it("başlık, bağlantı ve tarihi çıkarır", () => {
    const items = parseRssItems(feed(ITEM), ALLOWED);

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Kamuda yapay zeka dönemi");
    expect(items[0].link).toBe(
      "https://www.trthaber.com/haber/bilim/kamuda-yapay-zeka-953467.html",
    );
    expect(items[0].publishedAt?.toISOString()).toBe("2026-08-09T11:03:00.000Z");
  });

  it("kanalın kendi başlığını haber sanmaz", () => {
    // `<channel><title>` de bir `<title>` — yalnızca `<item>` içi okunmalı.
    const items = parseRssItems(feed(ITEM), ALLOWED);

    expect(items.map((item) => item.title)).not.toContain("TRT Haber");
  });

  it("CDATA sarmalını ve HTML varlıklarını çözer", () => {
    const xml = feed(`<item>
<title><![CDATA[Ekonomi &amp; piyasa: &quot;yeni dönem&quot;]]></title>
<link>https://www.trthaber.com/haber/ekonomi-1.html</link>
</item>`);

    expect(parseRssItems(xml, ALLOWED)[0].title).toBe('Ekonomi & piyasa: "yeni dönem"');
  });

  it("sayısal varlıkları ve fazla boşluğu temizler", () => {
    const xml = feed(`<item>
<title>
   Bakan&#39;dan   a&#xe7;&#x131;klama
</title>
<link>https://www.trthaber.com/haber/aciklama-2.html</link>
</item>`);

    expect(parseRssItems(xml, ALLOWED)[0].title).toBe("Bakan'dan açıklama");
  });

  it("başlıktaki etiketleri VARLIK ÇÖZÜMÜNDEN ÖNCE siler", () => {
    /**
     * Sıra bozulsaydı `&lt;script&gt;` çözülüp gerçek bir etikete dönerdi.
     * Başlık React tarafından metin olarak çizildiği için bu tek başına bir
     * açık değil, ama süzgecin sırası kaydığında fark edilmesi gereken bir şey.
     */
    const xml = feed(`<item>
<title>Zararsız <b>kalın</b> ve &lt;script&gt;alert(1)&lt;/script&gt;</title>
<link>https://www.trthaber.com/haber/xss-3.html</link>
</item>`);

    expect(parseRssItems(xml, ALLOWED)[0].title).toBe(
      "Zararsız kalın ve <script>alert(1)</script>",
    );
  });

  it("izinli olmayan alan adına giden bağlantıyı atar", () => {
    const xml = feed(`<item>
<title>Sahte haber</title>
<link>https://saldirgan.example/kimlik-avi</link>
</item>${ITEM}`);

    const items = parseRssItems(xml, ALLOWED);

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Kamuda yapay zeka dönemi");
  });

  it("https olmayan bağlantıyı atar", () => {
    const xml = feed(`<item>
<title>Şemasız</title>
<link>javascript:alert(1)</link>
</item>
<item>
<title>Şifresiz</title>
<link>http://www.trthaber.com/haber/duz-4.html</link>
</item>`);

    expect(parseRssItems(xml, ALLOWED)).toHaveLength(0);
  });

  it("başlığı veya bağlantısı olmayan kalemi atlar, listeyi düşürmez", () => {
    const xml = feed(`<item><link>https://www.trthaber.com/haber/basliksiz.html</link></item>
<item><title>Bağlantısız</title></item>
${ITEM}`);

    expect(parseRssItems(xml, ALLOWED)).toHaveLength(1);
  });

  it("geçersiz tarihi null bırakır ama kalemi korur", () => {
    const xml = feed(`<item>
<title>Tarihi bozuk</title>
<link>https://www.trthaber.com/haber/tarih-5.html</link>
<pubDate>ne zaman olduğu belirsiz</pubDate>
</item>`);

    const items = parseRssItems(xml, ALLOWED);

    expect(items).toHaveLength(1);
    expect(items[0].publishedAt).toBeNull();
  });

  it("RSS olmayan bir belge için boş liste döner", () => {
    // ADR-016 bedel 1: okuyucu genel bir XML ayrıştırıcı değil. Boş liste
    // dönmesi, çağıranın hata durumuna geçmesi demek — sessizce boş kart değil.
    expect(parseRssItems("<html><body>Hata sayfası</body></html>", ALLOWED)).toHaveLength(0);
    expect(parseRssItems("", ALLOWED)).toHaveLength(0);
  });

  it("tanınmayan varlığı olduğu gibi bırakır", () => {
    // Uydurma bir karakter üretmektense ham metni göstermek daha dürüst.
    expect(toPlainText("Fiyat &yok; arttı")).toBe("Fiyat &yok; arttı");
  });
});
