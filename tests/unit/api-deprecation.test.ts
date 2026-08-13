import { describe, expect, it } from "vitest";

import { withDeprecation } from "@/lib/api-deprecation";

/**
 * Emeklilik başlıkları (ADR-020 Karar 3 · borç #103).
 *
 * ⭐ BU TESTLERİN ASIL İŞİ BİÇİMİ KİLİTLEMEK. `Deprecation` sezgiye aykırı
 * biçimde bir HTTP-date DEĞİL, `@<unix-saniye>` biçiminde bir Structured Field
 * Date (RFC 9745 §2) — `Sunset` ise HTTP-date (RFC 8594). İkisini karıştırmak
 * derlemede de, testte de yakalanmayan sessiz bir hata olurdu: başlık yazılır,
 * istemci okuyamaz.
 */

/** 2026-03-01 23:59:59 UTC */
const DEPRECATED_AT = new Date("2026-03-01T23:59:59.000Z");
/** 2026-09-01 23:59:59 UTC */
const SUNSET_AT = new Date("2026-09-01T23:59:59.000Z");

describe("withDeprecation — RFC 9745 Deprecation başlığı", () => {
  it("değeri `@<unix-saniye>` biçiminde yazar, HTTP-date olarak DEĞİL", () => {
    const response = withDeprecation(new Response(null, { status: 200 }), {
      deprecatedAt: DEPRECATED_AT,
      sunsetAt: SUNSET_AT,
    });

    expect(response.headers.get("Deprecation")).toBe(
      `@${Math.floor(DEPRECATED_AT.getTime() / 1000)}`,
    );
    expect(response.headers.get("Deprecation")).toMatch(/^@\d+$/);
  });

  it("milisaniyeyi saniyeye AŞAĞI yuvarlar — kesirli Structured Field Date geçersizdir", () => {
    const response = withDeprecation(new Response(null, { status: 200 }), {
      deprecatedAt: new Date("2026-03-01T23:59:59.750Z"),
      sunsetAt: SUNSET_AT,
    });

    expect(response.headers.get("Deprecation")).toBe("@1772409599");
  });
});

describe("withDeprecation — RFC 8594 Sunset başlığı", () => {
  it("değeri HTTP-date biçiminde ve GMT olarak yazar", () => {
    const response = withDeprecation(new Response(null, { status: 200 }), {
      deprecatedAt: DEPRECATED_AT,
      sunsetAt: SUNSET_AT,
    });

    expect(response.headers.get("Sunset")).toBe("Tue, 01 Sep 2026 23:59:59 GMT");
  });

  it("Sunset, Deprecation'dan ÖNCE olamaz — hata fırlatır", () => {
    expect(() =>
      withDeprecation(new Response(null, { status: 200 }), {
        deprecatedAt: SUNSET_AT,
        sunsetAt: DEPRECATED_AT,
      }),
    ).toThrow(/Sunset tarihi Deprecation tarihinden önce olamaz/);
  });

  it("Sunset ile Deprecation AYNI an olabilir — 'önce olamaz' eşitliği dışlamaz", () => {
    const response = withDeprecation(new Response(null, { status: 200 }), {
      deprecatedAt: DEPRECATED_AT,
      sunsetAt: DEPRECATED_AT,
    });

    expect(response.headers.get("Sunset")).toBe("Sun, 01 Mar 2026 23:59:59 GMT");
  });
});

describe("withDeprecation — Link başlığı", () => {
  it('halefi `rel="successor-version"` ile bildirir', () => {
    const response = withDeprecation(new Response(null, { status: 200 }), {
      deprecatedAt: DEPRECATED_AT,
      sunsetAt: SUNSET_AT,
      successor: "/api/v2/appointments",
    });

    expect(response.headers.get("Link")).toBe('</api/v2/appointments>; rel="successor-version"');
  });

  it('belge adresini `rel="deprecation"` ile ayrıca bildirir', () => {
    const response = withDeprecation(new Response(null, { status: 200 }), {
      deprecatedAt: DEPRECATED_AT,
      sunsetAt: SUNSET_AT,
      successor: "/api/v2/appointments",
      documentation: "https://example.test/emeklilik",
    });

    expect(response.headers.get("Link")).toBe(
      '</api/v2/appointments>; rel="successor-version", ' +
        '<https://example.test/emeklilik>; rel="deprecation"; type="text/html"',
    );
  });

  it("yanıtta zaten duran Link başlığını EZMEZ, sonuna ekler", () => {
    const existing = new Response(null, {
      status: 200,
      headers: { Link: '</api/v1/appointments?page=2>; rel="next"' },
    });

    const response = withDeprecation(existing, {
      deprecatedAt: DEPRECATED_AT,
      sunsetAt: SUNSET_AT,
      successor: "/api/v2/appointments",
    });

    expect(response.headers.get("Link")).toBe(
      '</api/v1/appointments?page=2>; rel="next", </api/v2/appointments>; rel="successor-version"',
    );
  });

  it("halef de belge de yoksa Link başlığı HİÇ yazılmaz", () => {
    const response = withDeprecation(new Response(null, { status: 200 }), {
      deprecatedAt: DEPRECATED_AT,
      sunsetAt: SUNSET_AT,
    });

    expect(response.headers.get("Link")).toBeNull();
  });
});

describe("withDeprecation — yanıtın kendisi", () => {
  it("gövdeyi ve durum kodunu DEĞİŞTİRMEZ", async () => {
    const original = new Response(JSON.stringify({ data: { id: "abc" } }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });

    const response = withDeprecation(original, {
      deprecatedAt: DEPRECATED_AT,
      sunsetAt: SUNSET_AT,
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { id: "abc" } });
  });
});
