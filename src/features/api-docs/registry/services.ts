import {
  appointmentIdSchema,
  createAppointmentSchema,
} from "@/features/appointments/schemas/appointment.schema";
import {
  eventIdSchema,
  holdSeatSchema,
  reservationIdSchema,
} from "@/features/events/schemas/seat-hold.schema";
import {
  attachmentPathSchema,
  createSupportTicketSchema,
  supportTicketIdSchema,
} from "@/features/support/schemas/support-ticket.schema";
import type { ApiOperation } from "@/features/api-docs/types";

/** Randevu, etkinlik koltuğu ve destek talebi uçları (adım 18b). */

const TAG_APPOINTMENT = "Hastane randevusu";
const TAG_EVENT = "Etkinlik koltuğu";
const TAG_SUPPORT = "Destek";

export const serviceOperations: ApiOperation[] = [
  {
    path: "/api/v1/appointments",
    method: "post",
    tag: TAG_APPOINTMENT,
    summary: "Hastane randevusu oluşturur.",
    description:
      "⛔ Yalnızca kurum personeline açıktır. Aynı saate iki kişi talip olabildiği için koruma " +
      "'önce oku sonra yaz' DEĞİL, tek koşullu yazma + etkilenen satır sayısı üzerinden çalışır. " +
      "⚠️ Randevunun branş bilgisi sağlıkla ilişkili sayılabilir (teknik borç #86).",
    access: "staff",
    requestBody: { schema: createAppointmentSchema },
    success: { status: 201, description: "Oluşturulan randevunun kimliği ve saati." },
    errors: ["SLOT_NOT_FOUND", "SLOT_TAKEN", "SLOT_IN_PAST", "ACTIVE_SPECIALTY_APPOINTMENT"],
    rateLimited: true,
  },
  {
    path: "/api/v1/appointments/{id}",
    method: "delete",
    tag: TAG_APPOINTMENT,
    summary: "Randevuyu iptal eder.",
    access: "staff",
    pathParams: [
      { name: "id", description: "Randevu kimliği.", schema: appointmentIdSchema.shape.id },
    ],
    success: { status: 204, description: "Randevu iptal edildi; saat yeniden açıldı." },
    errors: ["APPOINTMENT_NOT_FOUND", "APPOINTMENT_ALREADY_CANCELLED", "CANCELLATION_TOO_LATE"],
    rateLimited: true,
  },

  {
    path: "/api/v1/events/{eventId}/seat-holds",
    method: "post",
    tag: TAG_EVENT,
    summary: "Etkinlik koltuğunu geçici olarak tutar (10 dakika).",
    description:
      "⭐ YARIŞ KORUMASI DESENİ: benzersiz index + tek koşullu yazma. 'Önce boş mu diye bak, " +
      "boşsa yaz' iki ayrı adımdır ve iki kullanıcı arasındaki yarışı çözmez. " +
      "Süresi dolan kilitler okuma anındaki zaman koşuluyla serbest sayılır (ADR-007).",
    access: "authenticated",
    pathParams: [{ name: "eventId", description: "Etkinlik kimliği.", schema: eventIdSchema }],
    requestBody: { schema: holdSeatSchema },
    success: { status: 201, description: "Rezervasyon kimliği ve kilidin bitiş zamanı." },
    errors: [
      "EVENT_NOT_FOUND",
      "EVENT_STARTED",
      "SEAT_NOT_FOUND",
      "SEAT_TAKEN",
      "TOO_MANY_SEAT_HOLDS",
    ],
    rateLimited: true,
  },
  {
    path: "/api/v1/events/{eventId}/seat-holds/{reservationId}",
    method: "delete",
    tag: TAG_EVENT,
    summary: "Koltuk kilidini bırakır.",
    access: "authenticated",
    pathParams: [
      { name: "eventId", description: "Etkinlik kimliği.", schema: eventIdSchema },
      { name: "reservationId", description: "Rezervasyon kimliği.", schema: reservationIdSchema },
    ],
    success: { status: 204, description: "Kilit bırakıldı; koltuk serbest." },
    errors: ["SEAT_HOLD_NOT_FOUND"],
    rateLimited: true,
  },

  {
    path: "/api/v1/support-tickets",
    method: "post",
    tag: TAG_SUPPORT,
    summary: "Destek talebi oluşturur (ek dosya yüklenebilir).",
    description:
      "⛔ İSTEMCİNİN SÖYLEDİĞİ DOSYA TÜRÜNE GÜVENİLMEZ: tür, boyut ve **bayt imzası** sunucuda " +
      "doğrulanır, dosya adı sanitize edilir. Dosya uygulama sunucusundan değil ayrı depolamadan " +
      "servis edilir (ADR-014). ⭐ Talep durumu kolonda tutulmaz, okuma anında zamandan türetilir (ADR-013).",
    access: "authenticated",
    requestBody: { schema: createSupportTicketSchema, contentType: "multipart/form-data" },
    success: { status: 201, description: "Oluşturulan talebin kimliği." },
    errors: [
      "ATTACHMENT_REJECTED",
      "BOT_CHECK_REQUIRED",
      "BOT_CHECK_FAILED",
      "BOT_CHECK_UNAVAILABLE",
    ],
    rateLimited: true,
  },
  {
    path: "/api/v1/support-tickets/{ticketId}",
    method: "delete",
    tag: TAG_SUPPORT,
    summary: "Destek talebini iptal eder.",
    access: "authenticated",
    pathParams: [
      {
        name: "ticketId",
        description: "Destek talebi kimliği.",
        schema: supportTicketIdSchema.shape.ticketId,
      },
    ],
    success: { status: 204, description: "Talep iptal edildi." },
    errors: ["SUPPORT_TICKET_NOT_FOUND", "SUPPORT_TICKET_ALREADY_CLOSED", "TICKET_NOT_CANCELLABLE"],
    rateLimited: true,
  },
  {
    path: "/api/v1/support-tickets/{ticketId}/attachments/{attachmentId}",
    method: "get",
    tag: TAG_SUPPORT,
    summary: "Destek talebine eklenen dosyayı indirir.",
    description:
      "⛔ Sahiplik kontrolü zorunlu: dosya yalnızca talebi açan kullanıcıya servis edilir (IDOR). " +
      "Kimlik tahmin edilebilir olsa bile başkasının eki alınamaz.",
    access: "authenticated",
    pathParams: [
      {
        name: "ticketId",
        description: "Destek talebi kimliği.",
        schema: attachmentPathSchema.shape.ticketId,
      },
      {
        name: "attachmentId",
        description: "Ek dosya kimliği.",
        schema: attachmentPathSchema.shape.attachmentId,
      },
    ],
    success: { status: 200, description: "Dosyanın kendisi (ikili içerik)." },
    errors: ["SUPPORT_TICKET_NOT_FOUND", "ATTACHMENT_NOT_FOUND"],
    rateLimited: true,
  },
];
