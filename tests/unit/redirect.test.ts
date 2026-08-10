/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { DEFAULT_REDIRECT_PATH, sanitizeRedirectPath } from "@/lib/redirect";

/**
 * Açık yönlendirme (open redirect) koruması.
 *
 * Dönüş adresi adres çubuğundan geliyor; denetlenmezse saldırgan
 * `/giris?donus=https://sahte-belediye.example` bağlantısını dağıtır.
 */

describe("kabul edilen adresler", () => {
  it("kendi sitemizdeki yolları geçirir", () => {
    expect(sanitizeRedirectPath("/hesabim")).toBe("/hesabim");
    expect(sanitizeRedirectPath("/hastane")).toBe("/hastane");
    expect(sanitizeRedirectPath("/hesabim?sekme=bilgiler")).toBe("/hesabim?sekme=bilgiler");
  });
});

describe("reddedilen adresler — hepsi sessizce güvenli varsayılana düşer", () => {
  it("mutlak adresleri reddeder", () => {
    expect(sanitizeRedirectPath("https://sahte-belediye.example")).toBe(DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectPath("http://sahte-belediye.example")).toBe(DEFAULT_REDIRECT_PATH);
  });

  it("şemasız mutlak adresleri reddeder", () => {
    // `//ornek.test` tarayıcıda BAŞKA SİTEYE gider ama yol gibi görünür.
    expect(sanitizeRedirectPath("//sahte-belediye.example")).toBe(DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectPath("/\\sahte-belediye.example")).toBe(DEFAULT_REDIRECT_PATH);
  });

  /**
   * ⭐ KONTROL KARAKTERİ ATLATMASI (adım 15c-2 güvenlik denetiminde bulundu).
   *
   * WHATWG URL standardı adresteki TAB, LF ve CR karakterlerini AYRIŞTIRMADAN
   * ÖNCE SİLER. Yani `/\t/sahte.example` filtreden "yol" gibi geçer ama
   * tarayıcı onu `//sahte.example` olarak okur ve BAŞKA SİTEYE gider.
   * `node` ile fiilen doğrulandı: `new URL("/\t/sahte.example", base).href`
   * → `https://sahte.example/`.
   *
   * Bu kural yalnızca kimlik doğrulama ekranını değil, giriş sonrası dönüşü ve
   * Google callback'ini de koruyor — üçü de aynı fonksiyondan geçiyor.
   */
  it("kontrol karakteriyle gizlenmiş şemasız mutlak adresleri reddeder", () => {
    expect(sanitizeRedirectPath("/\t/sahte-belediye.example")).toBe(DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectPath("/\n/sahte-belediye.example")).toBe(DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectPath("/\r/sahte-belediye.example")).toBe(DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectPath("/\t\\sahte-belediye.example")).toBe(DEFAULT_REDIRECT_PATH);
    // Karakter ARADA da olsa adres yine bozuluyor; temizlik baştan sona yapılır.
    expect(sanitizeRedirectPath("/hesabim\n/../..")).toBe(DEFAULT_REDIRECT_PATH);
  });

  it("eğik çizgiyle başlamayan değerleri reddeder", () => {
    expect(sanitizeRedirectPath("hesabim")).toBe(DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectPath("javascript:alert(1)")).toBe(DEFAULT_REDIRECT_PATH);
  });

  it("giriş ve kayıt sayfalarını reddeder — halkaya girilmesin", () => {
    expect(sanitizeRedirectPath("/giris")).toBe(DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectPath("/kayit/bilgiler")).toBe(DEFAULT_REDIRECT_PATH);
  });

  it("boş değer için varsayılanı döner", () => {
    expect(sanitizeRedirectPath(undefined)).toBe(DEFAULT_REDIRECT_PATH);
    expect(sanitizeRedirectPath("")).toBe(DEFAULT_REDIRECT_PATH);
  });
});
