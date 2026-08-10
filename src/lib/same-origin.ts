import { publicEnv } from "@/config/env";

/**
 * İsteğin KENDİ sitemizden gelip gelmediği (CSRF kapısı).
 *
 * ═══ NEDEN VAR ═══
 * 2026-08-10 güvenlik denetiminde `/api/consents` için yazıldı; adım 17b'de
 * hesap silme ve kimlik çözme uçları da aynı kapıyı isteyince ORTAK bir yere
 * taşındı. İki yerde ayrı yazılsaydı, biri sıkılaştırıldığında diğerinin
 * unutulması an meselesiydi (`profile/services/write-budget.ts` ile aynı
 * gerekçe).
 *
 * ═══ ÖLÇÜT NEDEN `Origin` BAŞLIĞI ═══
 * Tarayıcılar durum değiştiren isteklerde bu başlığı gönderiyor ve içeriği
 * JavaScript'ten DEĞİŞTİRİLEMİYOR. Yani saldırganın sayfasından gelen bir
 * istek kendini bizim sitemiz gibi gösteremez.
 *
 * ⛔ BAŞLIK HİÇ YOKSA İSTEK KABUL EDİLİYOR. CSRF bir TARAYICI saldırısıdır;
 * başlık yoksa istek bir tarayıcı formundan gelmiyordur (curl, test koşumu,
 * mobil istemci) ve orada reddedilecek bir şey yoktur. Reddetmek, adım 19'daki
 * mobil uygulamayı ve duman testlerini kırardı.
 *
 * ═══ ⚠️ BU KAPI TEK BAŞINA YETMİYOR, İKİNCİ KATMAN ═══
 * Asıl koruma çerezin kendisinde: oturum çerezi `sameSite: lax` olduğu için
 * başka bir siteden gelen POST isteğinde tarayıcı onu ZATEN GÖNDERMİYOR.
 * Bu kapı, o davranışın bir gün değişmesi ihtimaline karşı ikinci katman —
 * ve JSON gövdeli uçlarda gerçek bir açığı kapatıyor: `request.json()`
 * `content-type` başlığına BAKMIYOR, yani `enctype="text/plain"` ile
 * gönderilmiş bir HTML formunun gövdesi de geçerli JSON olarak ayrıştırılır.
 */
export function isSameOriginRequest(headers: Headers): boolean {
  const origin = headers.get("origin");

  if (!origin) return true;

  return origin === new URL(publicEnv.NEXT_PUBLIC_APP_URL).origin;
}
