import { requireAccess } from "@/features/auth/services/api-guard";
import { InvalidStaffVerificationRequestError } from "@/features/staff-verification/errors";
import {
  staffVerificationRequestSchema,
  staffVerificationStartedResponseSchema,
} from "@/features/staff-verification/schemas/staff-verification.schema";
import { requestStaffVerification } from "@/features/staff-verification/services/staff-verification.service";
import { created, fail } from "@/lib/http";
import { isSameOriginRequest } from "@/lib/same-origin";

/**
 * `POST /api/v1/staff-verifications` — kurumsal adrese personel doğrulama kodu
 * gönderir (adım 17c · ADR-017 ilke 2).
 *
 * Bu dosyada İŞ MANTIĞI YOKTUR (01-architecture.md): kapıdan geçirir, girdiyi
 * Zod ile doğrular, servisi çağırır ve hatayı tek tip zarfa çevirir. Hız
 * sınırının İKİ bacağı da serviste — orada olmaları şart, çünkü sıraları
 * (kullanıcı → adres → rehber sorgusu) hesap sayımı korumasının parçası.
 *
 * ⛔ KADEME `authenticated`, `identity_verified` DEĞİL. Kimlik kademesi bu
 * akışın ÖN KOŞULU ama kapıya yazılmıyor: `requireAccess("identity_verified")`
 * yazılsaydı, kimliği doğrulanmamış kullanıcı tek tip bir yetki hatası alırdı.
 * Servis kendi hata tipiyle (`StaffIdentityRequiredError`) cevaplıyor ve ekran
 * kullanıcıyı kimlik doğrulamasına yönlendirebiliyor.
 *
 * ⛔ KULLANICI KİMLİĞİ GÖVDEDEN GELMİYOR, oturumdan okunuyor (IDOR koruması
 * tasarım gereği, 05-auth-security.md).
 *
 * ⛔ YANITTA "BU ADRES REHBERDE VAR MI" BİLGİSİ YOK: adres bulunsa da
 * bulunmasa da aynı gövde dönüyor. Gerekçe serviste yazılı.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireAccess("authenticated");

    /**
     * ⛔ CSRF KAPISI. Asıl koruma çerezin `sameSite: lax` olmasında; bu ikinci
     * katman JSON gövdeli uçlarda gerçek bir açığı kapatıyor: `request.json()`
     * `content-type` başlığına BAKMIYOR, yani `enctype="text/plain"` ile
     * gönderilmiş bir HTML formunun gövdesi de geçerli JSON olarak ayrıştırılır.
     * Bu uç bir YETKİ AKIŞINI başlattığı için tek katmanla yetinilmedi.
     */
    if (!isSameOriginRequest(request.headers)) throw new InvalidStaffVerificationRequestError();

    const parsed = staffVerificationRequestSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) throw new InvalidStaffVerificationRequestError();

    const result = await requestStaffVerification({
      userId: session.userId,
      workEmail: parsed.data.workEmail,
    });

    /**
     * `revealedCode` YALNIZCA local ve preview'da dolu olabilir; production'da
     * `otp.service.ts` → `revealCodeIfAllowed()` her zaman `undefined` döndürür
     * ve sahte kanal production'da zaten seçilemiyor (`src/config/env.ts`).
     */
    return created(
      { revealedCode: result.revealedCode },
      { schema: staffVerificationStartedResponseSchema },
    );
  } catch (error) {
    return fail(error);
  }
}

/** Gövdesi bozuk istekte JSON ayrıştırma hatası sızdırmadan boş nesne döner. */
async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
