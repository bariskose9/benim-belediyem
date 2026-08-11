import { AccountAlreadyDeletedError } from "@/features/account/errors";
import { enforceDestructiveBudget } from "@/features/account/services/account-guards";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { hashActorIp } from "@/lib/rate-limit";

/**
 * İletişim bilgisi güncelleme — bugün yalnızca cep telefonu (teknik borç #80).
 *
 * ═══ ⛔ NUMARA "DOĞRULANMAMIŞ" OLARAK YAZILIYOR ═══
 * `phoneVerifiedAt` NULL'a çekiliyor ve ekranda "doğrulanmadı" görünüyor.
 * Bir OTP adımı EKLENMEDİ ve bu bilinçli bir karar, eksiklik değil:
 *
 * Bu projede telefon doğrulaması SİMÜLE (teknik borç #1) — kod telefona
 * değil kullanıcının KENDİ E-POSTASINA gidiyor. Yani "doğrulama" adımı,
 * numaranın kullanıcıya ait olduğunu kanıtlamıyor; yalnızca kullanıcının
 * kendi e-postasına erişebildiğini kanıtlıyor ki bunu oturum zaten
 * kanıtlamış durumda. ADR-017 aynı gerekçeyle kimlik doğrulamasına OTP
 * eklemeyi reddetti: "kod saldırganın kendi kanalına gidiyor — güvenlik
 * tiyatrosu olurdu". Aynı akıl yürütme burada da geçerli.
 *
 * Doğru davranış, kanıt üretmeyen bir adımı kanıtmış gibi göstermek yerine
 * kanıtın YOKLUĞUNU ekranda yazmak. Gerçek SMS sağlayıcısı geldiğinde
 * `OtpChannel`'ın yeni bir uygulaması yazılır ve bu servise bir doğrulama
 * adımı eklenir — akış değişmez.
 *
 * ═══ NEDEN "GERİ ALINAMAZ İŞLEM" BÜTÇESİ ═══
 * İletişim kanalı bir hesap kurtarma yüzeyi. Silme ve kimlik çözmeyle aynı
 * sayaca yazılıyor ki bu üç uç birlikte bir kötüye kullanım penceresi
 * oluşturmasın.
 */

export type UpdatePhoneInput = {
  /** Oturumdan gelir; istemciden ASLA. */
  userId: string;
  /** `turkishPhoneSchema`'dan geçmiş, normalize edilmiş numara. */
  phone: string;
  actorIp: string;
  now: Date;
};

export async function updateAccountPhone(input: UpdatePhoneInput): Promise<void> {
  await enforceDestructiveBudget(input.userId, input.now);

  /**
   * Tek koşullu yazma: silinmiş hesap `deletedAt: null` süzgecine takılıp
   * sessizce 0 satır günceller (`updateUserPassword` ile aynı desen).
   */
  const result = await prisma.user.updateMany({
    where: { id: input.userId, deletedAt: null },
    data: { phone: input.phone, phoneVerifiedAt: null },
  });

  if (result.count !== 1) throw new AccountAlreadyDeletedError();

  /**
   * ⛔ DENETİM KAYDINA NUMARA YAZILMIYOR — `entityId` hesabın kendi kimliği.
   * Kaydın cevaplaması gereken soru "bu hesabın iletişim bilgisi ne zaman
   * değişti"; numaranın kendisi kişisel veridir ve log'a yazılmaz
   * (CLAUDE.md §5.11 · `lib/audit.ts` imzasında zaten yeri yok).
   */
  await recordAuditLog({
    userId: input.userId,
    action: "contact_update",
    entityType: "user",
    entityId: input.userId,
    ipHash: hashActorIp(input.actorIp),
  });
}
