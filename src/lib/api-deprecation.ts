/**
 * Bir ucun emekliye ayrıldığını istemciye BİLDİREN başlıklar (ADR-020 · borç #103).
 *
 * ═══ NEDEN VAR ═══
 * `03-api-guidelines.md` → "Sözleşme ömrü" bir ucu kapatmadan önce onu
 * işaretlemeyi ŞART koşuyor. Mobil uygulamayla birlikte bu kural teorik
 * olmaktan çıkıyor: kullanıcının telefonundaki sürümü biz güncelleyemiyoruz,
 * yani "kapattık" demeden önce "kapatacağız" demek zorundayız.
 *
 * ⚠️ BU DOSYANIN BUGÜN ÜRETİMDE ÇAĞIRANI YOK ve bu bilinçli: henüz emekliye
 * ayrılan bir uç yok (`v1` tek sürüm). Bugün yazılmasının sebebi aşağıdaki
 * `@` biçimi — RFC okunmadan tahmin edilemeyecek bir ayrıntı ve ilk emeklilik
 * gününde acele içinde yanlış yazılması işten bile değil.
 */

/** RFC 9745 §2 — `Deprecation` bir Structured Field **Date**'tir, HTTP-date DEĞİL. */
function toStructuredFieldDate(value: Date): string {
  return `@${Math.floor(value.getTime() / 1000)}`;
}

export type DeprecationNotice = {
  /** Ucun emekliye ayrıldığı an. Geçmişte olabilir; gelecekteyse "ayrılacak" demektir. */
  deprecatedAt: Date;
  /** Ucun fiilen kapanacağı an. RFC 9745: `deprecatedAt`'ten ÖNCE OLAMAZ. */
  sunsetAt: Date;
  /** Yerine geçen adres — örn. `/api/v2/appointments`. */
  successor?: string;
  /** Emekliliği anlatan sayfanın adresi. */
  documentation?: string;
};

/**
 * Yanıta emeklilik başlıklarını yazar ve AYNI yanıtı döner.
 *
 * ```
 * Deprecation: @1788220799
 * Sunset: Sun, 01 Mar 2026 23:59:59 GMT
 * Link: </api/v2/appointments>; rel="successor-version"
 * ```
 *
 * @throws Sunset tarihi Deprecation'dan önceyse. Bu bir programlama hatasıdır:
 *   "önce kapanıp sonra emekliye ayrılan" bir uç istemciye anlamsız bir takvim
 *   bildirir ve sessizce yanlış davranmaktansa yapıyı kırmak doğrudur.
 */
export function withDeprecation<T extends Response>(response: T, notice: DeprecationNotice): T {
  if (notice.sunsetAt.getTime() < notice.deprecatedAt.getTime()) {
    throw new Error(
      "Sunset tarihi Deprecation tarihinden önce olamaz (RFC 9745 §3): " +
        `deprecatedAt=${notice.deprecatedAt.toISOString()} sunsetAt=${notice.sunsetAt.toISOString()}`,
    );
  }

  response.headers.set("Deprecation", toStructuredFieldDate(notice.deprecatedAt));
  // RFC 8594 — `Sunset` HTTP-date ister. `toUTCString()` tam olarak o biçimi üretir.
  response.headers.set("Sunset", notice.sunsetAt.toUTCString());

  const links: string[] = [];
  if (notice.successor) links.push(`<${notice.successor}>; rel="successor-version"`);
  if (notice.documentation) {
    links.push(`<${notice.documentation}>; rel="deprecation"; type="text/html"`);
  }

  if (links.length > 0) {
    // Yanıtta zaten bir `Link` varsa EZİLMEZ — başlık virgülle çoklanabilir bir listedir.
    const existing = response.headers.get("Link");
    response.headers.set("Link", existing ? `${existing}, ${links.join(", ")}` : links.join(", "));
  }

  return response;
}
