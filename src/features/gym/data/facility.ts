/**
 * Spor tesisinin sabit bilgisi: adres, çalışma saatleri ve haftalık ders
 * programı (PRD §5.6 "Tesis bilgisi, ders programı ve salon saatleri
 * görüntülenir").
 *
 * ═══ NEDEN VERİTABANINDA DEĞİL ═══
 *
 * `data-model.md` spor salonu için yalnızca üç tablo tanımlıyor
 * (`MembershipPlan`, `Membership`, `MembershipPayment`); tesis ve ders
 * programı için bir tablo YOK ve bu bilinçli: bu bilgiyi değiştirecek bir
 * yönetici paneli de yok (teknik borç #4). Salt okunur, tek satırlık,
 * hiç yazılmayan bir içeriği tabloya taşımak bugün hiçbir şey kazandırmaz
 * (YAGNI) — kazandığında ADR ile taşınır.
 *
 * ═══ NEDEN `messages.ts` DEĞİL ═══
 *
 * `messages.ts` ARAYÜZ metinlerini tutar (başlık, düğme, hata). Buradakiler
 * arayüz değil İÇERİK — ürün ve menü adlarının `prisma/seed/data/` altında
 * durmasıyla aynı ayrım. Ders adları yarın değişebilir, "Üye ol" düğmesinin
 * yazısı değişmez.
 *
 * ⚠️ TAMAMI SAHTE VERİDİR (`fake-data-guide.md`): uydurma adres, uydurma
 * ders programı. Gerçek bir belediye tesisine ait değildir.
 */

export type GymOpeningHour = {
  /** Türkçe gün adı — ekranda olduğu gibi görünür. */
  readonly days: string;
  /** `null` ise o gün kapalıdır. */
  readonly hours: string | null;
};

export type GymClass = {
  readonly id: string;
  readonly name: string;
  readonly time: string;
  readonly durationMinutes: number;
  readonly level: string;
};

export type GymClassDay = {
  readonly id: string;
  readonly day: string;
  readonly classes: readonly GymClass[];
};

/** Tesisin künyesi. Telefon ve kişi adı YAZILMAZ — gerçek sanılabilecek iletişim bilgisi üretmiyoruz. */
export const GYM_FACILITY = {
  name: "Belediye Personel Spor Tesisi",
  district: "Konak",
  address: "Kültürpark Mahallesi, Yeşilyaka Caddesi No: 14, Konak / İzmir",
  summary:
    "1.400 m² kapalı alan, 24 istasyonlu kondisyon salonu, serbest ağırlık bölümü, " +
    "iki grup ders stüdyosu ve yarı olimpik kapalı havuz.",
  amenities: [
    "Kondisyon salonu (24 istasyon)",
    "Serbest ağırlık bölümü",
    "Yarı olimpik kapalı havuz",
    "İki grup ders stüdyosu",
    "Soyunma odası, duş ve dolap",
    "Ücretsiz otopark",
  ],
} as const;

/**
 * Salon saatleri.
 *
 * Pazar kapalı: tesis bakım günü. Ekranda "kapalı" olarak yazılıyor —
 * satırı hiç göstermemek, kullanıcıya "acaba mı" dedirtirdi.
 */
export const GYM_OPENING_HOURS: readonly GymOpeningHour[] = [
  { days: "Pazartesi – Cuma", hours: "06:30 – 22:30" },
  { days: "Cumartesi", hours: "08:00 – 20:00" },
  { days: "Pazar", hours: null },
];

/**
 * Haftalık grup ders programı.
 *
 * Ders KAYDI YOKTUR ve bu adımın kapsamında değil: program yalnızca
 * görüntülenir (PRD §5.6). Kontenjan ve rezervasyon bir sonraki faz işi
 * olurdu ve kendi tablosunu gerektirirdi.
 */
export const GYM_CLASS_SCHEDULE: readonly GymClassDay[] = [
  {
    id: "pazartesi",
    day: "Pazartesi",
    classes: [
      {
        id: "pzt-1",
        name: "Sabah Pilatesi",
        time: "07:00",
        durationMinutes: 50,
        level: "Başlangıç",
      },
      {
        id: "pzt-2",
        name: "Fonksiyonel Antrenman",
        time: "18:30",
        durationMinutes: 45,
        level: "Orta",
      },
      {
        id: "pzt-3",
        name: "Yüzme Tekniği",
        time: "20:00",
        durationMinutes: 60,
        level: "Başlangıç",
      },
    ],
  },
  {
    id: "sali",
    day: "Salı",
    classes: [
      { id: "sal-1", name: "Yoga", time: "07:30", durationMinutes: 60, level: "Tüm seviyeler" },
      { id: "sal-2", name: "Kardiyo & HIIT", time: "19:00", durationMinutes: 40, level: "İleri" },
    ],
  },
  {
    id: "carsamba",
    day: "Çarşamba",
    classes: [
      {
        id: "car-1",
        name: "Sabah Pilatesi",
        time: "07:00",
        durationMinutes: 50,
        level: "Başlangıç",
      },
      {
        id: "car-2",
        name: "Sırt ve Duruş Sağlığı",
        time: "18:00",
        durationMinutes: 45,
        level: "Tüm seviyeler",
      },
      {
        id: "car-3",
        name: "Su Aerobiği",
        time: "19:30",
        durationMinutes: 45,
        level: "Tüm seviyeler",
      },
    ],
  },
  {
    id: "persembe",
    day: "Perşembe",
    classes: [
      { id: "per-1", name: "Yoga", time: "07:30", durationMinutes: 60, level: "Tüm seviyeler" },
      {
        id: "per-2",
        name: "Fonksiyonel Antrenman",
        time: "18:30",
        durationMinutes: 45,
        level: "Orta",
      },
    ],
  },
  {
    id: "cuma",
    day: "Cuma",
    classes: [
      {
        id: "cum-1",
        name: "Esneme ve Mobilite",
        time: "07:30",
        durationMinutes: 40,
        level: "Tüm seviyeler",
      },
      { id: "cum-2", name: "Kardiyo & HIIT", time: "19:00", durationMinutes: 40, level: "İleri" },
    ],
  },
  {
    id: "cumartesi",
    day: "Cumartesi",
    classes: [
      {
        id: "cmt-1",
        name: "Aile Yüzme Saati",
        time: "10:00",
        durationMinutes: 90,
        level: "Tüm seviyeler",
      },
      { id: "cmt-2", name: "Pilates", time: "12:00", durationMinutes: 50, level: "Orta" },
    ],
  },
];
