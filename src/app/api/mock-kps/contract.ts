/**
 * Sahte KPS'in DIŞ SERVİS SÖZLEŞMESİ (ADR-003).
 *
 * Bu dosya bilerek `src/app/api/mock-kps/` altında duruyor ve uygulamanın kendi
 * tiplerinden ayrı: burada tanımlı hiçbir şey iş mantığı değildir, "karşı taraf
 * ne konuşuyor" bilgisidir. Uygulama bu biçimi doğrudan kullanmaz;
 * `MockKpsProvider` onu kendi alan tipine çevirir. Gerçek KPS geldiğinde bu
 * dosya silinir, sözleşme çevirisi yapan tek sınıf değişir.
 *
 * YANIT ZARFI BİLEREK FARKLI: uygulamanın kendi `{ error: { code, message } }`
 * biçimi kullanılmıyor. Dış servisin ayrı bir hata modeli olması bu adımın
 * öğretmek istediği şeyin ta kendisi — iki modeli birbirine çeviren bir katman
 * olmazsa "dış servis" taklidi yalnızca isimde kalır.
 */

/** Uç yalnızca POST kabul eder: kimlik numarası URL'e değil gövdeye yazılır. */
export type MockKpsRequestBody = {
  nationalId: string;
  /** İKİNCİ DOĞRULAMA ALANI — zorunlu. Tek başına numarayla sorgu yapılamaz. */
  birthYear: number;
};

export type MockKpsCitizenPayload = {
  firstName: string;
  lastName: string;
  /** ISO tarih (YYYY-MM-DD). Saat bilgisi taşımaz. */
  birthDate: string;
  birthPlace: string;
  fatherName: string;
  motherName: string;
  registeredProvince: string;
  registeredDistrict: string;
  gender: string;
  maritalStatus: string;
  registeredAddress: string;
};

/**
 * `not_found` ile `mismatch` burada AYRIDIR ve bu doğrudur: KPS gerçekten
 * ikisini bilir. Ayrımın kullanıcıya sızdırılmaması UYGULAMA katmanının işidir
 * (`identity-lookup.service.ts`) — dış servisi kısıtlayarak değil, kendi
 * sınırımızda tek tip mesaja indirgeyerek çözülür.
 */
export type MockKpsResponseBody =
  | { status: "verified"; citizen: MockKpsCitizenPayload }
  | { status: "mismatch" }
  | { status: "not_found" }
  | { status: "invalid_request" }
  | { status: "unauthorized" }
  | { status: "error" };
