/**
 * Katalog verisi: market, restoran, etkinlik, spor salonu, hastane.
 *
 * Fiyat bantları ve adetler fake-data-guide.md "Fiyat bantları" bölümünden gelir;
 * tek kaynak orasıdır, buradaki sayılar oraya uyar.
 *
 * KURAL: Gerçek marka kullanılmaz — ürünler jenerik adlandırılır
 * ("Tam Buğday Ekmeği 500 g"). Mekân, etkinlik ve sanatçı adları uydurmadır.
 */

export interface PriceBand {
  readonly minLira: number;
  readonly maxLira: number;
}

export interface CatalogCategory {
  readonly name: string;
  readonly band: PriceBand;
  readonly items: readonly string[];
}

/** Market: 6 kategori (fake-data-guide.md fiyat bantları). */
export const MARKET_CATEGORIES: readonly CatalogCategory[] = [
  {
    name: "Ekmek ve Unlu Mamul",
    band: { minLira: 15, maxLira: 60 },
    items: [
      "Tam Buğday Ekmeği 500 g",
      "Beyaz Ekmek 300 g",
      "Kepekli Ekmek 400 g",
      "Simit 4'lü Paket",
      "Poğaça 6'lı Paket",
      "Lavaş 3'lü Paket",
      "Yufka 500 g",
    ],
  },
  {
    name: "Süt Ürünleri",
    band: { minLira: 55, maxLira: 350 },
    items: [
      "Tam Yağlı Süt 1 L",
      "Yarım Yağlı Süt 1 L",
      "Beyaz Peynir 500 g",
      "Kaşar Peyniri 400 g",
      "Süzme Yoğurt 750 g",
      "Ayran 1 L",
      "Tereyağı 250 g",
      "Krem Peynir 200 g",
    ],
  },
  {
    name: "Temel Gıda",
    band: { minLira: 60, maxLira: 240 },
    items: [
      "Pirinç 1 kg",
      "Bulgur 1 kg",
      "Makarna 500 g",
      "Ayçiçek Yağı 1 L",
      "Zeytinyağı 1 L",
      "Toz Şeker 1 kg",
      "Buğday Unu 1 kg",
      "Kırmızı Mercimek 1 kg",
      "Domates Salçası 700 g",
    ],
  },
  {
    name: "Meyve ve Sebze",
    band: { minLira: 35, maxLira: 160 },
    items: [
      "Domates (kg)",
      "Salatalık (kg)",
      "Patates (kg)",
      "Kuru Soğan (kg)",
      "Elma (kg)",
      "Muz (kg)",
      "Portakal (kg)",
      "Havuç (kg)",
    ],
  },
  {
    name: "İçecek",
    band: { minLira: 25, maxLira: 110 },
    items: [
      "Maden Suyu 6'lı",
      "Portakal Suyu 1 L",
      "Sade Soda 1 L",
      "Siyah Çay 500 g",
      "Türk Kahvesi 250 g",
      "Şalgam Suyu 1 L",
    ],
  },
  {
    name: "Temizlik ve Kağıt",
    band: { minLira: 90, maxLira: 400 },
    items: [
      "Çamaşır Deterjanı 3 L",
      "Bulaşık Deterjanı 1,5 L",
      "Yüzey Temizleyici 750 ml",
      "Tuvalet Kağıdı 16'lı",
      "Kağıt Havlu 8'li",
      "Çamaşır Suyu 1 L",
      "Sıvı El Sabunu 1 L",
    ],
  },
];

/** Restoran: 5 kategori. */
export const MENU_CATEGORIES: readonly CatalogCategory[] = [
  {
    name: "Ana Yemek",
    band: { minLira: 180, maxLira: 340 },
    items: [
      "Izgara Köfte",
      "Tavuk Şiş",
      "Kuzu Pirzola",
      "Karışık Izgara",
      "Etli Kuru Fasulye",
      "Fırında Tavuk But",
      "Sebzeli Güveç",
      "Izgara Levrek",
    ],
  },
  {
    name: "Ara Sıcak",
    band: { minLira: 90, maxLira: 170 },
    items: [
      "Sigara Böreği",
      "Elde Kesme Patates",
      "Kalamar Tava",
      "Mücver",
      "Paçanga Böreği",
      "Soğan Halkası",
    ],
  },
  {
    name: "Yan Ürün ve Salata",
    band: { minLira: 55, maxLira: 120 },
    items: [
      "Mevsim Salata",
      "Çoban Salata",
      "Gavurdağı Salata",
      "Cacık",
      "Tereyağlı Pirinç Pilavı",
      "Bulgur Pilavı",
    ],
  },
  {
    name: "İçecek",
    band: { minLira: 35, maxLira: 90 },
    items: ["Ayran", "Şalgam", "Ev Yapımı Limonata", "Maden Suyu", "Demleme Çay", "Türk Kahvesi"],
  },
  {
    name: "Tatlı",
    band: { minLira: 85, maxLira: 160 },
    items: ["Künefe", "Fırın Sütlaç", "Fıstıklı Baklava", "Kazandibi", "Profiterol"],
  },
];

/** Hastane: 8 branş (fake-data-guide.md "Hastane randevu"). */
export const SPECIALTIES = [
  "Dahiliye",
  "Kardiyoloji",
  "Göz Hastalıkları",
  "Kulak Burun Boğaz",
  "Ortopedi ve Travmatoloji",
  "Cildiye",
  "Nöroloji",
  "Kadın Hastalıkları ve Doğum",
] as const;

/** Etkinlik mekânları — adlar uydurmadır, gerçek bir salona karşılık gelmez. */
export interface VenueDefinition {
  readonly name: string;
  readonly address: string;
  readonly blocks: readonly string[];
  readonly rowCount: number;
  readonly seatsPerRow: number;
}

export const VENUES: readonly VenueDefinition[] = [
  {
    name: "Ege Kültür Merkezi",
    address: "Yeşilyaka Mahallesi, Papatya Sokak No: 14, Konak",
    blocks: ["A", "B"],
    rowCount: 12,
    seatsPerRow: 8,
  },
  {
    name: "Körfez Sahnesi",
    address: "Akçadere Mahallesi, Ihlamur Sokak No: 3, Karşıyaka",
    blocks: ["A", "B"],
    rowCount: 12,
    seatsPerRow: 8,
  },
  {
    name: "Çamlıtepe Gösteri Salonu",
    address: "Çamlıtepe Mahallesi, Manolya Sokak No: 27, Bornova",
    blocks: ["A", "B"],
    rowCount: 12,
    seatsPerRow: 8,
  },
];

export interface EventDefinition {
  readonly name: string;
  readonly category: "concert" | "theatre" | "kids";
  readonly performer: string;
  readonly band: PriceBand;
}

/** 12 etkinlik — sanatçı ve topluluk adlarının hepsi uydurmadır. */
export const EVENTS: readonly EventDefinition[] = [
  {
    name: "Körfez Akşamı",
    category: "concert",
    performer: "Mavi Rüzgâr Orkestrası",
    band: { minLira: 450, maxLira: 2200 },
  },
  {
    name: "Şehir Işıkları Konseri",
    category: "concert",
    performer: "Deniz Feneri Topluluğu",
    band: { minLira: 450, maxLira: 2200 },
  },
  {
    name: "Anadolu Ezgileri",
    category: "concert",
    performer: "Yedi Tepe Sazendeleri",
    band: { minLira: 450, maxLira: 2200 },
  },
  {
    name: "Caz Geceleri",
    category: "concert",
    performer: "Kuzey Rüzgârı Beşlisi",
    band: { minLira: 450, maxLira: 2200 },
  },
  {
    name: "Bir Yaz Gecesi Rüyası",
    category: "theatre",
    performer: "Kent Oyuncuları Topluluğu",
    band: { minLira: 220, maxLira: 650 },
  },
  {
    name: "Ayrılık Vakti",
    category: "theatre",
    performer: "Sahne Bir Tiyatrosu",
    band: { minLira: 220, maxLira: 650 },
  },
  {
    name: "Komşu Kapısı",
    category: "theatre",
    performer: "Perde Arkası Topluluğu",
    band: { minLira: 220, maxLira: 650 },
  },
  {
    name: "Son Tramvay",
    category: "theatre",
    performer: "Yeni Sahne Kumpanyası",
    band: { minLira: 220, maxLira: 650 },
  },
  {
    name: "Uçan Balık Masalı",
    category: "kids",
    performer: "Küçük Adımlar Kukla Ekibi",
    band: { minLira: 150, maxLira: 350 },
  },
  {
    name: "Ormanın Bekçileri",
    category: "kids",
    performer: "Renkli Kutu Çocuk Tiyatrosu",
    band: { minLira: 150, maxLira: 350 },
  },
  {
    name: "Yıldız Tozu",
    category: "kids",
    performer: "Gökkuşağı Gösteri Ekibi",
    band: { minLira: 150, maxLira: 350 },
  },
  {
    name: "Kayıp Papağan",
    category: "kids",
    performer: "Neşeli Sandık Topluluğu",
    band: { minLira: 150, maxLira: 350 },
  },
];

/**
 * Spor salonu paketleri — fiyatlar fake-data-guide.md'den BİREBİR alınır.
 * İndirim yüzdesi saklanmaz: taahhütsüz fiyattan hesaplanıp yalnızca ekranda
 * gösterilir (data-model.md → MembershipPlan).
 */
export const MEMBERSHIP_PLANS = [
  { name: "Aylık (Taahhütsüz)", commitmentMonths: 0, monthlyPrice: "949.90" },
  { name: "3 Aylık", commitmentMonths: 3, monthlyPrice: "854.90" },
  { name: "6 Aylık", commitmentMonths: 6, monthlyPrice: "807.40" },
  { name: "Yıllık", commitmentMonths: 12, monthlyPrice: "712.40" },
] as const;

/**
 * Test kartları (fake-data-guide.md). Bunlar sektörde bilinen test numaralarıdır,
 * gerçek bir karta ait değildir. VERİTABANINA YALNIZCA SON 4 HANE YAZILIR —
 * tam numara hiçbir yerde saklanmaz (05-auth-security.md).
 */
export const TEST_CARDS = [
  { label: "Başarılı (Visa)", brand: "visa", last4: "1111", expMonth: 12, expYear: 2030 },
  {
    label: "Başarılı (Mastercard)",
    brand: "mastercard",
    last4: "4444",
    expMonth: 12,
    expYear: 2030,
  },
  { label: "Reddedildi", brand: "visa", last4: "0002", expMonth: 12, expYear: 2030 },
  { label: "Yetersiz bakiye", brand: "visa", last4: "9995", expMonth: 12, expYear: 2030 },
] as const;
