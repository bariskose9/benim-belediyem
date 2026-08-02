import { cookies } from "next/headers";
import { cache } from "react";

import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from "@/config/constants";
import type { SessionUserRow } from "@/features/auth/repositories/session.repository";
import { readSession } from "@/features/auth/services/session.service";
import { secureCookieDefaults } from "@/lib/cookies";

/**
 * Oturumun HTTP tarafı: çerezi okur, yazar, siler.
 *
 * `session.service.ts` bilinçli olarak çerez bilmiyor; bu dosya iki dünyayı
 * birleştiren tek yer. Sunucu bileşenleri, route handler'lar ve gelecekteki
 * server action'lar oturuma BURADAN erişir.
 */

/** Ham jetonu çerezden okur. Doğrulamaz — doğrulama `readSession`'ın işi. */
export async function readSessionToken(): Promise<string | undefined> {
  const store = await cookies();

  return store.get(SESSION_COOKIE_NAME)?.value || undefined;
}

/**
 * Şu anki oturumu döner; yoksa `null`.
 *
 * İSTEK BAŞINA BİR VERİTABANI OKUMASI — ADR-005'in kabul ettiği bedel.
 * Karşılığında rol ve personel durumu HER İSTEKTE güncel gelir.
 *
 * `cache()` neden gerekli: aynı sayfayı çizerken oturum birden fazla yerden
 * okunuyor (üst menü + sayfanın kendisi, korumalı sayfalarda ayrıca
 * `page-guard`). Sarmalanmadığında her biri ayrı bir sorgu açıyordu. React'in
 * `cache`'i sonucu YALNIZCA O İSTEK boyunca saklar; istekler arasında hiçbir
 * şey paylaşılmaz, yani bir kullanıcının oturumu bir başkasına görünemez.
 */
export const getCurrentSession = cache(async (): Promise<SessionUserRow | null> => {
  return readSession(await readSessionToken());
});

/**
 * Oturum çerezini yazar.
 *
 * BİLİNEN SINIR — çerez süresi tarayıcıda uzamıyor: `maxAge` yalnızca burada,
 * yani giriş anında ayarlanıyor. Veritabanındaki oturum kayan yenilemeyle
 * uzasa bile çerez 7 gün sonra tarayıcıdan düşer. Yalnızca sayfa okuyup 7 gün
 * boyunca hiçbir istek göndermeyen kullanıcı bu yüzden yeniden giriş yapar.
 * Sebep: Next.js sunucu bileşenlerinde çerez YAZILAMAZ, dolayısıyla okuma
 * sırasında çerezi tazelemek mümkün değil. Düzeltmesi Node çalışma zamanlı bir
 * ara katman (middleware) gerektiriyor; teknik borç olarak `roadmap.md`'de.
 */
export async function writeSessionCookie(token: string): Promise<void> {
  const store = await cookies();

  store.set(SESSION_COOKIE_NAME, token, {
    ...secureCookieDefaults,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();

  store.delete(SESSION_COOKIE_NAME);
}
