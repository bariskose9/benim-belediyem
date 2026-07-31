import { NextResponse } from "next/server";

import { type AppError, toAppError } from "@/lib/errors";

/**
 * Tek tip API yanıt formatı (docs/standards/03-api-guidelines.md).
 * Tüm route handler'lar yanıtı buradan üretir — format tek yerde kalır.
 */

export type ApiMeta = { page?: number; limit?: number; total?: number };

export type ApiSuccess<T> = { data: T; meta?: ApiMeta };

export type ApiFailure = {
  error: { code: string; message: string; details?: unknown };
};

export type OkOptions = {
  meta?: ApiMeta;
  /**
   * Yanıtın hiçbir yerde önbelleklenmemesi gerekiyorsa `true`.
   *
   * `export const dynamic = "force-dynamic"` yalnızca Next'in kendi render
   * davranışını değiştirir; yanıta `Cache-Control` başlığı EKLEMEZ. Başlık
   * olmadan araya giren bir CDN cevabı dondurabilir — sağlık ucu gibi
   * "şu anki durum" bildiren uçlarda bu sessiz bir arızaya dönüşür.
   */
  noStore?: boolean;
};

export function ok<T>(data: T, options?: OkOptions): NextResponse<ApiSuccess<T>> {
  const body = options?.meta ? { data, meta: options.meta } : { data };

  return NextResponse.json(body, {
    status: 200,
    headers: options?.noStore ? { "Cache-Control": "no-store, max-age=0" } : undefined,
  });
}

/**
 * 201 yanıtı — HER ZAMAN `no-store`.
 *
 * `ok()`'teki gibi seçmeli değil: "oluşturuldu" yanıtları bu projede kimlik
 * bilgisi, maskeli iletişim bilgisi veya doğrulama durumu taşıyor ve araya
 * giren bir CDN bunları başka bir kullanıcıya servis edemez.
 */
export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    { data },
    { status: 201, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Hatayı istemciye güvenli biçimde yazar.
 *
 * Beklenmeyen hatalar `InternalError`'a çevrildiği için stack trace, SQL veya
 * dosya yolu istemciye gitmez; orijinali sunucu log'una düşer.
 */
export function fail(error: unknown, details?: unknown): NextResponse<ApiFailure> {
  const appError: AppError = toAppError(error);

  if (appError.status >= 500) {
    // Sunucu tarafı kayıt: Sentry adım 18'de bağlanacak (roadmap teknik borç).
    console.error(`[${appError.code}]`, appError.cause ?? appError);
  }

  return NextResponse.json(
    {
      error: {
        code: appError.code,
        message: appError.userMessage,
        ...(details === undefined ? {} : { details }),
      },
    },
    {
      status: appError.status,
      // Hata yanıtı hiçbir zaman önbelleklenmez: geçici bir arıza kalıcı gibi
      // görünmemeli, düzeldiğinde kullanıcı hâlâ eski hatayı almamalı.
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
