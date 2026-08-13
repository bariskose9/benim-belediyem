import { NextResponse } from "next/server";

import { publicEnv } from "@/config/env";
import { getCurrentSession } from "@/features/auth/services/session-context";
import { InvalidConsentRequestError } from "@/features/legal/errors";
import { consentInputSchema } from "@/features/legal/schemas/consent.schema";
import { recordCookieNoticeConsent } from "@/features/legal/services/consent.service";
import {
  clearCookieNoticeCookie,
  writeCookieNoticeCookie,
} from "@/features/legal/services/cookie-notice-cookie";
import { ensureAnonymousId } from "@/lib/anonymous-id";
import { AppError } from "@/lib/errors";
import { readActorIp } from "@/lib/rate-limit";
import { sanitizeRedirectPath } from "@/lib/redirect";
import { isSameOriginRequest } from "@/lib/same-origin";

/**
 * `POST /api/v1/consents` — çerez bildirimi tercihini kaydeder (adım 17 · PRD §5.10).
 *
 * ⛔ NEDEN JSON DEĞİL, FORM: bu ucu çağıran çerez bandı JAVASCRIPT İÇERMİYOR.
 * Bant her sayfada çiziliyor; bir istemci bileşeni olsaydı sitenin tamamına
 * gereksiz bir JavaScript paketi eklenirdi ve adım 18'in performans bütçesi
 * daha başlamadan zorlanırdı. Düz `<form method="post">` hem sıfır JavaScript
 * hem de betikleri kapalı tarayıcıda çalışan bir çözüm.
 *
 * ⛔ ÖZNE İSTEMCİDEN GELMİYOR: kullanıcı oturumdan, ziyaretçi kimliği çerezden
 * okunuyor. Gövdede böyle bir alan yok, dolayısıyla kimse başkası adına rıza
 * yazdıramaz (IDOR).
 *
 * ⛔ CEVAP 303 YÖNLENDİRME: tarayıcı POST sonrası GET'e döner, yani kullanıcı
 * sayfayı yenilediğinde form yeniden gönderilmez ("POST/Redirect/GET").
 */
export const dynamic = "force-dynamic";

/** Hata durumunda kullanıcının indiği sayfa — açıklamanın tamamı orada. */
const ERROR_REDIRECT_PATH = "/cerez-politikasi";

export async function POST(request: Request) {
  try {
    /**
     * BAŞKA BİR SİTEDEN GÖNDERİLEN FORMU REDDEDER (CSRF).
     *
     * ⛔ NEDEN GEREKLİ — 2026-08-10 güvenlik denetiminde bulundu: bu uç düz bir
     * form kabul ediyor, yani saldırganın sayfasındaki gizli bir form kurbanın
     * tarayıcısından buraya POST atabilir. Çerezlerimiz `sameSite: lax` olduğu
     * için kurbanın `bb_anon` çerezi O İSTEKLE GİTMEZ; sonuç olarak
     * `ensureAnonymousId()` kimliği bulamaz, YENİSİNİ ÜRETİR ve cevaptaki
     * `Set-Cookie` kurbanın gerçek ziyaretçi kimliğini EZER. Bedeli: ziyaretçi
     * sepeti ve hız sınırı sayacı sıfırlanır.
     *
     * Kapının kendisi `lib/same-origin.ts` içinde — adım 17b'de hesap uçları
     * da aynı kapıyı isteyince ortak bir yere taşındı.
     */
    if (!isSameOriginRequest(request.headers)) throw new InvalidConsentRequestError();

    const parsed = consentInputSchema.safeParse(await readFormBody(request));

    if (!parsed.success) throw new InvalidConsentRequestError();

    const session = await getCurrentSession();

    /**
     * Ziyaretçinin rızası bir ÖZNEYE bağlanmak zorunda; kimliği yoksa burada
     * üretiliyor. Giriş yapmış kullanıcıda da üretiliyor çünkü çıkış yaptıktan
     * sonra bandın yeniden çıkmaması için kimliğin sürmesi gerekiyor.
     */
    const anonymousId = await ensureAnonymousId();

    await recordCookieNoticeConsent({
      subject: { userId: session?.userId, anonymousId },
      isGranted: parsed.data.isGranted,
      actorIp: readActorIp(request.headers),
    });

    if (parsed.data.isGranted) await writeCookieNoticeCookie();
    else await clearCookieNoticeCookie();

    /**
     * DÖNÜŞ ADRESİ: form açıkça söylediyse o, söylemediyse geldiği sayfa.
     *
     * NEDEN `Referer`: bant KÖK YERLEŞİMDE (layout) çiziliyor ve sunucu
     * bileşenleri Next.js'te adres yolunu okuyamıyor — yani form kendi
     * sayfasının adresini alana yazamıyor. Başlık silinmiş olsa bile kayıp
     * yok: kullanıcı ana sayfaya iner.
     *
     * ⛔ HER İKİ KAYNAK DA `sanitizeRedirectPath`'ten geçiyor: `Referer`
     * istemcinin gönderdiği bir başlıktır, yani kullanıcı girdisidir ve
     * denetlenmeden kullanılırsa açık yönlendirme olur.
     */
    const returnTo = parsed.data.returnTo ?? readRefererPath(request.headers);

    return redirectTo(sanitizeRedirectPath(returnTo, "/"));
  } catch (error) {
    /**
     * Hata da YÖNLENDİRME ile bildiriliyor, JSON ile değil: JavaScript'siz bir
     * formu gönderen kullanıcıya ham JSON göstermek anlamsız olurdu. Kod
     * adresten okunup çerez politikası sayfasında Türkçe bir uyarıya çevriliyor.
     */
    const code = error instanceof AppError ? error.code : "UNKNOWN";

    return redirectTo(`${ERROR_REDIRECT_PATH}?hata=${encodeURIComponent(code)}`);
  }
}

async function readFormBody(request: Request): Promise<Record<string, string>> {
  try {
    const form = await request.formData();
    const entries: Record<string, string> = {};

    for (const [key, value] of form.entries()) {
      // Dosya alanı beklenmiyor; gelirse yok sayılıyor ki şema anlamsız bir
      // değerle değil, EKSİK alanla karşılaşsın.
      if (typeof value === "string") entries[key] = value;
    }

    return entries;
  } catch {
    return {};
  }
}

/**
 * `Referer` başlığından YALNIZCA yol kısmını çıkarır; başka bir siteden
 * geliyorsa `undefined` döner.
 *
 * Alan adı karşılaştırması ŞART: `sanitizeRedirectPath` yalnızca "yol mu"
 * sorusunu sorar, "bizim sitemiz mi" sorusunu sormaz. Karşılaştırma olmasaydı
 * `https://sahte.example/gizlilik` adresinden gelen bir POST kullanıcıyı
 * bizim `/gizlilik` sayfamıza atardı — zararsız ama yanlış bir davranış.
 */
function readRefererPath(headers: Headers): string | undefined {
  const referer = headers.get("referer");

  if (!referer) return undefined;

  try {
    const url = new URL(referer);
    const appUrl = new URL(publicEnv.NEXT_PUBLIC_APP_URL);

    if (url.origin !== appUrl.origin) return undefined;

    return `${url.pathname}${url.search}`;
  } catch {
    return undefined;
  }
}

/** 303: POST'un cevabı GET ile alınır (POST/Redirect/GET deseni). */
function redirectTo(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, publicEnv.NEXT_PUBLIC_APP_URL), 303);
}
