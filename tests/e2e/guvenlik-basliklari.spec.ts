import { expect, test } from "@playwright/test";

/**
 * Güvenlik başlıkları kapısı (adım 18d).
 *
 * NEDEN BU DOSYA VAR: baseline güvenlik başlıkları adım 4b'den beri
 * yapılandırılmıştı ve bugüne kadar HİÇBİR test onları doğrulamıyordu
 * (2026-08-12'de ölçüldü: `grep` ile `tests/` altında tek eşleşme yok).
 * Yapılandırılmış ama ölçülmeyen bir koruma, sessizce kaybolabilen bir
 * korumadır — `next.config.ts`'ten bir satır silinse hiçbir şey kırmızıya
 * dönmezdi.
 *
 * ⚠️ BU TESTLER YANIT BAŞLIĞINA BAKAR, `page.goto`'nun döndürdüğü koda DEĞİL.
 * Bir sayfanın 200 dönmesi başlıklarının doğru olduğunu göstermez.
 */

/** Politikayı `ad → değer` sözlüğüne çevirir; sıraya bağlı testten kaçınmak için. */
function parsePolicy(policy: string): Record<string, string> {
  return Object.fromEntries(
    policy
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...values] = part.split(/\s+/);
        return [name ?? "", values.join(" ")];
      }),
  );
}

async function fetchPolicy(request: import("@playwright/test").APIRequestContext, path: string) {
  const response = await request.get(path);
  const header = response.headers()["content-security-policy"];

  expect(header, `${path} için CSP başlığı hiç gelmedi`).toBeTruthy();

  return parsePolicy(header!);
}

test.describe("içerik güvenliği politikası (CSP)", () => {
  test("script-src ARTIK 'unsafe-inline' içermiyor — sıkı CSP'nin asıl kazancı", async ({
    request,
  }) => {
    // Borç #10'un ta kendisi: `'unsafe-inline'` varken sayfaya enjekte edilen
    // her satır içi betik çalışırdı, yani CSP XSS'e karşı hiçbir şey yapmıyordu.
    const policy = await fetchPolicy(request, "/");

    expect(policy["script-src"]).not.toContain("'unsafe-inline'");
    expect(policy["script-src"]).toContain("'strict-dynamic'");
    expect(policy["script-src"]).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  });

  test("nonce her istekte YENİDEN üretiliyor", async ({ request }) => {
    // Sabit bir nonce, hiç nonce olmamasıyla aynı şeydir: saldırgan onu
    // enjekte ettiği betiğe yazar ve politika tamamen atlanır.
    const [first, second] = await Promise.all([
      fetchPolicy(request, "/"),
      fetchPolicy(request, "/"),
    ]);

    expect(first["script-src"]).not.toBe(second["script-src"]);
  });

  test("sayfadaki her çalıştırılabilir betik nonce taşıyor", async ({ page }) => {
    await page.goto("/");

    /*
     * ⚠️ `getAttribute("nonce")` KULLANILMIYOR — tarayıcı CSP gereği nonce
     * özniteliğini DOM'dan GİZLİYOR ("nonce hiding"), böylece bir CSS seçici
     * saldırısı nonce'u okuyamıyor. Değer yalnızca `.nonce` property'sinde
     * durur. Öznitelikle ölçen bir test, doğru çalışan bir sayfada bile
     * "hiçbir betikte nonce yok" der ve yanlış alarm üretirdi.
     */
    const sonuc = await page.evaluate(() => {
      const betikler = Array.from(document.querySelectorAll("script"));
      const calistirilabilir = betikler.filter(
        (s) => !s.type || s.type === "" || s.type.includes("javascript"),
      );

      return {
        toplam: calistirilabilir.length,
        nonceSuz: calistirilabilir.filter((s) => !s.nonce).length,
      };
    });

    expect(sonuc.toplam).toBeGreaterThan(0);
    expect(sonuc.nonceSuz).toBe(0);
  });

  test("tema betiği bloklanmadı — koyu tema ilk boyamada uygulanıyor", async ({ page }) => {
    /*
     * Bu testin sebebi bir TUZAK: elle yazılmış `<script>` etiketlerine Next
     * nonce'u OTOMATİK takmıyor, yalnızca kendi ürettiklerine takıyor. Tema
     * betiği nonce'suz kalsaydı sessizce bloklanır, sayfa yine açılır ve
     * hata hiçbir yere düşmezdi — yalnızca koyu tema kullanıcısı her açılışta
     * beyaz parlama görürdü.
     */
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("çerçeveleme ve nesne yönergeleri kapalı", async ({ request }) => {
    const policy = await fetchPolicy(request, "/");

    expect(policy["frame-ancestors"]).toBe("'none'");
    expect(policy["object-src"]).toBe("'none'");
    expect(policy["base-uri"]).toBe("'self'");
    expect(policy["form-action"]).toBe("'self'");
  });

  test("bot doğrulaması için gereken üç yönerge duruyor", async ({ request }) => {
    // Bu üçü olmadan Turnstile SESSİZCE bozulur: sunucu hata vermez, test
    // geçer, yalnızca tarayıcıda kutu hiç görünmez ve form gönderilemez.
    const policy = await fetchPolicy(request, "/");
    const turnstile = "https://challenges.cloudflare.com";

    expect(policy["script-src"]).toContain(turnstile);
    expect(policy["connect-src"]).toContain(turnstile);
    expect(policy["frame-src"]).toContain(turnstile);
  });

  /*
   * ⛔ TEK BİR YOLU ÖLÇMEK YETMEZ. Politika `proxy.ts`'teki bir `matcher`
   * ifadesine bağlı; o ifade yanlışlıkla daraltılırsa yalnızca `/` korunur ve
   * geri kalan sayfalar SESSİZCE politikasız kalır. Aşağıdaki liste kimlik,
   * ödeme ve yasal akışlardan birer temsilci içeriyor.
   */
  const korunmasiSartYollar = ["/", "/giris", "/kayit", "/market", "/hesabim", "/gizlilik"];

  for (const yol of korunmasiSartYollar) {
    test(`${yol} adresinde de sıkı CSP uygulanıyor`, async ({ request }) => {
      const policy = await fetchPolicy(request, yol);

      expect(policy["script-src"]).not.toContain("'unsafe-inline'");
      expect(policy["script-src"]).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
      expect(policy["frame-ancestors"]).toBe("'none'");
    });
  }

  test("TEK bir CSP başlığı gönderiliyor", async ({ request }) => {
    /*
     * İki `Content-Security-Policy` başlığı gönderilirse tarayıcı ikisini de
     * ayrı ayrı uygular ve KESİŞİMLERİNİ alır — gevşek olan sıkı olanı
     * gevşetmez, ama sıkı olanın izin verdiğini bloklar. `next.config.ts`'e
     * ikinci bir CSP satırı eklenirse bu test onu yakalar.
     */
    const response = await request.get("/");
    const raw = response
      .headersArray()
      .filter((h) => h.name.toLowerCase() === "content-security-policy");

    expect(raw).toHaveLength(1);
  });
});

test.describe("diğer güvenlik başlıkları", () => {
  const beklenen: Record<string, string | RegExp> = {
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "strict-transport-security": /max-age=\d+/,
    "permissions-policy": /camera=\(\)/,
  };

  for (const [ad, deger] of Object.entries(beklenen)) {
    test(`${ad} başlığı ayarlı`, async ({ request }) => {
      const response = await request.get("/");
      const gelen = response.headers()[ad];

      if (typeof deger === "string") {
        expect(gelen).toBe(deger);
      } else {
        expect(gelen).toMatch(deger);
      }
    });
  }

  test("sunucu teknolojisini açık eden başlık gönderilmiyor", async ({ request }) => {
    // `poweredByHeader: false` — saldırgana hedefin ne olduğunu söylemek
    // ücretsiz bir keşif hediyesidir.
    const response = await request.get("/");

    expect(response.headers()["x-powered-by"]).toBeUndefined();
  });
});
