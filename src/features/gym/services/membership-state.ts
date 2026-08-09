import {
  MEMBERSHIP_PAYMENT_GRACE_DAYS,
  MEMBERSHIP_RENEWAL_REMINDER_DAYS,
} from "@/config/constants";
import { addDays } from "@/features/gym/services/billing-period";
import type { MembershipRow } from "@/features/gym/types";

/**
 * Üyelik durumunun türetilmesi — ADR-013'ün spor salonundaki karşılığı.
 *
 * ═══ DURUM KOLONDAN OKUNMAZ ═══
 *
 * `memberships.status` yalnızca üyeliğin NASIL DOĞDUĞUNU (`active`), iptal
 * edilip edilmediğini (`cancelled`) ve son tahsilatın başarısız olup
 * olmadığını (`payment_pending`) tutar. Aradaki geçişler — vadesi geçmiş
 * üyeliğin "ödeme bekliyor" sayılması, ödeme süresi de dolmuş üyeliğin
 * pasifleşmesi, iptal edilmiş üyeliğin ödenmiş dönem sonunda bitmesi —
 * OKUMA ANINDA hesaplanır ve hiçbir yere yazılmaz.
 *
 * Sebebi PRD §5.6'da yazılı: "Görev hiç çalışmazsa üyelik kendiliğinden
 * pasifleşmez; vadesi geçmiş üyelik okuma anında `ödeme bekliyor` sayılır
 * (ADR-007)". Planlı görev henüz yok (adım 16) ve olduğunda da ücretsiz
 * planda günde bir çalışacak (teknik borç #3). Kolona güvenen bir ekran,
 * görev bir gün atladığında kullanıcıya yanlış durum gösterirdi.
 *
 * ⚠️ Durum okuyan HER YOL bu fonksiyondan geçmelidir.
 */

export type MembershipState = {
  /** Ekranda gösterilecek durum. */
  readonly status: "active" | "cancelled" | "payment_pending" | "expired";
  /** Tesise girebilir mi — kapı kararını bu verir, `status` metni değil. */
  readonly hasAccess: boolean;
  /**
   * Üyeliğin biteceği an (iptal edilmiş ya da yenilenmeyecekse).
   * Yenilenmeye devam eden üyelikte `null`.
   */
  readonly endsAt: Date | null;
  /** Ödeme bekleyen üyelikte, pasifleşmeye kalan son an. */
  readonly paymentDueBy: Date | null;
  /** Taahhüt hâlâ sürüyor mu — erken çıkış farkı bu soruya bağlı. */
  readonly isUnderCommitment: boolean;
};

type StateInput = Pick<
  MembershipRow,
  "storedStatus" | "autoRenewEnabled" | "nextBillingAt" | "commitmentEndsAt"
> & { readonly now: Date };

export function deriveMembershipState(input: StateInput): MembershipState {
  const isUnderCommitment = input.commitmentEndsAt !== null && input.now < input.commitmentEndsAt;

  const base = { isUnderCommitment, paymentDueBy: null, endsAt: null } as const;

  if (input.storedStatus === "expired") {
    return { ...base, status: "expired", hasAccess: false };
  }

  /**
   * Vade yoksa ilerletecek bir zaman ölçüsü de yok; kolon ne diyorsa o.
   * Pratikte yalnızca bozuk bir kayıtta oluşur, ama sessizce "aktif" saymak
   * ödeme yapmamış birine süresiz erişim vermek olurdu.
   */
  if (input.nextBillingAt === null) {
    return input.storedStatus === "active"
      ? { ...base, status: "active", hasAccess: true }
      : { ...base, status: "expired", hasAccess: false };
  }

  const graceEndsAt = addDays(input.nextBillingAt, MEMBERSHIP_PAYMENT_GRACE_DAYS);

  /**
   * İPTAL EDİLMİŞ ÜYELİK ÖDENMİŞ DÖNEMİN SONUNA KADAR ÇALIŞIR (PRD §5.6:
   * "taahhütsüz paket istendiği zaman iptal edilir; DÖNEM SONUNDA biter").
   * Erken çıkışta da aynısı geçerli: kullanıcı o ayın parasını ödedi, farkı
   * da ödedi; ayın ortasında kapıyı yüzüne kapatmak ikinci bir ceza olurdu.
   */
  if (input.storedStatus === "cancelled") {
    return input.now < input.nextBillingAt
      ? {
          ...base,
          status: "cancelled",
          hasAccess: true,
          endsAt: input.nextBillingAt,
        }
      : { ...base, status: "expired", hasAccess: false };
  }

  if (input.storedStatus === "payment_pending") {
    return input.now < graceEndsAt
      ? {
          ...base,
          status: "payment_pending",
          hasAccess: true,
          paymentDueBy: graceEndsAt,
        }
      : { ...base, status: "expired", hasAccess: false };
  }

  // Buradan sonrası `active`.
  if (input.now < input.nextBillingAt) {
    return {
      ...base,
      status: "active",
      hasAccess: true,
      endsAt: input.autoRenewEnabled ? null : input.nextBillingAt,
    };
  }

  /**
   * Vade geçmiş ama tahsilat denenmemiş: yenileme görevi henüz çalışmadı
   * (adım 16'ya kadar HİÇ çalışmayacak). Otomatik yenileme kapalıysa
   * yenilenecek bir şey de yok — üyelik dönem sonunda bitmiştir.
   */
  if (!input.autoRenewEnabled) {
    return { ...base, status: "expired", hasAccess: false };
  }

  return input.now < graceEndsAt
    ? { ...base, status: "payment_pending", hasAccess: true, paymentDueBy: graceEndsAt }
    : { ...base, status: "expired", hasAccess: false };
}

/**
 * Yenileme hatırlatması ŞİMDİ gönderilmeli mi (PRD §5.6: "yenilemeden 3 gün
 * önce hatırlatma bildirimi düşer").
 *
 * Saf: yalnızca "zamanı geldi mi" sorusunu cevaplar. Aynı hatırlatmanın iki
 * kez yazılmasını bu fonksiyon DEĞİL, `memberships.renewal_reminder_for_
 * billing_at` üzerindeki koşullu güncelleme engeller — "önce bak, yoksa yaz"
 * iki adımdır ve yarışı çözmez (adım 11'in dersi).
 */
export function isRenewalReminderDue(input: {
  autoRenewEnabled: boolean;
  nextBillingAt: Date | null;
  now: Date;
}): boolean {
  if (!input.autoRenewEnabled || input.nextBillingAt === null) return false;

  const windowOpensAt = addDays(input.nextBillingAt, -MEMBERSHIP_RENEWAL_REMINDER_DAYS);

  return input.now >= windowOpensAt && input.now < input.nextBillingAt;
}
