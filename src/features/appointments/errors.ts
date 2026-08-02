import { messages } from "@/config/messages";
import { AppError } from "@/lib/errors";

/**
 * Hastane randevu modülüne özel hatalar (PRD §5.1).
 *
 * NEDEN AYRI SINIFLAR: dört iş kuralının dördü de 409 döner, ama istemcinin
 * hangi kuralın devreye girdiğini bilmesi gerekiyor — "saat kapıldı" ekranı
 * listeyi tazeleyip kullanıcıyı seçime döndürür, "aynı gün ikinci randevu"
 * ise başka bir güne yönlendirir. Tek bir `CONFLICT` kodu bu ayrımı yok
 * ederdi (03-api-guidelines.md → "code makine için sabit ve anlamlı").
 *
 * DÖRDÜ DE SUNUCUDA UYGULANIR. Ekranda dolu saatin tıklanamaz olması bir
 * KOLAYLIKTIR, koruma değil: adresi bilen biri isteği doğrudan atabilir ve
 * aynı duvara çarpar (05-auth-security.md).
 */

const copy = messages.hospital.errors;

/**
 * Saat bu istek işlenirken başkasına verildi (PRD §5.1 kabul kriteri: 409).
 *
 * Bu hatanın kaynağı bir kontrol DEĞİL, koşullu güncellemenin sıfır satır
 * etkilemesidir: "önce boş mu diye bak, sonra yaz" iki eşzamanlı istekte aynı
 * saati iki kişiye verirdi. Kararı veren PostgreSQL'dir, uygulama değil.
 */
export class SlotTakenError extends AppError {
  readonly code = "SLOT_TAKEN";
  readonly status = 409;

  constructor() {
    super(copy.slotTaken);
  }
}

/** Geçmiş tarihe randevu alınamaz (PRD §5.1). Ölçüt sunucunun saatidir. */
export class SlotInPastError extends AppError {
  readonly code = "SLOT_IN_PAST";
  readonly status = 409;

  constructor() {
    super(copy.slotInPast);
  }
}

/**
 * İstenen saat takvimde yok.
 *
 * 404 dönüyor çünkü kaynağın kendisi bulunamadı. Burada hesap sayımı endişesi
 * yok: doktor takvimi zaten personelin görebildiği herkese açık bir liste.
 */
export class SlotNotFoundError extends AppError {
  readonly code = "SLOT_NOT_FOUND";
  readonly status = 404;

  constructor() {
    super(copy.slotNotFound);
  }
}

/** Aynı branşta aynı gün ikinci randevu alınamaz (PRD §5.1). */
export class SameDaySpecialtyError extends AppError {
  readonly code = "SAME_DAY_SPECIALTY";
  readonly status = 409;

  constructor() {
    super(copy.sameDaySpecialty);
  }
}

/**
 * Randevu bulunamadı — VEYA BAŞKASINA AİT.
 *
 * İKİ DURUM AYNI YANITI ÜRETİR ve bu bilinçli: başkasının randevusunda 403
 * dönmek "böyle bir randevu var, ama senin değil" bilgisini sızdırırdı.
 * Saldırgan kimlik denemesiyle takvimde hangi kayıtların bulunduğunu
 * çıkarabilirdi (05-auth-security.md → IDOR).
 */
export class AppointmentNotFoundError extends AppError {
  readonly code = "APPOINTMENT_NOT_FOUND";
  readonly status = 404;

  constructor() {
    super(copy.appointmentNotFound);
  }
}

/** Zaten iptal edilmiş randevu yeniden iptal edilemez. */
export class AppointmentAlreadyCancelledError extends AppError {
  readonly code = "APPOINTMENT_ALREADY_CANCELLED";
  readonly status = 409;

  constructor() {
    super(copy.alreadyCancelled);
  }
}

/** İptal en geç randevudan 2 saat önce yapılabilir (PRD §5.1). */
export class CancellationTooLateError extends AppError {
  readonly code = "CANCELLATION_TOO_LATE";
  readonly status = 409;

  constructor() {
    super(copy.cancellationTooLate);
  }
}

/**
 * Yazma bütçesi aşıldı (CLAUDE.md §5.5).
 *
 * Sayaç KULLANICI başına: bu hizmet tek bir kurumun personeline açık ve
 * hepsi aynı dış IP'nin arkasından girebilir.
 */
export class AppointmentRateLimitedError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super(copy.tooManyAttempts);
  }
}

/**
 * İstek gövdesi şemaya uymuyor.
 *
 * Kullanıcı arayüzü bu hatayı üretemez — `slotId`'yi kullanıcı elle yazmıyor,
 * listeden seçiyor. Yalnızca ucu doğrudan çağıran bir istemci görür, bu yüzden
 * mesaj "listeyi yenileyin" diyor: gerçek kullanıcıya ulaşırsa sebebi büyük
 * ihtimalle ekranın elindeki listenin eskimiş olmasıdır.
 *
 * Zod'un alan yolu ve beklenen tip bilgisi yanıta KONMUYOR: iç detay
 * sızdırmama kuralı şema hatalarını da kapsar (03-api-guidelines.md).
 */
export class InvalidAppointmentRequestError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly status = 422;

  constructor() {
    super(copy.slotNotFound);
  }
}
