import type { IdentityRecord } from "@/features/identity/types";

/**
 * Kayıt akışının dışa açık tipleri.
 */

/**
 * Kayıt ekranında GÖSTERİLEN kimlik alanları.
 *
 * `IdentityRecord`'un tamamını taşır — baba adı, anne adı, doğum yeri, medeni
 * hâl ve nüfus adresi dahil. Bu alanlar EKRANDA GÖSTERİLİR ama veritabanına
 * YAZILMAZ (PRD §5.0 veri minimizasyonu); yazılmadıklarının kanıtı
 * `user.repository.ts` girdi tipinde yerlerinin olmamasıdır.
 */
export type RegistrationIdentityView = IdentityRecord & {
  /** `123******90` — tam numara istemciye hiç gitmez. */
  nationalIdMasked: string;
};

/** Kayıt akışının hangi adımında olunduğu. */
export type RegistrationStep = "contact" | "verify";

export type RegistrationState = {
  step: RegistrationStep;
  identity: RegistrationIdentityView;
  /** İletişim adımı tamamlandıysa maskeli hâlleri gösterilir. */
  emailMasked: string | null;
  phoneMasked: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  expiresAt: Date;
};

/** Taslakta şifreli duran iletişim bilgisi. */
export type RegistrationContact = {
  email: string;
  phone: string;
};
