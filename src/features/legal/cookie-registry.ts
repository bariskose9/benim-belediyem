import {
  ANONYMOUS_ID_COOKIE_NAME,
  ANONYMOUS_ID_TTL_MS,
  COOKIE_NOTICE_COOKIE_NAME,
  COOKIE_NOTICE_TTL_MS,
  GOOGLE_OAUTH_COOKIE_NAME,
  GOOGLE_OAUTH_FLOW_TTL_MS,
  PASSWORD_RESET_COOKIE_NAME,
  PASSWORD_RESET_FLOW_TTL_MS,
  REGISTRATION_COOKIE_NAME,
  REGISTRATION_DRAFT_TTL_MS,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
} from "@/config/constants";
import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Çerez kayıt defteri — tarayıcıda ne sakladığımızın TEK KAYNAĞI (adım 17).
 *
 * NEDEN AYRI BİR DOSYA: aynı bilgi üç yerde lazım — çerez politikası sayfasının
 * tablosu, çerez bandının hangi kipte çizileceği ve KVKK aydınlatma metnindeki
 * "otomatik yollarla toplanan veriler" bölümü. Üçü ayrı ayrı yazılsaydı yeni
 * bir çerez eklendiğinde biri mutlaka güncellenmeden kalırdı ve yayımladığımız
 * metin gerçeğe aykırı düşerdi. `scheduled-tasks/task-registry.ts` ile aynı
 * desen: katalog veri, ekran o veriyi çiziyor.
 *
 * ⛔ TARAYICIDA YENİ BİR ŞEY SAKLAYAN HER DEĞİŞİKLİK BURAYA BİR SATIR EKLER.
 * Satır eklenmezse politika sayfası eksik kalır; bu, yalnızca bir belge hatası
 * değil, KVKK aydınlatma yükümlülüğünün ihlalidir.
 */

/**
 * Depolama sınıfı.
 *
 * `necessary`  : hizmetin çalışması için zorunlu — rıza aranmaz, ama YİNE DE
 *                bildirilir (aydınlatma yükümlülüğü rızadan bağımsızdır)
 * `analytics`  : ölçüm/istatistik — rıza olmadan çalıştırılamaz
 * `marketing`  : reklam/hedefleme — rıza olmadan çalıştırılamaz
 */
export type CookieCategory = "necessary" | "analytics" | "marketing";

/** Tarayıcıda saklanan şeyin biçimi. Çerez olmayanı da bildirmek zorundayız. */
export type BrowserStorageKind = "cookie" | "local_storage";

export type CookieEntry = {
  /** Tarayıcıda görünen ad — kullanıcı geliştirici araçlarında birebir bulabilsin. */
  readonly name: string;
  readonly kind: BrowserStorageKind;
  readonly category: CookieCategory;
  /** İlk taraf mı (bizim alan adımız) yoksa üçüncü taraf mı. */
  readonly firstParty: boolean;
  /** Ne işe yarıyor — kullanıcının anlayacağı Türkçe, teknik terim olmadan. */
  readonly purpose: string;
  /**
   * Ömrü milisaniye. `null` = tarayıcı kapanınca veya kullanıcı silene kadar
   * (oturum çerezi / yerel depolama).
   */
  readonly lifetimeMs: number | null;
};

/**
 * BUGÜN tarayıcıda sakladığımız her şey.
 *
 * ⛔ LİSTE ÖLÇÜLEREK DOĞRULANIR, EZBERDEN YAZILMAZ: tarayıcının "Uygulama →
 * Çerezler" bölümünde görünenle bu liste birebir aynı olmalı. Adım 17'de
 * geliştirici araçlarıyla karşılaştırıldı.
 */
export const COOKIE_REGISTRY: readonly CookieEntry[] = [
  {
    name: SESSION_COOKIE_NAME,
    kind: "cookie",
    category: "necessary",
    firstParty: true,
    purpose:
      "Giriş yaptığınızda oturumunuzu taşır. Bu çerez olmadan her sayfada yeniden " +
      "giriş yapmanız gerekirdi. İçinde adınız veya e-postanız değil, yalnızca " +
      "rastgele bir anahtar bulunur.",
    lifetimeMs: SESSION_TTL_MS,
  },
  {
    name: ANONYMOUS_ID_COOKIE_NAME,
    kind: "cookie",
    category: "necessary",
    firstParty: true,
    purpose:
      "Aynı tarayıcıdan gelen istekleri sayabilmek için rastgele bir numara taşır. " +
      "Kötüye kullanımı sınırlamak (aynı kişinin dakikada onlarca kod istemesini " +
      "engellemek) ve çerez tercihinizi kaydetmek için kullanılır. Kimliğinize " +
      "bağlanmaz ve hiçbir profil taşımaz.",
    lifetimeMs: ANONYMOUS_ID_TTL_MS,
  },
  {
    name: COOKIE_NOTICE_COOKIE_NAME,
    kind: "cookie",
    category: "necessary",
    firstParty: true,
    purpose:
      "Bu çerez bildirimini okuduğunuzu hatırlar; olmasaydı bant her sayfada " +
      "yeniden çıkardı. Yalnızca okuduğunuz metnin sürüm numarasını taşır.",
    lifetimeMs: COOKIE_NOTICE_TTL_MS,
  },
  {
    name: REGISTRATION_COOKIE_NAME,
    kind: "cookie",
    category: "necessary",
    firstParty: true,
    purpose:
      "Kayıt işlemini yarıda bırakıp geri döndüğünüzde kaldığınız yerden devam " +
      "edebilmeniz için kayıt adımınızı tanır. Kimlik numaranız ve doğrulama " +
      "kodunuz bu çerezde DEĞİL, sunucuda şifreli olarak durur.",
    lifetimeMs: REGISTRATION_DRAFT_TTL_MS,
  },
  {
    name: PASSWORD_RESET_COOKIE_NAME,
    kind: "cookie",
    category: "necessary",
    firstParty: true,
    purpose:
      "Şifre sıfırlama adımlarını birbirine bağlar. Yalnızca rastgele bir anahtar " +
      "taşır ve işlem bitince değersizleşir.",
    lifetimeMs: PASSWORD_RESET_FLOW_TTL_MS,
  },
  {
    name: GOOGLE_OAUTH_COOKIE_NAME,
    kind: "cookie",
    category: "necessary",
    firstParty: true,
    purpose:
      "Google ile giriş sırasında sizi Google'a gönderen isteğin geri dönen " +
      "istekle aynı kişiye ait olduğunu doğrular. Bir güvenlik kontrolüdür; " +
      "olmadan araya girme saldırısı mümkün olurdu.",
    lifetimeMs: GOOGLE_OAUTH_FLOW_TTL_MS,
  },
  {
    name: THEME_STORAGE_KEY,
    kind: "local_storage",
    category: "necessary",
    firstParty: true,
    purpose:
      "Açık/koyu tema tercihinizi tarayıcınızda saklar. Sunucuya hiç gönderilmez; " +
      "yalnızca sayfanın doğru renkle açılması için okunur.",
    lifetimeMs: null,
  },
  {
    /**
     * ÜÇÜNCÜ TARAF — Cloudflare Turnstile (ADR-004).
     *
     * ⚠️ ADI TEK BİR ÇEREZ DEĞİL, BU YÜZDEN JOKER YAZILDI: Cloudflare bot
     * kutusunu `challenges.cloudflare.com` üzerinden servis ediyor ve orada ne
     * sakladığı bizim kontrolümüzde değil. Cloudflare'ın Turnstile gizlilik
     * politikası bu sinyalleri "bot tespiti için KESİNLİKLE GEREKLİ" (strictly
     * necessary) olarak tanımlıyor — bu yüzden `necessary` sınıfında.
     *
     * ⛔ `cf_clearance` BİZİM ALAN ADIMIZDA OLUŞMAZ: o çerez yalnızca
     * "pre-clearance" ayarı açıkken veriliyor ve bizim Turnstile widget'ımızda
     * bu ayar kapalı. Ayar bir gün açılırsa BU SATIR GÜNCELLENMEK ZORUNDA.
     */
    name: "challenges.cloudflare.com (Turnstile)",
    kind: "cookie",
    category: "necessary",
    firstParty: false,
    purpose:
      "Giriş, kayıt ve kimlik doğrulama ekranlarındaki “robot değilim” " +
      "kontrolünü Cloudflare sağlıyor. Bu kontrol, hesapların otomatik yollarla " +
      "ele geçirilmesini engelliyor ve kapatılamıyor; kapatılsaydı koruma da " +
      "ortadan kalkardı.",
    lifetimeMs: null,
  },
];

/**
 * Zorunlu olmayan (rıza gerektiren) bir depolama kullanıyor muyuz?
 *
 * ⛔ BANDIN KİPİNİ BU SORU BELİRLİYOR. Bugün cevap HAYIR — o yüzden bant
 * "kabul et / reddet" değil, BİLGİLENDİRME. Olmayan bir çerez için onay
 * düğmesi koymak kullanıcıyı yanıltır ve rızayı anlamsızlaştırır; verilen
 * onayın karşılığında kapatılacak hiçbir şey yoktur.
 *
 * Adım 18'de Sentry veya bir ölçüm aracı bağlandığında kataloğa `analytics`
 * sınıfında bir satır eklenecek ve bant kendiliğinden onay bandına dönüşecek —
 * arayüzü yeniden yazmak gerekmeyecek.
 */
export function hasConsentRequiringStorage(
  registry: readonly CookieEntry[] = COOKIE_REGISTRY,
): boolean {
  return registry.some((entry) => entry.category !== "necessary");
}

/** Politika sayfasında sınıf başlıkları altında gruplamak için. */
export function groupByCategory(
  registry: readonly CookieEntry[] = COOKIE_REGISTRY,
): ReadonlyMap<CookieCategory, readonly CookieEntry[]> {
  const grouped = new Map<CookieCategory, CookieEntry[]>();

  for (const entry of registry) {
    const bucket = grouped.get(entry.category);

    if (bucket) bucket.push(entry);
    else grouped.set(entry.category, [entry]);
  }

  return grouped;
}
