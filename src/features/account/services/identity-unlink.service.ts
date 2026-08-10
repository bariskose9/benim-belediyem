import {
  AccountAlreadyDeletedError,
  IdentityNotLinkedError,
  IdentityUnlinkWouldLockAccountError,
} from "@/features/account/errors";
import {
  detachVerifiedIdentity,
  findAccountState,
} from "@/features/account/repositories/account-erasure.repository";
import {
  enforceDestructiveBudget,
  requirePasswordConfirmation,
} from "@/features/account/services/account-guards";
import { findLoginMethods } from "@/features/auth/repositories/google-account.repository";
import { recordAuditLog } from "@/lib/audit";
import { hashActorIp } from "@/lib/rate-limit";

/**
 * Kimlik bağını çözme — ADR-017 ilke 3: "her bağlama geri alınabilir olmalıdır".
 *
 * ═══ HANGİ SORUNU ÇÖZÜYOR ═══
 * Bir T.C. kimlik numarası yalnızca BİR hesaba bağlanabiliyor (PRD §5.0). Bağ
 * yanlış hesaba kurulmuşsa gerçek kişi kendi kimliğini bir daha
 * doğrulatamıyordu ve bunu düzeltecek hiçbir akış YOKTU — yalnızca elle
 * veritabanı müdahalesi. Bu servis o kapıyı açıyor: bağı kuran hesap, kendi
 * bağını çözebiliyor ve numara serbest kalıyor.
 *
 * ⚠️ BU, ADR-017'DEKİ ZAAFI TAMAMEN KAPATMIYOR ve kapatamaz: saldırgan
 * gönüllü olarak çözmezse kurban yine çaresiz. Gerçek çözüm, kanıtın sınıfını
 * değiştirmek (e-Devlet) — faz 2. Buradaki kazanç, geri alınamaz bir işlemin
 * geri alınabilir hâle gelmesi.
 *
 * ═══ ⛔ ÇÖZMEK GİRİŞ YOLUNU DA KAPATIYOR ═══
 * Şifreyle giriş kullanıcıyı T.C. numarasının ÖZETİNDEN buluyor
 * (`findAuthUserByNationalIdHash`). Bağ koptuğunda o yol ölüyor. Bu yüzden
 * kural: hesapta kimlikten BAĞIMSIZ bir giriş yolu (Google) yoksa çözmeye
 * izin verilmiyor. `login-methods.ts`'teki "son giriş yöntemi kaldırılamaz"
 * korumasının aynısı, başka bir kapıda.
 */

export type UnlinkIdentityInput = {
  /** Oturumdan gelir; istemciden ASLA. */
  userId: string;
  password: string | undefined;
  actorIp: string;
  now: Date;
};

export async function unlinkIdentity(input: UnlinkIdentityInput): Promise<void> {
  const [state, methods] = await Promise.all([
    findAccountState(input.userId),
    findLoginMethods(input.userId),
  ]);

  if (!state || !methods) throw new AccountAlreadyDeletedError();

  if (state.identityStatus !== "kps_verified") throw new IdentityNotLinkedError();

  // SIRA ÖNEMLİ: kilitlenme kontrolü şifre doğrulamasından ÖNCE. Kullanıcıya
  // önce şifresini yazdırıp sonra "zaten yapamazsın" demek boş bir emek.
  if (!methods.hasGoogle) throw new IdentityUnlinkWouldLockAccountError();

  await enforceDestructiveBudget(input.userId, input.now);

  await requirePasswordConfirmation({
    userId: input.userId,
    hasPassword: state.hasPassword,
    password: input.password,
  });

  const outcome = await detachVerifiedIdentity({
    userId: input.userId,
    fallbackFullName: fallbackDisplayName(state.email),
  });

  // Yarışı kaybeden istek: araya giren başka bir istek bağı zaten çözmüş.
  if (outcome.kind === "not_linked") throw new IdentityNotLinkedError();

  /**
   * ⛔ DENETİM KAYDINA KİMLİK NUMARASI YAZILMIYOR — `entityId` hesabın kendi
   * kimliği. Kaydın cevaplaması gereken soru "bu hesabın kimlik bağı ne zaman
   * çözüldü"; numaranın kendisi bu soruyu cevaplamıyor (CLAUDE.md §5.11).
   *
   * `identity_verify` işlemiyle AYNI enum değeri kullanılmıyor — yeni bir
   * değer (`identity_unlink`) eklendi, çünkü ikisi zıt yönde YETKİ
   * DEĞİŞİKLİKLERİ ve denetim kaydında ayırt edilemezlerse kayıt işe yaramaz.
   */
  await recordAuditLog({
    userId: input.userId,
    action: "identity_unlink",
    entityType: "user",
    entityId: input.userId,
    ipHash: hashActorIp(input.actorIp),
  });
}

/**
 * Kimlik çözüldükten sonra ekranda görünecek ad.
 *
 * `google-account.repository.ts` → `displayNameFor` ile AYNI yedek: e-postanın
 * `@` öncesi. Google ile açılmış bir hesapta kullanıcı zaten bunu görüyordu;
 * kimlik çözülünce hesap tam olarak o duruma dönüyor. KPS'ten gelen gerçek adı
 * tutmak, silinmiş bir kimliğin verisini saklamak olurdu.
 */
function fallbackDisplayName(email: string | null): string {
  const localPart = email?.split("@")[0]?.trim();

  // E-postası da olmayan hesap: Google bağlantısı zorunlu olduğu için pratikte
  // buraya düşülmüyor, ama `fullName` şemada zorunlu — boş bırakılamaz.
  return localPart && localPart.length > 0 ? localPart : "Doğrulanmamış kullanıcı";
}

/** Kimlik kartının çizilmesi için gereken durum. */
export type IdentityUnlinkState = {
  isLinked: boolean;
  /** Çözmeye izin var mı — yoksa ekran sebebini yazıyor. */
  canUnlink: boolean;
  requiresPassword: boolean;
  /** Çözünce şifreyle giriş kapanacak mı (kullanıcıya söylenmesi gereken bedel). */
  losesPasswordLogin: boolean;
};

export async function readIdentityUnlinkState(userId: string): Promise<IdentityUnlinkState | null> {
  const [state, methods] = await Promise.all([findAccountState(userId), findLoginMethods(userId)]);

  if (!state || !methods) return null;

  const isLinked = state.identityStatus === "kps_verified";

  return {
    isLinked,
    canUnlink: isLinked && methods.hasGoogle,
    requiresPassword: state.hasPassword,
    losesPasswordLogin: state.hasPassword,
  };
}
