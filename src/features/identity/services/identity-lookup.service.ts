import {
  KPS_CONSTANT_RESPONSE_MS,
  KPS_RATE_LIMIT_MAX_ATTEMPTS,
  KPS_RATE_LIMIT_WINDOW_MS,
} from "@/config/constants";
import { consumeRateLimit, hashActorIp, rateLimitKey } from "@/lib/rate-limit";
import { sleep } from "@/lib/utils";

import type { KpsQueryResult } from "@/generated/prisma/enums";
import { MockKpsProvider } from "../providers/mock-kps-provider";
import { recordKpsQuery } from "../repositories/kps-query-log.repository";
import { identityLookupSchema } from "../schemas/identity-lookup.schema";
import type { IdentityProvider, IdentityRecord } from "../types";

/**
 * Kimlik sorgusunun İŞ MANTIĞI katmanı (01-architecture.md: route → servis →
 * repository). Sağlayıcı dış servisi konuşur; bu dosya UYGULAMANIN kurallarını
 * uygular ve sonucu numara taramasına kapalı hale getirir.
 *
 * SIRA ÖNEMLİ:
 *   1) biçim + kontrol basamağı doğrulaması
 *   2) hız sınırı — deneme başına BİR kez sayılır
 *   3) sağlayıcı (zaman aşımı, yeniden deneme, devre kesici onun içinde)
 *   4) denetim kaydı — numara YAZILMADAN
 *   5) yanıt süresinin sabitlenmesi
 *
 * Hız sınırının 3. adımdan ÖNCE ve sağlayıcının dışında olması bilinçli:
 * sayaç yeniden deneme döngüsünün içinde kalsaydı tek bir kullanıcı denemesi
 * 3 çağrıya dönüşür ve 5 deneme/15 dakika bütçesi üçte bir sürede biterdi.
 */

const RATE_LIMIT_PURPOSE = "kps_lookup";

export type IdentityLookupResult =
  | { outcome: "success"; identity: IdentityRecord }
  /**
   * TEK TİP BAŞARISIZLIK: "numara kayıtlı değil", "doğum yılı tutmadı" ve
   * "numara biçimsel olarak geçersiz" durumlarının HEPSİ buraya düşer.
   * Ayrımı burada eritmek şart — çağıran taraf ayıramadığı bir şeyi kullanıcıya
   * da sızdıramaz (05-auth-security.md → "hangi alanın tutmadığı söylenmez").
   */
  | { outcome: "failed" }
  | { outcome: "rate_limited" }
  | { outcome: "unavailable" };

export type IdentityLookupRequest = {
  nationalId: string;
  birthYear: unknown;
  /** İsteği atan IP (ham). Bu fonksiyondan dışarı ASLA ham haliyle çıkmaz. */
  actorIp: string;
  /** Oturum kimliği — adım 4b'de dolacak. */
  sessionId?: string;
};

/** Testlerin sahte sağlayıcı ve sahte saat verebilmesi için. */
export type IdentityLookupDeps = {
  provider?: IdentityProvider;
  now?: () => number;
};

export async function lookupIdentity(
  request: IdentityLookupRequest,
  deps: IdentityLookupDeps = {},
): Promise<IdentityLookupResult> {
  const now = deps.now ?? (() => Date.now());
  const provider = deps.provider ?? new MockKpsProvider();
  const startedAt = now();
  const actorIpHash = hashActorIp(request.actorIp);

  const result = await runLookup(request, provider, actorIpHash, now);

  await equalizeDuration(result.outcome, now() - startedAt);

  return result;
}

async function runLookup(
  request: IdentityLookupRequest,
  provider: IdentityProvider,
  actorIpHash: string,
  now: () => number,
): Promise<IdentityLookupResult> {
  const parsed = identityLookupSchema.safeParse({
    nationalId: request.nationalId,
    birthYear: request.birthYear,
  });

  // Hız sınırı biçim doğrulamasından SONRA ama sorgudan ÖNCE. Geçersiz biçimli
  // bir istek de sayacı artırır: aksi halde saldırgan sınırsız sayıda ücretsiz
  // istek atarak sunucuyu meşgul edebilirdi.
  const allowed = await consumeAttempt(request, now);

  if (!allowed) {
    await recordKpsQuery({
      actorIpHash,
      sessionId: request.sessionId,
      result: "rate_limited",
      durationMs: 0,
    });

    return { outcome: "rate_limited" };
  }

  // Geçersiz biçim KPS'e hiç gitmiyor, bu yüzden denetim kaydına da yazılmıyor:
  // ortada bir KPS sorgusu yok. Yanıt yine de sabit süreye dolduruluyor, yani
  // dışarıdan "geçersiz numara" ile "kayıtlı olmayan numara" ayırt edilemiyor.
  if (!parsed.success) {
    return { outcome: "failed" };
  }

  const queryStartedAt = now();
  const providerResult = await provider.lookup(parsed.data);
  const durationMs = now() - queryStartedAt;

  await recordKpsQuery({
    actorIpHash,
    sessionId: request.sessionId,
    result: toLogResult(providerResult.outcome),
    durationMs,
  });

  switch (providerResult.outcome) {
    case "success":
      return { outcome: "success", identity: providerResult.identity };
    case "mismatch":
    case "not_found":
      return { outcome: "failed" };
    case "unavailable":
      return { outcome: "unavailable" };
  }
}

/**
 * Hız sınırı IP VE oturum bazlı (PRD §5.0). İkisi de sayılır: tek başına IP,
 * mobil şebekede binlerce kullanıcının paylaştığı bir adreste haksız kilit
 * yaratır; tek başına oturum ise çerezi silen saldırganı hiç durdurmaz.
 *
 * Oturum katmanı adım 4b'de geleceği için bugün `sessionId` boş geliyor ve
 * yalnızca IP bacağı çalışıyor. Kod yolu hazır duruyor.
 */
async function consumeAttempt(request: IdentityLookupRequest, now: () => number): Promise<boolean> {
  const at = new Date(now());
  const keys = [rateLimitKey(RATE_LIMIT_PURPOSE, "ip", request.actorIp)];

  if (request.sessionId) {
    keys.push(rateLimitKey(RATE_LIMIT_PURPOSE, "session", request.sessionId));
  }

  // Her iki sayaç da HER ZAMAN artırılıyor, biri limiti aşsa bile. Erken çıkış
  // yapılsaydı sayaçlar birbirinden kayar ve saldırgan sırayla tetikleyerek
  // ikisini de dolmaktan kurtarabilirdi.
  const decisions = await Promise.all(
    keys.map((key) =>
      consumeRateLimit({
        key,
        limit: KPS_RATE_LIMIT_MAX_ATTEMPTS,
        windowMs: KPS_RATE_LIMIT_WINDOW_MS,
        now: at,
      }),
    ),
  );

  return decisions.every((decision) => decision.allowed);
}

/**
 * Şemadaki `KpsQueryResult` sözlüğüne çevirir.
 *
 * `unavailable` → `timeout`: enum'da "servis erişilemedi" için ayrı bir değer
 * yok, `timeout` bu sınıfın tek karşılığı. Enum'a yeni değer eklemek migration
 * gerektirirdi; bu adımın kapsamı veri modelini değiştirmek değil.
 */
function toLogResult(
  outcome: "success" | "mismatch" | "not_found" | "unavailable",
): KpsQueryResult {
  return outcome === "unavailable" ? "timeout" : outcome;
}

/**
 * NUMARA TARAMASI KORUMASI — yanıt süresini sabitler.
 *
 * Sorgulanan numaraya BAĞLI olan üç sonuç (bulundu / eşleşmedi / bulunamadı)
 * aynı süreyi alır. Aksi halde saldırgan mesajlar aynı olsa bile kronometreyle
 * "bu numara kayıtlı" bilgisini çıkarabilirdi
 * (05-auth-security.md → "yanıt süresi sabitlenir").
 *
 * `rate_limited` ve `unavailable` BİLEREK doldurulmuyor: bu iki sonuç
 * sorgulanan numaradan bağımsızdır, hangi numara gelirse gelsin aynıdır,
 * dolayısıyla zamanlamaları hiçbir şey sızdırmaz. Onları da beklettirmek
 * yalnızca saldırgana ücretsiz kaynak tüketimi hediye ederdi.
 */
async function equalizeDuration(outcome: IdentityLookupResult["outcome"], elapsedMs: number) {
  if (outcome === "rate_limited" || outcome === "unavailable") return;

  const remaining = KPS_CONSTANT_RESPONSE_MS - elapsedMs;

  if (remaining > 0) await sleep(remaining);
}
