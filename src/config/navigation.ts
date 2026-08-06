/**
 * Menü ve ana sayfa hizmet ızgarasının YAPISI (metinler `messages.ts` içinde).
 *
 * Neden ayrı dosya: aynı liste iki yerde kullanılıyor (üst menü + ana sayfa
 * kartları). İkisi ayrı ayrı yazılsaydı yeni bir modül eklendiğinde birinin
 * güncellenip diğerinin unutulması an meselesiydi.
 *
 * Neden metin burada değil: `02-coding-standards.md` kullanıcıya görünen tüm
 * Türkçe metinlerin `messages.ts` içinde tek yerde durmasını istiyor.
 */

/** `messages.services` altındaki anahtarlarla birebir aynı olmalı. */
export type ServiceKey = "market" | "restaurant" | "events" | "hospital" | "gym" | "support";

export interface ServiceCard {
  key: ServiceKey;
  /**
   * `null` ise sayfa HENÜZ YOK ve kart tıklanabilir değildir.
   *
   * Olmayan bir adrese bağlantı vermek iki şeyi birden bozardı: kullanıcı 404
   * görürdü ve Next.js bağlantıları önceden getirdiği için ana sayfa açılır
   * açılmaz başarısız istekler düşerdi (duman testi bunu yakalıyor).
   */
  href: string | null;
  /** PRD §5.0: hastane ve spor salonu belediyenin PERSONEL hizmetleri. */
  staffOnly: boolean;
}

export const serviceCards: readonly ServiceCard[] = [
  { key: "market", href: "/market", staffOnly: false },
  { key: "restaurant", href: null, staffOnly: false },
  { key: "events", href: null, staffOnly: false },
  { key: "support", href: null, staffOnly: false },
  { key: "hospital", href: "/hastane", staffOnly: true },
  { key: "gym", href: "/spor-salonu", staffOnly: true },
] as const;

/**
 * Üst menüdeki bağlantılar — yalnızca GERÇEKTEN VAR OLAN sayfalar.
 *
 * MENÜDE ÖĞE GİZLEMEK/GÖSTERMEK KORUMA DEĞİLDİR: personele özel sayfalar
 * burada herkese görünür, kapı sayfanın kendisindedir (`page-guard.ts`).
 * Gizlemek yalnızca "bu hizmet yok" izlenimi verir, güvenlik katkısı olmaz.
 */
export const primaryNavItems = [
  { key: "home", href: "/" },
  { key: "market", href: "/market" },
  { key: "hospital", href: "/hastane" },
  { key: "gym", href: "/spor-salonu" },
] as const;

export type PrimaryNavKey = (typeof primaryNavItems)[number]["key"];
