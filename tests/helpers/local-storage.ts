import { vi } from "vitest";

/**
 * Test ortamı için `localStorage` taklidi.
 *
 * NEDEN GEREKLİ: bu projenin jsdom sürümünde `localStorage` global'i BOŞ BİR
 * NESNE olarak geliyor — `getItem`/`setItem` bile yok. Gerçek tarayıcıda böyle
 * bir durum yok; bu yalnızca test ortamının eksiği.
 *
 * Taklit GERÇEK DAVRANIŞI taşıyor (06-testing.md): değerler string'e
 * çevriliyor, olmayan anahtar `null` dönüyor, `clear` gerçekten siliyor.
 * Sessizce her şeye `undefined` dönen bir taklit, testi yeşil gösterip
 * hatayı canlıya bırakırdı.
 */
export function installLocalStorage(): void {
  const store = new Map<string, string>();

  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  });
}

/**
 * Depolamayı ERİŞİLEMEZ yapar: her çağrı istisna fırlatır.
 *
 * Gizli sekmede ve çerez/depolama kapalıyken tarayıcının yaptığı budur.
 * Uygulamanın bu durumda çökmediği ayrıca test ediliyor.
 */
export function installUnavailableLocalStorage(): void {
  const fail = () => {
    throw new Error("depolama kapalı");
  };

  vi.stubGlobal("localStorage", {
    getItem: fail,
    setItem: fail,
    removeItem: fail,
    clear: fail,
    key: fail,
    get length(): number {
      return fail();
    },
  });
}
