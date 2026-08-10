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
 * ⛔ BU DEĞERLER DENETİM KAYDINDA YAŞIYOR. Bir adı değiştirmek geçmiş kayıtları
 * öksüz bırakır; yeniden adlandırmak yerine yeni ad eklenip eskisi kaldırılır.
 */
export type ScheduledTaskName =
  | "cleanup_sessions"
  | "cleanup_registration_drafts"
  | "cleanup_otp_challenges"
  | "cleanup_rate_limits"
  | "cleanup_seat_holds"
  | "cleanup_external_cache"
  | "extend_doctor_calendar"
  | "send_renewal_reminders"
  | "renew_memberships";

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

export type ScheduledTaskOutcome = {
  name: ScheduledTaskName;
  status: "ok" | "failed";
  /** Başarısız görevde 0. */
  affected: number;
  durationMs: number;
};

export type ScheduledRunSummary = {
  startedAt: string;
  durationMs: number;
  taskCount: number;
  failedCount: number;
  tasks: ScheduledTaskOutcome[];
};
