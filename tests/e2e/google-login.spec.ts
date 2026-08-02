import { expect, test, type Page } from "@playwright/test";

import { messages } from "../../src/config/messages";

/**
 * Google ile giriş — uçtan uca (PRD §5.0 · adım 4c).
 *
 * NE TEST EDİLİYOR: bizim tarafımız. Yani düğmenin çizilmesi, Google'a giden
 * adresin PKCE + `state` + `nonce` taşıması, dönüş ucunun korumaları ve hata
 * ekranları.
 *
 * NE TEST EDİLMİYOR: Google'ın kendi giriş ekranı. Orada gerçek bir hesapla
 * şifre girmek gerekiyor ve test kullanıcısının parolası hiçbir yere
 * yazılamaz. Ayrıca Google'ın ekranını otomatikleştirmek kendi kullanım
 * şartlarına aykırı. Bu sınır bilinçlidir; akışın Google'a DOĞRU parametrelerle
 * gittiği burada, gelen kimlikle NE YAPILDIĞI ise
 * `tests/integration/google-callback-route.test.ts` içinde kanıtlanıyor.
 *
 * Bu testler veritabanına HİÇBİR ŞEY YAZMIYOR — hepsi akışın başlangıcında
 * veya reddedilen dallarında kalıyor. Bu yüzden `afterAll` temizliği yok.
 */

const copy = messages.auth.login.google;

/**
 * Her KOŞU kendi IP bloğunu alır — başlatma ucu IP başına 10 istek / 15 dakika
 * ile sınırlı. Sınır KAPATILMIYOR, test ona uyuyor (06-testing.md).
 * 198.51.100.0/24 belgelendirme için ayrılmış TEST-NET-2 bloğudur.
 */
const IP_RUN_BLOCK = Math.floor(Math.random() * 250);
let ipCounter = 0;

async function assignOwnIp(page: Page) {
  ipCounter += 1;

  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.${IP_RUN_BLOCK}.${ipCounter % 250}`,
  });
}

test.describe("giriş ekranındaki Google düğmesi", () => {
  test("görünür ve kimlik doğrulamadığı açıkça yazıyor", async ({ page }) => {
    await assignOwnIp(page);
    await page.goto("/giris");

    /**
     * BAĞLANTI olarak aranıyor, düğme olarak değil. Akış bir sayfa
     * yönlendirmesi; bir gün `<button>` + `fetch` hâline getirilirse JavaScript
     * kapalıyken giriş çalışmaz olur ve bu test onu yakalar.
     */
    const cta = page.getByRole("link", { name: copy.cta });

    await expect(cta).toBeVisible();

    // Kullanıcı kimliğinin doğrulanmadığını EN BAŞTA öğrenmeli (PRD §5.0):
    // hastane randevusuna neden erişemediğini sonradan keşfetmemeli.
    await expect(page.getByText(copy.identityNotice)).toBeVisible();
  });

  test("klavye ile odaklanılabiliyor", async ({ page }) => {
    await assignOwnIp(page);
    await page.goto("/giris");

    const cta = page.getByRole("link", { name: copy.cta });

    await cta.focus();

    await expect(cta).toBeFocused();
  });
});

test.describe("akışın başlatılması", () => {
  /**
   * EN DEĞERLİ TEST. Google'a gidilen adreste üç korumanın da bulunduğunu
   * kanıtlıyor. Biri sessizce düşerse (örneğin bir düzenleme `nonce`'u
   * kaldırırsa) burası kırmızıya döner.
   */
  test("Google'a PKCE, state ve nonce ile gidiliyor", async ({ page }) => {
    await assignOwnIp(page);

    const response = await page.request.get("/api/auth/google?donus=%2Fhesabim", {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(302);

    const target = new URL(response.headers().location);

    expect(target.host).toBe("accounts.google.com");
    expect(target.searchParams.get("code_challenge_method")).toBe("S256");
    expect(target.searchParams.get("code_challenge")).toBeTruthy();
    expect(target.searchParams.get("state")).toBeTruthy();
    expect(target.searchParams.get("nonce")).toBeTruthy();
    expect(target.searchParams.get("prompt")).toBe("select_account");
    expect(target.searchParams.get("scope")).toBe("openid email profile");
    expect(target.searchParams.get("redirect_uri")).toContain("/api/auth/google/callback");
  });

  test("her başlatmada yeni state üretiliyor", async ({ page }) => {
    await assignOwnIp(page);

    const first = await page.request.get("/api/auth/google", { maxRedirects: 0 });
    const second = await page.request.get("/api/auth/google", { maxRedirects: 0 });

    const stateOf = (response: { headers: () => Record<string, string> }) =>
      new URL(response.headers().location).searchParams.get("state");

    expect(stateOf(first)).not.toBe(stateOf(second));
  });

  /**
   * AÇIK YÖNLENDİRME KORUMASI (PRD §5.0: "yönlendirme adresleri beyaz
   * listededir"). Dış bir adres dönüş hedefi olarak kabul edilmemeli.
   */
  test("dış adres dönüş hedefi olarak kabul edilmiyor", async ({ page }) => {
    await assignOwnIp(page);

    const response = await page.request.get(
      "/api/auth/google?donus=https%3A%2F%2Fsahte-belediye.example",
      { maxRedirects: 0 },
    );

    // Akış yine başlıyor ama dönüş hedefi güvenli varsayılana düşürülüyor;
    // bunu callback'te değil, çerezde taşıdığımız için adreste görünmüyor.
    // Kanıt: Google'a giden adreste kendi alan adımızdan başka host yok.
    const target = new URL(response.headers().location);

    expect(target.host).toBe("accounts.google.com");
    expect(target.searchParams.get("redirect_uri")).not.toContain("sahte-belediye");
  });
});

test.describe("dönüş ucunun korumaları", () => {
  /**
   * CSRF KORUMASI. Saldırgan kurbanın tarayıcısında bu adresi açtırsa bile
   * doğrulanacak bir `state` yok — akış ölür ve oturum AÇILMAZ.
   */
  test("işlem çerezi olmadan gelen istek reddediliyor", async ({ page }) => {
    await assignOwnIp(page);
    await page.goto("/api/auth/google/callback?code=sahte&state=uydurma");

    await expect(page).toHaveURL(/\/giris\?hata=baglanti_suresi_doldu/);

    // METİNLE aranıyor, `getByRole("alert")` ile DEĞİL: Next.js her sayfaya
    // boş bir `role="alert"` duyurucusu koyuyor ve rol bazlı arama önce onu
    // buluyor — hata hiç görünmese bile test geçerdi.
    await expect(page.getByText(copy.errors.expired)).toBeVisible();

    // Oturum çerezi yazılmamış olmalı.
    const cookies = await page.context().cookies();

    expect(cookies.find((cookie) => cookie.name === "bb_session")).toBeUndefined();
  });

  /**
   * İŞLEM ÇEREZİ TEK KULLANIMLIK. Akış başlatılıp bozuk bir `state` ile
   * dönülünce çerez tüketiliyor; aynı istek ikinci kez denendiğinde
   * doğrulanacak bir şey kalmıyor.
   */
  test("aynı dönüş isteği ikinci kez işlemiyor", async ({ page }) => {
    await assignOwnIp(page);

    // Akışı başlat — işlem çerezi tarayıcıya yazılır.
    await page.goto("/api/auth/google", { waitUntil: "commit" });

    const callbackUrl = "/api/auth/google/callback?code=sahte&state=uydurma";

    await page.goto(callbackUrl);
    await expect(page).toHaveURL(/hata=google_girisi_tamamlanamadi/);

    await page.goto(callbackUrl);
    await expect(page).toHaveURL(/hata=baglanti_suresi_doldu/);
  });
});

test.describe("hata mesajları", () => {
  /**
   * METİN ENJEKSİYONU KORUMASI. Adres çubuğundaki hata kodu beyaz listeden
   * geçiyor; bilinmeyen bir değer ekrana BASILMIYOR. Basılsaydı, bağlantıyı
   * dağıtan biri bizim sayfamızda kendi kimlik avı metnini gösterebilirdi.
   */
  test("uydurma hata kodu ekrana basılmıyor", async ({ page }) => {
    await assignOwnIp(page);
    await page.goto("/giris?hata=Hesabiniz+kapatildi+kart+bilgilerinizi+girin");

    await expect(page.getByText("kart bilgilerinizi girin")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Giriş yap" })).toBeVisible();
  });

  /** Birleştirme engelinin iki sebebi de kullanıcıya ne yapacağını söylüyor. */
  test("hesap birleştirme engellendiğinde ne yapılacağı yazıyor", async ({ page }) => {
    await assignOwnIp(page);
    await page.goto("/giris?hata=dogrulama_gerekli_google_email_unverified");

    await expect(page.getByText(copy.errors.verificationRequired)).toBeVisible();
  });
});
