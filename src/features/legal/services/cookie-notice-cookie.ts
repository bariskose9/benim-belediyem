import { cookies } from "next/headers";

import {
  COOKIE_NOTICE_COOKIE_NAME,
  COOKIE_NOTICE_TTL_MS,
  COOKIE_NOTICE_VERSION,
} from "@/config/constants";
import { isCurrentNoticeVersion } from "@/features/legal/services/consent.service";
import { secureCookieDefaults } from "@/lib/cookies";

/**
 * Çerez bildiriminin HTTP tarafı — çerezi okur, yazar, siler (adım 17).
 *
 * `consent.service.ts` bilinçli olarak çerez bilmiyor; bu dosya iki dünyayı
 * birleştiren tek yer (`session-context.ts` ile aynı desen).
 */

/**
 * Bant çizilmeli mi?
 *
 * ⛔ VERİTABANINA GİTMİYOR. Bu soru HER SAYFA ÇİZİMİNDE soruluyor; bir sorgu
 * eklemek, hiçbir doğruluk kazancı olmadan tüm sitenin gecikmesini artırırdı.
 * Rızanın KANITI tabloda; buradaki çerez yalnızca arayüz durumudur.
 *
 * Sürüm eşleşmiyorsa bant yeniden çıkıyor: eski bir metne verilen onay yeni
 * metni kapsamaz.
 */
export async function shouldShowCookieNotice(): Promise<boolean> {
  const store = await cookies();

  return !isCurrentNoticeVersion(store.get(COOKIE_NOTICE_COOKIE_NAME)?.value);
}

/** Bandı susturur. Değer, kullanıcının gördüğü metnin sürümüdür. */
export async function writeCookieNoticeCookie(): Promise<void> {
  const store = await cookies();

  store.set(COOKIE_NOTICE_COOKIE_NAME, COOKIE_NOTICE_VERSION, {
    ...secureCookieDefaults,
    /**
     * `httpOnly` DEĞİL — bilinçli. Bu çerez bir sır taşımıyor (yalnızca sürüm
     * numarası) ve tarayıcıdaki bir betiğin okuması bir şey kazandırmıyor.
     * Yine de `secureCookieDefaults`'un diğer korumaları (secure, sameSite,
     * path) korunuyor; tek bir alan geçersiz kılınıyor.
     */
    httpOnly: false,
    maxAge: Math.floor(COOKIE_NOTICE_TTL_MS / 1000),
  });
}

/** Tercih geri alındığında bandın yeniden çıkması için çerezi siler. */
export async function clearCookieNoticeCookie(): Promise<void> {
  const store = await cookies();

  store.delete(COOKIE_NOTICE_COOKIE_NAME);
}
