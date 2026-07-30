/**
 * Deterministik rastgelelik.
 *
 * NEDEN Math.random DEĞİL: fake-data-guide.md sahte KPS numaralarının "sabit
 * tohumla (deterministik) üretilmesini" şart koşuyor — testler ve
 * docs/project/test-hesaplari.md bu numaralara güveniyor. Math.random her
 * kurulumda farklı veri üretir ve o güven kaybolur.
 *
 * Algoritma mulberry32: kısa, hızlı ve tek 32-bit durum tutar. Kriptografik
 * DEĞİLDİR ve olmamalıdır — burada üretilen hiçbir değer güvenlik amaçlı
 * kullanılmaz (şifre, jeton, anahtar üretimi için node:crypto kullanılır).
 */
export interface Rng {
  /** [0, 1) aralığında sayı. */
  next(): number;
  /** [min, max] aralığında tam sayı (iki uç dahil). */
  int(min: number, max: number): number;
  /** Diziden bir eleman seçer. */
  pick<T>(items: readonly T[]): T;
  /** `probability` olasılıkla true döner (0-1). */
  chance(probability: number): boolean;
  /** Diziyi kopyalayıp karıştırır; kaynağı değiştirmez. */
  shuffled<T>(items: readonly T[]): T[];
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));

  return {
    next,
    int,
    pick: <T>(items: readonly T[]): T => items[int(0, items.length - 1)],
    chance: (probability: number): boolean => next() < probability,
    shuffled: <T>(items: readonly T[]): T[] => {
      const copy = [...items];

      // Fisher-Yates: her eleman eşit olasılıkla her konuma gelir.
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = int(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }

      return copy;
    },
  };
}
