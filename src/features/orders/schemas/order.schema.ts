import { z } from "zod";

/**
 * Sipariş uçlarının girdi şemaları (03-api-guidelines.md: "her endpoint
 * girişi — body, query, params — Zod ile doğrulanır").
 *
 * İSTEMCİDEN YALNIZCA SİPARİŞ KİMLİĞİ ALINIYOR. Kimin siparişi olduğu, hangi
 * durumda olduğu, ne kadar iade edileceği — hepsi sunucuda okunuyor.
 * İstemcinin gönderdiği bir `userId` veya `amount` alanı olsaydı yok sayılırdı
 * (data-model.md).
 */

/**
 * Kayıt kimliği.
 *
 * `z.cuid()` kullanılmıyor: tohumlanmış satırlar okunabilir kimlikler taşıyor
 * ve katı bir cuid kontrolü onları reddederdi (randevu şemasıyla aynı gerekçe).
 * Üst sınır hizmet dışı bırakma önlemi.
 */
const recordId = z.string().trim().min(1).max(128);

/** `DELETE /api/orders/{id}` yol parametresi. */
export const orderIdSchema = z.object({
  id: recordId,
});
