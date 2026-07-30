import { describe, expect, it } from "vitest";

import { seedAll } from "../../prisma/seed/index.js";
import { isValidNationalId } from "../../src/lib/crypto.js";
import { prisma } from "./helpers.js";

/**
 * Tohumlamanın iki güvencesini kanıtlar:
 *   1. İDEMPOTENT — ikinci çalıştırma veriyi katlamaz (04-database.md "Seed")
 *   2. KURAL UYUMU — üretilen veri fake-data-guide.md'nin bantlarına ve
 *      gizlilik kurallarına uyar
 *
 * Sayım karşılaştırması gerçek veritabanı üzerinde yapılır; "upsert kullandım"
 * demek kanıt değildir, tekrar çalıştırıp saymak kanıttır.
 */

const TABLES = [
  "kps_citizens",
  "org_units",
  "staff_members",
  "users",
  "addresses",
  "saved_cards",
  "product_categories",
  "products",
  "menu_categories",
  "menu_items",
  "membership_plans",
  "specialties",
  "doctors",
  "doctor_slots",
  "appointments",
  "venues",
  "venue_seats",
  "events",
  "seat_reservations",
] as const;

async function countAll(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  counts.kps_citizens = await prisma.kpsCitizen.count();
  counts.org_units = await prisma.orgUnit.count();
  counts.staff_members = await prisma.staffMember.count();
  counts.users = await prisma.user.count();
  counts.addresses = await prisma.address.count();
  counts.saved_cards = await prisma.savedCard.count();
  counts.product_categories = await prisma.productCategory.count();
  counts.products = await prisma.product.count();
  counts.menu_categories = await prisma.menuCategory.count();
  counts.menu_items = await prisma.menuItem.count();
  counts.membership_plans = await prisma.membershipPlan.count();
  counts.specialties = await prisma.specialty.count();
  counts.doctors = await prisma.doctor.count();
  counts.doctor_slots = await prisma.doctorSlot.count();
  counts.appointments = await prisma.appointment.count();
  counts.venues = await prisma.venue.count();
  counts.venue_seats = await prisma.venueSeat.count();
  counts.events = await prisma.event.count();
  counts.seat_reservations = await prisma.seatReservation.count();

  return counts;
}

describe("tohumlama idempotenttir", () => {
  it("iki kez çalıştırıldığında hiçbir tablonun kayıt sayısı değişmez", async () => {
    await seedAll(prisma);
    const first = await countAll();

    await seedAll(prisma);
    const second = await countAll();

    expect(second).toEqual(first);

    // Boş bir veritabanında sessizce hiçbir şey yazmamış olma ihtimalini eler.
    for (const table of TABLES) {
      expect(first[table], `${table} boş kalmamalı`).toBeGreaterThan(0);
    }
  }, 120_000);
});

describe("üretilen veri rehberin kurallarına uyar", () => {
  it("sahte kimlik numaralarının hepsi 9 ile başlar ve kontrol basamağı tutar", async () => {
    const citizens = await prisma.kpsCitizen.findMany({
      where: { isSeedData: true },
      select: { nationalId: true },
    });

    expect(citizens.length).toBeGreaterThan(0);
    for (const citizen of citizens) {
      expect(citizen.nationalId.startsWith("9")).toBe(true);
      expect(isValidNationalId(citizen.nationalId)).toBe(true);
    }
  });

  it("kayıt akışının reddetmesi gereken 18 yaş altı kayıtlar bulunur", async () => {
    const eighteenYearsAgo = new Date();

    eighteenYearsAgo.setUTCFullYear(eighteenYearsAgo.getUTCFullYear() - 18);

    const minors = await prisma.kpsCitizen.count({
      where: { isSeedData: true, birthDate: { gt: eighteenYearsAgo } },
    });

    expect(minors).toBeGreaterThanOrEqual(5);
  });

  it("hata yollarını sınayan zaman aşımı ve sunucu hatası kayıtları bulunur", async () => {
    expect(await prisma.kpsCitizen.count({ where: { simulationBehavior: "timeout" } })).toBe(1);
    expect(await prisma.kpsCitizen.count({ where: { simulationBehavior: "error" } })).toBe(1);
  });

  it("hiçbir üye kaydında düz metin kimlik numarası bulunmaz", async () => {
    const citizens = await prisma.kpsCitizen.findMany({ select: { nationalId: true }, take: 200 });
    const plainIds = new Set(citizens.map((citizen) => citizen.nationalId));

    const users = await prisma.user.findMany({
      select: { nationalIdEncrypted: true, nationalIdMasked: true, nationalIdHash: true },
    });

    expect(users.length).toBeGreaterThan(0);
    for (const user of users) {
      for (const value of [user.nationalIdEncrypted, user.nationalIdMasked, user.nationalIdHash]) {
        expect(value === null || !plainIds.has(value)).toBe(true);
      }
      // Maskeli değer yalnızca ilk 3 ve son 2 haneyi gösterir.
      expect(user.nationalIdMasked).toMatch(/^\d{3}\*{6}\d{2}$/);
    }
  });

  it("personel rehberinde düz kimlik numarası değil yalnızca özet tutulur", async () => {
    const staff = await prisma.staffMember.findMany({ select: { nationalIdHash: true } });

    expect(staff.length).toBeGreaterThan(0);
    for (const member of staff) {
      // Özet 64 karakterlik onaltılık SHA-256 çıktısıdır; 11 haneli numara değil.
      expect(member.nationalIdHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("market fiyatları rehberin bantları içinde kalır ve stoksuz ürün bulunur", async () => {
    const products = await prisma.product.findMany({
      select: { price: true, stock: true, category: { select: { name: true } } },
    });
    const bands: Record<string, [number, number]> = {
      "Ekmek ve Unlu Mamul": [15, 60],
      "Süt Ürünleri": [55, 350],
      "Temel Gıda": [60, 240],
      "Meyve ve Sebze": [35, 160],
      İçecek: [25, 110],
      "Temizlik ve Kağıt": [90, 400],
    };

    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      const band = bands[product.category.name];
      const price = Number(product.price);

      expect(band, `${product.category.name} için bant tanımlı olmalı`).toBeDefined();
      expect(price).toBeGreaterThanOrEqual(band[0]);
      expect(price).toBeLessThanOrEqual(band[1]);
    }

    expect(products.filter((product) => product.stock === 0).length).toBeGreaterThanOrEqual(2);
  });

  it("satışa kapalı menü kalemi bulunur (tükendi durumu testi için)", async () => {
    expect(await prisma.menuItem.count({ where: { isAvailable: false } })).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("örnek üye hesaplarının en az 3'ü personel, 7'si normal vatandaştır", async () => {
    const demoUsers = await prisma.user.findMany({
      where: { id: { startsWith: "seed-user-" } },
      select: { isStaff: true },
      take: 10,
      orderBy: { id: "asc" },
    });

    expect(demoUsers.filter((user) => user.isStaff).length).toBeGreaterThanOrEqual(3);
    expect(demoUsers.filter((user) => !user.isStaff).length).toBeGreaterThanOrEqual(7);
  });

  it("kayıtlı kartlarda yalnızca son 4 hane bulunur", async () => {
    const cards = await prisma.savedCard.findMany({ select: { last4: true } });

    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.last4).toMatch(/^\d{4}$/);
    }
  });

  it("her satılmış koltuğun bir sahibi vardır", async () => {
    const reservations = await prisma.seatReservation.findMany({ select: { userId: true } });

    expect(reservations.length).toBeGreaterThan(0);
    expect(reservations.every((reservation) => reservation.userId.length > 0)).toBe(true);
  });

  it("hiç kimsenin aynı branşta aynı gün iki aktif randevusu yoktur", async () => {
    // PRD §5.1 iş kuralı. Tohumlanan verinin kendisi bu kuralı ihlal ederse,
    // adım 6'da kuralı uygulayan kod "zaten bozuk" bir veriyle karşılaşırdı.
    const appointments = await prisma.appointment.findMany({
      where: { status: "booked" },
      select: {
        userId: true,
        slot: { select: { startsAt: true, doctor: { select: { specialtyId: true } } } },
      },
    });

    expect(appointments.length).toBeGreaterThan(0);

    const seen = new Set<string>();
    for (const appointment of appointments) {
      const day = appointment.slot.startsAt.toISOString().slice(0, 10);
      const key = `${appointment.userId}:${appointment.slot.doctor.specialtyId}:${day}`;

      expect(seen.has(key), `çift randevu: ${key}`).toBe(false);
      seen.add(key);
    }
  });
});
