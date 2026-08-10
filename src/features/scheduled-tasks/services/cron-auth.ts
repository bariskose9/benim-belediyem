import { timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/config/env";
import { UnauthorizedError } from "@/lib/errors";

/**
 * `/api/cron/*` uçlarının kapısı (ADR-007: "her planlı görev `CRON_SECRET` ile
 * korunur; kimliği doğrulanmamış istek 401 alır").
 *
 * ═══ NEDEN OTURUM KONTROLÜ DEĞİL ═══
 * Bu ucu çağıran bir kullanıcı değil, Vercel'in zamanlayıcısı. Oturum çerezi
 * yok; taşıdığı tek kanıt paylaşılan gizli anahtar. Vercel dokümanından
 * (2026-08-10'da okundu) doğrulandı: `CRON_SECRET` ortam değişkeni tanımlıysa
 * platform onu isteğe `Authorization: Bearer <değer>` başlığıyla ekliyor.
 *
 * ═══ ANAHTAR YOKSA KAPI AÇILMAZ ═══
 * `CRON_SECRET` tanımlı değilse istek 401 alıyor — "anahtar yoksa herkese
 * açık" davranışı, değişkenin unutulduğu ortamda ucu internete açardı ve
 * planlı görev veri SİLEN bir uçtur. Yanlış tarafa düşmek yerine kapalı
 * kalıyor (fail-closed).
 */
export function assertCronRequestAuthorized(headers: Headers): void {
  const secret = serverEnv.CRON_SECRET;
  const provided = headers.get("authorization");

  if (!secret || !provided || !isSameSecret(provided, `Bearer ${secret}`)) {
    // Tek tip mesaj: "anahtar tanımlı değil" ile "anahtar yanlış" ayrımı
    // dışarıdan görülmez, yoksa saldırgan yapılandırma durumunu öğrenirdi.
    throw new UnauthorizedError("Bu uca erişim yetkiniz yok.");
  }
}

/**
 * Sabit süreli karşılaştırma.
 *
 * ⛔ `===` KULLANILMIYOR: JavaScript'in dizi karşılaştırması ilk farklı
 * karakterde duruyor ve yanıt süresi "kaç karakter tuttu" bilgisini sızdırıyor.
 * Saldırgan anahtarı karakter karakter çıkarabilirdi (zamanlama saldırısı).
 *
 * Uzunluk farkı önce kontrol ediliyor: `timingSafeEqual` farklı uzunlukta
 * istisna fırlatıyor. Uzunluğun sızması önemsiz — anahtarın uzunluğu zaten
 * gizli bilgi değil, içeriği gizli.
 */
function isSameSecret(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");

  if (providedBytes.length !== expectedBytes.length) return false;

  return timingSafeEqual(providedBytes, expectedBytes);
}
