import { ACCOUNT_EXPORT_FORMAT_VERSION } from "@/config/constants";
import { AccountAlreadyDeletedError } from "@/features/account/errors";
import {
  findExportProfile,
  listExportAddresses,
  listExportAppointments,
  listExportConsents,
  listExportMemberships,
  listExportOrders,
  listExportPayments,
  listExportSavedCards,
  listExportSeatReservations,
  listExportSupportTickets,
} from "@/features/account/repositories/data-export.repository";
import { enforceExportBudget } from "@/features/account/services/account-guards";
import { recordAuditLog } from "@/lib/audit";
import { hashActorIp } from "@/lib/rate-limit";

/**
 * "Verimi indir" — kullanıcının tüm kayıtlarını tek bir JSON belgesine çevirir
 * (PRD §5.11 · KVKK m.11: veri taşınabilirliği).
 *
 * ═══ ⛔ KUYRUK YOK, DOSYA ANINDA ÜRETİLİYOR ═══
 * PRD "hazırlama uzun sürerse istek kuyruğa alınır" diyor. Kuyruk YAZILMADI ve
 * sebebi ölçülebilir: bu projede planlı görev günde bir çalışıyor (teknik borç
 * #3, ücretsiz plan sınırı), yani bir kuyruk indirmeyi 24 saate kadar
 * geciktirmek demekti. Tek bir kullanıcının kayıtları on tabloda toplam birkaç
 * yüz satır; anında üretmek hem doğru hem hızlı. Trafik ölçülüp bu varsayım
 * yanlış çıkarsa kuyruk eklenir (teknik borç olarak yazıldı).
 *
 * ═══ ALAN ADLARI TÜRKÇE ═══
 * Bu dosyayı okuyacak olan KULLANICI, geliştirici değil. Kod içi isimlendirme
 * İngilizce (CLAUDE.md §0) ama bu bir ARAYÜZ çıktısı — ekrandaki etiketlerle
 * aynı dili konuşmak zorunda. Dönüşüm tek yerde, burada.
 *
 * ═══ TARİHLER ISO 8601 (UTC) ═══
 * Yerelleştirilmiş metin ("10 Ağustos 2026") makine tarafından okunamaz ve
 * taşınabilirliğin amacı tam da başka bir sisteme taşınabilmesi. Ekranda
 * gösterim ayrı bir iş.
 */

/** Prisma `Decimal` kayıpsız METİN olarak yazılıyor — `Number` çevrimi yok. */
function money(value: { toString(): string }): string {
  return value.toString();
}

function iso(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

export type BuildDataExportInput = {
  /** Oturumdan gelir; istemciden ASLA. */
  userId: string;
  actorIp: string;
  now: Date;
};

export type DataExportDocument = Record<string, unknown>;

export async function buildDataExport(input: BuildDataExportInput): Promise<DataExportDocument> {
  await enforceExportBudget(input.userId, input.now);

  const profile = await findExportProfile(input.userId);

  // Hesap bu arada silinmişse oturum zaten geçersizdir; sessizce boş bir
  // dosya üretmek yerine akış burada duruyor.
  if (!profile) throw new AccountAlreadyDeletedError();

  /**
   * Dokuz sorgu BİRBİRİNDEN BAĞIMSIZ — sırayla beklemek indirmeyi dokuz kat
   * yavaşlatırdı. Hepsi aynı kullanıcıya ait ve hiçbiri diğerinin sonucunu
   * kullanmıyor, yani tutarlılık için de sıraya gerek yok.
   */
  const [
    addresses,
    savedCards,
    orders,
    payments,
    appointments,
    seatReservations,
    memberships,
    supportTickets,
    consents,
  ] = await Promise.all([
    listExportAddresses(input.userId),
    listExportSavedCards(input.userId),
    listExportOrders(input.userId),
    listExportPayments(input.userId),
    listExportAppointments(input.userId),
    listExportSeatReservations(input.userId),
    listExportMemberships(input.userId),
    listExportSupportTickets(input.userId),
    listExportConsents(input.userId),
  ]);

  const document: DataExportDocument = {
    belge: {
      bicimSurumu: ACCOUNT_EXPORT_FORMAT_VERSION,
      olusturulmaTarihi: input.now.toISOString(),
      aciklama:
        "Bu dosya, benim-belediyem uygulamasında hesabınıza bağlı olarak tuttuğumuz " +
        "kişisel verilerin tamamıdır (KVKK m.11). Kimlik numaranız güvenlik gereği " +
        "yalnızca maskeli hâliyle yer alır; şifreniz ve oturum bilgileriniz hiçbir " +
        "şekilde yer almaz.",
      /**
       * ⛔ BU UYARI DOSYANIN İÇİNDE OLMAK ZORUNDA. Kullanıcı dosyayı aylar
       * sonra, uygulamanın dışında açacak; o an ekrandaki hiçbir uyarıyı
       * hatırlamıyor olacak.
       */
      uyari:
        "Bu dosya kişisel verilerinizi içerir. Paylaşırken dikkatli olun ve " +
        "güvenmediğiniz kimseye göndermeyin.",
      gosterimUygulamasi:
        "benim-belediyem gerçek bir belediye hizmeti değildir; tüm veriler gösterim amaçlıdır.",
    },

    profil: {
      adSoyad: profile.fullName,
      kimlikNumarasiMaskeli: profile.nationalIdMasked,
      ePosta: profile.email,
      cepTelefonu: profile.phone,
      dogumTarihi: iso(profile.birthDate),
      nufusaKayitliIl: profile.registeredProvince,
      nufusaKayitliIlce: profile.registeredDistrict,
      kimlikDurumu: profile.identityStatus,
      kurumPersoneliMi: profile.isStaff,
      ePostaDogrulanmaTarihi: iso(profile.emailVerifiedAt),
      telefonDogrulanmaTarihi: iso(profile.phoneVerifiedAt),
      hesapAcilisTarihi: profile.createdAt.toISOString(),
    },

    teslimatAdresleri: addresses.map((row) => ({
      baslik: row.title,
      acikAdres: row.fullAddress,
      ilce: row.district,
      eklenmeTarihi: row.createdAt.toISOString(),
      silinmeTarihi: iso(row.deletedAt),
    })),

    kayitliKartlar: savedCards.map((row) => ({
      marka: row.brand,
      sonDortHane: row.last4,
      sonKullanmaAy: row.expMonth,
      sonKullanmaYil: row.expYear,
      kartSahibi: row.holderName,
      eklenmeTarihi: row.createdAt.toISOString(),
      silinmeTarihi: iso(row.deletedAt),
    })),

    siparisler: orders.map((row) => ({
      siparisNo: row.id,
      tur: row.fulfillmentType,
      durum: row.status,
      araToplam: money(row.subtotalAmount),
      teslimatUcreti: money(row.deliveryFee),
      indirim: money(row.discountAmount),
      toplam: money(row.totalAmount),
      teslimatZamanAraligi: row.deliverySlot,
      teslimatAdresi: row.deliveryAddress
        ? {
            baslik: row.deliveryAddress.title,
            acikAdres: row.deliveryAddress.fullAddress,
            ilce: row.deliveryAddress.district,
          }
        : null,
      iptalTarihi: iso(row.cancelledAt),
      olusturulmaTarihi: row.createdAt.toISOString(),
      kalemler: row.items.map((item) => ({
        tur: item.itemType,
        urunKimligi: item.refId,
        adet: item.quantity,
        birimFiyat: money(item.unitPrice),
      })),
    })),

    odemeler: payments.map((row) => ({
      islemNo: row.fakeTransactionId,
      marka: row.brand,
      kartSonDortHane: row.cardLast4,
      durum: row.status,
      tutar: money(row.amount),
      islemTarihi: row.attemptedAt.toISOString(),
      iadeler: row.refunds.map((refund) => ({
        iadeNo: refund.fakeRefundId,
        tutar: money(refund.amount),
        gerekce: refund.reason,
        tarih: refund.createdAt.toISOString(),
      })),
    })),

    hastaneRandevulari: appointments.map((row) => ({
      durum: row.status,
      randevuZamani: row.slot.startsAt.toISOString(),
      doktor: `${row.slot.doctor.title} ${row.slot.doctor.fullName}`,
      brans: row.slot.doctor.specialty.name,
      iptalTarihi: iso(row.cancelledAt),
      olusturulmaTarihi: row.createdAt.toISOString(),
    })),

    etkinlikBiletleri: seatReservations.map((row) => ({
      durum: row.status,
      etkinlik: row.event.name,
      sanatci: row.event.performer,
      etkinlikZamani: row.event.startsAt.toISOString(),
      koltuk: `${row.seat.block} blok, ${row.seat.rowLabel} sıra, ${row.seat.seatNumber}. koltuk`,
      fiyat: money(row.event.basePrice),
      olusturulmaTarihi: row.createdAt.toISOString(),
    })),

    sporSalonuUyelikleri: memberships.map((row) => ({
      paket: row.plan.name,
      taahhutAy: row.plan.commitmentMonths,
      aylikUcret: money(row.plan.monthlyPrice),
      durum: row.status,
      baslangicTarihi: row.startsAt.toISOString(),
      taahhutBitisTarihi: iso(row.commitmentEndsAt),
      sonrakiTahsilatTarihi: iso(row.nextBillingAt),
      otomatikYenileme: row.autoRenewEnabled,
      iptalTarihi: iso(row.cancelledAt),
      olusturulmaTarihi: row.createdAt.toISOString(),
      tahsilatlar: row.payments.map((payment) => ({
        tur: payment.kind,
        durum: payment.status,
        tutar: money(payment.amount),
        donemBaslangici: payment.periodStart.toISOString(),
        donemBitisi: payment.periodEnd.toISOString(),
        islemTarihi: payment.attemptedAt.toISOString(),
      })),
    })),

    destekTalepleri: supportTickets.map((row) => ({
      konu: row.subject,
      aciklama: row.description,
      durum: row.status,
      kapanmaTarihi: iso(row.closedAt),
      olusturulmaTarihi: row.createdAt.toISOString(),
      ekler: row.attachments.map((file) => ({
        dosyaAdi: file.fileName,
        tur: file.contentType,
        boyutBayt: file.sizeBytes,
        yuklenmeTarihi: file.createdAt.toISOString(),
      })),
    })),

    rizaKayitlari: consents.map((row) => ({
      tur: row.consentType,
      verildiMi: row.isGranted,
      tarih: row.createdAt.toISOString(),
    })),
  };

  /**
   * DENETİM KAYDI İNDİRMEDEN SONRA (`14-privacy-and-compliance.md`: "indirme
   * denetim kaydına düşer"). Kişisel verinin tamamının bir dosyaya çıkması
   * kritik bir olaydır: hesabı ele geçiren biri de bu ucu çağırır ve kayıt,
   * bunun ne zaman olduğunun tek kanıtıdır.
   *
   * ⛔ KAYDA DOSYANIN İÇERİĞİ VEYA SATIR SAYISI YAZILMIYOR — `entityId`
   * hesabın kendi kimliği. "Kaç siparişi var" bilgisi denetim kaydının
   * cevaplaması gereken soru değil.
   */
  await recordAuditLog({
    userId: input.userId,
    action: "data_export",
    entityType: "user",
    entityId: input.userId,
    ipHash: hashActorIp(input.actorIp),
  });

  return document;
}
