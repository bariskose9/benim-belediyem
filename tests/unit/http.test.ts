import { afterEach, describe, expect, it, vi } from "vitest";

import { ConflictError, InternalError, NotFoundError, toAppError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";

describe("tek tip yanıt zarfı", () => {
  it("başarılı yanıtı data içine sarar", async () => {
    const response = ok({ id: "abc" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { id: "abc" } });
  });

  it("sayfalama bilgisi verilirse meta ekler", async () => {
    const body = await ok([1, 2], { meta: { page: 1, total: 2 } }).json();

    expect(body.meta).toEqual({ page: 1, total: 2 });
  });

  it("varsayılan olarak önbellek başlığı eklemez", () => {
    expect(ok({ id: "abc" }).headers.get("cache-control")).toBeNull();
  });

  it("noStore istenirse önbelleklemeyi kapatan başlık ekler", () => {
    // force-dynamic tek başına bu başlığı EKLEMİYOR; CDN cevabı dondurabilirdi.
    expect(ok({ id: "abc" }, { noStore: true }).headers.get("cache-control")).toBe(
      "no-store, max-age=0",
    );
  });
});

describe("hata yanıtları", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tiplenmiş hatanın kodunu ve durum kodunu korur", async () => {
    const response = fail(new NotFoundError("Aradığınız kayıt bulunamadı."));

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });

  it("kullanıcıya Türkçe ve eyleme dönük mesaj gösterir", async () => {
    const body = await fail(
      new ConflictError("Seçtiğiniz saat dolmuş. Lütfen başka bir saat seçin."),
    ).json();

    expect(body.error.message).toMatch(/başka bir saat seçin/);
  });

  it("beklenmeyen hatada iç detay sızdırmaz", async () => {
    // Gerçek hata log'a gitmeli ama istemciye ASLA gitmemeli.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const leaky = new Error("connect ECONNREFUSED 10.0.0.5:5432 — /Users/gizli/db.ts");

    const response = fail(leaky);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(body)).not.toContain("/Users/");
    expect(consoleError).toHaveBeenCalled();
  });

  it("beklenen hatayı sunucu log'una yazmaz", async () => {
    // 404 bir arıza değil; log'u kirletmemeli.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    fail(new NotFoundError("Kayıt bulunamadı."));

    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe("toAppError", () => {
  it("tanımadığı değeri InternalError'a çevirir", () => {
    expect(toAppError("düz metin hata")).toBeInstanceOf(InternalError);
    expect(toAppError(undefined)).toBeInstanceOf(InternalError);
  });

  it("tiplenmiş hatayı olduğu gibi bırakır", () => {
    const original = new NotFoundError("yok");

    expect(toAppError(original)).toBe(original);
  });
});
