import {
  STAFF_VERIFICATION_SEND_RATE_LIMIT_MAX,
  STAFF_VERIFICATION_SEND_RATE_LIMIT_WINDOW_MS,
  STAFF_VERIFICATION_USER_RATE_LIMIT_MAX,
  STAFF_VERIFICATION_USER_RATE_LIMIT_WINDOW_MS,
} from "@/config/constants";
import {
  issueDecoyChallenge,
  issueOtp,
  pendingChallengeMatchesDestination,
  verifyOtp,
} from "@/features/otp/services/otp.service";
import {
  findClaimableStaffMember,
  findStaffEligibility,
  linkStaffMember,
} from "@/features/staff-verification/repositories/staff-claim.repository";
import {
  StaffAlreadyVerifiedError,
  StaffIdentityRequiredError,
  StaffVerificationCodeInvalidError,
  StaffVerificationRateLimitedError,
  StaffVerificationTooManyAttemptsError,
} from "@/features/staff-verification/errors";
import { recordAuditLog } from "@/lib/audit";
import { consumeRateLimit, hashActorIp, rateLimitKey } from "@/lib/rate-limit";

/**
 * PERSONEL YETKİSİ — işveren kontrollü kanaldan (adım 17c · ADR-017 ilke 2).
 *
 * ═══ BU DOSYA NEDEN VAR ═══
 * Adım 17c'den önce yetki, kimlik doğrulamasının bir YAN ETKİSİYDİ: kimlik
 * numarasının özeti personel rehberinde eşleşirse hesap personel oluyordu.
 * T.C. kimlik numarası Türkiye'de gizli bilgi olmadığı için bu, kurbanın
 * numarasını bilen herkese onun hastane ve spor salonu yetkisini veriyordu
 * (teknik borç #76). ADR-017 ilke 2: "kim olduğun" ile "ne yapmaya yetkili
 * olduğun" ayrı sorulardır ve ayrı kanıt ister; bir kişinin kurum personeli
 * olduğu kimliğinden TÜRETİLEMEZ, İŞVERENİN doğrulaması gerekir.
 *
 * ═══ KANIT NEDEN GERÇEK BİR KANIT ═══
 * Kod, kullanıcının kendi adresine değil `staff_members.work_email` adresine
 * gidiyor — yani kurumun kendi kaydındaki kanala. Kullanıcı o posta kutusuna
 * ERİŞEBİLDİĞİNİ kanıtlıyor: "bildiğin bir şey" değil, "sahip olduğun bir şey".
 *
 * ⛔ ADR-017'NİN REDDETTİĞİ OTP İLE KARIŞTIRILMAMALI. Orada reddedilen şey,
 * kodun SALDIRGANIN KENDİ e-postasına gitmesiydi; öyle bir kod hiçbir şey
 * kanıtlamadığı için "güvenlik tiyatrosu" sayılmıştı. Buradaki fark kanalın
 * sahibi: hedefi saldırgan seçemiyor, kurum rehberi belirliyor.
 *
 * ═══ ⚠️ CANLIDA BU AKIŞ TAMAMLANAMAZ — BİLİNEN VE KABUL EDİLEN SINIR ═══
 * Tohum personel adresleri `@ornek.test` uzantılı (`.test` rezerve bir alan
 * adı, oraya posta teslim edilemez) ve Resend'de doğrulanmış alan adımız yok
 * (teknik borç #25). Yani production'da kod hiçbir zaman ulaşmıyor ve kimse
 * YENİ personel yetkisi alamıyor. Bu bir gerileme değil, GÜVENLİ TARAFA
 * KAPANMA: önceki hâlde yetki yanlış bir kanıtla dağıtılıyordu. Mevcut
 * personel hesapları (tohumun işveren verisinden bağladıkları) etkilenmiyor.
 * Ekran bu sınırı kullanıcıya AÇIKÇA yazıyor — sessizce beklemeye bırakmıyor.
 *
 * KATMAN: bu dosya iş kurallarını tutar. HTTP, çerez ve durum kodu bilgisi
 * YOKTUR — onlar route katmanının işi (01-architecture.md).
 */

const PURPOSE = "staff_verification" as const;

/**
 * Akış kimliği — kullanıcının KENDİ hesabı.
 *
 * NEDEN AYRI BİR JETON YOK: kayıt ve şifre sıfırlama akışlarında kullanıcı
 * henüz giriş yapmamış olduğu için tarayıcıya rastgele bir jeton veriliyor.
 * Burada kullanıcı ZATEN girişli ve akışın sahibi oturumdan biliniyor; ikinci
 * bir jeton üretmek, hiçbir şey eklemeden korunacak yeni bir sır yaratırdı.
 *
 * Önek, kullanıcı kimliğinin kayıt akışı jetonlarıyla kazara çakışmasını
 * imkânsız kılıyor.
 */
function flowIdFor(userId: string): string {
  return `staff:${userId}`;
}

export type RequestStaffVerificationInput = {
  /** Oturumdan gelir; istemciden ASLA. */
  userId: string;
  workEmail: string;
  now?: Date;
};

export type RequestStaffVerificationResult = {
  /** Yalnızca local ve preview'da dolu — production'da her zaman `undefined`. */
  revealedCode?: string;
};

/**
 * 1. ADIM — kurumsal adrese kod gönderir.
 *
 * ═══ SIRA GÜVENLİK GEREĞİ ═══
 *  1. Hesabın durumu (zaten personel mi · kimliği doğrulanmış mı) — KENDİ
 *     hesabına dair bilgiler, dışarıya hiçbir şey sızdırmıyorlar ve gereksiz
 *     bir gönderimi baştan önlüyorlar.
 *  2. Kullanıcı bacağı bütçesi — tek hesabın rehberi taramasını kapatır.
 *  3. Adres bacağı bütçesi — GERÇEK/SAHTE AYRIMINDAN ÖNCE. Gerekçe aşağıda.
 *  4. Rehber sorgusu ve gönderim.
 *
 * ═══ ⛔ HESAP SAYIMI KORUMASI — YANIT HER ZAMAN AYNI ═══
 * Adres rehberde yoksa, personel işten ayrılmışsa veya kayıt zaten başka bir
 * hesaba bağlıysa akış SAHTE bir kod kaydı açıyor (`issueDecoyChallenge`,
 * şifre sıfırlamadaki desenin aynısı) ve çağırana yine "gönderildi" diyor.
 *
 * Kurumsal adreslerin KENDİSİ zaten herkese açık (`/hakkimizda` personel
 * rehberi onları listeliyor), yani gizlenen şey adresin varlığı değil:
 * **o personelin bu sitede hesabı olup olmadığı.** Bu, korunması gereken
 * gerçek bir kişisel veri.
 *
 * ⛔ GÖNDERİM BAŞARISIZ OLSA DA YANIT DEĞİŞMİYOR ve bu, şifre sıfırlamadaki
 * karardan BİLEREK ayrılıyor. Orada `unavailable` kullanıcıya söyleniyor,
 * çünkü orada bu NADİR bir arıza. Burada ise production'ın BEKLENEN durumu
 * (yukarıdaki `@ornek.test` sınırı): söylenseydi, "sağlayıcı hatası aldım
 * demek ki bu adres rehberde ve boşta" diyen KALICI bir sayım kanalı açılırdı.
 * Arıza yutulmuyor — `email-transport.ts` sunucu log'una yazıyor ve ekran
 * kullanıcıya sınırı zaten baştan söylüyor.
 */
export async function requestStaffVerification(
  input: RequestStaffVerificationInput,
): Promise<RequestStaffVerificationResult> {
  const now = input.now ?? new Date();

  await assertEligible(input.userId);
  await enforceUserBudget(input.userId, now);
  await enforceDestinationBudget(input.workEmail, now);

  const flowId = flowIdFor(input.userId);
  const staffMember = await findClaimableStaffMember(input.workEmail);

  if (!staffMember) {
    await issueDecoyChallenge({ registrationId: flowId, purpose: PURPOSE, now });

    return {};
  }

  const result = await issueOtp({
    registrationId: flowId,
    purpose: PURPOSE,
    destinationKind: "email",
    // Hedef DE teslimat adresi DE kurumsal adres: kod kullanıcının kendi
    // kutusuna değil, kurumun kaydındaki kutuya gidiyor. Bu satır akışın
    // güvenlik değerinin tamamı.
    destinationValue: input.workEmail,
    contactEmail: input.workEmail,
    userId: input.userId,
    now,
  });

  // `rate_limited` ve `unavailable` yutulmuyor, YANITA YANSITILMIYOR —
  // gerekçesi fonksiyon başlığındaki "hesap sayımı koruması" bölümünde.
  // Kayıt açılmadığı için kullanıcı ikinci adımda "kod geçersiz" görür ve
  // yeniden isteyebilir.
  return { revealedCode: result.outcome === "sent" ? result.revealedCode : undefined };
}

export type ConfirmStaffVerificationInput = {
  /** Oturumdan gelir; istemciden ASLA. */
  userId: string;
  workEmail: string;
  code: string;
  actorIp: string;
  now?: Date;
};

export type ConfirmStaffVerificationResult = {
  /** Ekranda "artık şu hizmetler açık" cümlesini kurmak için. */
  isStaff: true;
};

/**
 * 2. ADIM — kodu doğrular ve yetkiyi bağlar.
 *
 * ═══ SIRA GÜVENLİK GEREĞİ ═══
 *  1. Hesabın durumu — 1. adımdaki kapının aynısı. Arada kimlik bağı çözülmüş
 *     olabilir (adım 17b), o durumda yetki verilmemeli.
 *  2. ⛔ HEDEF BAĞLAMA — kod GERÇEKTEN bu adrese mi gitmişti. Bu kontrol
 *     olmadan, kendi adresine kod alan biri o kodu BAŞKA bir personelin
 *     adresiyle gönderip onun yetkisini alırdı. Kodu doğrulamadan ÖNCE
 *     yapılıyor ki yanlış hedefli bir istek deneme hakkı harcamasın.
 *  3. Kod doğrulaması — süre, deneme sayısı ve tek kullanımlık olma
 *     `verifyOtp` içinde.
 *  4. Rehber sorgusu — kayıt hâlâ sahiplenilebilir mi (5 dakikada bayatlamış
 *     olabilir).
 *  5. Tek koşullu yazma — son sözü veritabanı söylüyor.
 */
export async function confirmStaffVerification(
  input: ConfirmStaffVerificationInput,
): Promise<ConfirmStaffVerificationResult> {
  const now = input.now ?? new Date();

  await assertEligible(input.userId);

  const flowId = flowIdFor(input.userId);

  const boundToDestination = await pendingChallengeMatchesDestination(
    flowId,
    PURPOSE,
    input.workEmail,
  );

  if (!boundToDestination) throw new StaffVerificationCodeInvalidError();

  const verification = await verifyOtp({
    registrationId: flowId,
    purpose: PURPOSE,
    code: input.code,
    now,
  });

  if (verification.outcome === "too_many_attempts") {
    throw new StaffVerificationTooManyAttemptsError();
  }

  if (verification.outcome !== "verified") throw new StaffVerificationCodeInvalidError();

  /**
   * SAHTE AKIŞ BURAYA HİÇ ULAŞAMAZ: sahte kaydın kod özeti 32 rastgele
   * bayttan üretiliyor ve kullanıcının girebileceği hiçbir 6 haneli değer o
   * özete denk gelemez (`issueDecoyChallenge`). Yine de rehber sorgusu
   * tekrarlanıyor — kayıt bu 5 dakikada başka bir hesaba bağlanmış olabilir.
   */
  const staffMember = await findClaimableStaffMember(input.workEmail);

  if (!staffMember) throw new StaffVerificationCodeInvalidError();

  const outcome = await linkStaffMember({
    userId: input.userId,
    staffMemberId: staffMember.id,
  });

  // Yarışı KAYBEDEN istek: arada ya bu hesap personel oldu ya da kayıt başka
  // bir hesaba bağlandı. İkisi de kullanıcı için "bu kod artık işe yaramıyor".
  if (outcome === "staff_member_taken") throw new StaffVerificationCodeInvalidError();
  if (outcome === "not_eligible") throw new StaffAlreadyVerifiedError();

  /**
   * ⛔ YETKİ DEĞİŞİKLİĞİ DENETİM KAYDINA YAZILIR (CLAUDE.md §5.11).
   *
   * `role_change` kullanılıyor; enum'da adım 3'ten beri var, yeni değer
   * gerekmedi. Kayda KURUMSAL ADRES YAZILMIYOR: `entityId` hesabın kendi
   * kimliği. Kaydın cevaplaması gereken soru "bu hesap ne zaman personel
   * oldu"; adresin kendisi o soruyu cevaplamak için gerekmiyor.
   */
  await recordAuditLog({
    userId: input.userId,
    action: "role_change",
    entityType: "user",
    entityId: input.userId,
    ipHash: hashActorIp(input.actorIp),
  });

  return { isStaff: true };
}

/**
 * İki adımın ORTAK kapısı: hesap bu akışa uygun mu.
 *
 * NEDEN İKİ ADIMDA DA ÇAĞRILIYOR: ilk adımdan sonra kullanıcı kimlik bağını
 * çözmüş (adım 17b) veya başka bir sekmeden personel olmuş olabilir. Yalnızca
 * ilk adımda kontrol etmek, 5 dakikalık bir pencerede kuralı askıya alırdı.
 */
async function assertEligible(userId: string): Promise<void> {
  const eligibility = await findStaffEligibility(userId);

  // Hesap silinmişse oturum zaten geçersizdir (`session.repository.ts`); yine
  // de sessizce devam etmek yerine akış burada duruyor.
  if (eligibility === null) throw new StaffIdentityRequiredError();

  /**
   * SIRA ÖNEMLİ: "zaten personel" kontrolü kimlik kontrolünden ÖNCE.
   *
   * Personel olup kimlik bağını çözmüş bir hesap teorik olarak mümkün
   * (adım 17b çözmede yetkiyi de kaldırıyor, ama veri elle bozulabilir).
   * Öyle bir hesap "önce kimliğini doğrula" mesajı alsaydı, doğrulayıp geri
   * geldiğinde bu kez "zaten personelsin" mesajını görürdü — iki adım
   * boşuna atılmış olurdu.
   */
  if (eligibility.isStaff) throw new StaffAlreadyVerifiedError();
  if (eligibility.identityStatus !== "kps_verified") throw new StaffIdentityRequiredError();
}

/** Kullanıcı bacağı — rehber taramasını ve griefing'i kapatır. */
async function enforceUserBudget(userId: string, now: Date): Promise<void> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("staff_verification_send", "user", userId),
    limit: STAFF_VERIFICATION_USER_RATE_LIMIT_MAX,
    windowMs: STAFF_VERIFICATION_USER_RATE_LIMIT_WINDOW_MS,
    now,
  });

  if (!decision.allowed) throw new StaffVerificationRateLimitedError();
}

/**
 * Adres bacağı — GERÇEK/SAHTE AYRIMINDAN ÖNCE tüketiliyor.
 *
 * ⛔ SIRA BİLİNÇLİ. `issueOtp` kendi içinde `otp_send` sayacını yalnızca
 * GERÇEK yolda tüketiyor. Tek başına ona bırakılsaydı, dördüncü istekte 429
 * almak "bu adres rehberde ve boşta" demeye gelirdi; sahte yolda ise sayaç
 * hiç artmadığı için 429 hiç gelmezdi. Buradaki ayrı sayaç iki yolu da aynı
 * anda durduruyor.
 */
async function enforceDestinationBudget(workEmail: string, now: Date): Promise<void> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("staff_verification_send", "destination", workEmail),
    limit: STAFF_VERIFICATION_SEND_RATE_LIMIT_MAX,
    windowMs: STAFF_VERIFICATION_SEND_RATE_LIMIT_WINDOW_MS,
    now,
  });

  if (!decision.allowed) throw new StaffVerificationRateLimitedError();
}
