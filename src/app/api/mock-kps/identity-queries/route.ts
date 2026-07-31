import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  MOCK_KPS_API_KEY_HEADER,
  MOCK_KPS_MAX_DELAY_MS,
  MOCK_KPS_MIN_DELAY_MS,
  MOCK_KPS_TIMEOUT_DELAY_MS,
} from "@/config/constants";
import { serverEnv } from "@/config/env";
import { prisma } from "@/lib/db";
import { sleep } from "@/lib/utils";

import type { MockKpsCitizenPayload, MockKpsResponseBody } from "../contract";

/**
 * `POST /api/mock-kps/identity-queries` — SAHTE KPS (ADR-003, PRD §5.0).
 *
 * Bu uç uygulamanın parçası gibi davranmaz; taklit edilen DIŞ KURUM'dur.
 * Uygulama buraya `MockKpsProvider` üzerinden, gerçek bir HTTP isteğiyle gelir.
 *
 * NEDEN GET DEĞİL POST: kimlik numarası URL'de taşınsaydı sunucu erişim
 * log'una, vekil sunucu kayıtlarına, tarayıcı geçmişine ve `Referer` başlığına
 * düşerdi. Bunların hiçbiri bizim kontrolümüzde değil
 * (05-auth-security.md → "kimlik numarası URL'e asla yazılmaz").
 *
 * BURADA OLMAYANLAR — bilerek: zaman aşımı, yeniden deneme, devre kesici ve
 * hız sınırı. Onlar ÇAĞIRAN tarafın kurallarıdır. Yeniden denemeyi taklit
 * edilen servisin içine koymak, gerçek hayatta karşılığı olmayan bir şey
 * yapmak olurdu — servis kendi kendini yeniden denemez.
 */

/**
 * `nationalId` burada yalnızca BİÇİM olarak doğrulanıyor; kontrol basamağı
 * uygulama tarafında (`isValidNationalId`) bakılıyor. Gerçek KPS de kendisine
 * gelen numaranın algoritmaya uyup uymadığını çağırana bırakır.
 */
const requestSchema = z.object({
  nationalId: z.string().regex(/^[1-9][0-9]{10}$/),
  // Zorunlu: ikinci doğrulama alanı olmadan kimlik bilgisi DÖNMEZ
  // (05-auth-security.md → "tek alanla veri dönülmez").
  birthYear: z.number().int().min(1900).max(2100),
});

export async function POST(request: Request): Promise<NextResponse<MockKpsResponseBody>> {
  // 1) Gizli anahtar EN BAŞTA. Doğrulama, gecikme, veritabanı — hiçbiri bundan
  //    önce çalışmaz; aksi halde yetkisiz istek yine de kaynak tüketirdi.
  if (!hasValidApiKey(request)) {
    return respond({ status: "unauthorized" }, 401);
  }

  const parsed = requestSchema.safeParse(await readJsonBody(request));

  if (!parsed.success) {
    // Hangi alanın hatalı olduğu SÖYLENMEZ: "birthYear eksik" cevabı, alanı hiç
    // göndermeden numara taramak isteyen birine yol gösterirdi.
    return respond({ status: "invalid_request" }, 400);
  }

  // 2) Yapay gecikme — sahte servisin kendi davranışı (PRD §5.0: 200–800 ms).
  await sleep(randomDelayMs());

  const citizen = await prisma.kpsCitizen.findUnique({
    where: { nationalId: parsed.data.nationalId },
    select: {
      firstName: true,
      lastName: true,
      birthDate: true,
      birthPlace: true,
      fatherName: true,
      motherName: true,
      registeredProvince: true,
      registeredDistrict: true,
      gender: true,
      maritalStatus: true,
      registeredAddress: true,
      simulationBehavior: true,
    },
  });

  // 3) Tabloda hiç olmayan numara ile `not_found` işaretli kayıt AYNI cevabı
  //    verir — dışarıdan ikisi ayırt edilemez.
  if (!citizen || citizen.simulationBehavior === "not_found") {
    return respond({ status: "not_found" }, 404);
  }

  // 4) Hata yollarını test edebilmek için kayda iliştirilen davranışlar.
  if (citizen.simulationBehavior === "timeout") {
    // Çağıranın 3 sn'lik sınırını aşacak kadar bekler; çağıran isteği keser.
    await sleep(MOCK_KPS_TIMEOUT_DELAY_MS);

    return respond({ status: "error" }, 500);
  }

  if (citizen.simulationBehavior === "error") {
    return respond({ status: "error" }, 500);
  }

  // 5) Doğum yılı tutmazsa KİMLİK BİLGİSİ DÖNMEZ. Hangi alanın tutmadığı da
  //    burada söylenmiyor; çağıran zaten bunu kullanıcıya iletmeyecek.
  if (citizen.birthDate.getUTCFullYear() !== parsed.data.birthYear) {
    return respond({ status: "mismatch" }, 200);
  }

  const { simulationBehavior: _behavior, ...identity } = citizen;

  return respond({ status: "verified", citizen: toPayload(identity) }, 200);
}

/**
 * Anahtar karşılaştırması SABİT ZAMANLI.
 *
 * Düz `===` karşılaştırması ilk farklı karakterde durur; saldırgan yanıt
 * sürelerini ölçerek anahtarı karakter karakter bulabilir. `timingSafeEqual`
 * eşit uzunlukta tampon ister, bu yüzden iki değer önce SHA-256'dan geçiriliyor:
 * özetler her zaman 32 bayt olduğu için uzunluk farkı da sızmıyor.
 */
function hasValidApiKey(request: Request): boolean {
  const provided = request.headers.get(MOCK_KPS_API_KEY_HEADER);

  if (!provided) return false;

  return timingSafeEqual(sha256(provided), sha256(serverEnv.MOCK_KPS_API_KEY));
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Bozuk JSON gövdesi istisna fırlatır; burada yakalanıp doğrulamaya bırakılır. */
async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function randomDelayMs(): number {
  const span = MOCK_KPS_MAX_DELAY_MS - MOCK_KPS_MIN_DELAY_MS;

  return MOCK_KPS_MIN_DELAY_MS + Math.floor(Math.random() * (span + 1));
}

/**
 * `simulationBehavior` bu tipe GİRMEZ ve girmemeli: hangi numaranın hata
 * simülasyonu taşıdığı dışarıya sızarsa, hata yollarını tetikleyecek numaraları
 * bulmak ücretsiz hale gelir. Alan yukarıda açıkça ayıklanıyor.
 */
function toPayload(
  citizen: Omit<MockKpsCitizenPayload, "birthDate"> & { birthDate: Date },
): MockKpsCitizenPayload {
  return {
    ...citizen,
    // Sadece tarih; saat bilgisi sözleşmede yok ve kimseye lazım değil.
    birthDate: citizen.birthDate.toISOString().slice(0, 10),
  };
}

function respond(body: MockKpsResponseBody, status: number): NextResponse<MockKpsResponseBody> {
  return NextResponse.json(body, {
    status,
    headers: {
      // Kimlik verisi taşıyan bir yanıt hiçbir katmanda saklanmamalı.
      "Cache-Control": "no-store, max-age=0",
      // Uç yalnızca sunucudan çağrılır; arama motoru bulmasın diye açık işaret.
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
