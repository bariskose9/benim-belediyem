import type { PrismaClient } from "../../src/generated/prisma/client.js";

/** Tohumlama adımlarının ortak bağlamı. */
export interface SeedContext {
  readonly prisma: PrismaClient;
  /** Referans gün (UTC gece yarısı) — tüm göreli tarihler buradan hesaplanır. */
  readonly today: Date;
  /**
   * Tohumlamanın çalıştığı AN. `today` gün başıdır; "geçmişe randevu yazma"
   * gibi kurallar gün başına değil şu ana göre değerlendirilmelidir.
   */
  readonly now: Date;
  /** NATIONAL_ID_HASH_SALT — kimlik özeti üretmek için. */
  readonly hashSalt: string;
  /** NATIONAL_ID_ENCRYPTION_KEY (base64, 32 bayt) — kimlik numarasını şifrelemek için. */
  readonly encryptionKey: string;
  readonly log: (message: string) => void;
}

/** Sahte KPS havuzundaki bir kişi. Personel ve üye kayıtları bu havuzdan türer. */
export interface SeededCitizen {
  readonly index: number;
  readonly id: string;
  readonly nationalId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly birthDate: Date;
  readonly registeredProvince: string;
  readonly registeredDistrict: string;
}

/** Tohumlanan personel kaydının özeti — üye hesapları buna bağlanır. */
export interface SeededStaff {
  readonly id: string;
  readonly citizenIndex: number;
  readonly fullName: string;
  readonly title: string;
  readonly workEmail: string;
  readonly extensionNumber: number;
}

/** Tohumlanan üye hesabı. */
export interface SeededUser {
  readonly id: string;
  readonly citizenIndex: number;
  readonly fullName: string;
  readonly email: string;
  readonly isStaff: boolean;
  /** Giriş yapılabilen örnek hesap mı, yoksa yalnızca veriyi sahiplendiren arka plan kaydı mı? */
  readonly isDemoAccount: boolean;
}
