/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ADDRESS_MAX_PER_USER, PROFILE_WRITE_RATE_LIMIT_MAX } from "@/config/constants";
import {
  AddressLimitReachedError,
  AddressNotFoundError,
  ProfileRateLimitedError,
  SavedCardNotFoundError,
} from "@/features/profile/errors";
import {
  createUserAddress,
  deleteUserAddress,
  listUserAddresses,
  updateUserAddress,
} from "@/features/profile/services/address.service";
import {
  deleteUserSavedCard,
  listUserSavedCards,
} from "@/features/profile/services/saved-card.service";
import { rateLimitKey, resetRateLimit } from "@/lib/rate-limit";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * PROFİL — adres ve kayıtlı kart yönetimi (PRD §4 · §5.0 · adım 15).
 *
 * ═══ BU DOSYANIN ASIL İŞİ: SAHİPLİK ═══
 *
 * Adres ve kart KİŞİSEL VERİ. En önemli iddiası "kullanıcı başkasının kaydına
 * dokunamaz" ve bu iddia ancak GERÇEK veritabanına karşı kanıtlanabilir:
 * sahiplik kontrolü bir `if` değil, koşullu `UPDATE`'in `WHERE` koşulu.
 * Taklit bir istemci "0 satır etkilendi"yi taklit ederdi — yani yanlış
 * yazılmış bir taklit YANLIŞ YEŞİL gösterirdi (06-testing.md).
 *
 * YUMUŞAK SİLMENİN GERÇEKTEN YUMUŞAK OLDUĞU da burada ölçülüyor: satırın
 * listeden düştüğü AMA veritabanında durduğu ayrı ayrı doğrulanıyor. Sert
 * silme zaten mümkün değil (`orders.delivery_address_id` → `Restrict`).
 *
 * ZAMAN DIŞARIDAN VERİLİYOR: silme damgası ve hız sınırı penceresi `now`
 * üzerinden sabitleniyor (06-testing.md).
 */

const ACTOR_IP = "203.0.113.90";
const NOW = new Date("2026-09-01T09:00:00.000Z");

const USER = testId("user", "profile-owner");
const OTHER_USER = testId("user", "profile-other");

const OTHER_ADDRESS = testId("address", "other-owned");
const CARD = testId("card", "profile-owned");
const OTHER_CARD = testId("card", "other-owned");
const PLAN = testId("plan", "profile-gym");

function addressPayload(
  overrides: Partial<{ title: string; fullAddress: string; district: string }> = {},
) {
  return {
    title: overrides.title ?? "Ev",
    fullAddress: overrides.fullAddress ?? "Bostanlı Mahallesi 1740 Sokak No 3 Daire 5",
    district: overrides.district ?? "Karşıyaka",
  };
}

function addAddress(
  overrides: Partial<{ title: string; fullAddress: string; district: string }> = {},
  userId = USER,
) {
  return createUserAddress({
    userId,
    payload: addressPayload(overrides),
    actorIp: ACTOR_IP,
    now: NOW,
  });
}

describe("profil — teslimat adresleri", () => {
  beforeEach(async () => {
    await cleanupTestData();
    await seedFixtures();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("eklenen adres kullanıcının listesinde görünür", async () => {
    const created = await addAddress();

    const addresses = await listUserAddresses(USER);

    expect(addresses).toHaveLength(1);
    expect(addresses[0]?.id).toBe(created.id);
    expect(addresses[0]?.title).toBe("Ev");
    expect(addresses[0]?.district).toBe("Karşıyaka");
  });

  it("BAŞKASININ adresi listede GÖRÜNMEZ", async () => {
    await addAddress();

    const others = await listUserAddresses(OTHER_USER);

    // Kurulumda `OTHER_USER` için bir adres var; kendi listesinde onu görüyor
    // ama `USER`'ınkini görmüyor.
    expect(others.map((address) => address.id)).toEqual([OTHER_ADDRESS]);
  });

  it("adres güncellenir ve yeni değerler listeye yansır", async () => {
    const created = await addAddress();

    await updateUserAddress({
      userId: USER,
      addressId: created.id,
      payload: addressPayload({ title: "İş", district: "Konak" }),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    const [address] = await listUserAddresses(USER);

    expect(address?.title).toBe("İş");
    expect(address?.district).toBe("Konak");
  });

  /** ⛔ IDOR: PRD §5.0 güvenlik kuralları · 05-auth-security.md */
  it("BAŞKASININ adresi GÜNCELLENEMEZ ve satır DEĞİŞMEZ", async () => {
    await expect(
      updateUserAddress({
        userId: USER,
        addressId: OTHER_ADDRESS,
        payload: addressPayload({ title: "Ele geçirildi" }),
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(AddressNotFoundError);

    // İstisna fırlatmak yetmez: satırın GERÇEKTEN değişmediği okunuyor.
    const row = await prisma.address.findUnique({ where: { id: OTHER_ADDRESS } });

    expect(row?.title).toBe("Komşu evi");
  });

  it("BAŞKASININ adresi SİLİNEMEZ ve satır silinmemiş kalır", async () => {
    await expect(
      deleteUserAddress({
        userId: USER,
        addressId: OTHER_ADDRESS,
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(AddressNotFoundError);

    const row = await prisma.address.findUnique({ where: { id: OTHER_ADDRESS } });

    expect(row?.deletedAt).toBeNull();
  });

  /**
   * SİLME YUMUŞAK: kullanıcı için kayıp, veritabanı için duruyor.
   * Geçmiş siparişler bu satıra `Restrict` ile bağlı (data-model.md).
   */
  it("silinen adres listeden düşer AMA satır veritabanında kalır", async () => {
    const created = await addAddress();

    await deleteUserAddress({ userId: USER, addressId: created.id, actorIp: ACTOR_IP, now: NOW });

    expect(await listUserAddresses(USER)).toHaveLength(0);

    const row = await prisma.address.findUnique({ where: { id: created.id } });

    expect(row).not.toBeNull();
    expect(row?.deletedAt?.toISOString()).toBe(NOW.toISOString());
  });

  it("aynı adres İKİ KEZ silinemez", async () => {
    const created = await addAddress();

    await deleteUserAddress({ userId: USER, addressId: created.id, actorIp: ACTOR_IP, now: NOW });

    await expect(
      deleteUserAddress({ userId: USER, addressId: created.id, actorIp: ACTOR_IP, now: NOW }),
    ).rejects.toBeInstanceOf(AddressNotFoundError);
  });

  it("silinmiş adres GÜNCELLENEMEZ", async () => {
    const created = await addAddress();

    await deleteUserAddress({ userId: USER, addressId: created.id, actorIp: ACTOR_IP, now: NOW });

    await expect(
      updateUserAddress({
        userId: USER,
        addressId: created.id,
        payload: addressPayload({ title: "Geri geldi" }),
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(AddressNotFoundError);
  });

  it("üst sınıra ulaşınca yeni adres eklenemez", async () => {
    // Kurulumda `USER`'ın adresi yok; sınıra kadar dolduruluyor.
    for (let index = 0; index < ADDRESS_MAX_PER_USER; index += 1) {
      await addAddress({ title: `Adres ${index + 1}` });
    }

    await expect(addAddress({ title: "Bir fazla" })).rejects.toBeInstanceOf(
      AddressLimitReachedError,
    );

    expect(await listUserAddresses(USER)).toHaveLength(ADDRESS_MAX_PER_USER);
  });

  /** Silinen adres sınırdan DÜŞER — yumuşak silme yeri geri açmalı. */
  it("bir adres silinince sınırın altına inilir ve yeni adres eklenebilir", async () => {
    const first = await addAddress({ title: "Adres 1" });

    for (let index = 1; index < ADDRESS_MAX_PER_USER; index += 1) {
      await addAddress({ title: `Adres ${index + 1}` });
    }

    await deleteUserAddress({ userId: USER, addressId: first.id, actorIp: ACTOR_IP, now: NOW });

    await expect(addAddress({ title: "Yeni yer açıldı" })).resolves.toBeDefined();
  });

  /** CLAUDE.md §5.11: kritik işlemler denetim kaydına yazılır. */
  it("ekleme, güncelleme ve silme DENETİM KAYDINA yazılır", async () => {
    const created = await addAddress();

    await updateUserAddress({
      userId: USER,
      addressId: created.id,
      payload: addressPayload({ title: "İş" }),
      actorIp: ACTOR_IP,
      now: NOW,
    });
    await deleteUserAddress({ userId: USER, addressId: created.id, actorIp: ACTOR_IP, now: NOW });

    const logs = await prisma.auditLog.findMany({
      where: { userId: USER, entityType: "address" },
      orderBy: { createdAt: "asc" },
    });

    expect(logs.map((log) => log.action)).toEqual([
      "address_create",
      "address_update",
      "address_delete",
    ]);
    expect(logs.every((log) => log.entityId === created.id)).toBe(true);
    // ⛔ Düz IP denetim kaydına YAZILMAZ, yalnızca geri döndürülemez özeti.
    expect(logs.every((log) => log.ipHash !== ACTOR_IP)).toBe(true);
  });

  /**
   * BÜTÇE EKLEME DEĞİL YAZMA SAYAR — ve test bunu GÜNCELLEMEYLE ölçüyor.
   *
   * Sadece ekleyerek ölçmek MÜMKÜN DEĞİL: adres üst sınırı (20) yazma
   * bütçesinden (30) küçük, yani ekleme sınırı önce dolardı ve test yanlış
   * hatayı yakalardı. Aynı adresi tekrar tekrar güncellemek bütçeyi
   * tüketirken adres sayısını sabit tutuyor.
   */
  it("yazma bütçesi aşılınca 429 üretilir", async () => {
    const created = await addAddress();

    for (let index = 1; index < PROFILE_WRITE_RATE_LIMIT_MAX; index += 1) {
      await updateUserAddress({
        userId: USER,
        addressId: created.id,
        payload: addressPayload({ title: `Ev ${index}` }),
        actorIp: ACTOR_IP,
        now: NOW,
      });
    }

    await expect(
      updateUserAddress({
        userId: USER,
        addressId: created.id,
        payload: addressPayload({ title: "Bütçe bitti" }),
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(ProfileRateLimitedError);
  });
});

describe("profil — kayıtlı kartlar", () => {
  beforeEach(async () => {
    await cleanupTestData();
    await seedFixtures();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("kullanıcı YALNIZCA kendi kartını görür", async () => {
    const cards = await listUserSavedCards(USER);

    expect(cards.map((card) => card.id)).toEqual([CARD]);
    // ⛔ Görünen tek şey son dört hane; tam numara hiçbir yerde yok.
    expect(cards[0]?.last4).toBe("1111");
  });

  it("silinen kart listeden düşer AMA satır veritabanında kalır", async () => {
    await deleteUserSavedCard({ userId: USER, savedCardId: CARD, actorIp: ACTOR_IP, now: NOW });

    expect(await listUserSavedCards(USER)).toHaveLength(0);

    const row = await prisma.savedCard.findUnique({ where: { id: CARD } });

    expect(row).not.toBeNull();
    expect(row?.deletedAt?.toISOString()).toBe(NOW.toISOString());
  });

  /** ⛔ IDOR */
  it("BAŞKASININ kartı SİLİNEMEZ ve satır silinmemiş kalır", async () => {
    await expect(
      deleteUserSavedCard({ userId: USER, savedCardId: OTHER_CARD, actorIp: ACTOR_IP, now: NOW }),
    ).rejects.toBeInstanceOf(SavedCardNotFoundError);

    const row = await prisma.savedCard.findUnique({ where: { id: OTHER_CARD } });

    expect(row?.deletedAt).toBeNull();
  });

  it("aynı kart İKİ KEZ silinemez", async () => {
    await deleteUserSavedCard({ userId: USER, savedCardId: CARD, actorIp: ACTOR_IP, now: NOW });

    await expect(
      deleteUserSavedCard({ userId: USER, savedCardId: CARD, actorIp: ACTOR_IP, now: NOW }),
    ).rejects.toBeInstanceOf(SavedCardNotFoundError);
  });

  it("kart silme DENETİM KAYDINA yazılır", async () => {
    await deleteUserSavedCard({ userId: USER, savedCardId: CARD, actorIp: ACTOR_IP, now: NOW });

    const logs = await prisma.auditLog.findMany({
      where: { userId: USER, entityType: "saved_card" },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0]?.action).toBe("saved_card_delete");
    expect(logs[0]?.entityId).toBe(CARD);
  });

  /**
   * PRD §5.6: aylık aidat kayıtlı karttan çekiliyor. Kullanıcı kartı silmeden
   * ÖNCE bunu bilmeli; bayrak ekrandaki uyarıyı tetikliyor.
   */
  it("YAŞAYAN üyeliğe bağlı kart işaretlenir", async () => {
    await prisma.membership.create({
      data: {
        id: testId("membership", "live"),
        userId: USER,
        activeUserId: USER,
        planId: PLAN,
        savedCardId: CARD,
        startsAt: NOW,
        status: "active",
        nextBillingAt: new Date("2026-10-01T09:00:00.000Z"),
      },
    });

    const [card] = await listUserSavedCards(USER);

    expect(card?.usedByMembership).toBe(true);
  });

  it("üyeliği olmayan kart işaretlenmez", async () => {
    const [card] = await listUserSavedCards(USER);

    expect(card?.usedByMembership).toBe(false);
  });

  /**
   * SONA ERMİŞ üyelik uyarı ÜRETMEZ.
   *
   * Ölçüt `status` değil `activeUserId`: üyelik bittiğinde o kolon `NULL`'a
   * düşüyor ve "aynı anda tek üyelik" kuralını zorlayan benzersiz indeks de
   * onun üzerinde (schema.prisma).
   */
  it("sona ermiş üyeliğe bağlı kart işaretlenmez", async () => {
    await prisma.membership.create({
      data: {
        id: testId("membership", "ended"),
        userId: USER,
        activeUserId: null,
        planId: PLAN,
        savedCardId: CARD,
        startsAt: NOW,
        status: "cancelled",
        cancelledAt: NOW,
      },
    });

    const [card] = await listUserSavedCards(USER);

    expect(card?.usedByMembership).toBe(false);
  });
});

async function seedFixtures(): Promise<void> {
  await resetRateLimit(rateLimitKey("profile_write", "user", USER));
  await resetRateLimit(rateLimitKey("profile_write", "user", OTHER_USER));

  await prisma.user.createMany({
    data: [USER, OTHER_USER].map((id, index) => ({
      id,
      fullName: `Test Kullanıcı ${index + 1}`,
      email: `${id}@ornek.test`,
      isStaff: true,
      isSeedData: true,
    })),
  });

  await prisma.membershipPlan.create({
    data: {
      id: PLAN,
      name: testId("Aylık (Taahhütsüz)"),
      commitmentMonths: 0,
      monthlyPrice: "949.90",
      isSeedData: true,
    },
  });

  // KOMŞUNUN kaydı: IDOR testlerinin hedefi. `USER` bunlara dokunamamalı.
  await prisma.address.create({
    data: {
      id: OTHER_ADDRESS,
      userId: OTHER_USER,
      title: "Komşu evi",
      fullAddress: "Alsancak Mahallesi 1453 Sokak No 7",
      district: "Konak",
      isSeedData: true,
    },
  });

  await prisma.savedCard.createMany({
    data: [
      {
        id: CARD,
        userId: USER,
        brand: "visa",
        last4: "1111",
        expMonth: 12,
        expYear: 2030,
        holderName: "Test Kullanıcı 1",
        isSeedData: true,
      },
      {
        id: OTHER_CARD,
        userId: OTHER_USER,
        brand: "mastercard",
        last4: "4444",
        expMonth: 11,
        expYear: 2031,
        holderName: "Test Kullanıcı 2",
        isSeedData: true,
      },
    ],
  });
}
