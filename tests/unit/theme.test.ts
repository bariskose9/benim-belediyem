import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DARK_CLASS, THEME_STORAGE_KEY, themeInitScript, toggleTheme } from "@/lib/theme";
import { installLocalStorage, installUnavailableLocalStorage } from "../helpers/local-storage";

/**
 * Tema altyapısının GERÇEK davranışı test ediliyor: betik çalıştırılıp
 * `<html>` üzerindeki sınıfa bakılıyor. "Fonksiyon çağrıldı mı" değil,
 * "sayfa doğru temayla açıldı mı" sorusu ölçülüyor (06-testing.md).
 */
function runInitScript() {
  // Betik gerçekten çalıştırılıyor — string'i okuyup "içinde dark geçiyor mu"
  // demek, betiğin çalıştığını değil yazıldığını doğrulardı.
  new Function(themeInitScript)();
}

/** `matchMedia` jsdom'da yok; sistem tercihini taklit ediyoruz. */
function stubSystemPrefersDark(prefersDark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: prefersDark && query.includes("dark"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  installLocalStorage();
  document.documentElement.classList.remove(DARK_CLASS);
  stubSystemPrefersDark(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("açılışta tema uygulama", () => {
  it("kayıtlı tercih koyuysa sınıfı ekler", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");

    runInitScript();

    expect(document.documentElement).toHaveClass(DARK_CLASS);
  });

  it("kayıtlı tercih açıksa sistem koyu olsa bile açık kalır", () => {
    // Kullanıcı tercihi sistem tercihini EZER; aksi hâlde "açık tema" seçimi
    // koyu modda çalışan bir cihazda hiç işe yaramazdı.
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    stubSystemPrefersDark(true);

    runInitScript();

    expect(document.documentElement).not.toHaveClass(DARK_CLASS);
  });

  it("hiç tercih yoksa sistem tercihini kullanır", () => {
    stubSystemPrefersDark(true);

    runInitScript();

    expect(document.documentElement).toHaveClass(DARK_CLASS);
  });

  it("depolama erişilemezse tema yüzünden sayfa çökmez", () => {
    // Gizli sekmede / depolama kapalıyken `localStorage` istisna fırlatır.
    installUnavailableLocalStorage();

    expect(() => runInitScript()).not.toThrow();
    expect(document.documentElement).not.toHaveClass(DARK_CLASS);
  });
});

describe("tema değiştirme", () => {
  it("açıktan koyuya geçirir ve tercihi saklar", () => {
    expect(toggleTheme()).toBe("dark");

    expect(document.documentElement).toHaveClass(DARK_CLASS);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("koyudan açığa geri döner ve tercihi saklar", () => {
    document.documentElement.classList.add(DARK_CLASS);

    expect(toggleTheme()).toBe("light");

    expect(document.documentElement).not.toHaveClass(DARK_CLASS);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("depolama yazılamıyorsa bile temayı değiştirir", () => {
    installUnavailableLocalStorage();

    expect(() => toggleTheme()).not.toThrow();
    expect(document.documentElement).toHaveClass(DARK_CLASS);
  });
});
