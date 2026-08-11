import { NextResponse, type NextRequest } from "next/server";

import { TURNSTILE_SCRIPT_ORIGIN } from "@/config/constants";

/**
 * Sıkı (nonce tabanlı) Content-Security-Policy — roadmap teknik borç #10.
 *
 * ⚠️ DOSYA ADI `proxy.ts`, `middleware.ts` DEĞİL. Next.js 16 ara katmanın adını
 * `proxy` yaptı; 16.2.12 ikisini de tanıyor ama resmî belge ve gelecek sürümler
 * `proxy` diyor (`node_modules/next/dist/lib/constants.js` → `PROXY_FILENAME`).
 *
 * ⭐ NEDEN BURADA, `next.config.ts`'te DEĞİL: nonce her istekte YENİDEN
 * üretilmek zorunda. Tahmin edilebilir bir nonce, hiç nonce olmamasıyla aynı
 * şeydir. `next.config.ts` başlıkları derleme anında sabitlenir, oysa buradaki
 * kod her istekte çalışır.
 *
 * ⭐ MALİYETİ ÖLÇÜLDÜ VE BU PROJEDE SIFIR ÇIKTI. Next belgesi nonce'un en büyük
 * bedelini "tüm sayfalar dinamik olmak zorunda kalır, statik render ve CDN
 * önbelleği kaybolur" diye anlatıyor. Adım 18d'de `npm run build` çıktısı
 * ölçüldü: uygulamanın 77 rotasının tamamı ZATEN dinamikti (`ƒ`). Sebebi
 * teknik borç #84'te yazılı — `SiteHeader` oturum çerezini adım 4a'dan beri
 * okuyor. Yani kaybedilecek statik render yoktu; bu adımda ödenen bedel yok.
 */

/** Bir istekte bir kez üretilen, tahmin edilemez tek kullanımlık değer. */
function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));

  return btoa(String.fromCharCode(...bytes));
}

function buildContentSecurityPolicy(nonce: string, isDevelopment: boolean): string {
  return [
    "default-src 'self'",

    /*
     * ⭐ ASIL KAZANÇ BU SATIR: `'unsafe-inline'` gitti.
     *
     * `'strict-dynamic'`: nonce'lu bir betiğin DOM'a eklediği betikler de
     * güvenilir sayılır. Turnstile widget'ı tam da bunu yapıyor
     * (`TurnstileWidget.tsx` → `document.createElement("script")`), yani
     * bulmaca alan adını ayrıca listelemeye gerek kalmıyor.
     *
     * Turnstile alan adı YİNE DE yazılı ve bu bilinçli: `'strict-dynamic'`
     * desteklemeyen eski tarayıcılar onu yok sayıp allowlist'e düşer, yeni
     * tarayıcılar ise allowlist'i yok sayıp `'strict-dynamic'` kullanır.
     * CSP3'ün geriye dönük uyumluluk tasarımı budur.
     *
     * `'unsafe-eval'` yalnızca geliştirmede: React sunucu hatalarının yığınını
     * tarayıcıda yeniden kurarken `eval` kullanıyor. Üretimde gerekmiyor.
     */
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${TURNSTILE_SCRIPT_ORIGIN}${
      isDevelopment ? " 'unsafe-eval'" : ""
    }`,

    /*
     * ⚠️ STİLDE `'unsafe-inline'` KALDI — TAVİZ, VE GEREKÇESİ TAHMİN DEĞİL:
     * nonce'lu hâli fiilen kuruldu, üretim yapısı derlendi ve tarayıcıda
     * ölçüldü (2026-08-12, adım 18d). İki şey kırıldı:
     *
     *  1. `next/image` `fill` modunda görsele `style` ÖZNİTELİĞİ yazıyor.
     *     `/market` sayfasında 45 görselin `getComputedStyle().position`
     *     değeri `absolute` yerine `static` ölçüldü — hepsi bozuldu.
     *     ⛔ Bu bir yapılandırma eksiği DEĞİL, mimari sınır: nonce yalnızca
     *     ETİKETE takılabilir, özniteliğe takılamaz. Öznitelik biçimindeki
     *     stil `style-src-attr` altına düşer ve nonce ile imzalanamaz.
     *  2. `sonner` (bildirim kutusu) çalışma anında 14 859 karakterlik bir
     *     `<style>` etiketi enjekte ediyor ve nonce takmıyor; ölçümde
     *     `style.sheet` boş çıktı, yani tüm bildirim stilleri ölmüştü.
     *     `ToasterProps` arayüzünde `nonce` alanı YOK (ölçüldü) — yani
     *     kütüphaneye nonce geçirmenin bir yolu da yok.
     *
     * ⛔ `'nonce-...'` İLE `'unsafe-inline'`İ BİRLİKTE YAZMAK ÇÖZÜM DEĞİL:
     * CSP'ye göre nonce varken `'unsafe-inline'` YOK SAYILIR. Yani ikisini
     * yan yana koymak yalnızca sıkı görünen, aslında yine kırık bir politika
     * üretirdi.
     *
     * ⛔ EN SİNSİ TARAF: bu kırılma tarayıcı KONSOLUNA HİÇBİR ŞEY YAZMADI.
     * "Konsol temiz" burada "çalışıyor" anlamına gelmiyordu; kırıklık ancak
     * `getComputedStyle` ile ÖLÇÜLEREK görüldü.
     *
     * RİSK FARKI ÖNEMLİ: script tarafındaki `'unsafe-inline'` doğrudan kod
     * çalıştırma (XSS) demekti ve O KAPANDI. Stil tarafında kalan risk en
     * kötü ihtimalle görsel kurcalama ve dar bir veri sızdırma kanalıdır.
     * İkisi aynı ağırlıkta değildir. Kaldırma koşulu roadmap borç kaydında.
     */
    "style-src 'self' 'unsafe-inline'",

    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${TURNSTILE_SCRIPT_ORIGIN}`,

    // Bulmaca kendini bir iframe içinde gösteriyor. `frame-ancestors 'none'`
    // aşağıda duruyor: biz kimseyi gömemeyiz demiyor, KİMSE BİZİ gömemez diyor.
    `frame-src 'self' ${TURNSTILE_SCRIPT_ORIGIN}`,

    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest): NextResponse {
  const nonce = createNonce();
  const contentSecurityPolicy = buildContentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development",
  );

  /*
   * Nonce iki ayrı yere yazılıyor ve İKİSİ DE gerekli:
   *
   *  - `x-nonce` İSTEK başlığına → sunucu bileşenleri `headers()` ile okuyup
   *    kendi satır içi betiklerine takabilsin diye (`app/layout.tsx`).
   *  - `Content-Security-Policy` İSTEK başlığına → Next.js çerçevenin kendi
   *    betiklerine nonce'u BU başlığı ayrıştırarak takıyor. Yalnızca yanıta
   *    yazılsaydı Next nonce'u göremez ve kendi betikleri bloklanırdı.
   */
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  return response;
}

export const config = {
  matcher: [
    {
      /*
       * Statik varlıklar hariç her yol. CSP bir BELGE politikasıdır; bir JS
       * veya resim dosyasının kendi yanıtına yazılması hiçbir şeyi korumaz,
       * yalnızca her varlık isteğinde bu kodu boşuna çalıştırırdı.
       *
       * `robots.txt` · `sitemap.xml` · `icon.svg` de dışarıda: derleme anında
       * üretilen ve statik kalan tek üç rota bunlar (`npm run build` çıktısında
       * `○`). Buraya sokmak onları isteğe bağlı hâle getirirdi.
       */
      source:
        "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|robots\\.txt|sitemap\\.xml).*)",
      // `next/link` ön yüklemeleri gerçek bir belge açmıyor; onlara nonce
      // üretmek boşa iş ve gereksiz bir dinamiklik kaynağı.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
