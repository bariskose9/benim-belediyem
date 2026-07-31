/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  KPS_REQUEST_TIMEOUT_MS,
  MOCK_KPS_API_KEY_HEADER,
  MOCK_KPS_MAX_DELAY_MS,
  MOCK_KPS_TIMEOUT_DELAY_MS,
} from "@/config/constants";

/**
 * `POST /api/mock-kps/identity-queries` — sahte KPS ucu.
 *
 * EN ÖNEMLİ TEST BU DOSYADA: uç herkese açık bir adreste duruyor ve depo
 * public. Gizli başlık olmadan cevap verirse, yazılan diğer bütün güvenlik
 * kuralları anlamsızlaşır (ADR-009).
 */

const findUnique = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ prisma: { kpsCitizen: { findUnique } } }));

/** vitest.config.ts içindeki test değeri. */
const API_KEY = "test-only-mock-kps-key-at-least-32-chars";

const CITIZEN = {
  firstName: "Emre",
  lastName: "Arslan",
  birthDate: new Date("1990-04-12T00:00:00Z"),
  birthPlace: "İzmir",
  fatherName: "Ali",
  motherName: "Ayşe",
  registeredProvince: "İzmir",
  registeredDistrict: "Konak",
  gender: "male",
  maritalStatus: "single",
  registeredAddress: "Konak Mah. 1 Sk. No:1",
  simulationBehavior: "normal" as const,
};

const VALID_BODY = { nationalId: "97876775668", birthYear: 1990 };

function buildRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/mock-kps/identity-queries", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/**
 * Ucu çağırır ve yapay gecikmeyi sahte saatle atlar — gerçek bekleme yok
 * (06-testing.md). `advanceMs` varsayılanı en uzun normal gecikmeyi kapsar.
 */
async function callRoute(request: Request, advanceMs = MOCK_KPS_MAX_DELAY_MS + 50) {
  const { POST } = await import("@/app/api/mock-kps/identity-queries/route");

  vi.useFakeTimers();

  const responsePromise = POST(request);

  await vi.advanceTimersByTimeAsync(advanceMs);

  const response = await responsePromise;

  vi.useRealTimers();

  return response;
}

function withKey(headers: Record<string, string> = {}) {
  return { [MOCK_KPS_API_KEY_HEADER]: API_KEY, ...headers };
}

describe("KORUMA — gizli başlık olmadan erişim", () => {
  beforeEach(() => {
    findUnique.mockReset().mockResolvedValue(CITIZEN);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("BAŞLIKSIZ istek 401 döner", async () => {
    const response = await callRoute(buildRequest(VALID_BODY), 0);

    expect(response.status).toBe(401);
  });

  it("YANLIŞ anahtarla gelen istek 401 döner", async () => {
    const response = await callRoute(
      buildRequest(VALID_BODY, { [MOCK_KPS_API_KEY_HEADER]: "yanlis-anahtar" }),
      0,
    );

    expect(response.status).toBe(401);
  });

  it("reddedilen istekte HİÇBİR kimlik verisi dönmez", async () => {
    const response = await callRoute(buildRequest(VALID_BODY), 0);
    const raw = JSON.stringify(await response.json());

    expect(raw).not.toContain("Emre");
    expect(raw).not.toContain("Arslan");
    expect(raw).not.toContain(VALID_BODY.nationalId);
  });

  it("yetkisiz istek veritabanına HİÇ dokunmaz", async () => {
    // Anahtar kontrolü en başta olmasaydı yetkisiz istek yine de kaynak
    // tüketir ve uç ücretsiz bir yük aracına dönerdi.
    await callRoute(buildRequest(VALID_BODY), 0);

    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe("GİRDİ DOĞRULAMA", () => {
  beforeEach(() => {
    findUnique.mockReset().mockResolvedValue(CITIZEN);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("doğum yılı OLMADAN gelen istek reddedilir — TCKN tek başına yetmez", async () => {
    // 05-auth-security.md: "ikinci bir doğrulama alanı zorunludur,
    // tek alanla veri dönülmez".
    const response = await callRoute(
      buildRequest({ nationalId: VALID_BODY.nationalId }, withKey()),
      0,
    );

    expect(response.status).toBe(400);
    expect((await response.json()).status).toBe("invalid_request");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("kimlik numarası olmadan gelen istek reddedilir", async () => {
    const response = await callRoute(buildRequest({ birthYear: 1990 }, withKey()), 0);

    expect(response.status).toBe(400);
  });

  it("bozuk JSON gövdesi çökme değil 400 üretir", async () => {
    const response = await callRoute(buildRequest("{bozuk", withKey()), 0);

    expect(response.status).toBe(400);
  });

  it("hangi alanın eksik olduğunu SÖYLEMEZ", async () => {
    // "birthYear zorunlu" cevabı, alanı hiç göndermeden numara taramak
    // isteyen birine yol gösterirdi.
    const response = await callRoute(
      buildRequest({ nationalId: VALID_BODY.nationalId }, withKey()),
      0,
    );
    const raw = JSON.stringify(await response.json());

    expect(raw).not.toMatch(/birthYear|nationalId|required|zorunlu/i);
  });
});

describe("SORGU SONUÇLARI", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("MUTLU YOL: numara ve doğum yılı tutarsa kimlik bilgisi döner", async () => {
    findUnique.mockResolvedValue(CITIZEN);

    const response = await callRoute(buildRequest(VALID_BODY, withKey()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("verified");
    expect(body.citizen.firstName).toBe("Emre");
    expect(body.citizen.birthDate).toBe("1990-04-12");
  });

  it("başarılı yanıt simulationBehavior alanını SIZDIRMAZ", async () => {
    // Hangi numaranın hata simülasyonu taşıdığı dışarı çıkarsa, hata
    // yollarını tetikleyecek numaraları bulmak ücretsiz hale gelir.
    findUnique.mockResolvedValue(CITIZEN);

    const raw = JSON.stringify(await (await callRoute(buildRequest(VALID_BODY, withKey()))).json());

    expect(raw).not.toContain("simulationBehavior");
    expect(raw).not.toContain("normal");
  });

  it("TABLODA OLMAYAN numara için not_found döner", async () => {
    findUnique.mockResolvedValue(null);

    const response = await callRoute(buildRequest(VALID_BODY, withKey()));

    expect(response.status).toBe(404);
    expect((await response.json()).status).toBe("not_found");
  });

  it("not_found DAVRANIŞLI kayıt, tabloda olmayan numarayla AYNI cevabı verir", async () => {
    findUnique.mockResolvedValue({ ...CITIZEN, simulationBehavior: "not_found" });

    const response = await callRoute(buildRequest(VALID_BODY, withKey()));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ status: "not_found" });
  });

  it("DOĞUM YILI TUTMAZSA kimlik bilgisi DÖNMEZ", async () => {
    findUnique.mockResolvedValue(CITIZEN);

    const response = await callRoute(buildRequest({ ...VALID_BODY, birthYear: 1991 }, withKey()));
    const body = await response.json();

    expect(body.status).toBe("mismatch");
    expect(JSON.stringify(body)).not.toContain("Emre");
  });
});

describe("HATA SİMÜLASYONU", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("error davranışlı kayıt 500 döner", async () => {
    findUnique.mockResolvedValue({ ...CITIZEN, simulationBehavior: "error" });

    const response = await callRoute(buildRequest(VALID_BODY, withKey()));

    expect(response.status).toBe(500);
    expect((await response.json()).status).toBe("error");
  });

  it("timeout davranışlı kayıt çağıranın 3 sn'lik sınırını AŞAR", async () => {
    // Bu, zaman aşımının gerçekten tetiklenebildiğinin kanıtı: mock, çağıranın
    // sınırı dolduğunda hâlâ cevap vermemiş oluyor.
    findUnique.mockResolvedValue({ ...CITIZEN, simulationBehavior: "timeout" });

    const { POST } = await import("@/app/api/mock-kps/identity-queries/route");

    vi.useFakeTimers();

    let settled = false;
    const responsePromise = POST(buildRequest(VALID_BODY, withKey())).then((response) => {
      settled = true;

      return response;
    });

    await vi.advanceTimersByTimeAsync(KPS_REQUEST_TIMEOUT_MS);

    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(MOCK_KPS_TIMEOUT_DELAY_MS);
    await responsePromise;

    expect(settled).toBe(true);

    vi.useRealTimers();
  });
});

describe("YANIT BAŞLIKLARI", () => {
  beforeEach(() => {
    findUnique.mockReset().mockResolvedValue(CITIZEN);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("kimlik verisi taşıyan yanıt hiçbir katmanda önbelleklenmez", async () => {
    const response = await callRoute(buildRequest(VALID_BODY, withKey()));

    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
  });

  it("arama motorlarına kapalı olarak işaretlenir", async () => {
    const response = await callRoute(buildRequest(VALID_BODY, withKey()));

    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });
});
