/**
 * Kimlik doğrulama alan tipleri (ADR-003).
 *
 * Uygulamanın geri kalanı SADECE bu tipleri tanır; sahte KPS'in HTTP
 * sözleşmesini (`src/app/api/mock-kps/contract.ts`) hiçbir yerde görmez.
 * Gerçek KPS geldiğinde bu dosya değişmez, yalnızca arayüzü uygulayan sınıf
 * değişir — ADR-003'ün vaadi tam olarak budur.
 */

/**
 * KPS'ten dönen kimlik bilgisi.
 *
 * DİKKAT: bu nesnenin tamamı kalıcı olarak SAKLANMAZ. PRD §5.0 yalnızca ad,
 * soyad, doğum tarihi, şifreli kimlik numarası ve nüfus il/ilçesinin
 * tutulmasına izin veriyor; baba/anne adı, doğum yeri, medeni hal ve nüfus
 * adresi sadece kayıt ekranında gösterilip atılır (veri minimizasyonu).
 */
export type IdentityRecord = {
  firstName: string;
  lastName: string;
  /** ISO tarih (YYYY-MM-DD). Yaş kontrolü adım 4b'de bunun üzerinden yapılacak. */
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
 * Sağlayıcının (dış servisin) verebileceği sonuçlar.
 *
 * `rate_limited` burada YOK: hız sınırı bizim kuralımız, dış servisin değil.
 * Servis katmanı onu sağlayıcıya hiç gitmeden kendisi döndürür.
 */
export type ProviderLookupResult =
  | { outcome: "success"; identity: IdentityRecord }
  | { outcome: "mismatch" }
  | { outcome: "not_found" }
  /** Zaman aşımı, sunucu hatası veya devre kesici — çağrı sonuçlanamadı. */
  | { outcome: "unavailable" };

export type IdentityLookupInput = {
  nationalId: string;
  /** İkinci doğrulama alanı — zorunlu (05-auth-security.md). */
  birthYear: number;
};

/**
 * Kimlik sağlayıcı arayüzü. Bugün `MockKpsProvider`, yarın gerçek KPS.
 *
 * Arayüz hız sınırı, denetim kaydı veya sabit yanıt süresi BİLMEZ: onlar
 * uygulamanın kuralları, sağlayıcının değil. Sağlayıcıya taşınsalardı gerçek
 * KPS'e geçişte hepsi yeniden yazılmak zorunda kalırdı.
 */
export type IdentityProvider = {
  readonly name: string;
  lookup(input: IdentityLookupInput): Promise<ProviderLookupResult>;
};
