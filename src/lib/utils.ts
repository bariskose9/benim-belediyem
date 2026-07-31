import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Verilen süre kadar bekler.
 *
 * `setTimeout` üzerinden çalışıyor ki testler `vi.useFakeTimers()` ile saati
 * ileri sarabilsin — süreye bağlı davranışlar gerçekten beklenerek test
 * edilseydi test paketi dakikalarca sürerdi (docs/standards/06-testing.md).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
