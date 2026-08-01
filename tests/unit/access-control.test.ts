/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import type { SessionUserRow } from "@/features/auth/repositories/session.repository";
import { evaluateAccess } from "@/features/auth/services/access-control";

/**
 * Erişim kademeleri (PRD §5.0 tablosu).
 *
 * Kural saf bir fonksiyonda olduğu için tablonun TAMAMI burada, veritabanı ve
 * tarayıcı olmadan kanıtlanabiliyor. Sayfaların doğru kademeyi istediği
 * `tests/e2e/login.spec.ts` içinde ayrıca doğrulanıyor.
 */

function sessionOf(overrides: Partial<SessionUserRow> = {}): SessionUserRow {
  return {
    sessionId: "session-1",
    userId: "user-1",
    fullName: "Ayşe Yılmaz",
    role: "user",
    isStaff: false,
    identityStatus: "kps_verified",
    expiresAt: new Date("2026-08-08T10:00:00.000Z"),
    ...overrides,
  };
}

describe("giriş yapmamış ziyaretçi", () => {
  it("her kademede giriş ister", () => {
    expect(evaluateAccess(null, "authenticated")).toBe("sign_in_required");
    expect(evaluateAccess(null, "identity_verified")).toBe("sign_in_required");
    expect(evaluateAccess(null, "staff")).toBe("sign_in_required");
  });
});

describe("kimliği doğrulanmamış kullanıcı (4c: yalnızca Google ile açılmış hesap)", () => {
  const session = sessionOf({ identityStatus: "unverified" });

  it("giriş yetmeyen sayfalara girebilir", () => {
    expect(evaluateAccess(session, "authenticated")).toBe("allowed");
  });

  it("kimlik doğrulaması isteyen sayfada eksiğini öğrenir", () => {
    expect(evaluateAccess(session, "identity_verified")).toBe("identity_required");
  });

  it("personele özel sayfada ÖNCE kimlik eksiğini öğrenir", () => {
    // Sıra önemli: "personel değilsin" demek, kimliğini doğrulayınca
    // erişebilecek olan kullanıcıyı yanlış bilgilendirirdi.
    expect(evaluateAccess(session, "staff")).toBe("identity_required");
  });
});

describe("KPS doğrulanmış vatandaş", () => {
  const session = sessionOf();

  it("vatandaşa açık her şeye erişir", () => {
    expect(evaluateAccess(session, "authenticated")).toBe("allowed");
    expect(evaluateAccess(session, "identity_verified")).toBe("allowed");
  });

  it("hastane ve spor salonuna erişemez", () => {
    expect(evaluateAccess(session, "staff")).toBe("staff_only");
  });
});

describe("kurum personeli", () => {
  const session = sessionOf({ isStaff: true });

  it("personele özel hizmetlere erişir", () => {
    expect(evaluateAccess(session, "staff")).toBe("allowed");
  });
});

describe("yönetici rolü personel yetkisi VERMEZ", () => {
  it("admin ama personel değilse hastaneye giremez", () => {
    // `role` ve `isStaff` farklı işler yapar (PRD §5.0): yönetici olmak
    // kurum personeli olmak demek değildir.
    expect(evaluateAccess(sessionOf({ role: "admin" }), "staff")).toBe("staff_only");
  });
});
