import { KPS_RATE_LIMIT_MAX_ATTEMPTS, KPS_RATE_LIMIT_WINDOW_MS } from "@/config/constants";
import { IdentityCheckFailedError, IdentityRateLimitedError } from "@/features/auth/errors";
import { requireAccess } from "@/features/auth/services/api-guard";
import { verifyIdentity } from "@/features/auth/services/identity-verification.service";
import { identityChallengeSchema } from "@/features/identity/schemas/identity-challenge.schema";
import { created, fail } from "@/lib/http";
import { consumeRateLimit, rateLimitKey, readActorIp } from "@/lib/rate-limit";

/**
 * POST /api/v1/identity-verifications — girişli hesaba KPS kimliğini bağlar
 * (PRD §5.0 · teknik borç #32).
 *
 * Bu dosyada İŞ MANTIĞI YOKTUR (01-architecture.md): kapıdan geçirir, bütçeyi
 * düşer, girdiyi Zod ile doğrular, servisi çağırır ve hatayı tek tip zarfa
 * çevirir.
 *
 * ⛔ KADEME `authenticated`, `identity_verified` DEĞİL: buraya gelen kullanıcı
 * zaten doğrulanmamış olan. `identity_verified` istenseydi uç kendi
 * kullanıcısını dışarıda bırakırdı.
 *
 * ⛔ KULLANICI KİMLİĞİ GÖVDEDEN GELMİYOR, oturumdan okunuyor: "başkasının
 * hesabına kimlik bağla" diyebileceği bir alan yok (IDOR koruması tasarım
 * gereği, 05-auth-security.md).
 *
 * ⛔ YANITTA KİMLİK ALANI YOK: kullanıcı zaten girdiği numarayı biliyor, ad
 * soyad ise ekranda karşılama cümlesi için dönüyor. Doğum yeri, baba/anne adı
 * gibi KPS alanları bu akışta hiç dışarı çıkmıyor — kayıt ekranındaki
 * "bilgilerini gör ve onayla" adımı burada yok, çünkü hesap zaten var.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireAccess("authenticated");

    await enforceAttemptBudget(session.userId);

    const parsed = identityChallengeSchema.safeParse(await readJsonBody(request));

    /**
     * ŞEMA HATASI DA 400 `IDENTITY_CHECK_FAILED` DÖNER, 422 DEĞİL — kayıt
     * ucundaki aynı gerekçe: 422 dönseydi DURUM KODUNUN KENDİSİ "numaran
     * bozuk" ile "numara kayıtlı değil" arasındaki farkı sızdırır ve tek tip
     * mesajın sildiği ayrım geri gelirdi (05-auth-security.md).
     */
    if (!parsed.success) throw new IdentityCheckFailedError();

    const result = await verifyIdentity({
      userId: session.userId,
      payload: parsed.data,
      actorIp: readActorIp(request.headers),
      // Hız sınırının "oturum" bacağı (ADR-006). Ziyaretçi kimliği değil GERÇEK
      // oturum kimliği: çerezi silmek bu sayacı sıfırlamaya yetmesin.
      sessionId: session.sessionId,
    });

    // ⛔ `isStaff` YANITTAN KALDIRILDI (adım 17c · ADR-017 ilke 2): kimlik
    // doğrulaması artık personel yetkisi vermiyor, söyleyecek bir şeyi yok.
    return created({ fullName: result.fullName });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Deneme bütçesi — KULLANICI başına 15 dakikada 5 deneme, ZOD'DAN ÖNCE.
 *
 * ⛔ SIRA BİLİNÇLİ ve `identity-lookup.service.ts`'teki kararın aynısı:
 * "Geçersiz biçimli bir istek de sayacı artırır: aksi halde saldırgan sınırsız
 * sayıda ücretsiz istek atarak sunucuyu meşgul edebilirdi." Bedeli kabul
 * edilmiş bir kolaylık kaybı: numarasını beş kez yanlış yazan kullanıcı da
 * 15 dakika bekler.
 *
 * ═══ NEDEN `lookupIdentity`'NİN KENDİ SINIRI YETMİYOR ═══
 * Orada sayaç IP ve OTURUM bazlı. Oturum kimliği çıkış yapıp yeniden girerek
 * yenilenebiliyor, IP ise mobil şebekede değişiyor. Kullanıcı bazlı üçüncü
 * bacak, girişli bir saldırganın numara taramasını bu iki yolla sürdürmesini
 * kapatıyor — ve profil uçlarının gevşek bütçesi (30/15dk) yerine KPS'in kendi
 * sıkı bütçesi kullanılıyor (PRD §5.0: "5 deneme / 15 dakika").
 */
async function enforceAttemptBudget(userId: string): Promise<void> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("identity_verification", "user", userId),
    limit: KPS_RATE_LIMIT_MAX_ATTEMPTS,
    windowMs: KPS_RATE_LIMIT_WINDOW_MS,
  });

  if (!decision.allowed) throw new IdentityRateLimitedError();
}

/** Gövdesi bozuk istekte JSON ayrıştırma hatası sızdırmadan boş nesne döner. */
async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
