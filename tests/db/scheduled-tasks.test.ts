import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CLEANUP_GRACE_MS, INFO_WIDGET_MAX_STALE_MS } from "@/config/constants";
import { findLiveMembership } from "@/features/gym/repositories/membership.repository";
import { addCalendarMonths } from "@/features/gym/services/billing-period";
import { startMembership } from "@/features/gym/services/membership-purchase.service";
import {
  cleanupExternalCacheTask,
  cleanupRateLimitsTask,
  cleanupSeatHoldsTask,
  cleanupSessionsTask,
} from "@/features/scheduled-tasks/services/cleanup-tasks";
import { extendDoctorCalendarTask } from "@/features/scheduled-tasks/services/doctor-calendar-task";
import { renewMembershipsTask } from "@/features/scheduled-tasks/services/membership-tasks";
import { rateLimitKey, resetRateLimit } from "@/lib/rate-limit";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * PLANLI GÖREVLER — gerçek PostgreSQL'e karşı (adım 16 · ADR-007).
 *
 * ═══ BU DOSYANIN CEVAPLADIĞI İKİ SORU ═══
 *  1. **Görev fazlasını silmiyor mu?** Her temizlik testinde "silinmesi
 *     gereken" ile "DURMASI gereken" satır birlikte yazılıyor. Yalnızca
 *     silinenlere bakan bir test, `WHERE` koşulu tamamen kaldırılsa bile
 *     yeşil kalırdı.
 *  2. **İki kez çalışınca ne oluyor?** Cron "en iyi çaba" ile çalışıyor ve
 *     Vercel aynı koşuyu birden fazla kez tetikleyebiliyor (dokümandan
 *     doğrulandı). İdempotentlik varsayım değil, ölçüm.
 *
 * ⚠️ TEMİZLİK GÖREVLERİ TÜM TABLOYU TARAR — sahiplik veya önek süzgeci yoktur,
 * çünkü zamanlayıcı adına çalışırlar. Bu yüzden test satırları TOHUM VERİSİNİN
 * DOKUNULMAYACAĞI biçimde kuruluyor: tohumlanmış koltuk kayıtlarının hepsi
 * `sold` ve `hold_expires_at = null` (kontrol edildi), diğer tabloları tohum
 * hiç yazmıyor.
 */

const NOW = new Date("2026-09-01T09:00:00.000Z");

/** Payın DIŞINDA kalan an — silinmeli. */
const LONG_EXPIRED = new Date(NOW.getTime() - CLEANUP_GRACE_MS - 60_000);
/** Süresi dolmuş ama payın İÇİNDE — durmalı. */
const RECENTLY_EXPIRED = new Date(NOW.getTime() - 60_000);

const USER = testId("user", "cron");
const SESSION_OLD = testId("session", "old");
const SESSION_FRESH = testId("session", "fresh");
const COUNTER_OLD = testId("counter", "old");
const COUNTER_FRESH = testId("counter", "fresh");

const VENUE = testId("venue", "cron");
const SEAT_HELD = testId("seat", "held");
const SEAT_SOLD = testId("seat", "sold");
const EVENT = testId("event", "cron");
const HOLD_EXPIRED = testId("reservation", "expired-hold");
const TICKET_SOLD = testId("reservation", "sold");

const SPECIALTY = testId("specialty", "cron");
const DOCTOR = testId("doctor", "cron");

const PLAN = testId("plan", "cron-monthly");

/**
 * ⚠️ TAKVİM GÖREVİNİN YAN ETKİSİNİ GERİ ALIR — ölçülerek bulundu.
 *
 * `extendDoctorCalendarTask` TASARIMI GEREĞİ tüm doktorlara yazıyor, yalnızca
 * testin kurduğu doktora değil. Yani test koştuktan sonra TOHUMLANMIŞ 32
 * doktorun takviminde de yeni satırlar kalıyordu (yerel veritabanında fiilen
 * görüldü: son slot 14 gün yerine 36 gün ileriye gitmişti) ve tohum sayılarına
 * bakan testler dosya sırasına göre kayabilirdi.
 *
 * Ayırt edici `isSeedData`: tohumun yazdığı satırlarda `true`, uygulamanın
 * yazdıklarında `false`. Test önekli satırlar `cleanupTestData()`'nın işi,
 * burada onlara dokunulmuyor.
 */
async function undoCalendarSideEffects(): Promise<void> {
  await prisma.doctorSlot.deleteMany({
    where: { isSeedData: false, NOT: { id: { startsWith: "test-db" } } },
  });
}

describe("planlı görevler", () => {
  beforeEach(async () => {
    await cleanupTestData();
    await undoCalendarSideEffects();
  });

  afterEach(async () => {
    await cleanupTestData();
    await undoCalendarSideEffects();
  });

  describe("temizlik payı gerçekten uygulanıyor", () => {
    /**
     * ⛔ BU DOSYANIN EN ÖNEMLİ TESTİ.
     *
     * `CLEANUP_GRACE_MS` kaldırılırsa (yani görev "süresi dolan her satırı
     * sil" hâline gelirse) bu test kırmızıya döner. Pay olmadan görev, yarıda
     * kalmış canlı bir akışın satırını silebilirdi — `otp_challenges` örneği
     * sabitin başında yazılı.
     */
    it("süresi YENİ dolmuş oturum durur, eski oturum silinir", async () => {
      await createUser();
      await prisma.session.createMany({
        data: [
          { id: SESSION_OLD, sessionToken: SESSION_OLD, userId: USER, expires: LONG_EXPIRED },
          {
            id: SESSION_FRESH,
            sessionToken: SESSION_FRESH,
            userId: USER,
            expires: RECENTLY_EXPIRED,
          },
        ],
      });

      await cleanupSessionsTask.run({ now: NOW });

      expect(await prisma.session.findUnique({ where: { id: SESSION_OLD } })).toBeNull();
      expect(await prisma.session.findUnique({ where: { id: SESSION_FRESH } })).not.toBeNull();
    });

    it("hız sınırı sayaçlarında da aynı pay uygulanıyor (teknik borç #18)", async () => {
      await prisma.rateLimitCounter.createMany({
        data: [
          { id: COUNTER_OLD, key: testId("rl", "old"), windowStartedAt: LONG_EXPIRED, count: 4 },
          {
            id: COUNTER_FRESH,
            key: testId("rl", "new"),
            windowStartedAt: RECENTLY_EXPIRED,
            count: 1,
          },
        ],
      });

      const deleted = await cleanupRateLimitsTask.run({ now: NOW });

      expect(deleted).toBeGreaterThanOrEqual(1);
      expect(await prisma.rateLimitCounter.findUnique({ where: { id: COUNTER_OLD } })).toBeNull();
      expect(
        await prisma.rateLimitCounter.findUnique({ where: { id: COUNTER_FRESH } }),
      ).not.toBeNull();
    });
  });

  describe("koltuk kilidi temizliği satılmış bilete DOKUNMAZ", () => {
    /**
     * Silme koşulu `status = 'held'` olmasaydı bu test kırmızıya dönerdi ve
     * kaybolan şey bir MALİ KAYIT olurdu: kullanıcının parasını ödediği bilet.
     */
    it("süresi dolmuş kilit silinir, aynı yaştaki satılmış bilet durur", async () => {
      await createUser();
      await createEventFixtures();

      await prisma.seatReservation.createMany({
        data: [
          {
            id: HOLD_EXPIRED,
            eventId: EVENT,
            seatId: SEAT_HELD,
            userId: USER,
            status: "held",
            holdExpiresAt: LONG_EXPIRED,
          },
          {
            // Satılmış bilette `holdExpiresAt` normalde `null`; burada bilerek
            // ESKİ bir değer yazılıyor ki testi geçiren tek şey durum süzgeci olsun.
            id: TICKET_SOLD,
            eventId: EVENT,
            seatId: SEAT_SOLD,
            userId: USER,
            status: "sold",
            holdExpiresAt: LONG_EXPIRED,
          },
        ],
      });

      await cleanupSeatHoldsTask.run({ now: NOW });

      expect(await prisma.seatReservation.findUnique({ where: { id: HOLD_EXPIRED } })).toBeNull();
      expect(
        await prisma.seatReservation.findUnique({ where: { id: TICKET_SOLD } }),
      ).not.toBeNull();
    });
  });

  describe("dış veri önbelleği BAYAT YEDEĞİ korur (ADR-015)", () => {
    /**
     * Bu görevin ölçütü `expiresAt` DEĞİL `fetchedAt`. Sebep: süresi dolmuş
     * bir kayıt burada ölü değil — sağlayıcı çöktüğünde 24 saate kadar
     * "güncellenemiyor" notuyla ekrana çıkıyor. `expiresAt`'e göre silen bir
     * görev, tam da sağlayıcının çöktüğü gün yedeği silerdi.
     */
    it("süresi dolmuş ama hâlâ bayat gösterilebilir kayıt DURUR", async () => {
      const key = testId("cache", "stale-usable");

      await prisma.externalDataCache.create({
        data: {
          key,
          payload: { value: 1 },
          // 5 dakika önce çekildi, 1 dakika önce süresi doldu.
          fetchedAt: new Date(NOW.getTime() - 5 * 60_000),
          expiresAt: RECENTLY_EXPIRED,
        },
      });

      await cleanupExternalCacheTask.run({ now: NOW });

      expect(await prisma.externalDataCache.findUnique({ where: { key } })).not.toBeNull();
    });

    it("bayat olarak bile gösterilemeyecek kadar eski kayıt silinir", async () => {
      const key = testId("cache", "too-old");

      await prisma.externalDataCache.create({
        data: {
          key,
          payload: { value: 1 },
          fetchedAt: new Date(NOW.getTime() - INFO_WIDGET_MAX_STALE_MS - 60_000),
          expiresAt: LONG_EXPIRED,
        },
      });

      await cleanupExternalCacheTask.run({ now: NOW });

      expect(await prisma.externalDataCache.findUnique({ where: { key } })).toBeNull();
    });
  });

  describe("doktor takvimi ileri kaydırma (teknik borç #38)", () => {
    beforeEach(async () => {
      await createDoctorFixtures();
    });

    it("takvimi bugünden itibaren doldurur", async () => {
      const written = await extendDoctorCalendarTask.run({ now: NOW });

      expect(written).toBeGreaterThan(0);

      const slots = await prisma.doctorSlot.findMany({
        where: { doctorId: DOCTOR },
        orderBy: { startsAt: "asc" },
        select: { startsAt: true, isBooked: true },
      });

      expect(slots[0]!.startsAt.getTime()).toBeGreaterThanOrEqual(NOW.getTime() - 24 * 60 * 60_000);
      // Görev yalnızca BOŞ saat açar; tohumun "doluluk süsü" buraya taşınmadı.
      expect(slots.every((slot) => !slot.isBooked)).toBe(true);
    });

    /**
     * Cron aynı koşuyu iki kez tetikleyebiliyor. İdempotentliği sağlayan şey
     * uygulama mantığı değil, `@@unique([doctorId, startsAt])` + `skipDuplicates`.
     */
    it("İKİNCİ koşu tek satır bile yazmaz", async () => {
      const first = await extendDoctorCalendarTask.run({ now: NOW });
      const countAfterFirst = await prisma.doctorSlot.count({ where: { doctorId: DOCTOR } });

      const second = await extendDoctorCalendarTask.run({ now: NOW });

      expect(first).toBeGreaterThan(0);
      expect(second).toBe(0);
      expect(await prisma.doctorSlot.count({ where: { doctorId: DOCTOR } })).toBe(countAfterFirst);
    });

    it("bir gün sonra çalışınca YALNIZCA yeni günü ekler", async () => {
      await extendDoctorCalendarTask.run({ now: NOW });

      const nextDay = new Date(NOW.getTime() + 24 * 60 * 60_000);
      const added = await extendDoctorCalendarTask.run({ now: nextDay });

      // Ufkun sonuna bir gün eklendi; aradaki günler zaten yazılıydı.
      expect(added).toBeGreaterThan(0);

      const dayCount = await countDistinctSlotDays();

      expect(dayCount).toBe(15);
    });
  });

  describe("aidat tahsilatı (PRD §5.6 · teknik borç #55)", () => {
    /**
     * ⛔ PRD'NİN KABUL KRİTERİ: "Yenileme işi iki kez çalışırsa kullanıcıdan
     * iki kez tahsilat yapılmaz."
     *
     * Koruma iki katmanlı ve İKİSİ DE VERİTABANINDA: `unique(membership_id,
     * period_start)` ve `advanceBillingPeriod`'ın koşullu güncellemesi.
     */
    it("aynı gün İKİ KEZ çalışsa da tek dönem tahsil edilir", async () => {
      const { dueAt } = await startDueMembership();

      const firstCharged = await renewMembershipsTask.run({ now: dueAt });
      const secondCharged = await renewMembershipsTask.run({ now: dueAt });

      expect(firstCharged).toBe(1);
      expect(secondCharged).toBe(0);

      /**
       * ⚠️ SAYIM DÖNEME BAĞLI, ÜYELİĞE DEĞİL.
       *
       * İlk ayın tahsilatı da `kind = renewal` olarak yazılıyor (şemada ayrı
       * bir "ilk ödeme" türü YOK), dolayısıyla üyelik başına toplam satır
       * saymak "iki kez tahsil edildi mi" sorusunu cevaplamaz. Asıl iddia şu:
       * VADESİ GELEN DÖNEM için tek satır var.
       */
      const rowsForPeriod = await prisma.membershipPayment.count({
        where: { membership: { userId: USER }, periodStart: dueAt },
      });

      expect(rowsForPeriod).toBe(1);
    });

    it("tahsilat sonrası vade bir dönem ileri gider", async () => {
      const { dueAt } = await startDueMembership();

      await renewMembershipsTask.run({ now: dueAt });

      const membership = await findLiveMembership(USER);

      expect(membership?.nextBillingAt?.toISOString()).toBe(
        addCalendarMonths(dueAt, 1).toISOString(),
      );
    });

    it("vadesi GELMEMİŞ üyeliğe dokunmaz", async () => {
      const { startedAt } = await startDueMembership();

      const charged = await renewMembershipsTask.run({ now: startedAt });

      expect(charged).toBe(0);
    });
  });
});

async function createUser(): Promise<void> {
  await prisma.user.create({
    data: {
      id: USER,
      fullName: "Test Personel",
      email: `${USER}@ornek.test`,
      isStaff: true,
      isSeedData: true,
    },
  });
}

async function createEventFixtures(): Promise<void> {
  await prisma.venue.create({
    data: { id: VENUE, name: testId("Salon"), address: "Test", isSeedData: true },
  });
  await prisma.venueSeat.createMany({
    data: [SEAT_HELD, SEAT_SOLD].map((id, index) => ({
      id,
      venueId: VENUE,
      block: "A",
      rowLabel: "1",
      seatNumber: index + 1,
      isSeedData: true,
    })),
  });
  await prisma.event.create({
    data: {
      id: EVENT,
      venueId: VENUE,
      name: testId("Konser"),
      category: "concert",
      performer: "Test",
      startsAt: new Date("2026-10-01T18:00:00.000Z"),
      basePrice: "500.00",
      isSeedData: true,
    },
  });
}

async function createDoctorFixtures(): Promise<void> {
  await prisma.specialty.create({
    data: { id: SPECIALTY, name: testId("Branş"), isSeedData: true },
  });
  await prisma.doctor.create({
    data: {
      id: DOCTOR,
      specialtyId: SPECIALTY,
      fullName: testId("Dr"),
      title: "specialist",
      isSeedData: true,
    },
  });
}

/** Kaç FARKLI güne slot yazıldı — ufkun gerçekten kaydığını ölçer. */
async function countDistinctSlotDays(): Promise<number> {
  const slots = await prisma.doctorSlot.findMany({
    where: { doctorId: DOCTOR },
    select: { startsAt: true },
  });

  return new Set(slots.map((slot) => slot.startsAt.toISOString().slice(0, 10))).size;
}

/**
 * Vadesi gelmiş, KAYITLI KARTI OLAN bir üyelik kurar.
 *
 * `save: true` şart: yenileme kartsız üyelikte tahsilat denemeden "reddedildi"
 * yoluna giriyor (silinen kart senaryosu) ve idempotentlik ölçülemezdi.
 */
async function startDueMembership(): Promise<{ startedAt: Date; dueAt: Date }> {
  await createUser();
  await resetRateLimit(rateLimitKey("membership_write", "user", USER));

  await prisma.membershipPlan.create({
    data: {
      id: PLAN,
      name: testId("Aylık"),
      commitmentMonths: 0,
      monthlyPrice: "949.90",
      isSeedData: true,
    },
  });

  const started = await startMembership({
    userId: USER,
    payload: {
      planId: PLAN,
      idempotencyKey: testId("idem", "cron-start"),
      acceptedTerms: true,
      card: {
        kind: "new",
        number: "4111111111111111",
        holderName: "Test Personel",
        expMonth: 12,
        expYear: 2030,
        cvv: "123",
        save: true,
      },
    },
    actorIp: "203.0.113.71",
    now: NOW,
  });

  return { startedAt: NOW, dueAt: started.nextBillingAt };
}
