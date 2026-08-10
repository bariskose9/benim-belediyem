import { MEMBERSHIP_RENEWAL_REMINDER_DAYS, RENEWAL_BATCH_LIMIT } from "@/config/constants";
import {
  listMembershipsDueForRenewal,
  listMembershipsDueForReminder,
} from "@/features/gym/repositories/membership.repository";
import { addDays } from "@/features/gym/services/billing-period";
import { renewMembershipPeriod } from "@/features/gym/services/membership-billing";
import { syncMembershipNotifications } from "@/features/notifications/services/membership-notification.service";
import { systemActorIpHash } from "@/features/scheduled-tasks/services/system-actor";
import type { ScheduledTask } from "@/features/scheduled-tasks/types";

/**
 * Aidat tahsilatı ve yenileme hatırlatması (PRD §5.6 · teknik borç #55).
 *
 * ═══ TAHSİLAT MANTIĞI BURADA DEĞİL ═══
 * `renewMembershipPeriod()` adım 12'de yazıldı ve testlerde kanıtlandı; bu
 * dosya yalnızca "kimler vadesi gelmiş" sorusunu sorup onu çağırıyor. Mantığın
 * kopyalanmaması bilinçli: kopya, iki yerden birinin düzeltilip diğerinin
 * unutulmasının en kısa yolu.
 */

/**
 * Aynı dönem için AYNI anahtar — idempotentliğin taşıyıcısı.
 *
 * `membership_payments.idempotency_key` benzersiz. Görev aynı gün iki kez
 * çalışırsa ikinci çağrı aynı anahtarı üretir ve satır yazılamaz; ayrıca
 * `advanceBillingPeriod`'ın koşullu güncellemesi de ikinci kez tutmaz.
 * PRD §5.6 kabul kriteri: "Yenileme işi iki kez çalışırsa kullanıcıdan iki kez
 * tahsilat yapılmaz."
 *
 * ⛔ RASTGELE DEĞER (UUID) OLAMAZ: kullanıcı akışlarında istemci her denemede
 * aynı UUID'yi gönderiyor, burada gönderecek istemci yok. Anahtarın kendisi
 * dönemden TÜRETİLMEK zorunda.
 */
function renewalIdempotencyKey(membershipId: string, periodStart: Date): string {
  return `renewal:${membershipId}:${periodStart.toISOString()}`;
}

export const renewMembershipsTask: ScheduledTask = {
  name: "renew_memberships",
  description: "Vadesi gelen spor salonu üyeliklerinin aidatını tahsil eder",
  run: async ({ now }) => {
    const due = await listMembershipsDueForRenewal({ now, limit: RENEWAL_BATCH_LIMIT });
    let charged = 0;

    for (const membership of due) {
      const periodStart = membership.nextBillingAt;

      // Sorgu `nextBillingAt <= now` diyor, yani `null` gelemez. Yine de tip
      // daraltması için kontrol ediliyor — sessizce `!` koymak, sorgunun bir
      // gün değişmesi hâlinde çalışma anında patlardı.
      if (periodStart === null) continue;

      /**
       * ⛔ TEK ÜYELİĞİN HATASI KOŞUYU DURDURMAZ. Bir kullanıcının kartı
       * sağlayıcıda beklenmedik bir hata üretirse, arkasındaki 199 üyelik de
       * tahsil edilemeden koşu ölürdü. Hata yutulmuyor: sunucu log'una
       * yazılıyor ve görev "başarılı" saymadığı için sayaca da girmiyor.
       */
      try {
        const outcome = await renewMembershipPeriod({
          membership,
          idempotencyKey: renewalIdempotencyKey(membership.id, periodStart),
          now,
          actorIpHash: systemActorIpHash(),
        });

        if (outcome.status === "charged") charged += 1;
      } catch (error) {
        console.error("[CRON] üyelik yenilemesi başarısız", { membershipId: membership.id, error });
      }
    }

    return charged;
  },
};

/**
 * Yenilemeden 3 gün önce hatırlatma bildirimi (PRD §5.6).
 *
 * ═══ NEDEN `syncMembershipNotifications` ÇAĞIRIYOR ═══
 * Aynı hatırlatma ekran açıldığında da yazılabiliyor (tembel yol, ADR-013).
 * Görev ikinci bir yazma yolu açsaydı iki yerde iki ayrı "zamanı geldi mi"
 * kuralı olurdu. Onun yerine görev, kullanıcı ekrana bakmış gibi AYNI
 * fonksiyonu çağırıyor — kural tek yerde kalıyor ve çift yazmayı yine
 * `claimRenewalReminder`'ın koşullu güncellemesi engelliyor.
 *
 * Bedeli kullanıcı başına fazladan bir indeksli okuma; karşılığı iki kod
 * yolunun asla birbirinden kaymaması.
 */
export const sendRenewalRemindersTask: ScheduledTask = {
  name: "send_renewal_reminders",
  description: "Yenilemesine 3 gün kalan üyeliklere hatırlatma bildirimi yazar",
  run: async ({ now }) => {
    const due = await listMembershipsDueForReminder({
      now,
      windowOpensBefore: addDays(now, MEMBERSHIP_RENEWAL_REMINDER_DAYS),
      limit: RENEWAL_BATCH_LIMIT,
    });

    let written = 0;

    for (const membership of due) {
      try {
        written += await syncMembershipNotifications({ userId: membership.userId, now });
      } catch (error) {
        console.error("[CRON] yenileme hatırlatması yazılamadı", {
          membershipId: membership.id,
          error,
        });
      }
    }

    return written;
  },
};
