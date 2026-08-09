/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { DIRECTORY_SELECT } from "@/features/organization/repositories/staff.repository";

/**
 * ═══ PERSONEL REHBERİ HANGİ ALANLARI OKUYOR ═══
 *
 * Rehber (`/hakkimizda`) HERKESE AÇIK bir sayfa. `staff_members` tablosunda
 * personelin kimlik numarasının tuzlanmış özeti duruyor (`national_id_hash`);
 * o alan personel eşleştirmesi için var (KPS doğrulaması → personel mi) ve
 * rehber sorgusunun onunla hiçbir işi yok (05-auth-security.md · PRD §5.9).
 *
 * NEDEN BU TESTE İHTİYAÇ VAR: rehber kaydı repository içinde alan alan
 * kuruluyor, yani sorguya fazladan bir kolon eklense bile DÖNEN NESNE
 * değişmezdi — `tests/db/organization.test.ts` içindeki gizlilik testi yeşil
 * kalırdı. Bu test farkı kapatıyor: sorgunun okuduğu alan listesini doğrudan
 * sınıyor. ÖLÇÜLDÜ: `nationalIdHash: true` eklendiğinde bu test kırmızıya
 * dönüyor, veritabanı testi dönmüyor.
 */

describe("personel rehberi sorgusu", () => {
  it("kimlik özetini okumuyor", () => {
    expect(Object.keys(DIRECTORY_SELECT)).not.toContain("nationalIdHash");
  });

  /**
   * Kişisel veri alanı hiç eklenmemiş olmalı. `staff_members` bugün cep
   * telefonu, adres ve doğum tarihi TUTMUYOR (data-model.md); bir gün
   * eklenirse rehber sorgusuna sessizce sızmasın.
   */
  it("yalnızca kurumsal iletişim alanlarını okuyor", () => {
    expect(Object.keys(DIRECTORY_SELECT).sort()).toEqual(
      ["extensionNumber", "fullName", "id", "orgUnit", "title", "workEmail"].sort(),
    );
  });
});
