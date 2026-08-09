import { z } from "zod";

import {
  SUPPORT_DESCRIPTION_MAX_LENGTH,
  SUPPORT_DESCRIPTION_MIN_LENGTH,
  SUPPORT_SUBJECT_MAX_LENGTH,
  SUPPORT_SUBJECT_MIN_LENGTH,
} from "@/config/constants";

/**
 * Destek uçlarının girdi şemaları (03-api-guidelines.md: "her endpoint girişi —
 * body, query, params — Zod ile doğrulanır").
 *
 * İSTEMCİDEN YALNIZCA KONU, AÇIKLAMA VE BOT JETONU ALINIYOR. Talebin sahibi
 * oturumdan, durumu kuraldan, ekin türü ve boyutu baytlardan okunuyor.
 * İstemcinin göndereceği bir `userId` veya `status` alanı olsaydı yok sayılırdı
 * (data-model.md).
 *
 * ⚠️ DOSYALAR BU ŞEMADA YOK ve bu bilinçli: `File` bir tarayıcı nesnesi,
 * güvenliği uzunluk kontrolüyle değil İÇERİĞİN İMZASIYLA sağlanıyor
 * (`file-upload.ts`). Zod'a "dosya var mı" diye sordurmak, gerçek kontrolün
 * yapıldığı yeri gizlerdi.
 */

/**
 * Kayıt kimliği.
 *
 * `z.cuid()` kullanılmıyor: sipariş ve randevu şemalarındaki aynı gerekçe —
 * tohumlanmış satırlar okunabilir kimlikler taşıyabiliyor. Üst sınır hizmet
 * dışı bırakma önlemi.
 */
const recordId = z.string().trim().min(1).max(128);

/**
 * Formun metin alanları.
 *
 * `trim()` doğrulamadan ÖNCE: yalnızca boşluktan oluşan bir açıklama "20
 * karakter" şartını geçmemeli.
 */
export const createSupportTicketSchema = z.object({
  subject: z.string().trim().min(SUPPORT_SUBJECT_MIN_LENGTH).max(SUPPORT_SUBJECT_MAX_LENGTH),
  description: z
    .string()
    .trim()
    .min(SUPPORT_DESCRIPTION_MIN_LENGTH)
    .max(SUPPORT_DESCRIPTION_MAX_LENGTH),
  /**
   * Cloudflare Turnstile jetonu (PRD §5.7 · §5.0 · ADR-004).
   *
   * BOŞ STRING KABUL EDİLİYOR ve bu bilinçli — kayıt, giriş ve şifre
   * sıfırlama şemalarındaki aynı karar. "Jeton hiç gönderilmedi" durumu bir
   * ŞEMA HATASI (422) değil, BOT DOĞRULAMASI HATASI (400) olarak dönmeli:
   * kullanıcıya "istek geçersiz" demek yanlış alanı işaret eder, oysa yapması
   * gereken kutuyu işaretlemek.
   *
   * Üst sınır var: jeton uzunluğu Cloudflare tarafında sabit değil ama
   * sınırsız bir alan, doğrulamaya hiç girmeden bellek yiyen bir yüzeydir.
   */
  turnstileToken: z.string().max(4096).default(""),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;

/** `GET /destek/{id}` ve kapatma ucunun yol parametresi. */
export const supportTicketIdSchema = z.object({
  ticketId: recordId,
});

/** Ek servis eden ucun yol parametreleri. */
export const attachmentPathSchema = z.object({
  ticketId: recordId,
  attachmentId: recordId,
});
