import type { ZodType } from "zod";

import {
  INFO_WIDGET_BREAKER_COOLDOWN_MS,
  INFO_WIDGET_BREAKER_FAILURE_THRESHOLD,
  INFO_WIDGET_BREAKER_WINDOW_MS,
  INFO_WIDGET_MAX_RETRIES,
  INFO_WIDGET_RETRY_BACKOFF_MS,
  INFO_WIDGET_TIMEOUT_MS,
} from "@/config/constants";
import { isCircuitOpen, recordCircuitFailure, recordCircuitSuccess } from "@/lib/circuit-breaker";
import { logger } from "@/lib/logger";
import { sleep } from "@/lib/utils";

/**
 * Dış bilgi servislerine yapılan çağrıların ORTAK dayanıklılık katmanı
 * (ADR-015 · CLAUDE.md §5.9).
 *
 * Üç kural burada, sağlayıcıların içinde DEĞİL — sahte KPS'te (ADR-003) alınan
 * kararın aynısı: bir servis kendi kendini yeniden denemez, dayanıklılık
 * çağıranın sorumluluğudur. Üç sağlayıcının üçü de aynı yoldan geçsin diye
 * burada tek kez yazıldı:
 *
 *   1. ZAMAN AŞIMI     — cevap vermeyen servis isteği sonsuza kadar tutamaz
 *   2. YENİDEN DENEME  — en fazla 2 kez, üstel geri çekilmeli
 *   3. DEVRE KESİCİ    — sağlayıcı başına ayrı devre (ADR-010)
 *
 * BU KATMAN HİÇ İSTİSNA FIRLATMAZ. Dönüşü ayrık bir birleşimdir; çağıran
 * "başarısız" durumunu unutamaz, çünkü tip onu okumaya zorlar. Widget'ın
 * çökmesi sayfayı çökertmemeli (PRD §5.8).
 */

export type ExternalFetchResult<T> = { ok: true; data: T } | { ok: false };

/** Yeniden denemenin anlamlı olduğu durumlar için iç işaret. */
type Attempt<T> = { outcome: "success"; body: T } | { outcome: "failed" | "retryable" };

export type ExternalFetchOptions = {
  /** Devre kesici adı, örn. "open-meteo". Kişisel veri içermez. */
  name: string;
  url: string;
  /** Testlerin süreyi kısaltabilmesi için dışarıdan verilebilir. */
  timeoutMs?: number;
  maxRetries?: number;
};

/**
 * JSON döndüren bir dış servisi çağırır ve gövdeyi Zod ile DOĞRULAR.
 *
 * Şema neden zorunlu: dış servis bozuk veya değişmiş veri gönderdiğinde hata
 * burada, tek bir yerde görülür — ekran çizilirken `undefined.map` olarak değil
 * (`integrations.md` → "cevap şeması Zod ile doğrulanır").
 */
export async function fetchExternalJson<T>(
  options: ExternalFetchOptions & { schema: ZodType<T> },
): Promise<ExternalFetchResult<T>> {
  // Genel tip AÇIKÇA veriliyor: çıkarıma bırakılırsa "failed" dalında `body`
  // alanı olmadığı için TypeScript `T | undefined` çıkarıyor.
  return runWithResilience<T>(options, async (response): Promise<Attempt<T>> => {
    const raw: unknown = await response.json();
    const parsed = options.schema.safeParse(raw);

    if (!parsed.success) {
      // Sessizce yutulmuyor (CLAUDE.md §5.9): sağlayıcının sözleşmesi değişmişse
      // bu görünmeli. Gövdenin kendisi loglanmıyor — gereksiz gürültü.
      logger.error("external_fetch_schema_mismatch", {
        provider: options.name,
        issues: parsed.error.issues,
      });

      return { outcome: "failed" };
    }

    return { outcome: "success", body: parsed.data };
  });
}

/**
 * Düz metin (bu projede RSS/XML) döndüren bir dış servisi çağırır.
 * Ayrıştırma çağıranın işi — bu katman yalnızca baytları güvenle getirir.
 */
export async function fetchExternalText(
  options: ExternalFetchOptions,
): Promise<ExternalFetchResult<string>> {
  return runWithResilience<string>(options, async (response): Promise<Attempt<string>> => {
    const body = await response.text();

    if (body.trim().length === 0) {
      logger.error("external_fetch_empty_body", { provider: options.name });

      return { outcome: "failed" };
    }

    return { outcome: "success", body };
  });
}

async function runWithResilience<T>(
  options: ExternalFetchOptions,
  readBody: (response: Response) => Promise<Attempt<T>>,
): Promise<ExternalFetchResult<T>> {
  const breaker = {
    name: options.name,
    failureThreshold: INFO_WIDGET_BREAKER_FAILURE_THRESHOLD,
    windowMs: INFO_WIDGET_BREAKER_WINDOW_MS,
    cooldownMs: INFO_WIDGET_BREAKER_COOLDOWN_MS,
  };

  // Devre açıksa çağrı HİÇ yapılmaz: çöken bir servisi her ziyarette yeniden
  // denemek kullanıcıyı zaman aşımı kadar bekletir ve servisi büsbütün boğar.
  if (await isCircuitOpen(breaker)) {
    return { ok: false };
  }

  const maxRetries = options.maxRetries ?? INFO_WIDGET_MAX_RETRIES;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const result = await attemptOnce(options, readBody);

    if (result.outcome === "success") {
      await recordCircuitSuccess(breaker);

      return { ok: true, data: result.body };
    }

    // "failed" tekrarlanmaz: sağlayıcı cevap verdi, cevabı kullanılamaz durumda
    // (bozuk şema, 4xx, hız sınırı). Aynı soruyu tekrar sormak aynı cevabı
    // getirir ve yalnızca dış servisi yorar.
    if (result.outcome === "failed") {
      break;
    }

    // Üstel geri çekilme: 300 ms, sonra 600 ms. Son denemeden sonra beklemek
    // anlamsız olurdu, o yüzden döngünün sonunda beklenmiyor.
    if (attempt < maxRetries) {
      await sleep(INFO_WIDGET_RETRY_BACKOFF_MS * 2 ** attempt);
    }
  }

  await recordCircuitFailure(breaker);

  return { ok: false };
}

async function attemptOnce<T>(
  options: ExternalFetchOptions,
  readBody: (response: Response) => Promise<Attempt<T>>,
): Promise<Attempt<T>> {
  let response: Response;

  try {
    response = await fetch(options.url, {
      headers: {
        // Kim olduğumuzu söylemek ücretsiz ve anahtarsız servislerde nezakettir;
        // sağlayıcı sorunlu bir istemciyi engellemek istediğinde ayırt edebilir.
        "user-agent": "benim-belediyem/1.0 (ornek belediye portali)",
        accept: "application/json, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.8",
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? INFO_WIDGET_TIMEOUT_MS),
      // Kendi önbelleğimiz var (ADR-015); Next'in katmanına ikinci bir önbellek
      // koymak "veri kaç dakikalık" sorusunu cevapsız bırakırdı.
      cache: "no-store",
    });
  } catch (error) {
    // Zaman aşımı ve ağ hatası aynı sınıfta: cevap alınamadı → tekrar denenir.
    logger.error("external_fetch_request_failed", { provider: options.name, error });

    return { outcome: "retryable" };
  }

  if (response.status >= 500) {
    logger.error("external_fetch_server_error", {
      provider: options.name,
      status: response.status,
    });

    return { outcome: "retryable" };
  }

  /**
   * 429 TEKRARLANMAZ ve bu bilinçli.
   *
   * Hız sınırına takılmışken 300 ms sonra yeniden sormak sınırı daha da
   * derinleştirir. Doğru davranış: bu turu kaybetmek, devre sayacını artırmak
   * ve bayat veriyle devam etmek. CoinGecko'nun anahtarsız ucunda bu beklenen
   * bir durum, istisna değil (ADR-015).
   */
  if (response.status === 429) {
    logger.error("external_fetch_rate_limited", { provider: options.name });

    return { outcome: "failed" };
  }

  if (!response.ok) {
    logger.error("external_fetch_unexpected_status", {
      provider: options.name,
      status: response.status,
    });

    return { outcome: "failed" };
  }

  try {
    return await readBody(response);
  } catch (error) {
    // Gövde okunamadı (bozuk JSON, yarıda kesilen aktarım).
    logger.error("external_fetch_body_unreadable", { provider: options.name, error });

    return { outcome: "failed" };
  }
}
