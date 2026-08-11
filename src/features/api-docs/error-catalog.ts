/**
 * API hata kodları kataloğu (adım 18b · ADR-019).
 *
 * ⭐ NEDEN BU DOSYA VAR: Hata kodları çalışma anında koddan okunamıyor —
 * her kod bir sınıfın `readonly code` alanında, sınıfı örneklemeden görünmüyor
 * ve bazı sınıfların yapıcısı zorunlu argüman istiyor. Bu yüzden durum kodu
 * eşlemesi burada duruyor.
 *
 * ⛔ SAPMA TESTLE KİLİTLİ: `tests/unit/api-docs-catalog.test.ts` kaynak
 * ağacındaki tüm `errors.ts` dosyalarını tarayıp `code`/`status` çiftlerini
 * çıkarıyor ve bu tabloyla karşılaştırıyor. Yeni bir hata sınıfı eklenip
 * buraya yazılmazsa CI kırmızıya döner. Elle tutulan ve kapısı olmayan bir
 * tablo, birkaç ay içinde yanlış tabloya dönüşür.
 *
 * `description` alanı belgeleme metnidir; kullanıcıya gösterilen Türkçe hata
 * mesajı DEĞİLDİR (o `messages.ts` içinde). İkisini karıştırmamak önemli:
 * buradaki metin API'yi kullanan geliştiriciye "bu kod ne demek" diye anlatır.
 */

export type ErrorCatalogEntry = {
  /**
   * Bu kodun dönebileceği HTTP durum kodları.
   *
   * ⚠️ Dizi olmasının sebebi bir tasarım tercihi DEĞİL, ölçülmüş bir
   * tutarsızlık: üç kod bugün iki farklı durumla dönüyor (teknik borç #105).
   * Tek elemanlı olması beklenen normaldir.
   */
  statuses: number[];
  description: string;
};

export const errorCatalog: Record<string, ErrorCatalogEntry> = {
  ACCOUNT_ALREADY_DELETED: { statuses: [409], description: "Hesap zaten silinmiş." },
  ACCOUNT_PASSWORD_MISMATCH: { statuses: [403], description: "Girilen şifre doğrulanamadı." },
  ACCOUNT_PASSWORD_REQUIRED: {
    statuses: [422],
    description: "İşlem şifre onayı istiyor ama şifre gönderilmedi.",
  },
  ACTIVE_SPECIALTY_APPOINTMENT: {
    statuses: [409],
    description: "Aynı branşta zaten aktif bir randevu var.",
  },
  ADDRESS_LIMIT_REACHED: { statuses: [409], description: "Kayıtlı adres sayısı üst sınırda." },
  ADDRESS_NOT_FOUND: {
    statuses: [404],
    description: "Adres bulunamadı veya bu kullanıcıya ait değil.",
  },
  AGE_RESTRICTED: { statuses: [403], description: "Yaş sınırı nedeniyle işleme izin verilmiyor." },
  ALREADY_MEMBER: { statuses: [409], description: "Kullanıcının zaten aktif bir üyeliği var." },
  ALREADY_PROCESSED: { statuses: [409], description: "Bu istek daha önce işlenmiş (idempotency)." },
  APPOINTMENT_ALREADY_CANCELLED: { statuses: [409], description: "Randevu zaten iptal edilmiş." },
  APPOINTMENT_NOT_FOUND: { statuses: [404], description: "Randevu bulunamadı." },
  ATTACHMENT_NOT_FOUND: { statuses: [404], description: "Ek dosya bulunamadı." },
  ATTACHMENT_REJECTED: {
    statuses: [422],
    description: "Ek dosya tip, boyut veya bayt imzası doğrulamasını geçemedi.",
  },
  BOT_CHECK_FAILED: { statuses: [400, 403], description: "Bot doğrulaması geçilemedi." },
  BOT_CHECK_REQUIRED: { statuses: [403], description: "Bot doğrulama jetonu gönderilmedi." },
  BOT_CHECK_UNAVAILABLE: { statuses: [503], description: "Bot doğrulama servisine ulaşılamadı." },
  CANCELLATION_TOO_LATE: { statuses: [409], description: "İptal için tanınan süre geçmiş." },
  CART_CHANGED: { statuses: [409], description: "Sepet ödeme başlatıldıktan sonra değişmiş." },
  CART_EMPTY: { statuses: [409], description: "Sepet boş." },
  CART_ITEM_NOT_FOUND: { statuses: [404], description: "Sepet kalemi bulunamadı." },
  CART_TOO_LARGE: { statuses: [409], description: "Sepetteki kalem sayısı üst sınırı aşıyor." },
  CONFLICT: {
    statuses: [409],
    description: "Genel çakışma — kaynağın durumu isteği kabul etmiyor.",
  },
  CONSENT_RATE_LIMITED: { statuses: [429], description: "Rıza kaydı için hız sınırı aşıldı." },
  DELIVERY_ADDRESS_REQUIRED: { statuses: [422], description: "Teslimat adresi seçilmemiş." },
  DELIVERY_SLOT_REQUIRED: { statuses: [422], description: "Teslimat zaman aralığı seçilmemiş." },
  DUPLICATE_PAYMENT: { statuses: [409], description: "Aynı ödeme ikinci kez gönderildi." },
  EARLY_EXIT_FEE_CHANGED: {
    statuses: [409],
    description: "Erken çıkış bedeli ekranda görülenden farklı — onay yenilenmeli.",
  },
  EMAIL_ALREADY_REGISTERED: { statuses: [409], description: "Bu e-posta zaten kayıtlı." },
  EVENT_NOT_FOUND: { statuses: [404], description: "Etkinlik bulunamadı." },
  EVENT_STARTED: { statuses: [409], description: "Etkinlik başlamış, işlem yapılamaz." },
  FORBIDDEN: { statuses: [403], description: "Giriş yapılmış ama bu işleme yetki yok." },
  GOOGLE_ALREADY_LINKED: { statuses: [409], description: "Hesaba zaten bir Google hesabı bağlı." },
  GOOGLE_LINK_UNAVAILABLE: {
    statuses: [503],
    description: "Google bağlama şu an yapılandırılmamış.",
  },
  GOOGLE_LINKED_TO_OTHER_ACCOUNT: {
    statuses: [409],
    description: "Bu Google hesabı başka bir kullanıcıya bağlı.",
  },
  GOOGLE_NOT_LINKED: { statuses: [409], description: "Hesaba bağlı bir Google hesabı yok." },
  IDENTITY_ALREADY_REGISTERED: {
    statuses: [409],
    description: "Bu kimlik numarası başka bir hesaba bağlı.",
  },
  IDENTITY_ALREADY_VERIFIED: { statuses: [409], description: "Kimlik zaten doğrulanmış." },
  IDENTITY_CHECK_FAILED: {
    statuses: [400],
    description: "Kimlik bilgileri doğrulanamadı — hangi alanın tutmadığı BİLEREK söylenmez.",
  },
  IDENTITY_NOT_LINKED: { statuses: [409], description: "Hesaba bağlı bir kimlik kaydı yok." },
  IDENTITY_SERVICE_UNAVAILABLE: {
    statuses: [503],
    description: "Kimlik sorgulama servisi yanıt vermiyor.",
  },
  IDENTITY_UNLINK_WOULD_LOCK_ACCOUNT: {
    statuses: [409],
    description: "Kimlik bağı çözülürse hesaba giriş yolu kalmıyor.",
  },
  INSUFFICIENT_FUNDS: {
    statuses: [402, 409],
    description: "Sahte ödeme sağlayıcısı bakiye yetersiz döndü.",
  },
  INTERNAL_ERROR: {
    statuses: [500],
    description: "Beklenmeyen sunucu hatası — detay istemciye verilmez.",
  },
  INVALID_CARD_EXPIRY: { statuses: [422], description: "Kart son kullanma tarihi geçersiz." },
  INVALID_CARD_NUMBER: {
    statuses: [422],
    description: "Kart numarası biçim doğrulamasını geçemedi.",
  },
  INVALID_CONSENT_REQUEST: { statuses: [400], description: "Rıza isteği bozuk veya eksik." },
  INVALID_CREDENTIALS: {
    statuses: [401],
    description: "E-posta veya şifre hatalı — hangisi olduğu BİLEREK söylenmez.",
  },
  ITEM_UNAVAILABLE: { statuses: [409], description: "Ürün satışta değil." },
  LAST_LOGIN_METHOD: { statuses: [409], description: "Son giriş yöntemi kaldırılamaz." },
  LEAKED_PASSWORD: { statuses: [422], description: "Şifre bilinen sızıntı listesinde." },
  LINK_PASSWORD_CHECK_FAILED: {
    statuses: [422],
    description: "Bağlama için istenen şifre doğrulanamadı.",
  },
  MEMBERSHIP_CARD_REQUIRED: { statuses: [422], description: "Üyelik için bir kart seçilmemiş." },
  MEMBERSHIP_NOT_FOUND: { statuses: [404], description: "Üyelik bulunamadı." },
  MEMBERSHIP_PLAN_NOT_FOUND: { statuses: [404], description: "Üyelik planı bulunamadı." },
  NO_ACTIVE_MEMBERSHIP: { statuses: [409], description: "Aktif üyelik yok." },
  NOT_FOUND: { statuses: [404], description: "Kaynak bulunamadı." },
  ORDER_ALREADY_CANCELLED: { statuses: [409], description: "Sipariş zaten iptal edilmiş." },
  ORDER_NOT_CANCELLABLE: {
    statuses: [409],
    description:
      "Sipariş iptal edilebilir aşamayı geçmiş (durum okuma anında türetilir — ADR-013).",
  },
  ORDER_NOT_FOUND: { statuses: [404], description: "Sipariş bulunamadı." },
  OTP_CHANNEL_UNAVAILABLE: {
    statuses: [503],
    description: "Doğrulama kodu kanalı (e-posta/SMS) çalışmıyor.",
  },
  OTP_EXPIRED: { statuses: [422], description: "Doğrulama kodunun süresi dolmuş." },
  OTP_INVALID: { statuses: [422], description: "Doğrulama kodu hatalı." },
  OTP_SEND_RATE_LIMITED: { statuses: [429], description: "Aynı hedefe çok fazla kod istendi." },
  OTP_TOO_MANY_ATTEMPTS: { statuses: [429], description: "Kod deneme hakkı tükendi." },
  OUT_OF_STOCK: { statuses: [409], description: "Stok yetersiz — kalan adet yanıtta bildirilir." },
  PASSWORD_RESET_CLOSED: { statuses: [503], description: "Şifre sıfırlama şu an kapalı." },
  PASSWORD_RESET_EXPIRED: {
    statuses: [404],
    description: "Şifre sıfırlama oturumu bulunamadı veya süresi doldu.",
  },
  PASSWORD_RESET_SEND_RATE_LIMITED: {
    statuses: [429],
    description: "Şifre sıfırlama kodu için hız sınırı aşıldı.",
  },
  PAYMENT_DECLINED: {
    statuses: [402, 409],
    description: "Sahte ödeme sağlayıcısı işlemi reddetti.",
  },
  PAYMENT_PROVIDER_UNAVAILABLE: {
    statuses: [503],
    description: "Ödeme sağlayıcısına ulaşılamadı.",
  },
  QUANTITY_TOO_HIGH: {
    statuses: [422],
    description: "İstenen adet kalem başına üst sınırı aşıyor.",
  },
  RATE_LIMITED: { statuses: [429], description: "Hız sınırı aşıldı." },
  REGISTRATION_CLOSED: { statuses: [503], description: "Kayıt akışı şu an kapalı." },
  REGISTRATION_EXPIRED: {
    statuses: [404],
    description: "Kayıt taslağı bulunamadı veya süresi doldu.",
  },
  SAME_PLAN: { statuses: [409], description: "Zaten bu plandasınız." },
  SAVED_CARD_NOT_FOUND: { statuses: [404], description: "Kayıtlı kart bulunamadı." },
  SEAT_HOLD_NOT_FOUND: {
    statuses: [404],
    description: "Koltuk rezervasyonu bulunamadı veya süresi doldu.",
  },
  SEAT_NOT_FOUND: { statuses: [404], description: "Koltuk bulunamadı." },
  SEAT_TAKEN: { statuses: [409], description: "Koltuk başkası tarafından tutulmuş." },
  SERVICE_UNAVAILABLE: { statuses: [503], description: "Bağımlı bir servis şu an çalışmıyor." },
  SLOT_IN_PAST: { statuses: [409], description: "Seçilen saat geçmişte." },
  SLOT_NOT_FOUND: { statuses: [404], description: "Randevu saati bulunamadı." },
  SLOT_TAKEN: { statuses: [409], description: "Randevu saati dolmuş." },
  STAFF_ALREADY_VERIFIED: {
    statuses: [409],
    description: "Kurum personeli doğrulaması zaten yapılmış.",
  },
  STAFF_IDENTITY_REQUIRED: {
    statuses: [403],
    description:
      "Personel doğrulaması için önce kimlik doğrulaması gerekiyor (ön koşul, yeterli koşul değil).",
  },
  STAFF_VERIFICATION_CODE_INVALID: {
    statuses: [400],
    description: "Personel doğrulama kodu hatalı.",
  },
  STAFF_VERIFICATION_TOO_MANY_ATTEMPTS: {
    statuses: [429],
    description: "Personel doğrulama deneme hakkı tükendi.",
  },
  SUPPORT_TICKET_ALREADY_CLOSED: {
    statuses: [409],
    description: "Destek talebi zaten kapatılmış.",
  },
  SUPPORT_TICKET_NOT_FOUND: { statuses: [404], description: "Destek talebi bulunamadı." },
  TERMS_NOT_ACCEPTED: { statuses: [422], description: "Kullanım şartları onaylanmamış." },
  TICKET_NOT_CANCELLABLE: {
    statuses: [409],
    description: "Destek talebi iptal edilebilir aşamada değil.",
  },
  TOO_MANY_SEAT_HOLDS: {
    statuses: [409],
    description: "Aynı anda tutulabilecek koltuk sayısı aşıldı.",
  },
  UNAUTHORIZED: { statuses: [401], description: "Giriş yapılmamış." },
  VALIDATION_ERROR: {
    statuses: [422],
    description: "Girdi doğrulaması başarısız — Zod'un alan yolu BİLEREK istemciye verilmez.",
  },
  WEAK_PASSWORD: { statuses: [422], description: "Şifre asgari güç kuralını karşılamıyor." },
};
