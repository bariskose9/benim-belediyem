import { assertCronRequestAuthorized } from "@/features/scheduled-tasks/services/cron-auth";
import { runDailyTasks } from "@/features/scheduled-tasks/services/task-runner";
import { InternalError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";

/**
 * `GET /api/cron/daily` — günlük planlı görev koşusu (ADR-007 · adım 16).
 *
 * ═══ NEDEN `GET` ═══
 * Yazma yapan bir uç için alışılmış tercih `POST` olurdu, ama Vercel'in
 * zamanlayıcısı yapılandırılan yola **GET** isteği atıyor (2026-08-10'da
 * dokümandan doğrulandı) ve metodu değiştirmenin bir yolu yok. Uç bu yüzden
 * `GET` — ama herkese açık bir okuma ucu DEĞİL: `CRON_SECRET` kapısı önünde
 * duruyor ve yanıtı hiçbir yerde önbelleklenmiyor.
 *
 * ═══ NEDEN SONUÇ GÖVDEDE DÖNÜYOR ═══
 * Vercel başarısız bir cron'u YENİDEN DENEMİYOR ve kaçırılan koşu log bile
 * üretmiyor. Yanıt gövdesi, panelden "View Logs" ile bakan birinin hangi işin
 * kaç satır etkilediğini tek bakışta görmesini sağlıyor.
 */

// Zamanlayıcının tetiklediği bir iş asla önbellekten servis edilmemeli.
export const dynamic = "force-dynamic";

/**
 * Fonksiyon süresi üst sınırı.
 *
 * Dokuz görev sırayla çalışıyor ve en uzunu tahsilat (üyelik başına sahte
 * ödeme çağrısı, gecikme simülasyonlu). Sınır olmadan takılan bir görev
 * platformun varsayılanına kadar bekletirdi; sınıra dayanan koşu ertesi gün
 * kaldığı yerden devam eder — her görev idempotent.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    assertCronRequestAuthorized(request.headers);
  } catch (error) {
    return fail(error);
  }

  try {
    const summary = await runDailyTasks(new Date());

    /**
     * Bir görev bile patladıysa yanıt 500.
     *
     * ⛔ "Kısmen başarılı" diye 200 dönmek, Vercel panelinde koşuyu YEŞİL
     * gösterirdi ve arıza sessizce yaşardı (CLAUDE.md §5.9). Özet yine
     * gövdede: hangi işin çalıştığı, hangisinin patladığı görünür kalıyor.
     */
    if (summary.failedCount > 0) {
      return fail(new InternalError(), summary);
    }

    return ok(summary, { noStore: true });
  } catch (error) {
    // Buraya yalnızca çalıştırıcının kendisi patlarsa düşülür (örn. veritabanı
    // hiç ayakta değil). İç detay `fail()` içinde log'a yazılır, istemciye gitmez.
    return fail(new InternalError({ cause: error }));
  }
}
