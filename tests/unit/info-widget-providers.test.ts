/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Sağlayıcıların HAM YANITI uygulama şekline çevirmesi (PRD §5.8).
 *
 * Burada sınanan şey sağlayıcının kendisi değil, ARADAKİ ÇEVİRİ:
 *  · Open-Meteo paralel diziler döndürüyor → bugünü atlayıp üç günü çıkarmak
 *  · Frankfurter "1 TL kaç dolar" veriyor → ekranda gösterilen bunun TERSİ
 *  · CoinGecko eksik alan döndürebiliyor → kart yine çalışmalı
 *  · RSS akışı → izinli alan adı süzgecinden geçmiş başlıklar
 *
 * Yanıt gövdeleri 2026-08-09'da sağlayıcıların canlı uçlarından görülen
 * biçimlere göre yazıldı; testte ağa çıkılmıyor.
 */

const isCircuitOpen = vi.hoisted(() => vi.fn(async () => false));

vi.mock("@/lib/circuit-breaker", () => ({
  isCircuitOpen,
  recordCircuitFailure: vi.fn(async () => {}),
  recordCircuitSuccess: vi.fn(async () => {}),
}));

vi.mock("@/lib/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/utils")>()),
  sleep: vi.fn(async () => {}),
}));

const { fetchWeather } = await import("@/features/info-widgets/providers/weather.provider");
const { fetchExchangeRates } =
  await import("@/features/info-widgets/providers/exchange-rate.provider");
const { fetchCryptoPrices } = await import("@/features/info-widgets/providers/crypto.provider");
const { fetchNews } = await import("@/features/info-widgets/providers/news.provider");

function jsonOnce(body: unknown) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  isCircuitOpen.mockResolvedValue(false);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const OPEN_METEO_BODY = {
  current: {
    temperature_2m: 37.2,
    relative_humidity_2m: 31,
    weather_code: 0,
    wind_speed_10m: 22.1,
  },
  daily: {
    time: ["2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12"],
    weather_code: [1, 0, 1, 95],
    temperature_2m_max: [38.4, 38.9, 39.6, 39.2],
    temperature_2m_min: [26.4, 27, 27.8, 26.3],
  },
};

describe("hava durumu sağlayıcısı", () => {
  it("güncel durumu ve BUGÜNDEN SONRAKİ üç günü çıkarır", async () => {
    jsonOnce(OPEN_METEO_BODY);

    const result = await fetchWeather();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.current).toEqual({
      temperatureC: 37.2,
      humidityPercent: 31,
      windKmh: 22.1,
      code: 0,
    });
    // İlk gün ATLANIYOR: o bugün ve "güncel durum" bölümünde zaten var.
    expect(result.data.days.map((day) => day.date)).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
    ]);
    expect(result.data.days[2]).toEqual({ date: "2026-08-12", code: 95, maxC: 39.2, minC: 26.3 });
  });

  it("koordinatı ve İstanbul saat dilimini sorguya koyar", async () => {
    const fetchMock = jsonOnce(OPEN_METEO_BODY);

    await fetchWeather();

    const [requestUrl] = fetchMock.mock.calls[0] as unknown as [string];
    const url = new URL(requestUrl);

    expect(url.searchParams.get("latitude")).toBe("38.4237");
    expect(url.searchParams.get("longitude")).toBe("27.1428");
    // Gün sınırını sağlayıcı İstanbul'a göre bölmezse "yarın" bir gün kayar.
    expect(url.searchParams.get("timezone")).toBe("Europe/Istanbul");
  });

  it("paralel diziler farklı uzunlukta gelirse en kısasına göre keser", async () => {
    // `undefined` bir değerin ekrana `NaN°` olarak çıkması yerine o gün hiç
    // gösterilmiyor.
    jsonOnce({
      ...OPEN_METEO_BODY,
      daily: { ...OPEN_METEO_BODY.daily, temperature_2m_min: [26.4, 27] },
    });

    const result = await fetchWeather();

    expect(result.ok && result.data.days).toHaveLength(1);
  });

  it("eksik alanlı yanıtı reddeder", async () => {
    jsonOnce({ current: { temperature_2m: 30 } });

    expect(await fetchWeather()).toEqual({ ok: false });
  });
});

describe("döviz kuru sağlayıcısı", () => {
  it("'1 TL kaç dolar' değerini '1 dolar kaç TL'ye çevirir", async () => {
    jsonOnce({
      amount: 1,
      base: "TRY",
      date: "2026-08-07",
      rates: { USD: 0.02, EUR: 0.02, GBP: 0.0125 },
    });

    const result = await fetchExchangeRates();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.date).toBe("2026-08-07");
    expect(result.data.rates).toEqual([
      { code: "USD", tryPerUnit: 50 },
      { code: "EUR", tryPerUnit: 50 },
      { code: "GBP", tryPerUnit: 80 },
    ]);
  });

  it("sıfır veya negatif kuru atar", async () => {
    // Bölmede sonsuz/negatif üretirdi ve ekrana anlamsız bir sayı çıkardı.
    jsonOnce({ base: "TRY", date: "2026-08-07", rates: { USD: 0, EUR: 0.02, GBP: -1 } });

    const result = await fetchExchangeRates();

    expect(result.ok && result.data.rates.map((rate) => rate.code)).toEqual(["EUR"]);
  });

  it("hiçbir kur çıkarılamazsa başarısız sayar", async () => {
    // Boş bir kart göstermektense bayat veriye veya hataya düşmek doğru.
    jsonOnce({ base: "TRY", date: "2026-08-07", rates: { CHF: 0.03 } });

    expect(await fetchExchangeRates()).toEqual({ ok: false });
  });
});

describe("kripto sağlayıcısı", () => {
  it("TL fiyatını ve 24 saatlik değişimi çıkarır", async () => {
    jsonOnce({
      bitcoin: { try: 3_096_909, try_24h_change: -0.0777 },
      ethereum: { try: 91_537, try_24h_change: 1.25 },
    });

    const result = await fetchCryptoPrices();

    expect(result.ok && result.data.coins).toEqual([
      { id: "bitcoin", tryPrice: 3_096_909, changePercent24h: -0.0777 },
      { id: "ethereum", tryPrice: 91_537, changePercent24h: 1.25 },
    ]);
  });

  it("değişim alanı eksikse fiyatı yine gösterir", async () => {
    jsonOnce({ bitcoin: { try: 3_000_000 }, ethereum: { try: 90_000, try_24h_change: 2 } });

    const result = await fetchCryptoPrices();

    expect(result.ok && result.data.coins[0]).toEqual({
      id: "bitcoin",
      tryPrice: 3_000_000,
      changePercent24h: 0,
    });
  });

  it("beklenen jetonların hiçbiri yoksa başarısız sayar", async () => {
    jsonOnce({ dogecoin: { try: 5 } });

    expect(await fetchCryptoPrices()).toEqual({ ok: false });
  });
});

describe("haber sağlayıcısı", () => {
  function feed(items: string): Response {
    return new Response(`<rss version="2.0"><channel>${items}</channel></rss>`, {
      headers: { "content-type": "text/xml" },
    });
  }

  function rssItem(index: number): string {
    return `<item><title>Başlık ${index}</title>
<link>https://www.trthaber.com/haber/ornek-${index}.html</link>
<pubDate>Sun, 09 Aug 2026 14:0${index}:00 +0300</pubDate></item>`;
  }

  it("başlıkları çıkarır ve en fazla beş tane döndürür", async () => {
    const items = [1, 2, 3, 4, 5, 6, 7].map(rssItem).join("");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => feed(items)),
    );

    const result = await fetchNews();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.items).toHaveLength(5);
    expect(result.data.items[0].title).toBe("Başlık 1");
    // Tarih JSON'da metin olarak taşınıyor — `Date` nesnesi veritabanına
    // yazılıp geri okunduğunda metne dönerdi ve şema bunu yakalayamazdı.
    expect(result.data.items[0].publishedAt).toBe("2026-08-09T11:01:00.000Z");
  });

  it("izinsiz alan adına giden bağlantıları eler", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        feed(
          `<item><title>Kimlik avı</title><link>https://saldirgan.example/tuzak</link></item>` +
            rssItem(1),
        ),
      ),
    );

    const result = await fetchNews();

    expect(result.ok && result.data.items).toHaveLength(1);
    expect(result.ok && result.data.items[0].title).toBe("Başlık 1");
  });

  it("kullanılabilir başlık çıkmazsa başarısız sayar", async () => {
    // Akış biçim değiştirmiş olabilir (ADR-016 bedel 1): boş kart yerine
    // bayat veri ya da dürüst bir hata durumu devreye girer.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => feed("")),
    );

    expect(await fetchNews()).toEqual({ ok: false });
  });
});
