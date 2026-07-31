/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MOCK_KPS_API_KEY_HEADER } from "@/config/constants";

/**
 * MockKpsProvider — dayanıklılık kuralları (PRD §5.0, CLAUDE.md §5.9).
 *
 * Test edilen asıl şey ŞU AYRIM: hangi durumda yeniden denenir, hangisinde
 * denenmez. Yanlış tarafa konmuş bir retry ya dış servisi boşuna yorar
 * (iş sonucunu tekrar sormak) ya da geçici arızayı kalıcı hataya çevirir.
 *
 * DÜRÜST SINIR: `AbortSignal.timeout` Node'un iç zamanlayıcısını kullanıyor ve
 * Vitest'in sahte saati onu ele geçiremiyor. Bu yüzden 3 sn'nin gerçekten
 * dolduğu burada değil, isteğin bir AbortSignal TAŞIDIĞI doğrulanarak ve
 * zaman aşımı hatasının davranışı taklit edilerek test ediliyor. Gerçek
 * kesilmenin çalıştığı entegrasyon testinde (mock ucun 6 sn beklemesi)
 * ayrıca görülüyor.
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

const CITIZEN = {
  firstName: "Emre",
  lastName: "Arslan",
  birthDate: "1990-04-12",
  birthPlace: "İzmir",
  fatherName: "Ali",
  motherName: "Ayşe",
  registeredProvince: "İzmir",
  registeredDistrict: "Konak",
  gender: "male",
  maritalStatus: "single",
  registeredAddress: "Konak Mah. 1 Sk. No:1",
};

const INPUT = { nationalId: "97876775668", birthYear: 1990 };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Zaman aşımının fetch'e yansıması: AbortSignal isteği keser. */
function timeoutError(): Error {
  return new DOMException("The operation was aborted due to timeout", "TimeoutError");
}

const fetchMock = vi.fn();

async function lookup() {
  const { MockKpsProvider } = await import("@/features/identity/providers/mock-kps-provider");

  return new MockKpsProvider().lookup(INPUT);
}

describe("MockKpsProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    isCircuitOpen.mockResolvedValue(false);
    recordCircuitFailure.mockClear();
    recordCircuitSuccess.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("istek biçimi", () => {
    it("gizli anahtarı başlıkta gönderir", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: "verified", citizen: CITIZEN }));

      await lookup();

      const [, init] = fetchMock.mock.calls[0];

      expect(init.headers[MOCK_KPS_API_KEY_HEADER]).toBeTruthy();
    });

    it("kimlik numarasını URL'e DEĞİL gövdeye koyar", async () => {
      // URL'e yazılsaydı sunucu erişim log'una ve Referer başlığına düşerdi
      // (05-auth-security.md → "kimlik numarası URL'e asla yazılmaz").
      fetchMock.mockResolvedValue(jsonResponse({ status: "verified", citizen: CITIZEN }));

      await lookup();

      const [url, init] = fetchMock.mock.calls[0];

      expect(String(url)).not.toContain(INPUT.nationalId);
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body).nationalId).toBe(INPUT.nationalId);
    });

    it("zaman aşımı için isteğe bir AbortSignal iliştirir", async () => {
      // Sinyalsiz bir istek cevap gelmezse sonsuza kadar açık kalırdı.
      fetchMock.mockResolvedValue(jsonResponse({ status: "verified", citizen: CITIZEN }));

      await lookup();

      expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe("YENİDEN DENENMEYEN durumlar — iş sonucu", () => {
    it("not_found tek çağrıda döner", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: "not_found" }, 404));

      expect(await lookup()).toEqual({ outcome: "not_found" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("mismatch tek çağrıda döner", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: "mismatch" }));

      expect(await lookup()).toEqual({ outcome: "mismatch" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("429 tekrar denenmez — sınırı yeniden zorlamak durumu kötüleştirir", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: "error" }, 429));

      expect(await lookup()).toEqual({ outcome: "unavailable" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("401 tekrar denenmez — yanlış anahtar tekrarla düzelmez", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: "unauthorized" }, 401));

      expect(await lookup()).toEqual({ outcome: "unavailable" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("YENİDEN DENENEN durumlar — cevap alınamadı", () => {
    it("zaman aşımında EN FAZLA 2 kez yeniden dener (toplam 3 çağrı)", async () => {
      fetchMock.mockRejectedValue(timeoutError());

      expect(await lookup()).toEqual({ outcome: "unavailable" });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("sunucu hatasında (5xx) yeniden dener", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: "error" }, 500));

      expect(await lookup()).toEqual({ outcome: "unavailable" });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("ilk denemede takılıp ikincide düzelen çağrı BAŞARILI sayılır", async () => {
      fetchMock
        .mockRejectedValueOnce(timeoutError())
        .mockResolvedValueOnce(jsonResponse({ status: "verified", citizen: CITIZEN }));

      expect(await lookup()).toEqual({ outcome: "success", identity: CITIZEN });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("devre kesici", () => {
    it("devre AÇIKKEN dış servis HİÇ çağrılmaz", async () => {
      isCircuitOpen.mockResolvedValue(true);

      expect(await lookup()).toEqual({ outcome: "unavailable" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("üst üste başarısızlıktan sonra hata sayacına yazar", async () => {
      fetchMock.mockRejectedValue(timeoutError());

      await lookup();

      expect(recordCircuitFailure).toHaveBeenCalledTimes(1);
    });

    it("servis cevap verince sayaç sıfırlanır", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: "verified", citizen: CITIZEN }));

      await lookup();

      expect(recordCircuitSuccess).toHaveBeenCalledTimes(1);
      expect(recordCircuitFailure).not.toHaveBeenCalled();
    });
  });

  describe("SUNUCU LOG'U — kimlik numarası sızmaz", () => {
    // 05-auth-security.md: "log'a, hata takip aracına, analitiğe, URL'e,
    // önbellek anahtarına ASLA yazılmaz". Hata yolları en kolay unutulan yer:
    // bir hata nesnesini olduğu gibi loglamak isteği de beraberinde getirebilir.
    it.each([
      ["zaman aşımı", () => fetchMock.mockRejectedValue(timeoutError())],
      ["sunucu hatası", () => fetchMock.mockResolvedValue(jsonResponse({ status: "error" }, 500))],
      [
        "yanlış anahtar",
        () => fetchMock.mockResolvedValue(jsonResponse({ status: "unauthorized" }, 401)),
      ],
      [
        "tanınmayan yanıt",
        () => fetchMock.mockResolvedValue(jsonResponse({ status: "invalid_request" }, 400)),
      ],
    ])("%s yolunda log'a numara yazılmaz", async (_label, arrange) => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      arrange();
      await lookup();

      const logged = JSON.stringify(errorSpy.mock.calls);

      expect(errorSpy).toHaveBeenCalled();
      expect(logged).not.toContain(INPUT.nationalId);
    });

    it("gizli anahtar da log'a yazılmaz", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      fetchMock.mockResolvedValue(jsonResponse({ status: "unauthorized" }, 401));
      await lookup();

      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
        process.env.MOCK_KPS_API_KEY as string,
      );
    });
  });
});
