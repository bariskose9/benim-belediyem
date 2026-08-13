import { z } from "zod";

/**
 * Randevu uçlarının ve ekranlarının girdi şemaları
 * (03-api-guidelines.md: "her endpoint girişi — body, query, params — Zod ile").
 *
 * İSTEMCİDEN YALNIZCA `slotId` ALINIYOR. `userId`, randevunun saati, doktoru
 * ve branşı sunucuda okunuyor; istemcinin gönderdiği böyle bir alan olsaydı
 * bile yok sayılırdı (data-model.md → "İstemciden gelen price, userId, role,
 * isStaff alanları reddedilir"). Zod'un varsayılan davranışı da bunu
 * destekliyor: şemada tanımlı olmayan alanlar sonuca hiç geçmiyor.
 */

/**
 * Kayıt kimliği.
 *
 * `z.cuid()` KULLANILMIYOR ve bunun somut bir sebebi var: tohumlanmış satırlar
 * okunabilir kimlikler taşıyor (`seed-slot-12-20260804-0900`), çünkü seed
 * idempotent olmak zorunda ve rastgele kimlikle her çalıştırmada yeni satır
 * açardı. Katı bir cuid kontrolü tohumlanmış saatlerin tamamını reddederdi.
 *
 * Üst sınır bir hizmet dışı bırakma önlemi: uzunluk sınırsız olsaydı megabaytlık
 * bir "kimlik" veritabanı sorgusuna kadar taşınırdı.
 */
const recordId = z.string().trim().min(1).max(128);

/** `POST /api/v1/appointments` gövdesi. */
export const createAppointmentSchema = z.object({
  slotId: recordId,
});

export type CreateAppointmentPayload = z.infer<typeof createAppointmentSchema>;

/** `DELETE /api/v1/appointments/{id}` yol parametresi. */
export const appointmentIdSchema = z.object({
  id: recordId,
});

/**
 * `/hastane` sayfasının adres çubuğu parametreleri.
 *
 * Adres çubuğu da bir GİRDİ NOKTASIDIR ve doğrulanır: parametreler
 * doğrudan veritabanı sorgusuna gidiyor. Prisma sorguları parametreli olduğu
 * için SQL enjeksiyonu riski yok, ama sınırsız uzunlukta bir değeri sorguya
 * taşımanın da anlamı yok.
 *
 * Parametre adları TÜRKÇE çünkü kullanıcıya görünen adresin parçası; alan
 * adları İngilizce çünkü kod (CLAUDE.md §0 dil kuralı).
 */
export const hospitalSearchParamsSchema = z.object({
  specialtyId: recordId.optional().catch(undefined),
  doctorId: recordId.optional().catch(undefined),
  /** Gün şeridinde seçili gün, `YYYY-MM-DD` (İstanbul takvimi). */
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
});

export type HospitalSearchParams = z.infer<typeof hospitalSearchParamsSchema>;

/**
 * Ham `searchParams` nesnesini güvenli bir seçime çevirir.
 *
 * BOZUK PARAMETRE HATA DEĞİL, YOK SAYILIR (`.catch(undefined)`): kullanıcı
 * adres çubuğunu elle kurcaladığında ekrana hata basmak yerine akışın
 * başına dönmek doğru davranış. Bir sayfayı 500'e düşürmek, kurcalayan
 * kişiye bilgi vermekten başka işe yaramaz.
 */
export function parseHospitalSearchParams(
  raw: Record<string, string | string[] | undefined>,
): HospitalSearchParams {
  return hospitalSearchParamsSchema.parse({
    specialtyId: firstValue(raw.brans),
    doctorId: firstValue(raw.doktor),
    day: firstValue(raw.gun),
  });
}

/** `?brans=a&brans=b` gibi tekrarlı parametrede ilk değeri alır. */
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
