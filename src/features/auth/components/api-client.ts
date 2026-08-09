import type { ApiFailure, ApiSuccess } from "@/lib/http";

import { messages } from "@/config/messages";

/**
 * Kayıt ekranlarının kullandığı ince istemci.
 *
 * Sunucu zaten tek tip zarf döndürüyor (`{data}` / `{error}`); bu yardımcı
 * yalnızca onu açıyor ve ağ hatasını da aynı biçime çeviriyor, böylece
 * bileşenlerde iki ayrı hata yolu olmuyor.
 */

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; code: string; message: string; details?: unknown };

export async function apiRequest<T>(
  path: string,
  init: { method: string; body?: unknown } = { method: "GET" },
): Promise<ApiResult<T>> {
  /**
   * `FormData` gövdesi OLDUĞU GİBİ gönderilir ve `content-type` ELLE
   * YAZILMAZ: sınır dizesini (boundary) tarayıcı üretiyor, başlığı elle
   * yazmak onu düşürür ve sunucu gövdeyi ayrıştıramaz. Dosya taşıyan tek
   * uç destek talebi oluşturma (ADR-014).
   */
  const isMultipart = init.body instanceof FormData;

  try {
    const response = await fetch(path, {
      method: init.method,
      headers: init.body && !isMultipart ? { "content-type": "application/json" } : undefined,
      body: isMultipart
        ? (init.body as FormData)
        : init.body
          ? JSON.stringify(init.body)
          : undefined,
      // Kayıt yanıtları kişisel veri taşıyor; tarayıcı önbelleğine girmemeli.
      cache: "no-store",
    });

    if (response.status === 204) return { ok: true, data: undefined as T };

    const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;

    if (!response.ok || "error" in payload) {
      const error = "error" in payload ? payload.error : undefined;

      return {
        ok: false,
        code: error?.code ?? "UNKNOWN",
        message: error?.message ?? messages.errors.unexpected,
        details: error?.details,
      };
    }

    return { ok: true, data: payload.data };
  } catch {
    // Ağ kopması: kullanıcıya iç detay değil, ne yapacağı söylenir.
    return { ok: false, code: "NETWORK_ERROR", message: messages.errors.unexpected };
  }
}
