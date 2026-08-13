/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `POST /api/v1/payments` — UCUN KENDİ İŞİ.
 *
 * İş kuralları (üç sipariş, başarısızlıkta geri alma, idempotency, stok
 * yarışı) gerçek PostgreSQL'e karşı `tests/db/checkout.test.ts` içinde
 * kanıtlandı. Burada sınanan dört şey:
 *  1. Giriş kapısı (401) — servis HİÇ çağrılmamalı
 *  2. Girdi doğrulama (422)
 *  3. ⛔ KART NUMARASININ YANITA VE LOG'A SIZMAMASI
 *  4. Hata zarfının tek tip olması
 */

type SessionShape = {
  sessionId: string;
  userId: string;
  fullName: string;
  role: "user" | "admin";
  isStaff: boolean;
  identityStatus: "unverified" | "kps_verified";
  expiresAt: Date;
};

const state = vi.hoisted(() => ({ session: null as SessionShape | null }));

vi.mock("@/features/auth/services/session-context", () => ({
  getCurrentSession: async () => state.session,
}));

const checkout = vi.hoisted(() => vi.fn());

vi.mock("@/features/payment/services/checkout.service", () => ({ checkout }));

const { POST } = await import("@/app/api/v1/payments/route");
const { messages } = await import("@/config/messages");

/** Hata sınıfları uç modülüyle AYNI aşamada içe aktarılıyor — `instanceof` tutsun diye. */
const { CartChangedError, PaymentDeclinedError } = await import("@/features/payment/errors");

/** `fake-data-guide.md`'deki sahte test kartı. */
const CARD_NUMBER = "4111111111111111";

const USER: SessionShape = {
  sessionId: "session-1",
  userId: "user-1",
  fullName: "Test Kullanıcı",
  role: "user",
  isStaff: false,
  identityStatus: "unverified",
  expiresAt: new Date("2030-01-01T00:00:00.000Z"),
};

function validBody() {
  return {
    idempotencyKey: "idem-0123456789",
    expectedTotalKurus: 45900,
    card: {
      kind: "new",
      number: CARD_NUMBER,
      holderName: "Test Kullanici",
      expMonth: 12,
      expYear: 2030,
      cvv: "123",
      save: false,
    },
    delivery: { addressId: "address-1", deliverySlot: "3 Eylül 10:00-12:00" },
  };
}

function request(body: unknown): Request {
  return new Request("http://localhost:3000/api/v1/payments", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  state.session = USER;
  checkout.mockReset();
  checkout.mockResolvedValue({
    paymentId: "payment-1",
    transactionId: "TRX-TEST-1",
    orderIds: ["order-1", "order-2"],
    totalKurus: 45900,
  });
});

describe("giriş kapısı", () => {
  it("giriş yapılmamışsa 401 döner ve servis HİÇ çağrılmaz", async () => {
    state.session = null;

    const response = await POST(request(validBody()));

    expect(response.status).toBe(401);
    expect(checkout).not.toHaveBeenCalled();
  });

  /**
   * Ödeme KPS doğrulaması İSTEMEZ (PRD §5.0 erişim kademeleri): sipariş ve
   * bilet doğrulanmamış kullanıcıya da açık. Kimlik yalnızca hastane ve spor
   * salonu için gerekiyor.
   */
  it("kimliği doğrulanmamış kullanıcı ödeme yapabilir", async () => {
    const response = await POST(request(validBody()));

    expect(response.status).toBe(201);
  });
});

describe("girdi", () => {
  it("geçerli istekte 201 ve işlem kodu döner", async () => {
    const response = await POST(request(validBody()));
    const body = await response.json();

    expect(body.data.transactionId).toBe("TRX-TEST-1");
    expect(body.data.orderIds).toHaveLength(2);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("userId oturumdan alınır, gövdeden DEĞİL", async () => {
    await POST(request({ ...validBody(), userId: "baskasinin-kimligi" }));

    expect(checkout).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
  });

  it("eksik alanda 422 döner ve servis çağrılmaz", async () => {
    const response = await POST(request({ idempotencyKey: "x" }));

    expect(response.status).toBe(422);
    expect(checkout).not.toHaveBeenCalled();
  });

  /**
   * ═══ FİİLEN YAŞANMIŞ BİR YANILTMANIN NÖBETÇİSİ ═══
   *
   * Son kullanma alanları boş bırakıldığında ekran "Kart numarası geçersiz"
   * diyordu ve kullanıcı numarayı kontrol etmeye yönlendiriliyordu — numara
   * doğruyken. Hangi alanın hatalı olduğunu SÖYLEYEMİYORUZ (gövdede kart
   * numarası var, Zod'un hata nesnesi girdinin parçalarını taşıyabiliyor),
   * ama yanlış alanı göstermemek elimizde.
   */
  it("son kullanma boşken KART NUMARASINI suçlamaz", async () => {
    const valid = validBody();
    // Kullanıcının iki alanı boş bırakması: tarayıcıdan boş metin gelir.
    const broken = { ...valid, card: { ...valid.card, expMonth: "", expYear: "" } };

    const response = await POST(request(broken));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.message).not.toBe(messages.payment.errors.invalidNumber);
    expect(body.error.message).toBe(messages.payment.errors.invalidRequest);
  });
});

/**
 * ═══ BU DOSYANIN EN ÖNEMLİ BÖLÜMÜ ═══
 * Kart numarası; yanıt gövdesine, hata mesajına ve sunucu log'una ASLA
 * yazılmamalı (05-auth-security.md).
 */
describe("kart numarası sızıntısı", () => {
  it("başarılı yanıtta kart numarası geçmez", async () => {
    const response = await POST(request(validBody()));

    expect(JSON.stringify(await response.json())).not.toContain(CARD_NUMBER);
  });

  it("şema hatasında kart numarası yanıta sızmaz", async () => {
    const broken = validBody();

    broken.card.cvv = "abc"; // geçersiz CVV → şema reddeder

    const response = await POST(request(broken));
    const serialized = JSON.stringify(await response.json());

    expect(response.status).toBe(422);
    expect(serialized).not.toContain(CARD_NUMBER);
    expect(serialized).not.toContain("4111");
  });

  it("iş kuralı hatasında kart numarası yanıta sızmaz", async () => {
    checkout.mockRejectedValue(new PaymentDeclinedError());

    const response = await POST(request(validBody()));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("PAYMENT_DECLINED");
    expect(JSON.stringify(body)).not.toContain(CARD_NUMBER);
  });

  it("beklenmeyen hatada ne yanıta ne LOG'A kart numarası yazılır", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    checkout.mockRejectedValue(new Error("sağlayıcı çöktü"));

    const response = await POST(request(validBody()));
    const serialized = JSON.stringify(await response.json());

    expect(response.status).toBe(500);
    expect(serialized).not.toContain(CARD_NUMBER);
    expect(serialized).toContain(messages.errors.unexpected);

    // Sunucu log'una yazılan her şey de kontrol ediliyor.
    const logged = consoleError.mock.calls.map((call) => JSON.stringify(call)).join(" ");

    expect(logged).not.toContain(CARD_NUMBER);

    consoleError.mockRestore();
  });
});

describe("hata zarfı", () => {
  it("sepet değiştiyse 409 CART_CHANGED döner", async () => {
    checkout.mockRejectedValue(new CartChangedError());

    const response = await POST(request(validBody()));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("CART_CHANGED");
    expect(body.error.message).toBe(messages.payment.errors.cartChanged);
  });
});
