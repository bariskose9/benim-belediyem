/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CONSENT_RATE_LIMIT_MAX } from "@/config/constants";
import { ConsentRateLimitedError } from "@/features/legal/errors";
import { findLatestConsent } from "@/features/legal/repositories/consent.repository";
import {
  linkVisitorConsentsToUser,
  readCookieNoticeConsent,
  recordCookieNoticeConsent,
  recordRegistrationConsents,
} from "@/features/legal/services/consent.service";
import { ConsentType } from "@/generated/prisma/enums";
import { hashActorIp, rateLimitKey, resetRateLimit } from "@/lib/rate-limit";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ÇEREZ RIZASI — ziyaretçi dahil (PRD §5.10 · adım 17).
 *
 * ═══ BU DOSYANIN ASIL İŞİ: KAYDIN KANIT OLMASI ═══
 *
 * Rıza kaydının tek amacı "ne zaman, kim, neyi kabul etti" sorusunu
 * cevaplayabilmek. Bu iddia ancak GERÇEK veritabanına karşı kanıtlanabilir:
 * tablonun eklemeli (append-only) kaldığı, geri almanın eski satırı
 * DEĞİŞTİRMEDİĞİ ve ziyaretçi kaydının hesaba bağlanırken TARİHİNİ
 * KAYBETMEDİĞİ, taklit bir istemciyle ölçülemez.
 *
 * ⛔ İKİNCİ İDDİA: bir öznenin sorgusu BAŞKASININ kaydını göremez. Bu bir `if`
 * değil, sorgunun `WHERE` koşulu — yine yalnızca veritabanı kanıtlayabilir.
 */

const USER = testId("consent", "user");
const OTHER_USER = testId("consent", "other-user");
const VISITOR = testId("consent", "visitor");
const OTHER_VISITOR = testId("consent", "other-visitor");
const ACTOR_IP = "203.0.113.55";

describe("çerez rızası", () => {
  beforeEach(async () => {
    await cleanupTestData();
    await seedUsers();
    await resetRateLimit(rateLimitKey("consent", "ip", hashActorIp(ACTOR_IP)));
  });

  afterEach(async () => {
    await resetRateLimit(rateLimitKey("consent", "ip", hashActorIp(ACTOR_IP)));
    await cleanupTestData();
  });

  it("ziyaretçinin rızası anonim kimliğe bağlanıyor", async () => {
    await recordCookieNoticeConsent({
      subject: { anonymousId: VISITOR },
      isGranted: true,
      actorIp: ACTOR_IP,
    });

    const latest = await findLatestConsent({ anonymousId: VISITOR }, ConsentType.necessary_cookies);

    expect(latest?.isGranted).toBe(true);

    // Kayıt hiçbir hesaba bağlanmadı: ziyaretçinin kim olduğunu bilmiyoruz.
    const row = await prisma.consentRecord.findUnique({ where: { id: latest?.id ?? "" } });

    expect(row?.userId).toBeNull();
    expect(row?.anonymousId).toBe(VISITOR);
  });

  it("geri alma eski satırı DEĞİŞTİRMİYOR, üzerine yazıyor", async () => {
    await recordCookieNoticeConsent({
      subject: { anonymousId: VISITOR },
      isGranted: true,
      actorIp: ACTOR_IP,
    });

    const granted = await findLatestConsent(
      { anonymousId: VISITOR },
      ConsentType.necessary_cookies,
    );

    await recordCookieNoticeConsent({
      subject: { anonymousId: VISITOR },
      isGranted: false,
      actorIp: ACTOR_IP,
    });

    const rows = await prisma.consentRecord.findMany({
      where: { anonymousId: VISITOR },
      orderBy: { createdAt: "asc" },
    });

    /**
     * ⛔ İKİ SATIR OLMAK ZORUNDA. Tek satır kalıp `isGranted` alanı
     * güncellenseydi "ne zaman verildi" bilgisi yok olurdu ve kayıt kanıt
     * olma özelliğini kaybederdi (14-privacy-and-compliance.md → append-only).
     */
    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe(granted?.id);
    expect(rows[0]?.isGranted).toBe(true);
    expect(rows[1]?.isGranted).toBe(false);

    expect(await readCookieNoticeConsent({ anonymousId: VISITOR })).toBe(false);
  });

  it("bir ziyaretçi diğerinin rızasını göremiyor", async () => {
    await recordCookieNoticeConsent({
      subject: { anonymousId: VISITOR },
      isGranted: true,
      actorIp: ACTOR_IP,
    });

    expect(await readCookieNoticeConsent({ anonymousId: OTHER_VISITOR })).toBe(false);
  });

  it("özne hiç verilmezse sorgu atılmıyor ve hiçbir kayıt sızmıyor", async () => {
    await recordCookieNoticeConsent({
      subject: { anonymousId: VISITOR },
      isGranted: true,
      actorIp: ACTOR_IP,
    });

    /**
     * ⛔ BU TESTİN VARLIK SEBEBİ: özne boşken koşulsuz bir `WHERE` üretilseydi
     * sorgu TABLODAKİ İLK KAYDI döndürürdü — yani rastgele birinin rızası,
     * kimliği olmayan bir ziyaretçiye "senin" diye gösterilirdi.
     */
    expect(await readCookieNoticeConsent({})).toBe(false);
  });

  it("giriş yapınca ziyaretçi rızası hesaba bağlanıyor ve TARİHİ korunuyor", async () => {
    await recordCookieNoticeConsent({
      subject: { anonymousId: VISITOR },
      isGranted: true,
      actorIp: ACTOR_IP,
    });

    const before = await findLatestConsent({ anonymousId: VISITOR }, ConsentType.necessary_cookies);

    const linked = await linkVisitorConsentsToUser({ anonymousId: VISITOR, userId: USER });

    expect(linked).toBe(1);

    const after = await prisma.consentRecord.findUnique({ where: { id: before?.id ?? "" } });

    expect(after?.userId).toBe(USER);
    // Aynı satır: yeni satır yazılsaydı rızanın tarihi giriş anına kayardı.
    expect(after?.createdAt.toISOString()).toBe(before?.createdAt.toISOString());
    // Anonim kimlik korunuyor: çıkış yapan ziyaretçi bandı yeniden görmesin.
    expect(after?.anonymousId).toBe(VISITOR);

    expect(await readCookieNoticeConsent({ userId: USER })).toBe(true);
  });

  it("bağlama başkasının hesabına bağlı kayda dokunmuyor", async () => {
    await recordCookieNoticeConsent({
      subject: { userId: OTHER_USER, anonymousId: OTHER_VISITOR },
      isGranted: true,
      actorIp: ACTOR_IP,
    });

    const linked = await linkVisitorConsentsToUser({ anonymousId: OTHER_VISITOR, userId: USER });

    /**
     * Kayıt ZATEN bir hesaba bağlı (`userId: null` koşulunu geçmiyor), yani
     * sıfır satır güncellenmeli. Koşul kaldırılsaydı aynı tarayıcıyı kullanan
     * ikinci kişi, birincinin rıza kaydını üstlenirdi.
     */
    expect(linked).toBe(0);

    const row = await prisma.consentRecord.findFirst({ where: { anonymousId: OTHER_VISITOR } });

    expect(row?.userId).toBe(OTHER_USER);
  });

  it("kayıt akışı şartlar ve aydınlatma metni için iki kayıt yazıyor", async () => {
    await recordRegistrationConsents({ userId: USER, ipHash: hashActorIp(ACTOR_IP) });

    const rows = await prisma.consentRecord.findMany({ where: { userId: USER } });

    expect(rows.map((row) => row.consentType).sort()).toEqual(
      [ConsentType.privacy_notice, ConsentType.terms_of_use].sort(),
    );
    expect(rows.every((row) => row.isGranted)).toBe(true);
  });

  it("her rıza değişikliği denetim kaydına düşüyor", async () => {
    await recordCookieNoticeConsent({
      subject: { userId: USER, anonymousId: VISITOR },
      isGranted: true,
      actorIp: ACTOR_IP,
    });

    const logs = await prisma.auditLog.findMany({ where: { userId: USER } });

    expect(logs).toHaveLength(1);
    expect(logs[0]?.action).toBe("consent_change");
    expect(logs[0]?.entityType).toBe("consent_record");
    // Düz IP değil, geri döndürülemez özeti yazılıyor (ADR-006).
    expect(logs[0]?.ipHash).not.toContain(ACTOR_IP);
  });

  it("hız sınırı aşılınca yazma reddediliyor", async () => {
    for (let attempt = 0; attempt < CONSENT_RATE_LIMIT_MAX; attempt += 1) {
      await recordCookieNoticeConsent({
        subject: { anonymousId: VISITOR },
        isGranted: attempt % 2 === 0,
        actorIp: ACTOR_IP,
      });
    }

    await expect(
      recordCookieNoticeConsent({
        subject: { anonymousId: VISITOR },
        isGranted: true,
        actorIp: ACTOR_IP,
      }),
    ).rejects.toBeInstanceOf(ConsentRateLimitedError);

    /**
     * ⛔ SINIR YAZMADAN ÖNCE ÇALIŞIYOR: reddedilen istek tabloya satır
     * BIRAKMAMALI, yoksa korumanın engellemek istediği şişme zaten olurdu.
     */
    const rows = await prisma.consentRecord.count({ where: { anonymousId: VISITOR } });

    expect(rows).toBe(CONSENT_RATE_LIMIT_MAX);
  });
});

async function seedUsers(): Promise<void> {
  await prisma.user.createMany({
    data: [USER, OTHER_USER].map((id, index) => ({
      id,
      fullName: `Test Kullanıcı ${index + 1}`,
      email: `${id}@ornek.test`,
      isSeedData: true,
    })),
  });
}
