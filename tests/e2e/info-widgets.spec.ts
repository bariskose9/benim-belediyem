import { expect, test } from "@playwright/test";

import {
  CRYPTO_CACHE_KEY,
  EXCHANGE_RATE_CACHE_KEY,
  NEWS_CACHE_KEY,
  NEWS_SOURCE_NAME,
  WEATHER_CACHE_KEY,
} from "../../src/config/constants";
import { messages } from "../../src/config/messages";
import { prisma } from "../db/helpers";

/**
 * Bilgi widget'ları — uçtan uca (PRD §5.8 · roadmap adım 14).
 *
 * ═══ TEST AĞA ÇIKMIYOR ve bu tasarımın bir sonucu ═══
 *
 * Önbellek veritabanında (ADR-015). Testler tabloyu ÖNCEDEN dolduruyor, yani
 * uygulama hiçbir dış servise gitmiyor ve ekranda kesin olarak bilinen sayılar
 * çıkıyor. Gerçek sağlayıcıya çıkılsaydı test:
 *   · sağlayıcının o günkü hâline bağlı olur (sıcaklık her gün değişir),
 *   · sağlayıcı yavaşladığında kararsızlaşırdı.
 *
 * Sağlayıcıların çeviri mantığı `tests/unit/info-widget-providers.test.ts`,
 * önbelleğin taze/bayat/hata davranışı `tests/db/info-widgets-cache.test.ts`
 * içinde ayrıca kanıtlanıyor.
 *
 * ⚠️ SATIRLAR TESTTEN SONRA SİLİNMİYOR — bilerek. Önbellek anahtarları
 * `constants.ts` içinde SABİT, yani iki Playwright projesi (desktop + mobile)
 * aynı satırları paylaşıyor. Biri bitirip silerken diğeri okusaydı test
 * kararsızlaşırdı. İki proje de AYNI değerleri yazdığı için yarış zararsız;
 * satırlar süresi dolunca kendiliğinden gerçek veriyle değişiyor.
 */

const copy = messages.infoWidgets;

const WEATHER_PAYLOAD = {
  current: { temperatureC: 37.2, humidityPercent: 31, windKmh: 22.1, code: 0 },
  days: [
    { date: "2026-08-10", code: 1, maxC: 38.9, minC: 27 },
    { date: "2026-08-11", code: 3, maxC: 39.6, minC: 27.8 },
    { date: "2026-08-12", code: 95, maxC: 39.2, minC: 26.3 },
  ],
};

const RATES_PAYLOAD = {
  date: "2026-08-07",
  rates: [
    { code: "USD", tryPerUnit: 47.70992 },
    { code: "EUR", tryPerUnit: 55.0287 },
    { code: "GBP", tryPerUnit: 64.1437 },
  ],
};

const CRYPTO_PAYLOAD = {
  coins: [
    { id: "bitcoin", tryPrice: 3_096_909, changePercent24h: -1.25 },
    { id: "ethereum", tryPrice: 91_537, changePercent24h: 2.5 },
  ],
};

const NEWS_PAYLOAD = {
  items: [
    {
      title: "E2E test haberi: kamuda yapay zeka dönemi",
      link: "https://www.trthaber.com/haber/e2e-ornek-1.html",
      publishedAt: "2026-08-09T11:03:00.000Z",
    },
    {
      title: "E2E test haberi: ikinci başlık",
      link: "https://www.trthaber.com/haber/e2e-ornek-2.html",
      publishedAt: null,
    },
  ],
};

/** Önbelleği taze doldurur — süresi test boyunca dolmayacak kadar ileride. */
async function seedCache(): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60_000);

  const rows: [string, unknown][] = [
    [WEATHER_CACHE_KEY, WEATHER_PAYLOAD],
    [EXCHANGE_RATE_CACHE_KEY, RATES_PAYLOAD],
    [CRYPTO_CACHE_KEY, CRYPTO_PAYLOAD],
    [NEWS_CACHE_KEY, NEWS_PAYLOAD],
  ];

  for (const [key, payload] of rows) {
    await prisma.externalDataCache.upsert({
      where: { key },
      create: { key, payload: payload as never, fetchedAt: now, expiresAt },
      update: { payload: payload as never, fetchedAt: now, expiresAt },
    });
  }
}

test.beforeEach(async () => {
  await seedCache();
});

test.describe("bilgi panosu", () => {
  test("hava durumu kartı güncel durumu ve üç günlük tahmini gösterir", async ({ page }) => {
    await page.goto("/");

    // Arama BÖLGEYE sınırlı: "Açık" gibi kısa metinler sayfanın başka
    // yerlerinde de geçiyor (tema düğmesinin ekran okuyucu etiketi).
    const card = page.getByRole("region", { name: copy.weather.title });

    await expect(card.getByText("37°", { exact: true })).toBeVisible();
    await expect(card.getByText(copy.weather.city, { exact: true })).toBeVisible();
    await expect(card.getByText("Açık", { exact: true })).toBeVisible();
    await expect(card.getByText("Nem %31")).toBeVisible();

    // Bugün ATLANIYOR: güncel durum bölümünde zaten var (PRD §5.8 "3 günlük").
    await expect(card.getByRole("listitem")).toHaveCount(3);
    await expect(card.getByText("10 Ağu Pzt")).toBeVisible();
    await expect(card.getByText("12 Ağu Çar")).toBeVisible();
  });

  test("piyasa kartı döviz kurunu ve kriptoyu gösterir", async ({ page }) => {
    await page.goto("/");

    const card = page.getByRole("region", { name: copy.markets.title });

    await expect(card.getByText("1 USD", { exact: true })).toBeVisible();
    await expect(card.getByText("47,7099 ₺")).toBeVisible();
    await expect(card.getByText("Bitcoin", { exact: true })).toBeVisible();
    await expect(card.getByText("3.096.909 ₺")).toBeVisible();

    // Kurun ANLIK OLMADIĞI ekranda yazıyor — ECB günde bir yayınlıyor.
    await expect(card.getByText("Merkez bankası kuru · 7 Ağustos 2026")).toBeVisible();
  });

  test("haber kartı başlıkları kaynağa bağlantıyla listeler", async ({ page }) => {
    await page.goto("/");

    const card = page.getByRole("region", { name: copy.news.title });
    const link = card.getByRole("link", { name: /kamuda yapay zeka/i });

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", NEWS_PAYLOAD.items[0].link);
    // Yeni sekmede açılıyor ve açan sayfaya erişemiyor (ADR-016).
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);

    // Haber bize ait değil: kaynak açıkça yazıyor.
    await expect(card.getByText(copy.news.source(NEWS_SOURCE_NAME))).toBeVisible();
  });

  test("her kart verinin ne zaman alındığını yazar", async ({ page }) => {
    await page.goto("/");

    for (const title of [copy.weather.title, copy.news.title, copy.markets.title]) {
      await expect(page.getByRole("region", { name: title }).getByText(/itibarıyla/)).toBeVisible();
    }
  });

  test("bilgi panosu hizmet ızgarasının işleyişini bozmaz", async ({ page }) => {
    await page.goto("/");

    // Pano eklendikten sonra da sayfanın asıl işi çalışmalı: hizmete gitmek.
    await expect(page.getByRole("heading", { name: copy.heading, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: messages.services.market.title })).toBeVisible();
  });
});
