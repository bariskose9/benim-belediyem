import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  completeGoogleLink,
  startGoogleLink,
  unlinkGoogle,
} from "@/features/auth/services/google-link.service";
import type { GoogleIdentity } from "@/features/auth/services/google-oauth.service";
import { hashPassword } from "@/features/auth/services/password.service";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ═══ PRD §5.0 — PROFİLDEN GOOGLE BAĞLANTISI (teknik borç #33) ═══
 *
 * GERÇEK PostgreSQL'e karşı yazıldı çünkü bu dosyanın en kritik iddiaları
 * veritabanının kendisine bağlı:
 *   · aynı Google hesabı iki kullanıcıya bağlanamaz — `accounts` tablosundaki
 *     `unique(provider, provider_account_id)` kısıtı
 *   · kaldırma satırı gerçekten siliyor mu ve KİMİN satırını siliyor
 *   · denetim kaydı yazılıyor mu
 * Taklit bir istemci bunların hiçbirini kanıtlayamazdı.
 */

const USER_WITH_PASSWORD = testId("user", "sifreli");
const USER_GOOGLE_ONLY = testId("user", "yalniz-google");
const OTHER_USER = testId("user", "baskasi");

const PASSWORD = "Test1234!";
const GOOGLE_SUB = testId("google", "sub-1");
const OTHER_GOOGLE_SUB = testId("google", "sub-2");
const ACTOR_IP = "203.0.113.10";

function identityOf(subject: string): GoogleIdentity {
  return {
    subject,
    email: `${subject}@ornek.test`,
    emailVerified: true,
    name: "Test Kullanıcı",
  };
}

beforeEach(async () => {
  await cleanupTestData();

  const passwordHash = await hashPassword(PASSWORD);

  await prisma.user.createMany({
    data: [
      {
        id: USER_WITH_PASSWORD,
        fullName: "Şifreli Kullanıcı",
        email: "sifreli@test.ornek.test",
        passwordHash,
        identityStatus: "kps_verified",
      },
      {
        id: USER_GOOGLE_ONLY,
        fullName: "Google Kullanıcısı",
        email: "google@test.ornek.test",
        identityStatus: "unverified",
      },
      {
        id: OTHER_USER,
        fullName: "Başka Kullanıcı",
        email: "baska@test.ornek.test",
        passwordHash,
        identityStatus: "unverified",
      },
    ],
  });

  // Google ile açılmış hesabın tek giriş yolu bu bağlantı.
  await prisma.account.create({
    data: {
      id: testId("account", "google-only"),
      userId: USER_GOOGLE_ONLY,
      type: "oidc",
      provider: "google",
      providerAccountId: OTHER_GOOGLE_SUB,
    },
  });
});

afterEach(async () => {
  await cleanupTestData();
});

async function googleAccountCount(userId: string): Promise<number> {
  return prisma.account.count({ where: { userId, provider: "google" } });
}

async function auditActions(userId: string): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    where: { userId },
    select: { action: true },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => row.action);
}

describe("startGoogleLink — şifre kapısı", () => {
  it("doğru şifreyle akış başlatılabilir", async () => {
    const outcome = await startGoogleLink({ userId: USER_WITH_PASSWORD, password: PASSWORD });

    expect(outcome).toEqual({ kind: "allowed" });
  });

  /**
   * ⭐ ASIL KORUMA: bağlama hesaba KALICI bir giriş yolu ekliyor. Yalnızca
   * oturuma dayansaydı, çalınmış bir oturumla saldırgan kendi Google hesabını
   * bağlar ve kurban şifresini değiştirse bile girmeye devam ederdi.
   */
  it("yanlış şifreyle akış başlatılamaz", async () => {
    const outcome = await startGoogleLink({
      userId: USER_WITH_PASSWORD,
      password: "YanlisSifre1!",
    });

    expect(outcome).toEqual({ kind: "rejected", reason: "invalid_password" });
  });

  it("boş şifreyle akış başlatılamaz", async () => {
    const outcome = await startGoogleLink({ userId: USER_WITH_PASSWORD, password: "" });

    expect(outcome).toEqual({ kind: "rejected", reason: "invalid_password" });
  });

  it("Google zaten bağlıysa şifre hiç sorulmadan reddedilir", async () => {
    const outcome = await startGoogleLink({ userId: USER_GOOGLE_ONLY, password: PASSWORD });

    expect(outcome).toEqual({ kind: "rejected", reason: "already_linked" });
  });

  it("olmayan kullanıcıda akış başlatılamaz", async () => {
    const outcome = await startGoogleLink({ userId: testId("user", "yok"), password: PASSWORD });

    expect(outcome.kind).toBe("rejected");
  });
});

describe("completeGoogleLink", () => {
  it("bağlantıyı kurar ve denetim kaydı yazar", async () => {
    const outcome = await completeGoogleLink({
      userId: USER_WITH_PASSWORD,
      identity: identityOf(GOOGLE_SUB),
      actorIp: ACTOR_IP,
    });

    expect(outcome).toEqual({ kind: "linked" });
    expect(await googleAccountCount(USER_WITH_PASSWORD)).toBe(1);
    expect(await auditActions(USER_WITH_PASSWORD)).toContain("google_link");
  });

  /**
   * ⭐ ASIL KORUMA: aynı Google hesabı iki kullanıcıya bağlanamaz. Kontrol
   * olmasaydı veritabanı kısıtı patlar ve kullanıcı ham bir hata görürdü —
   * ya da daha kötüsü, kısıt olmasa hesap ele geçirme yolu açılırdı.
   */
  it("başka kullanıcıya bağlı Google hesabı ikinci kez bağlanamaz", async () => {
    const outcome = await completeGoogleLink({
      userId: USER_WITH_PASSWORD,
      identity: identityOf(OTHER_GOOGLE_SUB),
      actorIp: ACTOR_IP,
    });

    expect(outcome).toEqual({ kind: "rejected", reason: "linked_to_other_account" });
    expect(await googleAccountCount(USER_WITH_PASSWORD)).toBe(0);
  });

  /** Reddedilen denemede denetim kaydı da YAZILMAZ: olmayan bir olay kaydedilmez. */
  it("reddedilen bağlamada denetim kaydı yazılmaz", async () => {
    await completeGoogleLink({
      userId: USER_WITH_PASSWORD,
      identity: identityOf(OTHER_GOOGLE_SUB),
      actorIp: ACTOR_IP,
    });

    expect(await auditActions(USER_WITH_PASSWORD)).not.toContain("google_link");
  });

  /** Kullanıcı akışı iki kez çalıştırdıysa (geri tuşu, çift tıklama) hata yok. */
  it("aynı bağlantı ikinci kez kurulmaya çalışılırsa sessizce başarılı olur", async () => {
    await completeGoogleLink({
      userId: USER_WITH_PASSWORD,
      identity: identityOf(GOOGLE_SUB),
      actorIp: ACTOR_IP,
    });

    const second = await completeGoogleLink({
      userId: USER_WITH_PASSWORD,
      identity: identityOf(GOOGLE_SUB),
      actorIp: ACTOR_IP,
    });

    expect(second).toEqual({ kind: "already_linked" });
    expect(await googleAccountCount(USER_WITH_PASSWORD)).toBe(1);
  });
});

describe("unlinkGoogle", () => {
  it("şifresi olan kullanıcının bağlantısını kaldırır ve denetim kaydı yazar", async () => {
    await completeGoogleLink({
      userId: USER_WITH_PASSWORD,
      identity: identityOf(GOOGLE_SUB),
      actorIp: ACTOR_IP,
    });

    const outcome = await unlinkGoogle({ userId: USER_WITH_PASSWORD, actorIp: ACTOR_IP });

    expect(outcome).toEqual({ kind: "unlinked" });
    expect(await googleAccountCount(USER_WITH_PASSWORD)).toBe(0);
    expect(await auditActions(USER_WITH_PASSWORD)).toContain("google_unlink");
  });

  /**
   * ⭐ ASIL KORUMA — KİLİTLENME: şifresi olmayan kullanıcı Google'ı kaldırırsa
   * hesabına bir daha giremez ve bunu kendi kendine geri alamaz.
   */
  it("son giriş yöntemi kaldırılamaz", async () => {
    const outcome = await unlinkGoogle({ userId: USER_GOOGLE_ONLY, actorIp: ACTOR_IP });

    expect(outcome).toEqual({ kind: "rejected", reason: "last_login_method" });
    // Satır DURUYOR: reddedilen istek hiçbir şey silmemeli.
    expect(await googleAccountCount(USER_GOOGLE_ONLY)).toBe(1);
  });

  it("bağlantısı olmayan kullanıcıda kaldırılacak bir şey yoktur", async () => {
    const outcome = await unlinkGoogle({ userId: USER_WITH_PASSWORD, actorIp: ACTOR_IP });

    expect(outcome).toEqual({ kind: "rejected", reason: "not_linked" });
  });

  /**
   * ⭐ SAHİPLİK: kaldırma yalnızca İSTEYEN kullanıcının satırına dokunur.
   * Sahiplik `deleteMany`'nin `WHERE` koşulunda, sonradan yapılan bir `if`
   * değil (adım 15'te adres ve kartta verilen kararın aynısı).
   */
  it("başkasının bağlantısına dokunmaz", async () => {
    await completeGoogleLink({
      userId: USER_WITH_PASSWORD,
      identity: identityOf(GOOGLE_SUB),
      actorIp: ACTOR_IP,
    });

    await unlinkGoogle({ userId: USER_WITH_PASSWORD, actorIp: ACTOR_IP });

    // Başka kullanıcının Google bağlantısı yerinde duruyor.
    expect(await googleAccountCount(USER_GOOGLE_ONLY)).toBe(1);
  });

  it("kaldırdıktan sonra yeniden bağlanabilir", async () => {
    await completeGoogleLink({
      userId: USER_WITH_PASSWORD,
      identity: identityOf(GOOGLE_SUB),
      actorIp: ACTOR_IP,
    });
    await unlinkGoogle({ userId: USER_WITH_PASSWORD, actorIp: ACTOR_IP });

    const again = await completeGoogleLink({
      userId: USER_WITH_PASSWORD,
      identity: identityOf(GOOGLE_SUB),
      actorIp: ACTOR_IP,
    });

    expect(again).toEqual({ kind: "linked" });
    expect(await googleAccountCount(USER_WITH_PASSWORD)).toBe(1);
  });
});
