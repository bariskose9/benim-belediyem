/**
 * Teşkilat şeması (fake-data-guide.md "Teşkilat şeması ve personel").
 *
 * Daire adları gerçek belediye teşkilatlarına BENZER seçilmiştir ama içerikleri
 * tamamen sahtedir; hiçbir gerçek personel veya iletişim bilgisi yoktur.
 *
 * Yalnızca Bilgi İşlem Dairesi Başkanlığı doludur; diğer 8 daire şemada ismen
 * görünür ve altlarında birim/personel bulunmaz (PRD §5.9). Neden: ağaç bileşeni
 * gerçekçi genişlikte sınanır ama seed hacmi ve arama yükü artmaz.
 */

export const PRESIDENCY_NAME = "Büyükşehir Belediye Başkanlığı";
export const GENERAL_SECRETARIAT_NAME = "Genel Sekreterlik";
export const DEPUTY_SECRETARIAT_NAME = "Genel Sekreter Yardımcılığı";

/** Personelin bağlı olduğu tek dolu daire. */
export const IT_DIRECTORATE_NAME = "Bilgi İşlem Dairesi Başkanlığı";

/** Proje sahibi hesabının bağlandığı müdürlük (fake-data-guide.md). */
export const OWNER_BRANCH_NAME = "Yazılım Geliştirme Şube Müdürlüğü";

/** 9 daire başkanlığı — sıralama ekranda göründüğü sıradır. */
export const DIRECTORATES = [
  "Fen İşleri Dairesi Başkanlığı",
  "İtfaiye Dairesi Başkanlığı",
  "Park ve Bahçeler Dairesi Başkanlığı",
  "Ulaşım Dairesi Başkanlığı",
  "Çevre Koruma ve Kontrol Dairesi Başkanlığı",
  "İmar ve Şehircilik Dairesi Başkanlığı",
  "Sağlık İşleri Dairesi Başkanlığı",
  "Kültür ve Sosyal İşler Dairesi Başkanlığı",
  IT_DIRECTORATE_NAME,
] as const;

export interface BranchDefinition {
  readonly name: string;
  readonly sections: readonly string[];
}

/** Bilgi İşlem Dairesi Başkanlığı — 7 şube müdürlüğü, toplam 16 şeflik. */
export const IT_BRANCHES: readonly BranchDefinition[] = [
  {
    name: OWNER_BRANCH_NAME,
    sections: ["Web Uygulamaları Şefliği", "Mobil Uygulamalar Şefliği", "Entegrasyon Şefliği"],
  },
  {
    name: "Sistem ve Ağ Yönetimi Şube Müdürlüğü",
    sections: [
      "Sunucu ve Sanallaştırma Şefliği",
      "Ağ ve İletişim Şefliği",
      "Veri Tabanı Yönetimi Şefliği",
    ],
  },
  {
    name: "Bilgi Güvenliği Şube Müdürlüğü",
    sections: ["Siber Olaylara Müdahale Şefliği", "Güvenlik Denetimi Şefliği"],
  },
  {
    name: "Coğrafi Bilgi Sistemleri (CBS) Şube Müdürlüğü",
    sections: ["Harita Üretim Şefliği", "Mekânsal Analiz Şefliği"],
  },
  {
    name: "Veri Yönetimi ve Raporlama Şube Müdürlüğü",
    sections: ["Veri Ambarı Şefliği", "Raporlama Şefliği"],
  },
  {
    name: "Teknik Destek ve Kullanıcı Hizmetleri Şube Müdürlüğü",
    sections: ["Çağrı ve Destek Şefliği", "Donanım Bakım Şefliği"],
  },
  {
    name: "Proje Yönetimi ve İdari İşler Şube Müdürlüğü",
    sections: ["Satınalma Şefliği", "Proje Takip Şefliği"],
  },
];

/**
 * Kadro dağılımı — toplam 100 (fake-data-guide.md tablosuna birebir uyar).
 * `unvan` sırası aynı zamanda hiyerarşi sırasıdır.
 */
export const STAFF_QUOTA = [
  { title: "department_head", count: 1 },
  { title: "branch_manager", count: 7 },
  { title: "chief", count: 16 },
  { title: "engineer", count: 34 },
  { title: "specialist", count: 18 },
  { title: "technician", count: 12 },
  { title: "officer", count: 8 },
  { title: "contracted", count: 4 },
] as const;

export const TOTAL_STAFF = STAFF_QUOTA.reduce((sum, row) => sum + row.count, 0);
