/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
  decideGoogleLink,
  type ExistingAccountForLinking,
} from "@/features/auth/services/google-account-linking";
import type { GoogleIdentity } from "@/features/auth/services/google-oauth.service";

/**
 * HESAP BİRLEŞTİRME KURALI (PRD §5.0 · kabul kriteri: "Aynı e-postayla Google
 * girişi mevcut hesabı OTOMATİK ELE GEÇİREMEZ").
 *
 * Buradaki testlerin çoğu bir saldırı senaryosunu tarif ediyor. Kural
 * gevşetilirse bu dosya kırmızıya döner — ve bu dosyayı yeşile döndürmek için
 * testi zayıflatmak, korumayı kaldırmakla aynı şeydir (CLAUDE.md §7).
 */

function identity(overrides: Partial<GoogleIdentity> = {}): GoogleIdentity {
  return {
    subject: "google-sub-1",
    email: "ahmet@ornek.test",
    emailVerified: true,
    name: "Ahmet Yılmaz",
    ...overrides,
  };
}

function existing(overrides: Partial<ExistingAccountForLinking> = {}): ExistingAccountForLinking {
  return { userId: "user-1", emailVerified: true, ...overrides };
}

describe("bağlantı zaten kurulmuşsa", () => {
  it("normal giriş yapılır", () => {
    const decision = decideGoogleLink({
      identity: identity(),
      linkedUserId: "user-42",
      existingAccount: null,
    });

    expect(decision).toEqual({ kind: "login", userId: "user-42" });
  });

  /**
   * Bağlantı `sub` üzerinden kurulu. Kullanıcı Google hesabının e-posta adresini
   * değiştirse ya da Google doğrulamayı geri alsa bile bu bağlantı geçerlidir —
   * her girişte yeniden kanıt istemek kullanıcıyı kendi hesabından kilitlerdi.
   */
  it("Google e-postası doğrulanmamış olsa bile giriş engellenmez", () => {
    const decision = decideGoogleLink({
      identity: identity({ emailVerified: false }),
      linkedUserId: "user-42",
      existingAccount: existing(),
    });

    expect(decision).toEqual({ kind: "login", userId: "user-42" });
  });
});

describe("bu e-postayla hesabımız yoksa", () => {
  it("doğrulanmamış yeni hesap açılır", () => {
    const decision = decideGoogleLink({
      identity: identity(),
      linkedUserId: null,
      existingAccount: null,
    });

    expect(decision).toEqual({ kind: "create_unverified" });
  });
});

describe("aynı e-postalı hesap varsa", () => {
  it("İKİ TARAF da doğrulanmışsa birleştirilir", () => {
    const decision = decideGoogleLink({
      identity: identity({ emailVerified: true }),
      linkedUserId: null,
      existingAccount: existing({ userId: "user-7", emailVerified: true }),
    });

    expect(decision).toEqual({ kind: "link_and_login", userId: "user-7" });
  });

  /**
   * SALDIRI SENARYOSU: saldırgan kurbanın e-posta adresini kendi Google
   * hesabına ekler ama doğrulamaz. Otomatik birleştirilseydi kurbanın hesabını
   * şifresini hiç bilmeden devralırdı.
   */
  it("Google e-postayı doğrulamamışsa OTOMATİK BİRLEŞTİRİLMEZ", () => {
    const decision = decideGoogleLink({
      identity: identity({ emailVerified: false }),
      linkedUserId: null,
      existingAccount: existing({ userId: "user-7", emailVerified: true }),
    });

    expect(decision).toEqual({
      kind: "verification_required",
      userId: "user-7",
      reason: "google_email_unverified",
    });
  });

  /**
   * SALDIRI SENARYOSU (ters yön): bizde e-postası hiç doğrulanmamış bir hesap
   * var. O adresin gerçek sahibi Google ile girerse, aslında hiç kimseye ait
   * olduğu kanıtlanmamış bir hesaba bağlanmış olurdu.
   */
  it("bizdeki e-posta doğrulanmamışsa OTOMATİK BİRLEŞTİRİLMEZ", () => {
    const decision = decideGoogleLink({
      identity: identity({ emailVerified: true }),
      linkedUserId: null,
      existingAccount: existing({ userId: "user-7", emailVerified: false }),
    });

    expect(decision).toEqual({
      kind: "verification_required",
      userId: "user-7",
      reason: "local_email_unverified",
    });
  });

  it("iki taraf da doğrulanmamışsa yine engellenir", () => {
    const decision = decideGoogleLink({
      identity: identity({ emailVerified: false }),
      linkedUserId: null,
      existingAccount: existing({ emailVerified: false }),
    });

    expect(decision.kind).toBe("verification_required");
  });

  /**
   * Engellenen durumda BİLE yeni hesap açılmamalı. Açılsaydı aynı e-postayla
   * iki hesap oluşur, `users.email` benzersizlik kısıtı patlar ve kullanıcı
   * anlamsız bir hata görürdü.
   */
  it("engellenen durumda yeni hesap AÇILMAZ", () => {
    const decision = decideGoogleLink({
      identity: identity({ emailVerified: false }),
      linkedUserId: null,
      existingAccount: existing(),
    });

    expect(decision.kind).not.toBe("create_unverified");
  });
});
