/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { serverEnv } from "@/config/env";
import {
  AccountPasswordMismatchError,
  AccountPasswordRequiredError,
  IdentityNotLinkedError,
  IdentityUnlinkWouldLockAccountError,
} from "@/features/account/errors";
import { DELETED_ACCOUNT_NAME } from "@/features/account/repositories/account-erasure.repository";
import { deleteAccount } from "@/features/account/services/account-deletion.service";
import { buildDataExport } from "@/features/account/services/data-export.service";
import { unlinkIdentity } from "@/features/account/services/identity-unlink.service";
import { findAuthUserByNationalIdHash } from "@/features/auth/repositories/user.repository";
import { hashPassword } from "@/features/auth/services/password.service";
import { encryptNationalId, hashNationalId, maskNationalId } from "@/lib/crypto";
import { rateLimitKey, resetRateLimit } from "@/lib/rate-limit";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * HESAP YÖNETİMİ VE VERİ HAKLARI (PRD §5.11 · ADR-017 · adım 17b).
 *
 * ═══ BU DOSYANIN ASIL İŞİ: PRD'NİN KABUL KRİTERİ CÜMLESİ ═══
 * "Silinen hesabın kimlik numarasıyla yeniden kayıt olunabilir; eski
 * siparişler kişiye bağlanamaz." Bu cümlenin iki yarısı da ancak GERÇEK
 * veritabanına karşı kanıtlanabilir: `national_id_hash` BENZERSİZ bir kolon
 * ve "boşaltıldı" iddiası, taklit bir istemciyle ölçülemez — taklit istemci
 * benzersizlik kısıtını hiç bilmez.
 *
 * ═══ İKİNCİ İDDİA: NEYİN KALDIĞI ═══
 * Silme, mali kayıtları ve denetim/rıza kayıtlarını KORUMAK zorunda
 * (TTK m.82 · KVKK Yönetmeliği m.7/3). "Yanlışlıkla fazla sildik" hatası geri
 * alınamaz olduğu için burada tek tek ölçülüyor.
 */

const USER = testId("account", "user");
const GOOGLE_USER = testId("account", "google-user");
const ACTOR_IP = "203.0.113.77";
const PASSWORD = "Dogru-Sifre-2026!";
const NATIONAL_ID = "10000000146";
const OTHER_NATIONAL_ID = "10000000278";

function nationalIdHashOf(value: string): string {
  return hashNationalId(value, serverEnv.NATIONAL_ID_HASH_SALT);
}

async function resetBudgets(): Promise<void> {
  for (const purpose of ["account_destructive", "account_export"]) {
    await resetRateLimit(rateLimitKey(purpose, "user", USER));
    await resetRateLimit(rateLimitKey(purpose, "user", GOOGLE_USER));
  }
}

describe("hesap yönetimi", () => {
  beforeEach(async () => {
    await cleanupTestData();
    await resetBudgets();
  });

  afterEach(async () => {
    await resetBudgets();
    await cleanupTestData();
  });

  describe("hesabımı sil", () => {
    it("PRD kabul kriteri: silinen hesabın kimlik numarasıyla YENİDEN KAYIT olunabiliyor", async () => {
      await seedPasswordUser();

      const hash = nationalIdHashOf(NATIONAL_ID);

      // Silmeden önce: numara bu hesaba kilitli.
      expect(await findAuthUserByNationalIdHash(hash)).not.toBeNull();

      await deleteAccount({ userId: USER, password: PASSWORD, actorIp: ACTOR_IP, now: new Date() });

      /**
       * ⛔ ASIL ÖLÇÜM: aynı numarayla YENİ bir satır yazılabiliyor mu?
       * `users.national_id_hash` benzersiz — silme onu boşaltmadıysa bu
       * `create` P2002 ile patlar ve test kırmızıya döner. "Alan null oldu mu"
       * diye bakmak yetmezdi: asıl soru kısıtın serbest kalıp kalmadığı.
       */
      const reRegistered = await prisma.user.create({
        data: {
          id: testId("account", "yeniden"),
          fullName: "Yeniden Kayıt",
          nationalIdHash: hash,
          nationalIdMasked: maskNationalId(NATIONAL_ID),
          email: "yeniden@ornek.test",
          identityStatus: "kps_verified",
          isSeedData: true,
        },
        select: { id: true },
      });

      expect(reRegistered.id).toBe(testId("account", "yeniden"));

      // Ve giriş artık YENİ hesabı buluyor, silinmiş olanı değil.
      const found = await findAuthUserByNationalIdHash(hash);

      expect(found?.id).toBe(testId("account", "yeniden"));
    });

    it("PRD kabul kriteri: eski sipariş DURUYOR ama kişiye bağlanamıyor", async () => {
      await seedPasswordUser();
      await seedOrder();

      await deleteAccount({ userId: USER, password: PASSWORD, actorIp: ACTOR_IP, now: new Date() });

      // Mali kayıt yerinde: TTK m.82 gereği 10 yıl saklanmak zorunda.
      const order = await prisma.order.findFirst({ where: { userId: USER } });

      expect(order).not.toBeNull();
      expect(order?.totalAmount.toString()).toBe("149.9");

      // Ama bağlandığı satırda kişiyi gösteren HİÇBİR alan kalmadı.
      const user = await prisma.user.findUnique({ where: { id: USER } });

      expect(user).not.toBeNull();
      expect(user?.fullName).toBe(DELETED_ACCOUNT_NAME);
      expect(user?.nationalIdHash).toBeNull();
      expect(user?.nationalIdEncrypted).toBeNull();
      expect(user?.nationalIdMasked).toBeNull();
      expect(user?.email).toBeNull();
      expect(user?.phone).toBeNull();
      expect(user?.birthDate).toBeNull();
      expect(user?.passwordHash).toBeNull();
      expect(user?.registeredProvince).toBeNull();
      expect(user?.deletedAt).not.toBeNull();
    });

    it("kişisel kayıtları siliyor, mali ve kanıt kayıtlarını BIRAKIYOR", async () => {
      await seedPasswordUser();
      await seedOrder();
      await seedPersonalRecords();

      await deleteAccount({ userId: USER, password: PASSWORD, actorIp: ACTOR_IP, now: new Date() });

      // Gidenler.
      expect(await prisma.session.count({ where: { userId: USER } })).toBe(0);
      expect(await prisma.account.count({ where: { userId: USER } })).toBe(0);
      expect(await prisma.notification.count({ where: { userId: USER } })).toBe(0);
      expect(await prisma.cart.count({ where: { userId: USER } })).toBe(0);
      expect(await prisma.supportTicket.count({ where: { userId: USER } })).toBe(0);

      // Kalanlar — ve KALMALARI gerektiği için tek tek ölçülüyor.
      expect(await prisma.payment.count({ where: { userId: USER } })).toBe(1);
      expect(await prisma.consentRecord.count({ where: { userId: USER } })).toBe(1);

      /**
       * ⛔ DENETİM KAYDI HESAPLA BİRLİKTE SİLİNMİYOR (Yönetmelik m.7/3: imha
       * işlemlerinin kaydı en az üç yıl saklanır). Üstelik silmenin KENDİSİ de
       * kayda geçmiş olmalı.
       */
      const deletionLog = await prisma.auditLog.findFirst({
        where: { userId: USER, action: "account_delete" },
      });

      expect(deletionLog).not.toBeNull();
      expect(deletionLog?.entityId).toBe(USER);
    });

    it("adres ve kartın metin alanlarını boşaltıyor, satırı bırakıyor", async () => {
      await seedPasswordUser();
      await seedPersonalRecords();
      // Kart yalnızca ödeme akışında yazılıyor; mali kayıtla birlikte kuruluyor.
      await seedOrder();

      await deleteAccount({ userId: USER, password: PASSWORD, actorIp: ACTOR_IP, now: new Date() });

      // Satır duruyor: `orders.delivery_address_id` adrese Restrict ile bağlı.
      const address = await prisma.address.findFirst({ where: { userId: USER } });

      expect(address).not.toBeNull();
      expect(address?.fullAddress).toBe("—");
      expect(address?.district).toBe("—");
      expect(address?.deletedAt).not.toBeNull();

      const card = await prisma.savedCard.findFirst({ where: { userId: USER } });

      expect(card?.holderName).toBe("—");
      expect(card?.deletedAt).not.toBeNull();
      // Son dört hane KALIYOR: aynı bilgi `payments` satırında da var ve o mali kayıt.
      expect(card?.last4).toBe("1111");
    });

    it("üyeliğin OTOMATİK YENİLEMESİNİ kapatıyor ama üyeliği iptal ETMİYOR", async () => {
      await seedPasswordUser();
      await seedMembership();

      await deleteAccount({ userId: USER, password: PASSWORD, actorIp: ACTOR_IP, now: new Date() });

      const membership = await prisma.membership.findFirst({ where: { userId: USER } });

      /**
       * İptal etmek erken çıkış farkı TAHSİL EDERDİ (PRD §5.6) — yani "hesabımı
       * sil" düğmesi kullanıcının kartından habersizce para çekerdi. Bunun
       * yerine PRD §5.11'in ikinci dalı: üyelik dönem sonuna kadar sürer.
       */
      expect(membership?.status).toBe("active");
      expect(membership?.autoRenewEnabled).toBe(false);
    });

    it("yanlış şifreyle SİLMİYOR", async () => {
      await seedPasswordUser();

      await expect(
        deleteAccount({
          userId: USER,
          password: "Yanlis-Sifre-2026!",
          actorIp: ACTOR_IP,
          now: new Date(),
        }),
      ).rejects.toBeInstanceOf(AccountPasswordMismatchError);

      const user = await prisma.user.findUnique({ where: { id: USER } });

      expect(user?.deletedAt).toBeNull();
      expect(user?.email).not.toBeNull();
    });

    it("şifresi olan hesapta şifre GÖNDERİLMEZSE silmiyor", async () => {
      await seedPasswordUser();

      await expect(
        deleteAccount({ userId: USER, password: undefined, actorIp: ACTOR_IP, now: new Date() }),
      ).rejects.toBeInstanceOf(AccountPasswordRequiredError);

      const user = await prisma.user.findUnique({ where: { id: USER } });

      expect(user?.deletedAt).toBeNull();
    });

    it("şifresi OLMAYAN hesap (Google) şifresiz silinebiliyor", async () => {
      await seedGoogleUser({ verified: false });

      await deleteAccount({
        userId: GOOGLE_USER,
        password: undefined,
        actorIp: ACTOR_IP,
        now: new Date(),
      });

      const user = await prisma.user.findUnique({ where: { id: GOOGLE_USER } });

      expect(user?.deletedAt).not.toBeNull();
      expect(user?.email).toBeNull();
    });

    it("iki eşzamanlı silmeden yalnızca BİRİ denetim kaydı yazıyor", async () => {
      await seedPasswordUser();

      /**
       * ⛔ YARIŞ KORUMASI ÖLÇÜLÜYOR. Son adım tek koşullu yazma
       * (`updateMany` + `deletedAt: null`) ve karar etkilenen satır sayısından
       * okunuyor. "Önce oku, silinmemişse yaz" deseni olsaydı iki istek de
       * "silinmemiş" görür ve İKİ denetim kaydı yazılırdı — yani olmamış bir
       * silme kayda geçerdi.
       */
      const results = await Promise.allSettled([
        deleteAccount({ userId: USER, password: PASSWORD, actorIp: ACTOR_IP, now: new Date() }),
        deleteAccount({ userId: USER, password: PASSWORD, actorIp: ACTOR_IP, now: new Date() }),
      ]);

      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);

      const logs = await prisma.auditLog.count({
        where: { userId: USER, action: "account_delete" },
      });

      expect(logs).toBe(1);
    });
  });

  describe("kimlik bağını çözme (ADR-017)", () => {
    it("Google bağlantısı YOKSA çözmüyor — hesap kilitlenirdi", async () => {
      await seedPasswordUser();

      /**
       * ⛔ BU TESTİN ÖLÇTÜĞÜ ŞEY BİR KİLİTLENME KORUMASI: giriş kullanıcıyı
       * T.C. numarasının özetinden buluyor. Bağ koparsa şifreyle giriş de
       * ölür ve kullanıcı hesabına bir daha giremez.
       */
      await expect(
        unlinkIdentity({ userId: USER, password: PASSWORD, actorIp: ACTOR_IP, now: new Date() }),
      ).rejects.toBeInstanceOf(IdentityUnlinkWouldLockAccountError);

      const user = await prisma.user.findUnique({ where: { id: USER } });

      expect(user?.nationalIdHash).not.toBeNull();
      expect(user?.identityStatus).toBe("kps_verified");
    });

    it("Google bağlıysa çözüyor: numara SERBEST kalıyor, yetki düşüyor, şifre siliniyor", async () => {
      await seedGoogleUser({ verified: true });

      await unlinkIdentity({
        userId: GOOGLE_USER,
        password: undefined,
        actorIp: ACTOR_IP,
        now: new Date(),
      });

      const user = await prisma.user.findUnique({ where: { id: GOOGLE_USER } });

      expect(user?.identityStatus).toBe("unverified");
      expect(user?.nationalIdHash).toBeNull();
      expect(user?.nationalIdEncrypted).toBeNull();
      expect(user?.birthDate).toBeNull();
      expect(user?.isStaff).toBe(false);
      expect(user?.staffMemberId).toBeNull();
      // Ad, Google hesabının e-posta yerel kısmına dönüyor.
      expect(user?.fullName).toBe("google-uye");
      // Çalışmayan bir giriş yöntemi ekranda "Tanımlı" görünmesin.
      expect(user?.passwordHash).toBeNull();

      /**
       * ⛔ ADR-017'NİN ASIL KAZANCI: numara artık BAŞKA bir hesaba bağlanabilir.
       * Bu satır kırmızıya dönerse "her bağlama geri alınabilir" ilkesi
       * fiilen çalışmıyor demektir.
       */
      const claimed = await prisma.user.create({
        data: {
          id: testId("account", "yeni-sahip"),
          fullName: "Yeni Sahip",
          nationalIdHash: nationalIdHashOf(OTHER_NATIONAL_ID),
          identityStatus: "kps_verified",
          isSeedData: true,
        },
        select: { id: true },
      });

      expect(claimed.id).toBe(testId("account", "yeni-sahip"));
    });

    it("kimliği bağlı olmayan hesapta çözecek bir şey yok", async () => {
      await seedGoogleUser({ verified: false });

      await expect(
        unlinkIdentity({
          userId: GOOGLE_USER,
          password: undefined,
          actorIp: ACTOR_IP,
          now: new Date(),
        }),
      ).rejects.toBeInstanceOf(IdentityNotLinkedError);
    });

    it("çözme işlemi AYRI bir denetim kaydı yazıyor", async () => {
      await seedGoogleUser({ verified: true });

      await unlinkIdentity({
        userId: GOOGLE_USER,
        password: undefined,
        actorIp: ACTOR_IP,
        now: new Date(),
      });

      const log = await prisma.auditLog.findFirst({
        where: { userId: GOOGLE_USER, action: "identity_unlink" },
      });

      // `identity_verify` ile aynı değere yazılsaydı denetim kaydı "bu hesapta
      // ne oldu" sorusunu cevaplayamazdı — ikisi zıt yönde yetki değişikliği.
      expect(log).not.toBeNull();
      expect(log?.entityId).toBe(GOOGLE_USER);
    });
  });

  describe("verimi indir", () => {
    it("dosyaya şifre özeti, şifreli kimlik veya oturum jetonu KOYMUYOR", async () => {
      await seedPasswordUser();
      await seedPersonalRecords();

      const document = await buildDataExport({ userId: USER, actorIp: ACTOR_IP, now: new Date() });
      const serialized = JSON.stringify(document);

      /**
       * ⛔ DOSYANIN İÇİNDE NE OLMADIĞI DA BİR TAAHHÜT. Bu dosya indirildiği
       * andan itibaren kullanıcının cihazında ve e-postasında dolaşacak;
       * içine sızan bir şifre özeti geri alınamaz.
       *
       * Ölçüm ham metin üzerinde yapılıyor, alan adı üzerinde değil: değerin
       * ADI değiştirilse bile sızıntı yakalanır.
       */
      const passwordHash = (await prisma.user.findUnique({ where: { id: USER } }))?.passwordHash;

      expect(passwordHash).toBeTruthy();
      expect(serialized).not.toContain(passwordHash);
      expect(serialized).not.toContain(NATIONAL_ID);
      expect(serialized).not.toContain("sessionToken");
      expect(serialized).not.toContain(testId("account", "oturum"));

      // Buna karşılık MASKELİ numara var — kullanıcı kendi kaydını tanımalı.
      expect(serialized).toContain(maskNationalId(NATIONAL_ID));
    });

    it("PRD'nin saydığı sekiz bölümün hepsini içeriyor", async () => {
      await seedPasswordUser();

      const document = await buildDataExport({ userId: USER, actorIp: ACTOR_IP, now: new Date() });

      // PRD §5.11: "profil, adresler, siparişler, randevular, rezervasyonlar,
      // üyelikler, destek talepleri, rıza kayıtları".
      for (const section of [
        "profil",
        "teslimatAdresleri",
        "siparisler",
        "hastaneRandevulari",
        "etkinlikBiletleri",
        "sporSalonuUyelikleri",
        "destekTalepleri",
        "rizaKayitlari",
      ]) {
        expect(document).toHaveProperty(section);
      }
    });

    it("indirme denetim kaydına düşüyor", async () => {
      await seedPasswordUser();

      await buildDataExport({ userId: USER, actorIp: ACTOR_IP, now: new Date() });

      const log = await prisma.auditLog.findFirst({
        where: { userId: USER, action: "data_export" },
      });

      expect(log).not.toBeNull();
    });
  });
});

// ===========================================================================
// Tohumlama — her test kendi ihtiyacını kuruyor
// ===========================================================================

async function seedPasswordUser(): Promise<void> {
  await prisma.user.create({
    data: {
      id: USER,
      fullName: "Test Kullanıcı",
      email: "silinecek@ornek.test",
      phone: "05320000001",
      birthDate: new Date("1990-01-01T00:00:00.000Z"),
      passwordHash: await hashPassword(PASSWORD),
      nationalIdHash: nationalIdHashOf(NATIONAL_ID),
      nationalIdEncrypted: encryptNationalId(NATIONAL_ID, serverEnv.NATIONAL_ID_ENCRYPTION_KEY),
      nationalIdMasked: maskNationalId(NATIONAL_ID),
      registeredProvince: "İzmir",
      registeredDistrict: "Karşıyaka",
      identityStatus: "kps_verified",
      isSeedData: true,
    },
  });

  await prisma.session.create({
    data: {
      id: testId("account", "oturum"),
      sessionToken: testId("account", "oturum", "token"),
      userId: USER,
      expires: new Date(Date.now() + 86_400_000),
      isSeedData: true,
    },
  });
}

/** Google ile açılmış hesap — şifresi YOK, `accounts` satırı VAR. */
async function seedGoogleUser({ verified }: { verified: boolean }): Promise<void> {
  await prisma.user.create({
    data: {
      id: GOOGLE_USER,
      fullName: verified ? "Doğrulanmış Kişi" : "google-uye",
      email: "google-uye@ornek.test",
      identityStatus: verified ? "kps_verified" : "unverified",
      nationalIdHash: verified ? nationalIdHashOf(OTHER_NATIONAL_ID) : null,
      nationalIdEncrypted: verified
        ? encryptNationalId(OTHER_NATIONAL_ID, serverEnv.NATIONAL_ID_ENCRYPTION_KEY)
        : null,
      nationalIdMasked: verified ? maskNationalId(OTHER_NATIONAL_ID) : null,
      birthDate: verified ? new Date("1985-05-05T00:00:00.000Z") : null,
      isSeedData: true,
      accounts: {
        create: {
          id: testId("account", "google-hesap"),
          type: "oauth",
          provider: "google",
          providerAccountId: testId("account", "google-sub"),
          isSeedData: true,
        },
      },
    },
  });
}

async function seedPersonalRecords(): Promise<void> {
  await prisma.address.create({
    data: {
      id: testId("account", "adres"),
      userId: USER,
      title: "Ev",
      fullAddress: "Bostanlı Mahallesi 1 Sokak No 2",
      district: "Karşıyaka",
      isSeedData: true,
    },
  });

  await prisma.notification.create({
    data: {
      id: testId("account", "bildirim"),
      userId: USER,
      type: "order_status",
      title: "Siparişiniz yola çıktı",
      body: "Bostanlı Mahallesi adresine geliyor.",
      isSeedData: true,
    },
  });

  await prisma.cart.create({
    data: { id: testId("account", "sepet"), userId: USER, status: "active", isSeedData: true },
  });

  await prisma.supportTicket.create({
    data: {
      id: testId("account", "talep"),
      userId: USER,
      subject: "Adresim yanlış görünüyor",
      description: "Bostanlı Mahallesi 1 Sokak No 2 yazması gerekiyordu.",
      isSeedData: true,
    },
  });

  await prisma.consentRecord.create({
    data: {
      id: testId("account", "riza"),
      userId: USER,
      consentType: "necessary_cookies",
      isGranted: true,
      isSeedData: true,
    },
  });
}

/** Ödeme + sipariş + kayıtlı kart — mali kaydın korunduğunu ölçmek için. */
async function seedOrder(): Promise<void> {
  await prisma.savedCard.create({
    data: {
      id: testId("account", "kart"),
      userId: USER,
      brand: "visa",
      last4: "1111",
      expMonth: 12,
      expYear: 2030,
      holderName: "TEST KULLANICI",
      isSeedData: true,
    },
  });

  await prisma.payment.create({
    data: {
      id: testId("account", "odeme"),
      userId: USER,
      savedCardId: testId("account", "kart"),
      brand: "visa",
      cardLast4: "1111",
      fakeTransactionId: testId("account", "islem"),
      status: "success",
      amount: "149.90",
      idempotencyKey: testId("account", "idem"),
      attemptedAt: new Date(),
      isSeedData: true,
    },
  });

  await prisma.order.create({
    data: {
      id: testId("account", "siparis"),
      userId: USER,
      paymentId: testId("account", "odeme"),
      fulfillmentType: "market_delivery",
      subtotalAmount: "149.90",
      deliveryFee: "0",
      discountAmount: "0",
      totalAmount: "149.90",
      status: "received",
      isSeedData: true,
    },
  });
}

async function seedMembership(): Promise<void> {
  await prisma.membershipPlan.create({
    data: {
      id: testId("account", "paket"),
      name: testId("account", "Aylık Paket"),
      commitmentMonths: 0,
      monthlyPrice: "499.00",
      isSeedData: true,
    },
  });

  await prisma.membership.create({
    data: {
      id: testId("account", "uyelik"),
      userId: USER,
      activeUserId: USER,
      planId: testId("account", "paket"),
      startsAt: new Date(),
      status: "active",
      autoRenewEnabled: true,
      nextBillingAt: new Date(Date.now() + 30 * 86_400_000),
      isSeedData: true,
    },
  });
}
