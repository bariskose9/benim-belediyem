/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

/**
 * Dış servis çağrılarının dayanıklılık kuralları (ADR-015 · CLAUDE.md §5.9).
 *
 * Test edilen asıl şey ŞU AYRIM: hangi durumda yeniden denenir, hangisinde
 * denenmez. Yanlış tarafa konmuş bir retry ya çöken servisi büsbütün boğar
 * (429'u tekrarlamak) ya da geçici bir arızayı kalıcı hataya çevirir
 * (5xx'i tekrarlamamak).
 *
 * DÜRÜST SINIR: `AbortSignal.timeout` Node'un iç zamanlayıcısını kullanıyor ve
 * Vitest'in sahte saati onu ele geçiremiyor. Bu yüzden 5 sn'nin gerçekten
 * dolduğu değil, isteğin bir `AbortSignal` TAŞIDIĞI doğrulanıyor; zaman aşımının
 * davranışı ise fırlatılan hata taklit edilerek sınanıyor.
 */

const isCircuitOpen = vi.hoisted(() => vi.fn(async () => false));
const recordCircuitFailure = vi.hoisted(() => vi.fn(async () => {}));
const recordCircuitSuccess = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@/lib/circuit-breaker", () => ({
  isCircuitOpen,
  recordCircuitFailure,
  recordCircuitSuccess,
}));

// Geri çekilme beklemesi testleri yavaşlatmasın; süresi burada ölçülmüyor.
vi.mock("@/lib/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/utils")>()),
  sleep: vi.fn(async () => {}),
}));

const { fetchExternalJson, fetchExternalText } = await import("@/lib/external-fetch");

const schema = z.object({ value: z.number() });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  isCircuitOpen.mockResolvedValue(false);
  // Hata yollarında bilerek `console.error` yazılıyor (sessiz hata yasak);
  // test çıktısını kirletmesin diye susturuluyor.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchExternalJson", () => {
  it("başarılı yanıtı şemadan geçirir ve devreyi sağlıklı işaretler", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ value: 42, fazlalik: "yok sayılır" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchExternalJson({ name: "test", url: "https://ornek.test", schema });

    expect(result).toEqual({ ok: true, data: { value: 42 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(recordCircuitSuccess).toHaveBeenCalledOnce();
    expect(recordCircuitFailure).not.toHaveBeenCalled();
  });

  it("isteğe zaman aşımı sinyali ekler ve önbelleğe almaz", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ value: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchExternalJson({ name: "test", url: "https://ornek.test", schema });

    // Taklit fonksiyonun imzası parametresiz olduğu için çağrı listesi boş
    // demet olarak tipleniyor; gerçek çağrı iki argümanla yapılıyor.
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];

    expect(init.signal).toBeInstanceOf(AbortSignal);
    // Kendi önbelleğimiz var (ADR-015); ikinci bir katman "veri kaç dakikalık"
    // sorusunu cevapsız bırakırdı.
    expect(init.cache).toBe("no-store");
  });

  it("sunucu hatasını (5xx) yeniden dener ve sonunda başarılı olur", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse({ value: 7 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchExternalJson({ name: "test", url: "https://ornek.test", schema });

    expect(result).toEqual({ ok: true, data: { value: 7 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("zaman aşımını yeniden dener, üç denemeden sonra pes eder", async () => {
    const fetchMock = vi.fn(async () => {
      throw new DOMException("The operation was aborted.", "TimeoutError");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchExternalJson({ name: "test", url: "https://ornek.test", schema });

    expect(result).toEqual({ ok: false });
    // 1 ilk deneme + 2 yeniden deneme (CLAUDE.md §5.9)
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(recordCircuitFailure).toHaveBeenCalledOnce();
  });

  it("HIZ SINIRINI (429) YENİDEN DENEMEZ", async () => {
    /**
     * Sınıra takılmışken 300 ms sonra yeniden sormak sınırı derinleştirir.
     * Doğru davranış: bu turu kaybetmek ve bayat veriyle devam etmek (ADR-015).
     */
    const fetchMock = vi.fn(async () => jsonResponse({ error: "rate limited" }, 429));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchExternalJson({ name: "test", url: "https://ornek.test", schema });

    expect(result).toEqual({ ok: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(recordCircuitFailure).toHaveBeenCalledOnce();
  });

  it("istemci hatasını (4xx) yeniden denemez", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: "bad request" }, 400));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchExternalJson({ name: "test", url: "https://ornek.test", schema })).toEqual({
      ok: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("şemaya uymayan yanıtı reddeder ve tekrar sormaz", async () => {
    // Sağlayıcı cevap verdi, cevabı kullanılamaz durumda: aynı soruyu tekrar
    // sormak aynı cevabı getirirdi.
    const fetchMock = vi.fn(async () => jsonResponse({ value: "sayı değil" }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchExternalJson({ name: "test", url: "https://ornek.test", schema })).toEqual({
      ok: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("bozuk JSON gövdesini yutmaz", async () => {
    const fetchMock = vi.fn(
      async () => new Response("{yarım", { headers: { "content-type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchExternalJson({ name: "test", url: "https://ornek.test", schema })).toEqual({
      ok: false,
    });
  });

  it("DEVRE AÇIKKEN HİÇ ÇAĞRI YAPMAZ", async () => {
    isCircuitOpen.mockResolvedValue(true);
    const fetchMock = vi.fn(async () => jsonResponse({ value: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchExternalJson({ name: "test", url: "https://ornek.test", schema })).toEqual({
      ok: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    // Devre zaten açık; sayacı bir kez daha artırmak soğumayı uzatırdı.
    expect(recordCircuitFailure).not.toHaveBeenCalled();
  });
});

describe("fetchExternalText", () => {
  it("gövdeyi olduğu gibi döndürür", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<rss></rss>")),
    );

    expect(await fetchExternalText({ name: "test", url: "https://ornek.test" })).toEqual({
      ok: true,
      data: "<rss></rss>",
    });
  });

  it("boş gövdeyi başarı saymaz", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("   ")),
    );

    expect(await fetchExternalText({ name: "test", url: "https://ornek.test" })).toEqual({
      ok: false,
    });
  });
});
