import { getCurrentSession } from "@/features/auth/services/session-context";
import type { CartOwner } from "@/features/cart/repositories/cart.repository";
import { ensureAnonymousId, readAnonymousId } from "@/lib/anonymous-id";

/**
 * "Bu istekte sepetin sahibi kim" sorusunun TEK cevabı.
 *
 * PRD §4 sepeti iki kimliğe bağlayabiliyor: giriş yapmışsa kullanıcıya,
 * yapmamışsa `bb_anon` çerezindeki rastgele ziyaretçi kimliğine. Bu ayrımı
 * her uçta ve her sayfada yeniden yazmak, birinde unutulup ziyaretçi
 * sepetinin kaybolmasının en kısa yoluydu.
 *
 * ═══ İKİ AYRI FONKSİYON VAR VE KARIŞTIRILMAMALI ═══
 *
 * Next.js SUNUCU BİLEŞENİNDE ÇEREZ YAZILMASINA İZİN VERMİYOR; `cookies().set()`
 * orada istisna fırlatıyor. Yani "kimliği oku, yoksa üret" davranışı yalnızca
 * route handler'larda geçerli. Bu ayrım `lib/anonymous-id.ts` içinde zaten
 * yazılıydı ama sepet ilk yazıldığında atlandı: `/sepet` sayfası hiç çerezi
 * olmayan bir ziyaretçide çöküyordu ve E2E testi bunu yakaladı.
 *
 *  · `getCartContext()`  → route handler'lar. Kimlik yoksa ÜRETİR
 *  · `readCartOwner()`   → sunucu bileşenleri. Kimlik yoksa `null` döner
 */

export type CartContext = {
  owner: CartOwner;
  anonymousId: string;
  userId: string | null;
};

/**
 * Yazma bağlamı: ziyaretçi kimliği yoksa üretilir ve çereze yazılır.
 * YALNIZCA route handler ve server action içinden çağrılabilir.
 */
export async function getCartContext(): Promise<CartContext> {
  const [session, anonymousId] = await Promise.all([getCurrentSession(), ensureAnonymousId()]);

  return {
    owner: session ? { userId: session.userId } : { anonymousId },
    anonymousId,
    userId: session?.userId ?? null,
  };
}

/**
 * Okuma bağlamı: sunucu bileşenleri için.
 *
 * `null` dönmesi "sepet yok" demektir — ne oturum var ne de ziyaretçi çerezi.
 * Bu tamamen normal bir durum: siteye ilk kez giren biri. Sayfa boş sepet
 * gösterir, kimlik ilk yazma isteğinde (uçta) üretilir.
 */
export async function readCartOwner(): Promise<CartOwner | null> {
  const session = await getCurrentSession();

  if (session) return { userId: session.userId };

  const anonymousId = await readAnonymousId();

  return anonymousId ? { anonymousId } : null;
}
