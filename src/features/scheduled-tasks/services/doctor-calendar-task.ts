import { DOCTOR_CALENDAR_HORIZON_DAYS } from "@/config/constants";
import {
  insertMissingSlots,
  listAllDoctorIds,
} from "@/features/appointments/repositories/doctor-slot.repository";
import {
  buildCalendarSlotTimes,
  startOfUtcDay,
} from "@/features/appointments/services/slot-calendar";
import type { ScheduledTask } from "@/features/scheduled-tasks/types";

/**
 * Doktor takvimini her gün bir gün ileri kaydırır (teknik borç #38).
 *
 * ═══ NEDEN GEREKLİYDİ ═══
 * Tohumlama, çalıştığı günden itibaren 14 günlük takvim yazıyor. Preview ve
 * production 2026-08-01'de tohumlandı, yani saatler ~2026-08-15'te bitiyordu
 * ve o tarihten sonra hastane ekranı "boş saat kalmamış" gösterecekti — çökme
 * değil, ama ürünün sessizce ölmesi.
 *
 * ═══ NEDEN "EKSİKLERİ TAMAMLA", "BİR GÜN EKLE" DEĞİL ═══
 * Görev her koşuda bugünden itibaren TÜM ufku üretip yazmayı deniyor; var
 * olanları veritabanı atlıyor (`skipDuplicates`). Böylece görev bir hafta hiç
 * çalışmazsa (cron "en iyi çaba" ile çalışır — Vercel) ilk koşu boşluğun
 * tamamını kapatıyor. "Bugüne bir gün ekle" yaklaşımı, kaçırılan her günü
 * kalıcı bir delik olarak bırakırdı.
 *
 * ⛔ GEÇMİŞE YAZMIYOR: ufuk `startOfUtcDay(now)`'dan başlıyor.
 */
export const extendDoctorCalendarTask: ScheduledTask = {
  name: "extend_doctor_calendar",
  description: `Doktor takvimini ${DOCTOR_CALENDAR_HORIZON_DAYS} gün ileriye kadar doldurur`,
  run: async ({ now }) => {
    const doctorIds = await listAllDoctorIds();

    if (doctorIds.length === 0) return 0;

    const slotTimes = buildCalendarSlotTimes({
      from: startOfUtcDay(now),
      days: DOCTOR_CALENDAR_HORIZON_DAYS,
    });

    const rows = doctorIds.flatMap((doctorId) =>
      slotTimes.map((startsAt) => ({ doctorId, startsAt })),
    );

    return insertMissingSlots(rows);
  },
};
