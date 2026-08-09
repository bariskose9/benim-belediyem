import type { OrgUnitType, StaffTitle } from "@/generated/prisma/enums";

/**
 * Hakkımızda modülünün tipleri (PRD §5.9).
 *
 * REHBERDE KİŞİSEL VERİ YOK: `StaffMember` tablosunda `nationalIdHash` alanı
 * var ama bu tiplerin hiçbirinde yer almıyor. Alan, personel eşleştirmesi için
 * (KPS doğrulaması → personel mi) tutuluyor; rehber ekranının onunla işi yok.
 * Tipin dışında bırakmak, yanlışlıkla ekrana taşınmasını derleme zamanında
 * imkânsız kılıyor (data-model.md · fake-data-guide.md "Gösterilmeyecekler").
 */

/** Şemadan okunan ham birim satırı — ağaç kurulmadan önceki hâli. */
export interface OrgUnitRow {
  readonly id: string;
  readonly name: string;
  readonly unitType: OrgUnitType;
  readonly parentId: string | null;
  /** YALNIZCA bu birime doğrudan bağlı personel sayısı (alt birimler hariç). */
  readonly directStaffCount: number;
}

/** Ağaca dönüştürülmüş birim. */
export interface OrgUnitNode extends OrgUnitRow {
  /**
   * Bu birim VE tüm alt birimlerindeki personel sayısı.
   *
   * Ekranda gösterilen sayı budur: "Bilgi İşlem Dairesi Başkanlığı — 1
   * personel" demek teknik olarak doğru ama kullanıcı için yanıltıcı olurdu;
   * daireye bağlı 100 kişi var, biri doğrudan, 99'u alt birimlerinde.
   */
  readonly totalStaffCount: number;
  readonly children: readonly OrgUnitNode[];
}

/** Rehberde gösterilen tek personel satırı. */
export interface StaffDirectoryEntry {
  readonly id: string;
  readonly fullName: string;
  readonly title: StaffTitle;
  readonly workEmail: string;
  readonly extensionNumber: number;
  readonly unitId: string;
  readonly unitName: string;
}
