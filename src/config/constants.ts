/**
 * Sihirli sayı ve sabit metinler koda gömülmez, buradan okunur
 * (docs/standards/02-coding-standards.md).
 */

/** Biçimlendirme yerel ayarı — para, tarih ve sıralama bunu kullanır. */
export const LOCALE = "tr-TR" as const;

/**
 * Ekranda gösterilen saat dilimi. Veritabanında her zaman UTC saklanır;
 * sunucunun kendi saat dilimine güvenilmez (docs/standards/02-coding-standards.md).
 */
export const DISPLAY_TIME_ZONE = "Europe/Istanbul" as const;

/** Para birimi — hesaplama kuruş cinsinden tam sayı ile yapılır, float ile asla. */
export const CURRENCY = "TRY" as const;

/**
 * Sürüm bilgisi — `/api/health` bunu döner.
 *
 * `package.json` içe aktarmak yerine sabit tutuluyor: JSON içe aktarımı tüm
 * bağımlılık listesini paketin içine gömer ve sürüm bilgisi için bu gereksiz.
 * Sürüm yükseltilirken `package.json` ile birlikte burası da güncellenir.
 */
export const APP_VERSION = "0.1.0" as const;

/**
 * Hangi commit'in yayında olduğu — duman testinde "yeni sürüm gerçekten çıktı mı"
 * sorusunu cevaplar. Vercel bu değişkeni her dağıtımda kendisi doldurur.
 */
export const BUILD_COMMIT: string = (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7);

/**
 * Sağlık ucunun veritabanı kontrolü için üst sınır.
 *
 * Kısa tutuluyor: cevap vermeyen bir veritabanında sağlık ucu askıda kalırsa
 * izleme aracı "yavaş" ile "çökmüş" arasındaki farkı göremez.
 */
export const HEALTH_DB_TIMEOUT_MS = 3_000;

// ===========================================================================
// SAHTE KPS — dış servis simülasyonu (PRD §5.0 "Mimari" · ADR-003)
//
// İki taraf var ve sayılar bilerek ayrı gruplanmış:
//   · MOCK_*      → sahte servisin KENDİ davranışı (gecikme, hata üretimi)
//   · KPS_*       → servisi ÇAĞIRAN tarafın dayanıklılık kuralları
// Bu ayrım korunmazsa yeniden deneme mock'un içine düşer ve anlamsızlaşır.
// ===========================================================================

/** Sahte servisin yapay gecikme aralığı (PRD §5.0: 200–800 ms). */
export const MOCK_KPS_MIN_DELAY_MS = 200;
export const MOCK_KPS_MAX_DELAY_MS = 800;

/**
 * `simulationBehavior = timeout` kayıtlarında mock'un beklediği süre.
 *
 * Çağıranın 3 sn'lik sınırından belirgin şekilde uzun: aradaki fark yeterince
 * açık olmazsa test bazen zaman aşımı, bazen başarı görür ve kararsızlaşır.
 */
export const MOCK_KPS_TIMEOUT_DELAY_MS = 6_000;

/** Gizli anahtarın taşındığı başlık (ADR-009). Değer log'a yazılmaz. */
export const MOCK_KPS_API_KEY_HEADER = "x-mock-kps-key";

/** Çağıranın zaman aşımı (PRD §5.0). Bu süreden uzun yanıt beklenmez. */
export const KPS_REQUEST_TIMEOUT_MS = 3_000;

/**
 * En fazla 2 yeniden deneme (CLAUDE.md §5.9), yani en kötü hâlde 3 çağrı.
 * Sadece zaman aşımı ve sunucu hatası tekrarlanır; iş sonuçları tekrarlanmaz.
 */
export const KPS_MAX_RETRIES = 2;

/** Üstel geri çekilme tabanı: 1. tekrar 250 ms, 2. tekrar 500 ms bekler. */
export const KPS_RETRY_BACKOFF_MS = 250;

/**
 * Devre kesici (ADR-010): pencere içinde bu kadar hata birikirse devre açılır
 * ve soğuma süresince sahte KPS hiç çağrılmaz.
 */
export const KPS_BREAKER_FAILURE_THRESHOLD = 5;
export const KPS_BREAKER_WINDOW_MS = 60_000;
export const KPS_BREAKER_COOLDOWN_MS = 30_000;

/** Hız sınırı: 5 deneme / 15 dakika, IP + oturum bazlı (ADR-006, PRD §5.0). */
export const KPS_RATE_LIMIT_MAX_ATTEMPTS = 5;
export const KPS_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

/**
 * Numara taraması koruması: kimlik sorgusunun çağırana dönüş süresi bu tabana
 * doldurulur. "Bulundu", "eşleşmedi" ve "bulunamadı" böylece AYNI sürer —
 * saldırgan zamanlamadan numaranın kayıtlı olup olmadığını çıkaramaz
 * (05-auth-security.md → "yanıt süresi sabitlenir").
 *
 * Mock'un en yavaş normal yanıtından (800 ms) belirgin şekilde büyük olmalı,
 * yoksa doldurma bazı çağrılarda hiç devreye girmez ve fark yeniden açılır.
 */
export const KPS_CONSTANT_RESPONSE_MS = 1_500;

// ===========================================================================
// KAYIT AKIŞI (PRD §5.0 "Kayıt akışı" · adım 4b-1)
// ===========================================================================

/**
 * Kayıt taslağının ömrü. PRD: "Tam KPS yanıtı en fazla 15 dakika önbellekte
 * tutulur (kayıt akışı yarıda kalırsa tekrar sorgu atılmasın diye)."
 *
 * Bu sınır KPS yükünün kendisi içindir; taslak satırı süresi dolduğunda okuma
 * anında silinir (ADR-007) ve kullanıcı akışa baştan başlar.
 */
export const REGISTRATION_DRAFT_TTL_MS = 15 * 60_000;

/**
 * Taslağı taşıyan çerezin adı. Çerez YALNIZCA rastgele bir jeton taşır;
 * kimlik numarası, e-posta ve KPS verisi çerezde bulunmaz — sunucudaki
 * satırda şifreli durur (ADR-012).
 */
export const REGISTRATION_COOKIE_NAME = "bb_registration" as const;

/** Jetonun bayt uzunluğu. 32 bayt = 256 bit; tahmin edilmesi pratikte imkânsız. */
export const REGISTRATION_TOKEN_BYTES = 32;

/**
 * Ziyaretçiyi tanımlayan rastgele kimlik. Hız sınırının "oturum" bacağını
 * besler (ADR-006) ve ileride ziyaretçi sepeti ile çerez rızası da bunu kullanır
 * (PRD §4 "Ziyaretçi sepeti", §5.10 "Çerez rızası").
 *
 * Kişisel veri DEĞİLDİR: içeriği rastgeledir, kimseye bağlanmaz.
 */
export const ANONYMOUS_ID_COOKIE_NAME = "bb_anon" as const;
export const ANONYMOUS_ID_BYTES = 32;
export const ANONYMOUS_ID_TTL_MS = 365 * 24 * 60 * 60_000;

/** 18 yaş sınırı (PRD §5.0 adım 4b). Sunucuda, KPS'ten gelen doğum tarihinden hesaplanır. */
export const MIN_REGISTRATION_AGE_YEARS = 18;

// ===========================================================================
// TEK KULLANIMLIK KOD — OTP (05-auth-security.md "Token ömürleri" · PRD §5.0)
//
// Bu değerler standartta SABİT olarak tanımlı; değiştirilecekse ADR yazılır.
// ===========================================================================

/** 6 hane. Baştaki sıfır korunur ("000123" geçerli bir koddur). */
export const OTP_CODE_LENGTH = 6;

/**
 * 5 dakika. PRD gerekçesi: kod e-posta ile taşınıyor ve e-posta 30-60 saniye
 * gecikebiliyor; 3 dakikalık pencerede kullanıcı süreyi doldurup "tekrar gönder"e
 * basıyor ve gönderim hız sınırına takılıyordu.
 */
export const OTP_TTL_MS = 5 * 60_000;

/** 3 deneme hakkı. Aşılırsa kod kilitlenir ve yeni kod istenmesi gerekir. */
export const OTP_MAX_ATTEMPTS = 3;

/** Gönderim hız sınırı: aynı hedefe 3 kod / 15 dakika (05-auth-security.md). */
export const OTP_SEND_RATE_LIMIT_MAX = 3;
export const OTP_SEND_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

/**
 * AYRI BİR "TEKRAR GÖNDER" BEKLEME SÜRESİ YOK ve bu bilinçli bir karar.
 *
 * Önce 60 saniyelik bir bekleme konmuştu, sonra kaldırıldı: hiçbir standartta
 * geçmiyor (05-auth-security.md yalnızca "aynı hedefe 3 kod / 15 dakika"
 * diyor) ve local/preview'da kodun ekranda görüldüğü akışta kullanıcıyı
 * boş yere bekletiyordu. Koruma zaten gönderim hız sınırında.
 *
 * Çift tıklama, düğmenin istek sürerken devre dışı kalmasıyla önleniyor.
 */

/** Dış e-posta servisine verilen süre. Aşılırsa kanal `unavailable` döner. */
export const EMAIL_SEND_TIMEOUT_MS = 5_000;

// ===========================================================================
// ŞİFRE (05-auth-security.md · ADR-011)
// ===========================================================================

/** Standartta sabit: en az 8 karakter. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Üst sınır neden var: argon2 girdi uzunluğunu kesmez, yani sınırsız uzun bir
 * şifre sınırsız CPU demektir (hizmet dışı bırakma yolu). 128 karakter hiçbir
 * gerçek kullanıcıyı kısıtlamaz.
 */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * argon2id parametreleri (ADR-011). OWASP "Password Storage Cheat Sheet"
 * asgarisinin (19 MiB / 2 tur) üzerinde, Vercel fonksiyon belleğine rahat sığar.
 * Donanım hızlanınca yükseltilecek tek yer burasıdır.
 */
export const ARGON2_MEMORY_COST_KIB = 65_536;
export const ARGON2_TIME_COST = 3;
export const ARGON2_PARALLELISM = 1;

// ===========================================================================
// OTURUM (ADR-002 çerez · ADR-005 oturum veritabanında · 05-auth-security.md)
//
// Oturum Auth.js ile DEĞİL, elle yazılmış bir veritabanı oturumuyla taşınıyor.
// Gerekçe ADR-005'in 2026-08-01 tarihli güncelleme notunda: Auth.js'in
// `Credentials` sağlayıcısı JWT stratejisini zorunlu kılıyor, JWT ise
// "çıkışta ve şifre değişiminde tüm oturumlar ANINDA düşer" sözünü tutamıyor.
// ===========================================================================

/** Çerez adı. Diğer çerezlerle aynı `bb_` öneki — hepsi tek bakışta görülsün. */
export const SESSION_COOKIE_NAME = "bb_session" as const;

/** Jetonun bayt uzunluğu. 32 bayt = 256 bit; tahmin edilmesi pratikte imkânsız. */
export const SESSION_TOKEN_BYTES = 32;

/** 7 gün — `05-auth-security.md` "Token ömürleri" tablosunda SABİT. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60_000;

/**
 * Kayan yenileme eşiği: oturumun kalan ömrü bu değerin altına düşünce süresi
 * yeniden 7 güne çekilir.
 *
 * NEDEN EŞİK VAR, NEDEN HER İSTEKTE UZATILMIYOR: standart "her istekte uzar"
 * diyor ama bunu harfiyen uygulamak HER SAYFA AÇILIŞINDA bir veritabanı
 * YAZMASI demek. Sunucusuz ortamda bu, okuma maliyetinin üstüne gereksiz bir
 * yazma maliyeti bindirir (ADR-005 zaten yalnızca okuma maliyetini kabul
 * ediyor). 6 gün eşiğiyle uzatma günde en fazla bir kez olur; kullanıcı
 * açısından davranış aynıdır — uygulamayı kullandığı sürece oturumu düşmez.
 */
export const SESSION_REFRESH_THRESHOLD_MS = 6 * 24 * 60 * 60_000;

// ===========================================================================
// GİRİŞ (PRD §5.0 "Giriş akışı" · 05-auth-security.md)
// ===========================================================================

/**
 * Giriş denemesi hız sınırı: 5 deneme / 15 dakika (05-auth-security.md
 * "Rate limit: giriş denemesi"). Kimlik sorgusuyla aynı bütçe, ama AYRI
 * anahtar — biri diğerinin sayacını tüketmemeli.
 */
export const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

/**
 * PRD §5.0: "2 başarısız denemeden sonra bot doğrulaması istenir."
 *
 * Sayaç YALNIZCA BAŞARISIZ denemede artar ve başarılı girişte sıfırlanır;
 * şifresini doğru bilen kullanıcı bulmacayla hiç karşılaşmaz.
 */
export const LOGIN_BOT_CHECK_AFTER_FAILURES = 2;

/**
 * Başarısız deneme sayacının penceresi. Hız sınırıyla aynı tutuluyor: iki
 * farklı pencere, "bulmaca çıktı ama sayaç sıfırlanmış" gibi kullanıcıya
 * açıklanamayan durumlar üretirdi.
 */
export const LOGIN_FAILURE_WINDOW_MS = LOGIN_RATE_LIMIT_WINDOW_MS;

// ===========================================================================
// ŞİFRE SIFIRLAMA (PRD §5.0 "Şifre sıfırlama" · adım 4b-3)
//
// Akışın tamamı HESAP SAYIMI KORUMASI etrafında kuruludur: kimlik numarası
// kayıtlı olsun olmasın aynı mesaj, aynı davranış ve aynı süre döner.
// ===========================================================================

/**
 * Sıfırlama akışını taşıyan çerez. Kayıt akışındaki desenin aynısı: çerezde
 * YALNIZCA rastgele bir jeton var — kimlik numarası, e-posta ve kullanıcı
 * kimliği tarayıcıya hiç gitmez.
 */
export const PASSWORD_RESET_COOKIE_NAME = "bb_password_reset" as const;

/** 32 bayt = 256 bit; tahmin edilmesi pratikte imkânsız. */
export const PASSWORD_RESET_TOKEN_BYTES = 32;

/**
 * Çerezin ömrü. Koddan (5 dk) uzun tutuluyor ki süresi dolan kodun ardından
 * kullanıcı "yeni kod gönder" diyebilsin; kod kilidi zaten OTP tarafında.
 */
export const PASSWORD_RESET_FLOW_TTL_MS = 15 * 60_000;

/**
 * Kod isteme ucunun SABİT yanıt süresi (PRD §5.0: "aynı mesaj ve aynı yanıt
 * süresi").
 *
 * Mesajı eşitleyip süreyi eşitlememek korumayı işe yaramaz kılar: kayıt varsa
 * e-posta gönderilir, yoksa gönderilmez ve fark milisaniyeden okunur. Taban
 * süre, production'daki gerçek e-posta çağrısından belirgin şekilde uzun
 * seçildi — `KPS_CONSTANT_RESPONSE_MS` ile aynı gerekçe.
 */
export const PASSWORD_RESET_CONSTANT_RESPONSE_MS = 2_000;

/** Deneme hız sınırı: giriş akışıyla aynı bütçe (5 / 15 dk), AYRI anahtar. */
export const PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS = 5;
export const PASSWORD_RESET_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

/**
 * Gönderim bütçesi — "aynı hedefe 3 kod / 15 dakika" kuralının bu akıştaki
 * karşılığı, ama anahtarı E-POSTA DEĞİL kimlik numarasının özeti.
 *
 * NEDEN: hedefe göre saymak yalnızca gerçek hesaplarda çalışırdı; kayıtsız
 * numarada gönderilecek bir hedef yok. O zaman dördüncü istek kayıtlı numarada
 * 429, kayıtsızda 201 döner ve hesap sayımı korumasının tamamı delinirdi.
 * Numaranın özetine göre saymak iki yolu da aynı yerde durdurur.
 */
export const PASSWORD_RESET_SEND_RATE_LIMIT_MAX = 3;
export const PASSWORD_RESET_SEND_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

/**
 * Kayıtsız numara için açılan sahte kod kaydının bayt uzunluğu.
 *
 * 6 haneli bir kod DEĞİL, 32 rastgele bayt özetleniyor: kullanıcının
 * girebileceği hiçbir 6 haneli değer bu özete denk gelemez, yani sahte akış
 * "doğrulandı" durumuna KAZAEN de olsa geçemez.
 */
export const PASSWORD_RESET_DECOY_SECRET_BYTES = 32;

// ===========================================================================
// BOT KORUMASI — Cloudflare Turnstile (ADR-004 · integrations.md)
// ===========================================================================

/** Jetonun doğrulandığı Cloudflare ucu. Jeton tek kullanımlıktır. */
export const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify" as const;

/** Widget betiğinin adresi — CSP'de de bu alan adına izin verilir. */
export const TURNSTILE_SCRIPT_ORIGIN = "https://challenges.cloudflare.com" as const;

/**
 * Doğrulama çağrısının üst sınırı. Yeniden DENENMEZ: jeton tek kullanımlık
 * olduğu için ikinci deneme Cloudflare'dan `timeout-or-duplicate` alır ve
 * kullanıcıyı haksız yere reddeder.
 */
export const TURNSTILE_TIMEOUT_MS = 3_000;

// ===========================================================================
// GOOGLE İLE GİRİŞ — OpenID Connect (PRD §5.0 · adım 4c)
//
// Google KİMLİK DOĞRULAMAZ; yalnızca bir e-posta hesabının sahipliğini kanıtlar.
// Kimliği KPS doğrular, çalışan olmayı personel rehberi gösterir. Bu yüzden
// Google ile açılan hesap `dogrulanmamis` kademesinde başlar.
// ===========================================================================

/**
 * Google'ın OpenID Connect yayıncı adresi. Uç adresleri (yetkilendirme, jeton,
 * JWKS) buradan KEŞFEDİLİR — koda gömülmez. Google bu adresleri zaman zaman
 * değiştiriyor; keşif, değişikliği kendiliğinden takip eden tek yöntem.
 */
export const GOOGLE_ISSUER_URL = "https://accounts.google.com" as const;

/**
 * İstenen kapsamlar. Üçü de Google'ın "hassas olmayan" listesinde, yani
 * uygulamanın Google incelemesinden geçmesi gerekmiyor.
 *
 * `profile` YALNIZCA ad için isteniyor. Daha fazlası istenmiyor: veri
 * minimizasyonu (14-privacy-and-compliance.md) — toplanmayan veri sızmaz.
 */
export const GOOGLE_OAUTH_SCOPES = "openid email profile" as const;

/**
 * Yetkilendirme isteğinin dönüş adresi. Google panelindeki "Authorized redirect
 * URIs" listesiyle KARAKTERİ KARAKTERİNE aynı olmalı; Google joker kabul etmez
 * ve en ufak fark `redirect_uri_mismatch` hatası verir.
 */
export const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback" as const;

/**
 * Akışı taşıyan tek kullanımlık çerez: `state`, PKCE doğrulayıcısı, `nonce` ve
 * dönüş adresi burada durur.
 *
 * NEDEN ÇEREZ, neden veritabanı değil: bu üç değer yalnızca tarayıcı ile bizim
 * aramızdaki TEK bir gidiş-dönüşü bağlar ve saniyeler yaşar. Veritabanına
 * yazmak, henüz kimliği olmayan bir ziyaretçiye satır açmak demekti — bot
 * trafiği tabloyu şişirirdi.
 *
 * Çerez `httpOnly`, yani sayfadaki JavaScript okuyamaz; XSS ile `state`
 * çalınıp CSRF korumasının etrafından dolaşılamaz.
 */
export const GOOGLE_OAUTH_COOKIE_NAME = "bb_google_oauth" as const;

/**
 * Akışın ömrü. Kullanıcının Google ekranında hesap seçip şifre girmesine ve
 * gerekirse iki adımlı doğrulamayı geçmesine yetecek kadar uzun; çalınan bir
 * `state` değerinin işe yarayacağı pencereyi dar tutacak kadar kısa.
 */
export const GOOGLE_OAUTH_FLOW_TTL_MS = 10 * 60_000;

/**
 * Google'ın uçlarına yapılan çağrıların üst sınırı (CLAUDE.md §5.9: dış
 * çağrılarda timeout zorunlu). Google çökerse giriş ekranı hata gösterir,
 * sayfa ayakta kalır.
 *
 * BİRİM SANİYE, milisaniye değil: `openid-client` bu seçeneği saniye olarak
 * alıyor ve kütüphanenin varsayılanı 30 saniye — sunucusuz bir fonksiyonu
 * yarım dakika meşgul edecek kadar uzun. Keşifte verilen değer, o
 * yapılandırmanın sonraki TÜM isteklerine de uygulanıyor.
 */
export const GOOGLE_OAUTH_TIMEOUT_SECONDS = 5;

/**
 * Akış başlatma ucunun IP başına bütçesi.
 *
 * Cömert: normal kullanıcı düğmeye bir kez basar, hesap seçme ekranından geri
 * dönüp tekrar dener, belki üçüncü kez. 10 bunu rahatça karşılar. Amaç
 * kullanıcıyı kısıtlamak değil, bu ucun Google'a karşı trafik üretmek için
 * kullanılmasını engellemek (CLAUDE.md §5.5).
 */
export const GOOGLE_OAUTH_START_RATE_LIMIT = 10;
export const GOOGLE_OAUTH_START_WINDOW_MS = 15 * 60_000;

// ===========================================================================
// HASTANE RANDEVU (PRD §5.1 · adım 6)
//
// Modül personele özeldir; erişim kapısı `access-control.ts` içinde ve bu
// sabitlerden bağımsızdır. Buradakiler yalnızca İŞ KURALLARININ sayılarıdır.
// ===========================================================================

/**
 * İptal penceresi: randevuya bu süreden az kalmışsa iptal edilemez (PRD §5.1).
 *
 * Ölçüt randevunun BAŞLANGIÇ ANIDIR, randevunun günü değil: "2 saat kala"
 * kuralını gün başına bağlamak, sabah 09:00'daki randevuyu bir önceki gece
 * yarısına kadar iptal edilebilir yapardı.
 */
export const APPOINTMENT_CANCEL_CUTOFF_MS = 2 * 60 * 60_000;

/**
 * Randevu ekranında ileriye dönük kaç gün gösterilir.
 *
 * Tohumlama 14 günlük slot üretiyor (`prisma/seed/steps/health.ts`); daha
 * uzun bir pencere her zaman boş çıkan gün şeritleri gösterirdi. Sayı
 * tohumlamadan bağımsız bir ÜRÜN kararıdır: hasta üç hafta sonrasını planlamaz.
 */
export const APPOINTMENT_VISIBLE_DAYS = 14;

/**
 * "Randevularım" ekranında gösterilen geçmiş randevu sayısı.
 *
 * Sınırsız liste dönülmez (03-api-guidelines.md). Yaklaşan randevular
 * sınırlanmaz — onlar zaten kullanıcının aktif işidir ve doğal olarak azdır.
 */
export const APPOINTMENT_HISTORY_LIMIT = 20;

/**
 * Yazma uçlarının KULLANICI BAŞINA bütçesi (CLAUDE.md §5.5: "yazma
 * endpoint'lerinde rate limit").
 *
 * NEDEN IP DEĞİL KULLANICI: bu hizmet belediye personeline açık ve personelin
 * tamamı aynı binadan, tek bir dış IP'nin arkasından girebilir. IP bazlı bir
 * sayaç o durumda meşru kullanıcıları birbirinin bütçesinden yerdi.
 *
 * Sınır cömert: normal kullanıcı bir randevu alır, belki iptal edip yenisini
 * seçer. 20, çift tıklamayı ve kararsızlığı rahatça karşılar; amaç kullanıcıyı
 * kısıtlamak değil, tek bir hesabın tüm takvimi otomatik doldurmasını önlemek.
 */
export const APPOINTMENT_WRITE_RATE_LIMIT_MAX = 20;
export const APPOINTMENT_WRITE_RATE_LIMIT_WINDOW_MS = 15 * 60_000;
