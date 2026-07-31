import { expect, test } from "@playwright/test";

/**
 * SAHTE KPS UCUNUN KORUMASI — canlı sunucuda kanıt (ADR-009).
 *
 * Bu dosyanın varlık sebebi şu: uç herkese açık bir adreste duruyor ve depo
 * public. "Kodu okudum, korunuyor" demek yetmez; korumanın gerçekten derlenmiş,
 * dağıtılmış uygulamada çalıştığı ancak dışarıdan istek atarak görülür.
 *
 * Playwright'ın `request` fixture'ı tarayıcıdan bağımsız, ham HTTP isteği atar —
 * yani tam olarak bir saldırganın yapacağı şeyi yapar.
 */

const ENDPOINT = "/api/mock-kps/identity-queries";

// Seed'in ürettiği geçerli bir sınır durum numarası (docs/project/test-hesaplari.md).
// Gerçek bir kişiye ait değildir; kontrol basamağı algoritmasına uyar.
const PROBE = { nationalId: "99918365820", birthYear: 1970 };

test.describe("mock KPS ucu dışarıdan erişilemez", () => {
  test("gizli başlık OLMADAN atılan istek 401 döner", async ({ request }) => {
    const response = await request.post(ENDPOINT, { data: PROBE });

    expect(response.status()).toBe(401);
  });

  test("YANLIŞ anahtarla atılan istek 401 döner", async ({ request }) => {
    const response = await request.post(ENDPOINT, {
      data: PROBE,
      headers: { "x-mock-kps-key": "tahmin-edilmis-anahtar" },
    });

    expect(response.status()).toBe(401);
  });

  test("reddedilen yanıt hiçbir kimlik verisi veya ipucu taşımaz", async ({ request }) => {
    const response = await request.post(ENDPOINT, { data: PROBE });
    const body = await response.text();

    // Ne kimlik alanı, ne "hangi başlık eksik" bilgisi, ne iç detay.
    expect(body).not.toContain(PROBE.nationalId);
    expect(body).not.toMatch(/firstName|lastName|birthDate|registeredAddress/i);
    expect(body).not.toMatch(/MOCK_KPS_API_KEY|x-mock-kps-key/i);
  });

  test("GET ile çağrılamaz — uç yalnızca POST kabul eder", async ({ request }) => {
    // GET açık olsaydı kimlik numarası URL'e, oradan da erişim log'una düşerdi.
    const response = await request.get(`${ENDPOINT}?nationalId=${PROBE.nationalId}`);

    expect(response.status()).toBe(405);
  });

  test("uç arama motorlarına kapalıdır", async ({ request }) => {
    // Local ve preview'da tüm site kapalı (`Disallow: /`); production'da uç
    // ayrıca açıkça kapatılıyor. İkisi de kabul: robots.txt zaten korumanın
    // kendisi değil, ikinci katman — asıl koruma yukarıdaki 401 testleridir.
    const robots = await (await request.get("/robots.txt")).text();

    expect(robots).toMatch(/^Disallow: \/(api\/mock-kps)?$/m);
  });
});
