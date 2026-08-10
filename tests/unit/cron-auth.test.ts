/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `/api/cron/*` kapısı (ADR-007 · adım 16).
 *
 * ═══ NEDEN AYRI VE NEDEN BU KADAR AYRINTILI ═══
 * Bu uç veri SİLİYOR ve para TAHSİL EDİYOR, üstelik oturum çerezi taşımıyor —
 * tek koruması paylaşılan gizli anahtar. Kapının yanlış tarafa düştüğü bir
 * hata, ucu internete açardı. Bu yüzden yalnızca mutlu yol değil, "anahtar hiç
 * tanımlı değil" ve "başlık biçimi yanlış" durumları da tek tek ölçülüyor.
 */

const envMock = vi.hoisted(() => ({
  serverEnv: { CRON_SECRET: undefined as string | undefined },
}));

vi.mock("@/config/env", () => envMock);

const SECRET = "s3cret-value-long-enough";

async function check(headers: Record<string, string>): Promise<void> {
  const { assertCronRequestAuthorized } =
    await import("@/features/scheduled-tasks/services/cron-auth");

  assertCronRequestAuthorized(new Headers(headers));
}

/**
 * Reddedilmeyi `instanceof` ile DEĞİL hata koduyla ölçüyoruz.
 *
 * Sebep ölçülerek bulundu: `vi.resetModules()` her dinamik içe aktarmada
 * `@/lib/errors`'ı yeniden yüklüyor, dolayısıyla fırlatılan sınıf testin
 * en üstte içe aktardığı sınıfla AYNI NESNE DEĞİL ve `instanceof` her zaman
 * `false` dönüyor. Kod (`UNAUTHORIZED`) modül kimliğinden bağımsız ve zaten
 * istemcinin gördüğü sözleşme — asıl ölçülmesi gereken de o.
 */
async function expectRejected(headers: Record<string, string>): Promise<string> {
  const error = await check(headers).then(
    () => null,
    (thrown: unknown) => thrown as { code: string; userMessage: string },
  );

  expect(error?.code).toBe("UNAUTHORIZED");

  return error?.userMessage ?? "";
}

beforeEach(() => {
  vi.resetModules();
  envMock.serverEnv.CRON_SECRET = SECRET;
});

describe("doğru anahtar", () => {
  it("`Bearer <anahtar>` başlığıyla geçer", async () => {
    await expect(check({ authorization: `Bearer ${SECRET}` })).resolves.toBeUndefined();
  });
});

describe("kapı kapalı kalan durumlar", () => {
  it("başlık hiç yoksa 401", async () => {
    await expectRejected({});
  });

  it("anahtar yanlışsa 401", async () => {
    await expectRejected({ authorization: "Bearer wrong-value-same-len!" });
  });

  it("`Bearer ` öneki olmadan çıplak anahtar kabul edilmez", async () => {
    await expectRejected({ authorization: SECRET });
  });

  it("önek yanlış yazılmışsa kabul edilmez", async () => {
    await expectRejected({ authorization: `bearer ${SECRET}` });
  });

  /**
   * ⛔ EN ÖNEMLİ TEST. Ortam değişkeni tanımsızken uç "koruma yok, herkese
   * açık" davranırsa, değişkeni girmeyi unutan bir ortamda planlı görev
   * internete açık bir silme ucuna dönüşür. Doğru davranış: anahtar yoksa
   * hiç kimse geçemez (fail-closed).
   */
  it("CRON_SECRET tanımlı DEĞİLSE hiçbir istek geçemez", async () => {
    envMock.serverEnv.CRON_SECRET = undefined;

    await expectRejected({ authorization: "Bearer " });
    await expectRejected({});
  });

  it("mesaj yapılandırma durumunu ele vermez", async () => {
    envMock.serverEnv.CRON_SECRET = undefined;

    const missingKeyMessage = await expectRejected({});

    envMock.serverEnv.CRON_SECRET = SECRET;

    const wrongKeyMessage = await expectRejected({ authorization: "Bearer nope" });

    expect(missingKeyMessage).toBe(wrongKeyMessage);
  });
});
