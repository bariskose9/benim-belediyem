import type { ZodType } from "zod";

import { INFO_WIDGET_MAX_STALE_MS } from "@/config/constants";
import type { ExternalFetchResult } from "@/lib/external-fetch";

import { readCacheEntry, writeCacheEntry } from "../repositories/external-cache.repository";
import type { WidgetResult } from "../types";

/**
 * Önbellekli okuma — ADR-015'in okuma yolunun TAMAMI burada, tek yerde.
 *
 * Üç sağlayıcının üçü de bu fonksiyondan geçer; "önce önbelleğe bak" kuralını
 * her sağlayıcıda yeniden yazmak, birinde unutmanın en kısa yoludur.
 *
 * ┌ taze kayıt var        → dış çağrı HİÇ yapılmaz
 * ├ yok / süresi geçmiş   → çağrılır, başarılıysa yazılır
 * ├ çağrı düştü + eski kayıt var (24 saatten yeni) → BAYAT olarak döner
 * └ çağrı düştü + kullanılabilir kayıt yok         → hata durumu
 *
 * `now` DIŞARIDAN VERİLEBİLİR: süreye bağlı davranış ancak sahte saatle
 * dürüstçe test edilebilir (06-testing.md). Verilmezse gerçek zaman kullanılır.
 */
export async function loadCachedExternalData<T>(options: {
  cacheKey: string;
  ttlMs: number;
  /**
   * Önbellekten okunan JSON'u DOĞRULAYAN şema.
   *
   * Neden önbellekte de doğrulanıyor: satır önceki bir sürümün yazdığı şekilde
   * olabilir. Doğrulanmadan geçirilseydi eski şekil ekranı çizerken patlardı;
   * doğrulanınca kayıt yok sayılır ve veri yeniden çekilir.
   */
  schema: ZodType<T>;
  /** Sağlayıcıyı çağıran fonksiyon — dayanıklılık `external-fetch.ts` içinde. */
  load: () => Promise<ExternalFetchResult<T>>;
  now?: Date;
}): Promise<WidgetResult<T>> {
  const now = options.now ?? new Date();
  const cached = await readCacheEntry(options.cacheKey);
  const cachedData = cached ? parseCached(options.schema, cached.payload) : null;

  if (cached && cachedData && cached.expiresAt > now) {
    return { status: "ok", data: cachedData, fetchedAt: cached.fetchedAt, isStale: false };
  }

  const fresh = await options.load();

  if (fresh.ok) {
    await writeCacheEntry({
      key: options.cacheKey,
      // Zod'dan geçmiş şekil düz JSON: tarih nesnesi veya `undefined` taşımıyor.
      payload: fresh.data as never,
      fetchedAt: now,
      expiresAt: new Date(now.getTime() + options.ttlMs),
    });

    return { status: "ok", data: fresh.data, fetchedAt: now, isStale: false };
  }

  /**
   * Sağlayıcıya ulaşılamadı. Elde kullanılabilir bir kayıt varsa onu döndürüyoruz
   * — ama "bayat" işaretiyle. Sınır olmadan bir haftalık döviz kurunu "güncel"
   * diye göstermek yanıltıcı olurdu; bu yüzden 24 saatten eski kayıt kullanılmaz.
   */
  if (
    cached &&
    cachedData &&
    now.getTime() - cached.fetchedAt.getTime() <= INFO_WIDGET_MAX_STALE_MS
  ) {
    return { status: "ok", data: cachedData, fetchedAt: cached.fetchedAt, isStale: true };
  }

  return { status: "error" };
}

function parseCached<T>(schema: ZodType<T>, payload: unknown): T | null {
  const parsed = schema.safeParse(payload);

  return parsed.success ? parsed.data : null;
}
