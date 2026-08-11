import { prisma } from "@/lib/db";

/**
 * "Verimi indir" için kullanıcının kendi kayıtlarını okuyan katman
 * (PRD §5.11 · `14-privacy-and-compliance.md` → "Verimi indir").
 *
 * ═══ HER SORGUDA `userId` KOŞULU VAR ═══
 * Kimliği ÇAĞIRAN VERİR ve yalnızca oturumdan alır. Bu dosyada sahiplik
 * kontrolü ayrı bir adım değil, her sorgunun `WHERE`'inde — yani unutulabilecek
 * bir yer yok (05-auth-security.md → IDOR).
 *
 * ═══ ⛔ HANGİ ALANLAR BİLEREK OKUNMUYOR ═══
 * `passwordHash` · `nationalIdEncrypted` · `nationalIdHash` · oturum jetonları ·
 * `accounts.providerAccountId` (Google `sub`) · `ticket_attachments.data`.
 * Bunlar SEÇİM LİSTESİNDE HİÇ YOK, sonradan filtrelenmiyor: okunmayan veri
 * yanlışlıkla dosyaya yazılamaz. Kimlik numarası yalnızca MASKELİ hâliyle
 * çıkıyor. Gerekçe: bu dosya indirildiği andan itibaren kullanıcının
 * cihazında, indirilenler klasöründe ve muhtemelen e-postasında dolaşacak.
 *
 * ═══ SİLİNMİŞ (soft-deleted) KAYITLAR DA DÖNÜYOR ═══
 * `deletedAt` dolu adres ve kartlar dosyaya `silindiTarihi` ile giriyor.
 * Sebebi: onları HÂLÂ TUTUYORUZ. "Verimi indir" elimizde ne varsa onu
 * göstermek zorunda; kullanıcının göremediği ama sakladığımız bir kayıt,
 * şeffaflık yükümlülüğünün ihlali olur.
 */

/** Prisma `Decimal` → kayıpsız metin. Ondalık sayıya çevrilmiyor (lib/money.ts). */
type DecimalLike = { toString(): string };

export type ExportProfileRow = {
  fullName: string;
  nationalIdMasked: string | null;
  email: string | null;
  phone: string | null;
  birthDate: Date | null;
  registeredProvince: string | null;
  registeredDistrict: string | null;
  identityStatus: string;
  isStaff: boolean;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  createdAt: Date;
};

export async function findExportProfile(userId: string): Promise<ExportProfileRow | null> {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      fullName: true,
      nationalIdMasked: true,
      email: true,
      phone: true,
      birthDate: true,
      registeredProvince: true,
      registeredDistrict: true,
      identityStatus: true,
      isStaff: true,
      emailVerifiedAt: true,
      phoneVerifiedAt: true,
      createdAt: true,
    },
  });
}

export async function listExportAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    select: {
      title: true,
      fullAddress: true,
      district: true,
      createdAt: true,
      deletedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listExportSavedCards(userId: string) {
  return prisma.savedCard.findMany({
    where: { userId },
    // ⛔ Tam kart numarası HİÇBİR YERDE SAKLANMIYOR (PRD §6.2), yani burada
    // "dikkatli seçim" değil, seçilecek bir şey yok.
    select: {
      brand: true,
      last4: true,
      expMonth: true,
      expYear: true,
      holderName: true,
      createdAt: true,
      deletedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listExportOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    select: {
      id: true,
      fulfillmentType: true,
      status: true,
      subtotalAmount: true,
      deliveryFee: true,
      discountAmount: true,
      totalAmount: true,
      deliverySlot: true,
      cancelledAt: true,
      createdAt: true,
      deliveryAddress: { select: { title: true, fullAddress: true, district: true } },
      items: {
        select: { itemType: true, refId: true, quantity: true, unitPrice: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listExportPayments(userId: string) {
  return prisma.payment.findMany({
    where: { userId },
    select: {
      fakeTransactionId: true,
      brand: true,
      cardLast4: true,
      status: true,
      amount: true,
      attemptedAt: true,
      refunds: { select: { fakeRefundId: true, amount: true, reason: true, createdAt: true } },
    },
    orderBy: { attemptedAt: "asc" },
  });
}

export async function listExportAppointments(userId: string) {
  return prisma.appointment.findMany({
    where: { userId },
    select: {
      status: true,
      cancelledAt: true,
      createdAt: true,
      slot: {
        select: {
          startsAt: true,
          doctor: {
            select: { fullName: true, title: true, specialty: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listExportSeatReservations(userId: string) {
  return prisma.seatReservation.findMany({
    where: { userId },
    select: {
      status: true,
      createdAt: true,
      event: { select: { name: true, performer: true, startsAt: true, basePrice: true } },
      seat: { select: { block: true, rowLabel: true, seatNumber: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listExportMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    select: {
      status: true,
      startsAt: true,
      commitmentEndsAt: true,
      nextBillingAt: true,
      cancelledAt: true,
      autoRenewEnabled: true,
      createdAt: true,
      plan: { select: { name: true, commitmentMonths: true, monthlyPrice: true } },
      payments: {
        select: {
          kind: true,
          status: true,
          amount: true,
          periodStart: true,
          periodEnd: true,
          attemptedAt: true,
        },
        orderBy: { attemptedAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listExportSupportTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    select: {
      subject: true,
      description: true,
      status: true,
      closedAt: true,
      createdAt: true,
      // ⛔ `data` (dosyanın kendisi) OKUNMUYOR: bir JSON dosyasına megabaytlarca
      // base64 gömmek dosyayı kullanılamaz hâle getirirdi. Kullanıcı ekleri
      // talebin kendi ekranından indiriyor; burada yalnızca "neyi tutuyoruz".
      attachments: {
        select: { fileName: true, contentType: true, sizeBytes: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listExportConsents(userId: string) {
  return prisma.consentRecord.findMany({
    where: { userId },
    select: { consentType: true, isGranted: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export type { DecimalLike };
