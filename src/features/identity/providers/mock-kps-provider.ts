import {
  KPS_BREAKER_COOLDOWN_MS,
  KPS_BREAKER_FAILURE_THRESHOLD,
  KPS_BREAKER_WINDOW_MS,
  KPS_MAX_RETRIES,
  KPS_REQUEST_TIMEOUT_MS,
  KPS_RETRY_BACKOFF_MS,
  MOCK_KPS_API_KEY_HEADER,
} from "@/config/constants";
import { publicEnv, serverEnv } from "@/config/env";
import { isCircuitOpen, recordCircuitFailure, recordCircuitSuccess } from "@/lib/circuit-breaker";
import { sleep } from "@/lib/utils";

import type { MockKpsResponseBody } from "@/app/api/mock-kps/contract";
import type { IdentityLookupInput, IdentityProvider, ProviderLookupResult } from "../types";

/**
 * Sahte KPS sağlayıcısı — ADR-003'ün "gerçek KPS gelirse yalnızca bu sınıf
 * değişir" dediği sınıf.
 *
 * DAYANIKLILIK KURALLARI BURADA, MOCK'UN İÇİNDE DEĞİL: zaman aşımı, yeniden
 * deneme ve devre kesici çağıran tarafın sorumluluğudur. Bir servis kendi
 * kendini yeniden denemez; retry'ı taklit edilen servisin içine koymak gerçek
 * hayatta karşılığı olmayan bir şey öğretirdi.
 *
 * NELER YENİDEN DENENİR: yalnızca zaman aşımı ve sunucu hatası (5xx) —
 * yani "cevap alamadım" durumları. `not_found`, `mismatch` ve 4xx İŞ
 * SONUCUDUR; tekrar sormak aynı cevabı getirir, sadece dış servisi boşuna
 * yorar (CLAUDE.md §5.9 → "yeniden deneme en fazla 2 kez ve üstel geri çekilmeli").
 */

const BREAKER = {
  name: "mock-kps",
  failureThreshold: KPS_BREAKER_FAILURE_THRESHOLD,
  windowMs: KPS_BREAKER_WINDOW_MS,
  cooldownMs: KPS_BREAKER_COOLDOWN_MS,
} as const;

/** Yeniden denemenin anlamlı olduğu durumlar için iç işaret. */
type AttemptOutcome = ProviderLookupResult | { outcome: "retryable" };

export class MockKpsProvider implements IdentityProvider {
  readonly name = "mock-kps";

  async lookup(input: IdentityLookupInput): Promise<ProviderLookupResult> {
    // Devre açıksa hiç çağırmıyoruz: çöken bir servise ısrar etmek kullanıcıyı
    // 3 sn × 3 deneme bekletir ve servisi büsbütün boğar.
    if (await isCircuitOpen(BREAKER)) {
      return { outcome: "unavailable" };
    }

    for (let attempt = 0; attempt <= KPS_MAX_RETRIES; attempt += 1) {
      const result = await this.attempt(input);

      if (result.outcome !== "retryable") {
        // Servis cevap verdi (olumlu ya da olumsuz) → sağlıklı sayılır.
        await recordCircuitSuccess(BREAKER);

        return result;
      }

      // Üstel geri çekilme: 250 ms, sonra 500 ms. Son denemeden sonra beklemek
      // anlamsız olurdu, o yüzden döngünün sonunda beklenmiyor.
      if (attempt < KPS_MAX_RETRIES) {
        await sleep(KPS_RETRY_BACKOFF_MS * 2 ** attempt);
      }
    }

    await recordCircuitFailure(BREAKER);

    return { outcome: "unavailable" };
  }

  private async attempt(input: IdentityLookupInput): Promise<AttemptOutcome> {
    let response: Response;

    try {
      response = await fetch(mockKpsUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Gizli anahtarın eklendiği TEK yer burası.
          [MOCK_KPS_API_KEY_HEADER]: serverEnv.MOCK_KPS_API_KEY,
        },
        body: JSON.stringify(input),
        // Zaman aşımı zorunlu (CLAUDE.md §5.9): cevap vermeyen bir servis
        // olmadan istek sonsuza kadar açık kalır ve fonksiyon zaman aşımına
        // kadar bloke olur.
        signal: AbortSignal.timeout(KPS_REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      // Zaman aşımı ve ağ hatası aynı sınıfta: cevap alınamadı → tekrar denenir.
      // Hata mesajına kimlik numarası GİRMEZ, sadece hatanın kendisi loglanır.
      console.error("[MOCK_KPS] istek başarısız", error);

      return { outcome: "retryable" };
    }

    if (response.status >= 500) {
      // Sessizce yutulmuyor (CLAUDE.md §5.9 "sessiz hata kabul edilmez"):
      // yeniden deneme başarılı olsa bile dış servisin hata verdiği görünmeli,
      // yoksa bozulmaya giden bir servis fark edilmeden idare edilir.
      console.error("[MOCK_KPS] sunucu hatası", { status: response.status });

      return { outcome: "retryable" };
    }

    // 401 buraya düşerse anahtar yanlış yapılandırılmıştır — tekrar denemek
    // düzeltmez. Sesli loglanıyor ki sessizce "servis kapalı" gibi görünmesin.
    if (response.status === 401) {
      console.error(
        "[MOCK_KPS] anahtar reddedildi — MOCK_KPS_API_KEY yapılandırmasını kontrol edin",
      );

      return { outcome: "unavailable" };
    }

    const body = (await response.json().catch(() => null)) as MockKpsResponseBody | null;

    switch (body?.status) {
      case "verified":
        return { outcome: "success", identity: body.citizen };
      case "mismatch":
        return { outcome: "mismatch" };
      case "not_found":
        return { outcome: "not_found" };
      default:
        // `invalid_request` veya tanınmayan biçim: bizim gönderdiğimiz istek
        // hatalı demektir. Kullanıcının düzeltebileceği bir şey değil.
        console.error("[MOCK_KPS] beklenmeyen yanıt", { status: response.status });

        return { outcome: "unavailable" };
    }
  }
}

/**
 * Sahte KPS uygulamanın kendi adresinde yayınlanıyor; çağrı GERÇEK bir HTTP
 * atlaması yapıyor (ADR-009). Doğrudan fonksiyon çağrısı yapılsaydı zaman
 * aşımı, yeniden deneme ve devre kesici test edilemeyen süslemeler olurdu —
 * ortada kesilecek bir bağlantı olmazdı.
 */
function mockKpsUrl(): string {
  return new URL("/api/mock-kps/identity-queries", publicEnv.NEXT_PUBLIC_APP_URL).toString();
}
