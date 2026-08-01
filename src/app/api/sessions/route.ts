import { InvalidCredentialsError } from "@/features/auth/errors";
import { loginSchema } from "@/features/auth/schemas/login.schema";
import { login } from "@/features/auth/services/login.service";
import { readSessionToken, writeSessionCookie } from "@/features/auth/services/session-context";
import { revokeSession } from "@/features/auth/services/session.service";
import { ensureAnonymousId } from "@/lib/anonymous-id";
import { created, fail } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * POST /api/sessions — giriş.
 *
 * KAYNAK ADI ÇOĞUL VE FİİLSİZ (`03-api-guidelines.md`): "giriş yapmak" bir
 * oturum KAYNAĞI oluşturmaktır, `/api/login` değil. Çıkışı da aynı kaynağın
 * silinmesi karşılıyor: `DELETE /api/sessions/current`.
 *
 * Bu dosyada İŞ MANTIĞI YOKTUR: girdiyi doğrular, servisi çağırır, çerezi
 * yazar, hatayı tek tip zarfa çevirir.
 *
 * YANIT GÖVDESİNDE OTURUM JETONU YOKTUR. Jeton yalnızca httpOnly çerezle
 * taşınır (ADR-002); gövdeye konsaydı JavaScript okuyabilir ve XSS ile
 * çalınabilirdi.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) {
      /**
       * ŞEMA HATASI DA 401 `INVALID_CREDENTIALS` DÖNER, 422 DEĞİL.
       * 422 dönseydi durum kodunun kendisi "numaranın biçimi bozuk" ile
       * "şifre yanlış" arasındaki farkı sızdırırdı.
       */
      throw new InvalidCredentialsError();
    }

    // Girişten ÖNCE okunuyor: çerez birazdan yeni jetonla değiştirilecek.
    const previousToken = await readSessionToken();

    const result = await login({
      payload: parsed.data,
      actorIp: readActorIp(request.headers),
      sessionId: await ensureAnonymousId(),
    });

    /**
     * Aynı tarayıcının önceki oturumu kapatılır.
     *
     * Kapatılmasaydı satır 7 gün daha GEÇERLİ kalırdı: kullanıcının artık
     * ulaşamadığı, "çıkış yap" ile de düşüremediği bir jeton. Sızmış bir kopya
     * varsa ömrü boşuna uzardı. Başka cihazlardaki oturumlara DOKUNULMAZ —
     * onları düşürmek şifre değişiminin işi (ADR-005).
     */
    await revokeSession(previousToken);

    await writeSessionCookie(result.token);

    return created({ expiresAt: result.expiresAt.toISOString() });
  } catch (error) {
    return fail(error, botCheckDetails(error));
  }
}

/**
 * Ekranın bot kutusunu ne zaman açacağını bilmesi için tek bir bayrak.
 *
 * Bu bilgi İSTEĞİ ATAN TARAFA (IP + ziyaretçi çerezi) bağlıdır, hesaba değil;
 * dolayısıyla hesap sayımına yol açmaz. Yanlış şifreyle üçüncü kez deneyen
 * kullanıcı, sayfayı yenilemeden kutuyu görür.
 */
function botCheckDetails(error: unknown): { botCheckRequired: true } | undefined {
  return error instanceof InvalidCredentialsError && error.botCheckRequired
    ? { botCheckRequired: true }
    : undefined;
}

/** Gövdesi bozuk istekte JSON ayrıştırma hatası sızdırmadan boş nesne döner. */
async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
