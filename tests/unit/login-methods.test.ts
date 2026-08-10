/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { decideGoogleUnlink, decideStartGoogleLink } from "@/features/auth/services/login-methods";

/**
 * ═══ SON GİRİŞ YÖNTEMİ KURALI (PRD §5.0 · teknik borç #33) ═══
 *
 * Korunan davranış tek cümle: kullanıcı kendini hesabından KİLİTLEYEMEMELİ.
 * Kural saf bir fonksiyonda olduğu için dört durumun dördü de veritabanı ve
 * tarayıcı olmadan kanıtlanabiliyor; uçların bu kararı gerçekten uyguladığı
 * `tests/db/google-link.test.ts` içinde ayrıca doğrulanıyor.
 */

describe("decideGoogleUnlink", () => {
  /** ⭐ ASIL KORUMA: Google tek giriş yoluysa kaldırmak hesabı kapatır. */
  it("şifre yokken Google kaldırılamaz", () => {
    const decision = decideGoogleUnlink({ hasPassword: false, hasGoogle: true });

    expect(decision).toEqual({ allowed: false, reason: "last_login_method" });
  });

  it("şifre varken Google kaldırılabilir", () => {
    expect(decideGoogleUnlink({ hasPassword: true, hasGoogle: true })).toEqual({ allowed: true });
  });

  /**
   * "Bağlı değil" ile "son yöntem" AYRI raporlanıyor: ikisi de engelliyor ama
   * kullanıcıya söylenecek cümle farklı. Tek bir "olmaz" mesajı, zaten
   * kaldırılmış bir bağlantıda "hesabın kilitlenir" korkusu verirdi.
   */
  it("bağlı değilken sebep 'not_linked' olur", () => {
    const decision = decideGoogleUnlink({ hasPassword: true, hasGoogle: false });

    expect(decision).toEqual({ allowed: false, reason: "not_linked" });
  });

  it("hiçbir yöntem yokken de kaldırılacak bir şey yoktur", () => {
    const decision = decideGoogleUnlink({ hasPassword: false, hasGoogle: false });

    expect(decision).toEqual({ allowed: false, reason: "not_linked" });
  });
});

describe("decideStartGoogleLink", () => {
  it("şifresi olan ve Google'ı olmayan hesap bağlayabilir", () => {
    expect(decideStartGoogleLink({ hasPassword: true, hasGoogle: false })).toEqual({
      allowed: true,
    });
  });

  it("zaten bağlıysa ikinci kez bağlanmaz", () => {
    const decision = decideStartGoogleLink({ hasPassword: true, hasGoogle: true });

    expect(decision).toEqual({ allowed: false, reason: "already_linked" });
  });

  /**
   * Şifresi olmayan hesap, şifresini doğrulayarak bağlama yapamaz.
   * Pratikte bu duruma yalnızca tohumdaki arka plan hesapları düşüyor
   * (ne şifreleri ne Google bağlantıları var, hiç giriş yapamıyorlar) —
   * kural yine de sessizce "izin ver" dememeli.
   */
  it("şifresiz hesapta bağlama başlatılamaz", () => {
    const decision = decideStartGoogleLink({ hasPassword: false, hasGoogle: false });

    expect(decision).toEqual({ allowed: false, reason: "password_required" });
  });

  /** Google'ı olup şifresi olmayan hesapta ilk dal kazanır. */
  it("Google bağlıyken şifre eksikliği raporlanmaz", () => {
    const decision = decideStartGoogleLink({ hasPassword: false, hasGoogle: true });

    expect(decision).toEqual({ allowed: false, reason: "already_linked" });
  });
});
