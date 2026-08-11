import { systemActorIpHash } from "@/features/scheduled-tasks/services/system-actor";
import { DAILY_TASKS } from "@/features/scheduled-tasks/services/task-registry";
import type {
  ScheduledRunSummary,
  ScheduledTask,
  ScheduledTaskOutcome,
} from "@/features/scheduled-tasks/types";
import { recordAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * Günlük planlı görev koşusunu yürüten katman (ADR-007 · adım 16).
 *
 * ═══ ÜÇ KURAL ═══
 *
 * 1. **BİR GÖREV PATLARSA DİĞERLERİ ÇALIŞMAYA DEVAM EDER.** Tek bir `await`
 *    zinciri olsaydı, ilk hata gününün geri kalan sekiz işini de silerdi. Hata
 *    YUTULMUYOR: log'a yazılıyor, denetim kaydına `failed` düşüyor ve koşu
 *    özetinde görünüyor (CLAUDE.md §5.9 "sessiz hata kabul edilmez").
 *
 * 2. **GÖREVLER SIRAYLA ÇALIŞIR, PARALEL DEĞİL.** `Promise.all` daha hızlı
 *    olurdu ama dokuz görev aynı anda veritabanı bağlantısı isterdi; sunucusuz
 *    ortamda havuz küçüktür ve koşu kendi kendini boğardı. Hız burada bir
 *    ölçüt değil — iş gecenin köründe çalışıyor ve kimse beklemiyor.
 *
 * 3. **HER GÖREV KENDİ DENETİM KAYDINI YAZAR.** Cron "en iyi çaba" ile
 *    çalışıyor (Vercel dokümanı: kaçırılan koşu log bile üretmiyor), yani
 *    işin o gün gerçekten çalıştığının tek güvenilir kanıtı bu kayıt.
 *    Denetim kaydı yazılamazsa görev BAŞARISIZ sayılmıyor — iş zaten yapıldı;
 *    kaydın kaybı log'a düşüyor.
 *
 * ═══ EŞZAMANLI KOŞU İÇİN KİLİT YOK — BİLİNÇLİ ═══
 * Vercel dokümanı (2026-08-10) aynı zamanlanmış koşunun birden fazla kez
 * tetiklenebileceğini söylüyor ve iki çözüm öneriyor: **kilit** ya da
 * **idempotent görevler**. İkincisi seçildi, çünkü kilidin kendisi de paylaşılan
 * bir yere (Postgres) yazılmalı ve o kilit takılı kalırsa görev günlerce hiç
 * çalışmaz — kilidin arızası, çözdüğü sorundan büyük. Her görev iki kez
 * çalışmaya dayanıklı ve bu `tests/db/scheduled-tasks.test.ts` içinde
 * ÖLÇÜLÜYOR, varsayılmıyor.
 */

async function runSingleTask(task: ScheduledTask, now: Date): Promise<ScheduledTaskOutcome> {
  const startedAt = Date.now();

  try {
    const affected = await task.run({ now });

    return { name: task.name, status: "ok", affected, durationMs: Date.now() - startedAt };
  } catch (error) {
    logger.error("cron_task_failed", { task: task.name, error });

    return { name: task.name, status: "failed", affected: 0, durationMs: Date.now() - startedAt };
  }
}

async function auditOutcome(outcome: ScheduledTaskOutcome, ipHash: string): Promise<void> {
  try {
    await recordAuditLog({
      action: "scheduled_task_run",
      entityType: "scheduled_task",
      entityId: outcome.name,
      ipHash,
    });
  } catch (error) {
    logger.error("cron_audit_write_failed", { task: outcome.name, error });
  }
}

/**
 * Bütün günlük görevleri koşturur ve özetini döner.
 *
 * `now` dışarıdan veriliyor: aynı koşudaki her görev AYNI ana bakmalı, ayrıca
 * test sahte saatle çalışabilmeli.
 */
export async function runDailyTasks(now: Date): Promise<ScheduledRunSummary> {
  const startedAt = Date.now();
  const ipHash = systemActorIpHash();
  const outcomes: ScheduledTaskOutcome[] = [];

  for (const task of DAILY_TASKS) {
    const outcome = await runSingleTask(task, now);

    outcomes.push(outcome);
    await auditOutcome(outcome, ipHash);
  }

  return {
    startedAt: now.toISOString(),
    durationMs: Date.now() - startedAt,
    taskCount: outcomes.length,
    failedCount: outcomes.filter((outcome) => outcome.status === "failed").length,
    tasks: outcomes,
  };
}
