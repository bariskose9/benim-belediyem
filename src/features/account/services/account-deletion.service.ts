import { AccountAlreadyDeletedError } from "@/features/account/errors";
import {
  eraseAccountPersonalData,
  findAccountState,
} from "@/features/account/repositories/account-erasure.repository";
import {
  enforceDestructiveBudget,
  requirePasswordConfirmation,
} from "@/features/account/services/account-guards";
import { findLiveMembership } from "@/features/gym/repositories/membership.repository";
import { recordAuditLog } from "@/lib/audit";
import { hashActorIp } from "@/lib/rate-limit";

/**
 * "Hesabımı sil" (PRD §5.11 · KVKK Yönetmeliği m.12).
 *
 * ═══ BU İŞLEM "SİLME"DİR, "ANONİMLEŞTİRME" DEĞİL ═══
 * Kişisel veriler siliniyor (m.12/1-a); mali kayıtlar TTK m.82 gereği 10 yıl
 * saklandığı için o talep kısmen ve GEREKÇESİ AÇIKLANARAK karşılanıyor
 * (m.12/1-c). Kullanıcı neyin kaldığını silmeden ÖNCE ekranda, sonra da
 * `/hesap-silindi` sayfasında görüyor — bildirme yükümlülüğü budur.
 *
 * ═══ SIRA GÜVENLİK GEREĞİ ═══
 *  1. Hesabın durumu — şifresi var mı, silinmiş mi.
 *  2. Bütçe — bu uç aynı zamanda bir şifre deneme yüzeyi.
 *  3. Şifre yeniden doğrulaması — çalınmış oturum tek başına yetmesin.
 *  4. Silme (tek transaction).
 *  5. Denetim kaydı.
 *
 * ⛔ DENETİM KAYDI SİLMEDEN SONRA YAZILIYOR VE HESAPLA BİRLİKTE SİLİNMİYOR.
 * Yönetmelik m.7/3: imha işlemlerinin kaydı en az üç yıl saklanır. Kaydı önce
 * yazmak da yanlış olurdu — silme patlarsa olmamış bir olay kayda geçerdi.
 *
 * KATMAN: HTTP, çerez ve yönlendirme route'un işi; burada yalnızca iş kuralı.
 */

export type DeleteAccountInput = {
  /** Oturumdan gelir; istemciden ASLA. */
  userId: string;
  /** Hesabın şifresi varsa zorunlu (`account-guards.ts`). */
  password: string | undefined;
  actorIp: string;
  now: Date;
};

export async function deleteAccount(input: DeleteAccountInput): Promise<void> {
  const state = await findAccountState(input.userId);

  if (!state) throw new AccountAlreadyDeletedError();

  await enforceDestructiveBudget(input.userId, input.now);

  await requirePasswordConfirmation({
    userId: input.userId,
    hasPassword: state.hasPassword,
    password: input.password,
  });

  const outcome = await eraseAccountPersonalData({
    userId: input.userId,
    deletedAt: input.now,
  });

  // Yarışı kaybeden istek: araya giren başka bir istek hesabı zaten silmiş.
  // Kullanıcının istediği sonuç gerçekleşti ama İKİNCİ bir denetim kaydı
  // yazmak, olmamış bir silmeyi kayda geçirmek olurdu.
  if (outcome.kind === "already_deleted") throw new AccountAlreadyDeletedError();

  await recordAuditLog({
    userId: input.userId,
    action: "account_delete",
    entityType: "user",
    entityId: input.userId,
    ipHash: hashActorIp(input.actorIp),
  });
}

/**
 * Silme ekranının çizilmesi için gereken durum.
 *
 * ⚠️ TAAHHÜTLÜ ÜYELİK UYARISI PRD §5.11'İN AÇIK İSTEĞİ: "Aktif taahhütlü
 * üyeliği olan kullanıcı silmeden önce uyarılır." Uyarı kararı SUNUCUDA
 * veriliyor; ekran yalnızca çiziyor.
 */
export type AccountDeletionState = {
  /** Şifre alanı gösterilecek mi (Google ile açılmış hesapta gösterilmez). */
  requiresPassword: boolean;
  /** Yaşayan üyelik var mı — yenileme duracak. */
  hasLiveMembership: boolean;
  /** Taahhüt hâlâ sürüyor mu — erken çıkış farkı doğurabilir. */
  hasOpenCommitment: boolean;
};

export async function readAccountDeletionState(input: {
  userId: string;
  now: Date;
}): Promise<AccountDeletionState | null> {
  const [state, membership] = await Promise.all([
    findAccountState(input.userId),
    findLiveMembership(input.userId),
  ]);

  if (!state) return null;

  return {
    requiresPassword: state.hasPassword,
    hasLiveMembership: membership !== null,
    hasOpenCommitment:
      membership?.commitmentEndsAt != null && membership.commitmentEndsAt > input.now,
  };
}
