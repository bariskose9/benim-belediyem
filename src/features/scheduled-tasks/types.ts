import type { z } from "zod";

import type {
  scheduledRunResponseSchema,
  scheduledTaskNameSchema,
  scheduledTaskOutcomeSchema,
} from "@/features/scheduled-tasks/schemas/scheduled-run.schema";

/**
 * Planlı görev sözleşmesi (ADR-007 · adım 16).
 *
 * Her görev tek bir işi yapar, kaç satır etkilediğini söyler ve HTTP bilmez.
 * Bölünmüşlüğün sebebi izlenebilirlik: biri patlarsa denetim kaydında hangi
 * işin patladığı yazar ve diğerleri çalışmaya devam eder.
 */

/**
 * Görevin SABİT adı — denetim kaydına `entityId` olarak yazılıyor.
 *
 * ⭐ DEĞER LİSTESİ ARTIK ŞEMADA (`schemas/scheduled-run.schema.ts`), tip oradan
 * türetiliyor. Sebebi borç #107: aynı dokuz ad hem burada bir birleşim hem de
 * yanıt şemasında bir `z.enum` olarak dursaydı, biri değişip diğeri unutulduğunda
 * belge sessizce yanlışa düşerdi.
 */
export type ScheduledTaskName = z.infer<typeof scheduledTaskNameSchema>;

export type ScheduledTaskContext = {
  /**
   * Koşunun referans anı — TEK BİR YERDEN geliyor.
   *
   * Her görev kendi `new Date()`'ini çağırsaydı aynı koşudaki görevler farklı
   * anlara bakardı ve "24 saatlik pay" hesabı görevden göreve kayardı. Ayrıca
   * test sahte saatle çalışamazdı (ADR-007'nin süre dolumu testi kuralı).
   */
  now: Date;
};

export type ScheduledTask = {
  name: ScheduledTaskName;
  /** Tek satır Türkçe açıklama — koşu özetinde ve log'da okunuyor. */
  description: string;
  /** Etkilenen satır sayısını döner (silinen, yazılan veya tahsil edilen). */
  run: (context: ScheduledTaskContext) => Promise<number>;
};

/**
 * Koşu sonucu ve özeti — ikisi de yanıt şemasından türetiliyor (borç #107).
 *
 * Bu iki tip HTTP yanıtının gövdesi olarak istemciye gidiyor; ayrı ayrı elle
 * yazılsalardı şemayla aralarındaki fark hiçbir yerde yakalanmazdı.
 */
export type ScheduledTaskOutcome = z.infer<typeof scheduledTaskOutcomeSchema>;

export type ScheduledRunSummary = z.infer<typeof scheduledRunResponseSchema>;
