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

/**
 * İstemciden kabul edilen bot jetonunun üst sınırı.
 *
 * Cloudflare jetonu 2048 karakteri geçmiyor; sınır iki katına konuldu ki
 * sağlayıcı biçimi büyütürse akış sessizce kırılmasın. Sınırın kendisi bir
 * KAYNAK KORUMASI: jeton doğrulanmak üzere Cloudflare'a gönderiliyor, yani
 * üst sınırsız bir alan girişli bir kullanıcıya bedava yük üretme imkânı
 * verirdi (2026-08-10 güvenlik denetimi).
 */
export const TURNSTILE_TOKEN_MAX_LENGTH = 4096;

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

// ===========================================================================
// ORTAK SEPET VE ÖDEME (PRD §4 "Ortak sepet" · §6.1 · §6.2 · adım 7)
//
// TUTARLAR TAM SAYI KURUŞ. Uygulama içinde para hiçbir yerde ondalık sayı
// olarak taşınmaz (`src/lib/money.ts` gerekçesi).
// ===========================================================================

/**
 * Market teslimat ücreti ve ücretsiz teslimat eşiği
 * (`fake-data-guide.md`: "Teslimat ücreti 59 TL; 750 TL üzeri siparişte ücretsiz").
 *
 * Eşik YALNIZCA MARKET TUTARINA bakar, sepetin tamamına değil (PRD §6.1).
 * Aksi hâlde restoran siparişi ekleyerek market teslimatı bedavaya getirilirdi.
 */
export const MARKET_DELIVERY_FEE_KURUS = 5_900;
export const MARKET_FREE_DELIVERY_THRESHOLD_KURUS = 75_000;

/**
 * Restoran teslimat ücreti ve ücretsiz teslimat eşiği.
 *
 * DEĞERLERİ PROJE SAHİBİ BELİRLEDİ (2026-08-07, adım 9): hiçbir doküman
 * restoran için ücret tanımlamıyordu ve bir sayı uydurmak, dokümanda olmayan
 * bir iş kuralı icat etmek olurdu (teknik borç #39). Market ile aynı desen
 * seçildi — sabit ücret + eşik üstü ücretsiz — ama sayılar restorana özel:
 * bir öğün siparişi bir market alışverişinden küçük olduğu için eşik de düşük.
 *
 * Eşik YALNIZCA RESTORAN TUTARINA bakar (PRD §6.1), sepetin tamamına değil.
 */
export const RESTAURANT_DELIVERY_FEE_KURUS = 4_990;
export const RESTAURANT_FREE_DELIVERY_THRESHOLD_KURUS = 40_000;

/**
 * Paket servis hazırlık süresi (PRD §5.4 "tahmini hazırlık süresi").
 *
 * TAHMİN, TAAHHÜT DEĞİL: mutfağın gerçek doluluğunu bilen bir sistem yok, bu
 * yüzden sipariş kaydına YAZILMIYOR — yalnızca ekranda gösteriliyor. Kayda
 * yazılsaydı "söz verilen saat" gibi görünür ve tutmadığında haklı bir şikâyet
 * konusu olurdu.
 */
export const RESTAURANT_PREP_MINUTES_MIN = 30;
export const RESTAURANT_PREP_MINUTES_MAX = 45;

/** Bir sepet satırında en fazla kaç adet olabilir — dolandırıcılık ve hata kalkanı. */
export const CART_MAX_QUANTITY_PER_ITEM = 20;

/**
 * Mutfak notunun en fazla kaç karakter olabileceği (PRD §5.4).
 *
 * "Az acılı, soğansız olsun" için fazlasıyla yeterli; sınırsız bırakılsaydı
 * bir sepet satırı megabaytlık metin taşıyabilirdi. Sınır hem şemada hem
 * ekranda AYNI SABİTTEN okunuyor: iki ayrı sayı olsaydı kullanıcı ekranda
 * yazabildiği bir notu sunucuda reddedilmiş görürdü.
 */
export const CART_ITEM_NOTE_MAX_LENGTH = 200;

/**
 * Sepette en fazla kaç FARKLI satır olabilir.
 *
 * Sınır ekranı ve ödeme transaction'ını korumak için: sınırsız sepet, tek
 * istekte binlerce satır yazan bir transaction demek.
 */
export const CART_MAX_LINES = 50;

/** Terk edilmiş sepetin ömrü (data-model.md saklama süreleri: 30 gün). */
export const CART_ABANDONED_AFTER_MS = 30 * 24 * 60 * 60_000;

/**
 * Sepet yazma uçlarının bütçesi.
 *
 * Sayaç ZİYARETÇİ kimliğine bağlı, kullanıcıya değil: sepete ekleme girişsiz
 * de yapılabiliyor (PRD §4 "Ziyaretçi sepeti"), dolayısıyla kullanıcı bazlı
 * bir sayaç bu ucun yarısını hiç korumazdı. Cömert: normal kullanıcı alışveriş
 * yaparken onlarca kez adet değiştirir.
 */
export const CART_WRITE_RATE_LIMIT_MAX = 120;
export const CART_WRITE_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

/**
 * Ödeme denemesi bütçesi — KULLANICI başına, dar tutuluyor.
 *
 * Sepet ucundan farklı: ödeme kart denemesi demek ve sınırsız deneme, çalınmış
 * kart numaralarını sırayla sınamanın (card testing) en kolay yolu olurdu.
 */
export const PAYMENT_RATE_LIMIT_MAX = 10;
export const PAYMENT_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

/**
 * Sipariş iptali bütçesi — KULLANICI başına (PRD §5.5).
 *
 * Dar tutuluyor ama ödemeden gevşek: iptal stok geri yükleyen ve iade kaydı
 * açan bir YAZMA işlemi, yani ucuz değil. Öte yandan meşru kullanıcı karışık
 * bir sepetten doğan birkaç siparişi arka arkaya iptal edebilir — sınır o
 * senaryoyu boğmayacak kadar yüksek.
 */
export const ORDER_CANCEL_RATE_LIMIT_MAX = 20;
export const ORDER_CANCEL_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

/**
 * Sahte ödeme sağlayıcısının yapay gecikmesi.
 *
 * Gerçek bir tahsilat anlıksa da değildir; ekranın "işleniyor" durumunu
 * gerçekten göstermesi ve çift tıklama korumasının sınanabilmesi için
 * küçük bir gecikme veriliyor (sahte KPS ile aynı gerekçe).
 */
export const MOCK_PAYMENT_MIN_DELAY_MS = 300;
export const MOCK_PAYMENT_MAX_DELAY_MS = 900;

/** Kart doğrulama sınırları (PRD §6.2 adım 3). */
export const CARD_NUMBER_MIN_DIGITS = 13;
export const CARD_NUMBER_MAX_DIGITS = 19;
export const CARD_CVV_MIN_DIGITS = 3;
export const CARD_CVV_MAX_DIGITS = 4;
export const CARD_HOLDER_MIN_LENGTH = 3;
export const CARD_HOLDER_MAX_LENGTH = 60;

// ===========================================================================
// ETKİNLİK VE KOLTUK KİLİDİ (PRD §5.2 · ADR-007 · adım 11)
// ===========================================================================

/**
 * Koltuk kilidinin ömrü — 10 dakika.
 *
 * SAYIYI AJAN SEÇMEDİ: PRD §5.2 ve `05-auth-security.md` bu süreyi sabitliyor.
 *
 * SÜRE SEPETTE UZAMAZ ve ödeme ekranına girmek onu SIFIRLAMAZ (PRD §5.2):
 * kilit konulduğu andan itibaren işler. Uzasaydı sepetini açık tutan tek bir
 * kullanıcı koltuğu süresiz kilitleyebilir, koltuk da hiç satılamazdı.
 */
export const SEAT_HOLD_DURATION_MS = 10 * 60_000;

/**
 * Bir kullanıcının aynı anda tutabileceği en fazla kilit.
 *
 * PRD BİR SAYI VERMİYOR; sınır yine de gerekli çünkü kilit bedava ve 10 dakika
 * boyunca koltuğu herkesten saklıyor — sınırsız bırakmak tek hesabın salonu
 * kilitleyip satışı durdurmasına izin vermek olurdu. 8, bir ailenin yan yana
 * oturması için fazlasıyla yeterli.
 */
export const SEAT_HOLD_MAX_PER_USER = 8;

/**
 * Koltuk kilidi uçlarının bütçesi — KULLANICI başına.
 *
 * Kilitleme ve bırakma AYNI sayacı paylaşıyor (randevu modülündeki desenin
 * aynısı): ayrı bütçe verilseydi "kilitle-bırak-kilitle" döngüsüyle sınır iki
 * katına çıkarılabilirdi. Cömert, çünkü salon planında koltuk seçmek fikir
 * değiştire değiştire yapılan bir iş.
 */
export const SEAT_HOLD_RATE_LIMIT_MAX = 60;
export const SEAT_HOLD_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

// ===========================================================================
// SPOR SALONU ÜYELİĞİ (PRD §5.6 · adım 12)
// ===========================================================================

/**
 * Yenileme hatırlatmasının kaç gün önce düşeceği.
 *
 * SAYIYI AJAN SEÇMEDİ: PRD §5.6 "yenilemeden 3 gün önce hatırlatma bildirimi
 * düşer" diyor.
 */
export const MEMBERSHIP_RENEWAL_REMINDER_DAYS = 3;

/**
 * Tahsilat başarısız olduktan sonra üyeliğin pasifleşmesine kalan süre.
 *
 * Yine PRD §5.6: "3 gün içinde ödenmezse üyelik pasifleşir". Pasifleşme bir
 * kolona YAZILMIYOR, okuma anında hesaplanıyor (ADR-007 · ADR-013): durumu
 * ilerletecek bir zamanlayıcı yok ve olsa bile hiç çalışmadığında kullanıcı
 * yanlış durum görmemeli.
 */
export const MEMBERSHIP_PAYMENT_GRACE_DAYS = 3;

/**
 * Bir ayın uzunluğu — bir sonraki tahsilat tarihi bununla bulunur.
 *
 * TAKVİM AYI KULLANILIYOR, 30 GÜN DEĞİL: 31 Ocak'ta başlayan üyelik 28
 * Şubat'ta yenilenir, 2 Mart'ta değil. Sabit gün sayısı kullanmak tahsilat
 * gününü her ay biraz kaydırır ve bir yıl sonra kullanıcının beklediği tarih
 * tutmaz. Ayın karşılığı olmayan günlerde (29-31) ay sonuna çekilir.
 */
export const MEMBERSHIP_BILLING_PERIOD_MONTHS = 1;

/**
 * Üyelik yazma uçlarının bütçesi — KULLANICI başına.
 *
 * Ödeme bütçesinden ayrı ve daha dar: üyelik işlemleri (satın alma, paket
 * değişimi, iptal) günde birkaç kez yapılan işler değil. Her denemenin
 * arkasında sahte de olsa bir tahsilat çağrısı var.
 */
export const MEMBERSHIP_WRITE_RATE_LIMIT_MAX = 20;
export const MEMBERSHIP_WRITE_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

// ===========================================================================
// DESTEK TALEBİ (PRD §5.7 · adım 13)
// ===========================================================================

/**
 * Talebin kaç DAKİKA sonra hangi aşamaya geçtiği.
 *
 * ⚠️ BU SAYILAR BİR VARSAYIMDIR. PRD §5.7 durumları sayıyor ama süre vermiyor;
 * `ORDER_TIMELINE_RULES`'taki gibi tek bir yerde toplandı ve proje sahibinin
 * onayına açık. Değiştirmek için TEK YER burasıdır.
 *
 * Sipariş eşiklerinden UZUN seçildi çünkü destek talebi bir kuryenin değil bir
 * insanın işi: 20 dakikada "çözüldü" diyen bir simülasyon inandırıcı olmazdı.
 */
export const SUPPORT_TICKET_IN_REVIEW_AFTER_MINUTES = 30;
export const SUPPORT_TICKET_RESOLVED_AFTER_MINUTES = 180;

/** Tek talepte kaç ek olabilir — PRD §5.7 "en fazla 5 adet". */
export const SUPPORT_ATTACHMENT_MAX_COUNT = 5;

/**
 * Dosya başına boyut sınırı.
 *
 * PRD §5.7 "dosya başına boyut sınırı var" diyor, sayıyı vermiyor. 2 MB seçildi:
 * bir telefon ekran görüntüsü tipik olarak 0,2-1,5 MB arasında, yani gerçek
 * kullanımı kesmiyor. Üst sınır aynı zamanda ADR-014'ün depolama bütçesini
 * koruyan tek kapı — talep başına en kötü durum 5 × 2 MB.
 */
export const SUPPORT_ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024;

/** Başlık ve açıklamanın sınırları — veritabanı değil, kullanılabilirlik kararı. */
export const SUPPORT_SUBJECT_MIN_LENGTH = 5;
export const SUPPORT_SUBJECT_MAX_LENGTH = 120;
export const SUPPORT_DESCRIPTION_MIN_LENGTH = 20;
export const SUPPORT_DESCRIPTION_MAX_LENGTH = 2000;

/** Liste ekranında en fazla kaç talep çizilir (sayfalama gelene kadar). */
export const SUPPORT_TICKET_LIST_LIMIT = 50;

/**
 * Destek yazma uçlarının bütçesi — KULLANICI başına.
 *
 * Üyelikten dar: her talep 10 MB'a kadar dosya taşıyabiliyor, yani burada hız
 * sınırı yalnızca spam'e değil **depolama tüketimine** de karşı duruyor
 * (ADR-014 bedel 1).
 */
export const SUPPORT_WRITE_RATE_LIMIT_MAX = 10;
export const SUPPORT_WRITE_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

// ===========================================================================
// BİLGİ WIDGET'LARI (PRD §5.8 · adım 14)
//
// Projenin İLK GERÇEK dış API çağrıları. Dördü de anahtar gerektirmiyor
// (ADR-016) ve yanıtları Postgres'te önbellekleniyor (ADR-015).
// ===========================================================================

/**
 * Dış servis zaman aşımı — sahte KPS'inkinden (3 sn) UZUN.
 *
 * Gerekçe: sahte KPS kendi sunucumuzda, aynı bölgede çalışıyor; buradakiler
 * başka kıtadaki üçüncü parti sunucular. 3 saniye onlar için haksız bir sınır
 * olurdu ve widget'lar durup dururken hataya düşerdi. Yine de üst sınır şart
 * (CLAUDE.md §5.9): cevap vermeyen bir servis isteği sonsuza kadar açık tutar.
 */
export const INFO_WIDGET_TIMEOUT_MS = 5_000;

/** En fazla 2 yeniden deneme (CLAUDE.md §5.9); taban 300 ms, üstel geri çekilme. */
export const INFO_WIDGET_MAX_RETRIES = 2;
export const INFO_WIDGET_RETRY_BACKOFF_MS = 300;

/**
 * Devre kesici (ADR-010) — sağlayıcı BAŞINA ayrı devre.
 *
 * Eşik sahte KPS'inkinden (5) düşük: orada her hata bir kullanıcının kayıt
 * denemesiydi, burada hatalar arka planda birikiyor ve kullanıcı zaten bayat
 * veri görüyor. Çöken bir servise ısrar etmenin karşılığı yok.
 */
export const INFO_WIDGET_BREAKER_FAILURE_THRESHOLD = 3;
export const INFO_WIDGET_BREAKER_WINDOW_MS = 5 * 60_000;
export const INFO_WIDGET_BREAKER_COOLDOWN_MS = 5 * 60_000;

/**
 * Önbellek süreleri (`integrations.md` tablosuyla birebir aynı).
 * Verinin gerçekte ne sıklıkta değiştiğine göre seçildi:
 * döviz kuru günde bir kez (ECB), kripto sürekli, hava yarım saatte bir.
 */
export const WEATHER_CACHE_TTL_MS = 30 * 60_000;
export const EXCHANGE_RATE_CACHE_TTL_MS = 60 * 60_000;
export const CRYPTO_CACHE_TTL_MS = 5 * 60_000;
export const NEWS_CACHE_TTL_MS = 15 * 60_000;

/** Önbellek anahtarları — TEK yerde, çünkü tablodaki satırı bunlar adresliyor. */
export const WEATHER_CACHE_KEY = "info:weather:izmir";
export const EXCHANGE_RATE_CACHE_KEY = "info:rates:try";
export const CRYPTO_CACHE_KEY = "info:crypto:try";
export const NEWS_CACHE_KEY = "info:news:tr";

/**
 * Bayat kayıt bu yaştan sonra ARTIK GÖSTERİLMEZ.
 *
 * Bayat veri sunmanın amacı geçici bir kesintiyi kullanıcıya yansıtmamak; bir
 * haftalık döviz kurunu "güncel" bölümünde göstermek ise yanıltıcı olurdu.
 * Bu sınırdan sonra widget dürüstçe hata durumuna geçer.
 */
export const INFO_WIDGET_MAX_STALE_MS = 24 * 60 * 60_000;

/** Önbellek satırı son okumadan bu kadar sonra çöp sayılır (data-model.md). */
export const EXTERNAL_CACHE_RETENTION_MS = 7 * 24 * 60 * 60_000;

/** Hava durumu: İzmir + 3 günlük tahmin (PRD §5.8). Bugün dâhil 4 gün istenir. */
export const WEATHER_FORECAST_DAYS = 4;
export const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * Döviz: Frankfurter, ECB günlük kurlarını yayınlıyor ve anahtar istemiyor.
 * `base=TRY` sorulup ters çevriliyor — tek çağrıyla üç kur geliyor.
 */
export const EXCHANGE_RATE_API_URL = "https://api.frankfurter.dev/v1/latest";
export const EXCHANGE_RATE_SYMBOLS = ["USD", "EUR", "GBP"] as const;

/** Kripto: CoinGecko'nun anahtarsız ucu. Dakikada sınırlı → 5 dk önbellek şart. */
export const CRYPTO_API_URL = "https://api.coingecko.com/api/v3/simple/price";
export const CRYPTO_COIN_IDS = ["bitcoin", "ethereum"] as const;

/**
 * Haber: anahtarsız RSS akışı (ADR-016). Sağlayıcı değişimi TEK satır.
 * Kaynak adı ekranda yazıyor — haber bize aitmiş gibi sunulmuyor.
 */
export const NEWS_FEED_URL = "https://www.trthaber.com/sondakika.rss";
export const NEWS_SOURCE_NAME = "TRT Haber";
export const NEWS_ITEM_LIMIT = 5;

/**
 * Haber bağlantılarının izinli alan adları.
 *
 * NEDEN VAR: akış üçüncü bir kurumun sunucusunda. Bir gün ele geçirilse veya
 * yönlendirilse, kullanıcıyı rastgele bir adrese götüren bir bağlantı
 * çizmemeliyiz. Bu liste dışındaki her kalem sessizce atılır.
 */
export const NEWS_ALLOWED_HOSTS = ["www.trthaber.com", "trthaber.com"] as const;

// ===========================================================================
// PROFİL (PRD §4 · §5.0 "Adres ve kimlik güncelleme" · adım 15)
//
// Adres ve kayıtlı kart KİŞİSEL VERİDİR (14-privacy-and-compliance.md).
// Sınırlar burada, şemada değil: aynı değer hem Zod'da hem ekrandaki
// `maxLength` sayacında kullanılıyor ve iki yerde ayrı yazılırsa kayarlar.
// ===========================================================================

/**
 * Adres alan sınırları — ödeme ekranındaki şemayla AYNI değerler.
 *
 * Adım 7'de `newAddressSchema` içine gömülü sayılardı; profil ekranı aynı
 * kuralı ikinci kez uygulamak zorunda olduğu için buraya çıkarıldılar (DRY).
 */
export const ADDRESS_TITLE_MIN_LENGTH = 2;
export const ADDRESS_TITLE_MAX_LENGTH = 60;
export const ADDRESS_FULL_MIN_LENGTH = 10;
export const ADDRESS_FULL_MAX_LENGTH = 300;
export const ADDRESS_DISTRICT_MIN_LENGTH = 2;
export const ADDRESS_DISTRICT_MAX_LENGTH = 60;

/**
 * Kullanıcı başına en fazla kaç adres.
 *
 * NEDEN SINIR VAR: adres ucu giriş yapmış her kullanıcıya açık bir YAZMA ucu.
 * Hız sınırı ani seli durdurur ama günlere yayılan birikimi durdurmaz; üst
 * sınır olmadan tek hesap tabloyu şişirebilir. 20 gerçek kullanım için fazlasıyla
 * yeterli (ev, iş, anne, yazlık...).
 */
export const ADDRESS_MAX_PER_USER = 20;

/**
 * Profil yazma uçlarının bütçesi — KULLANICI başına.
 *
 * Destekten geniş (10 → 30): adres formu dosya taşımıyor ve kullanıcı ekleme,
 * düzeltme, silmeyi arka arkaya yapabilir. Amaç kötüye kullanımı durdurmak,
 * normal düzenleme akışını cezalandırmak değil.
 */
export const PROFILE_WRITE_RATE_LIMIT_MAX = 30;
export const PROFILE_WRITE_RATE_LIMIT_WINDOW_MS = 15 * 60_000;
