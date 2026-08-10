/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ScheduledTask } from "@/features/scheduled-tasks/types";

/**
 * Günlük koşunun DAYANIKLILIĞI (adım 16 · CLAUDE.md §5.9).
 *
 * Ölçülen tek şey şu: bir görev patladığında koşunun geri kalanı ne yapıyor?
 * Görevlerin kendi doğruluğu değil — onlar `tests/db/scheduled-tasks.test.ts`
 * içinde gerçek veritabanına karşı kanıtlanıyor.
 */

const registryMock = vi.hoisted(() => ({ DAILY_TASKS: [] as ScheduledTask[] }));
const auditMock = vi.hoisted(() => ({ recordAuditLog: vi.fn() }));

vi.mock("@/features/scheduled-tasks/services/task-registry", () => registryMock);
vi.mock("@/lib/audit", () => auditMock);
vi.mock("@/features/scheduled-tasks/services/system-actor", () => ({
  systemActorIpHash: () => "ip-hash",
}));

const NOW = new Date("2026-09-01T00:00:00.000Z");

function task(name: string, run: ScheduledTask["run"]): ScheduledTask {
  return { name: name as ScheduledTask["name"], description: name, run };
}

async function run() {
  const { runDailyTasks } = await import("@/features/scheduled-tasks/services/task-runner");

  return runDailyTasks(NOW);
}

beforeEach(() => {
  vi.resetModules();
  auditMock.recordAuditLog.mockReset();
  auditMock.recordAuditLog.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("mutlu yol", () => {
  it("her görevi çalıştırır ve etkilenen satırları özetler", async () => {
    registryMock.DAILY_TASKS = [
      task("cleanup_sessions", async () => 3),
      task("cleanup_rate_limits", async () => 7),
    ];

    const summary = await run();

    expect(summary.taskCount).toBe(2);
    expect(summary.failedCount).toBe(0);
    expect(summary.tasks.map((outcome) => outcome.affected)).toEqual([3, 7]);
  });

  it("her göreve AYNI anı verir", async () => {
    const seen: Date[] = [];

    registryMock.DAILY_TASKS = [
      task("cleanup_sessions", async ({ now }) => {
        seen.push(now);

        return 0;
      }),
      task("cleanup_rate_limits", async ({ now }) => {
        seen.push(now);

        return 0;
      }),
    ];

    await run();

    // Görevler kendi `new Date()`'ini çağırsaydı "24 saatlik pay" hesabı
    // görevden göreve kayardı.
    expect(seen[0]).toBe(seen[1]);
    expect(seen[0]).toBe(NOW);
  });

  it("her görev için denetim kaydı yazar", async () => {
    registryMock.DAILY_TASKS = [
      task("cleanup_sessions", async () => 0),
      task("cleanup_rate_limits", async () => 0),
    ];

    await run();

    expect(auditMock.recordAuditLog).toHaveBeenCalledTimes(2);
    expect(auditMock.recordAuditLog).toHaveBeenCalledWith({
      action: "scheduled_task_run",
      entityType: "scheduled_task",
      entityId: "cleanup_sessions",
      ipHash: "ip-hash",
    });
  });
});

describe("bir görev patladığında", () => {
  /**
   * ⛔ ASIL ÖLÇÜLEN KURAL. Tek bir `await` zinciri olsaydı ilk hata, o günün
   * kalan işlerini de silerdi: temizlik yapılmaz, aidat tahsil edilmezdi.
   */
  it("sonraki görevler yine de çalışır", async () => {
    const third = vi.fn().mockResolvedValue(5);

    registryMock.DAILY_TASKS = [
      task("cleanup_sessions", async () => 1),
      task("cleanup_rate_limits", async () => {
        throw new Error("veritabanı düştü");
      }),
      task("renew_memberships", third),
    ];

    const summary = await run();

    expect(third).toHaveBeenCalledOnce();
    expect(summary.failedCount).toBe(1);
    expect(summary.tasks.map((outcome) => outcome.status)).toEqual(["ok", "failed", "ok"]);
  });

  it("hata YUTULMUYOR — sunucu log'una yazılıyor", async () => {
    registryMock.DAILY_TASKS = [
      task("cleanup_sessions", async () => {
        throw new Error("veritabanı düştü");
      }),
    ];

    await run();

    expect(console.error).toHaveBeenCalledWith(
      "[CRON] görev başarısız: cleanup_sessions",
      expect.any(Error),
    );
  });

  it("patlayan görev sıfır satır etkilemiş sayılır", async () => {
    registryMock.DAILY_TASKS = [
      task("cleanup_sessions", async () => {
        throw new Error("yarıda kaldı");
      }),
    ];

    expect((await run()).tasks[0]!.affected).toBe(0);
  });
});

describe("denetim kaydı yazılamazsa", () => {
  /**
   * İş YAPILDI; kaydın kaybı işi geri almıyor. Görevi "başarısız" saymak,
   * ertesi gün gereksiz bir alarm üretirdi. Kayıp yine de log'a düşüyor.
   */
  it("görev başarılı sayılmaya devam eder", async () => {
    auditMock.recordAuditLog.mockRejectedValue(new Error("audit tablosu kilitli"));
    registryMock.DAILY_TASKS = [task("cleanup_sessions", async () => 4)];

    const summary = await run();

    expect(summary.failedCount).toBe(0);
    expect(summary.tasks[0]!.affected).toBe(4);
    expect(console.error).toHaveBeenCalledWith(
      "[CRON] denetim kaydı yazılamadı: cleanup_sessions",
      expect.any(Error),
    );
  });
});
