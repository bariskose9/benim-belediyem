import { NextResponse } from "next/server";

import { buildOpenApiDocument } from "@/features/api-docs/services/openapi.service";
import { isApiDocsPublished } from "@/features/api-docs/services/publication";
import { NotFoundError } from "@/lib/errors";
import { fail } from "@/lib/http";
import { messages } from "@/config/messages";

/**
 * `GET /api/docs` — OpenAPI 3.1 belgesi (adım 18b · ADR-019).
 *
 * ⛔ **PRODUCTION'DA VARSAYILAN OLARAK KAPALI.**
 *
 * Bu API üçüncü taraflara sunulan bir ürün değil, kendi arayüzümüzün arka ucu
 * (BFF). Belgesi hiçbir dış tüketiciye hizmet etmez; buna karşılık tüm uçları,
 * kabul edilen alanları, doğrulama kurallarını ve hata kodlarını tek sayfada,
 * taranabilir biçimde sunar. Kazanç sıfır, bedel gerçek
 * (03-api-guidelines.md → "Belgeyi yayınlamak ile üretmek AYRI kararlardır").
 *
 * ⚠️ Bu bir "gizlilikle güvenlik" argümanı DEĞİLDİR ve öyle savunulmuyor:
 * depo herkese açık, aynı bilgi zaten okunabilir. Argüman saldırı yüzeyi
 * hijyeni — kimseye faydası olmayan bir yüzeyi açık tutmamak. Güvenlik
 * yetkilendirmeden geliyor, belgenin kapalı olmasından değil.
 *
 * ⛔ 403 DEĞİL 404 DÖNÜYOR: 403 "burada bir şey var ama giremezsin" der ve
 * ucun varlığını doğrular. Kapalıyken uç hiç yokmuş gibi davranmalı.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isApiDocsPublished()) throw new NotFoundError(messages.apiDocs.notPublished);

    /**
     * ⛔ `ok()` SARMALAYICISI BİLEREK KULLANILMIYOR — belgenin tek istisnası.
     *
     * `03-api-guidelines.md` her başarılı yanıtın `{ data: ... }` zarfıyla
     * dönmesini istiyor ve bu kural uygulamanın KENDİ kaynakları içindir.
     * Buradaki gövde ise bir uygulama kaynağı değil, **standart biçimli bir
     * belge**: Swagger UI, Scalar, istemci üreticileri ve doğrulayıcıların
     * hepsi `openapi` alanını kökte arar. Zarfa sarılsa belge geçerli bir
     * OpenAPI dosyası olmaktan çıkar ve hiçbir araç okuyamaz.
     *
     * Bu yüzden yanıt `application/json` olarak ham dönüyor. Sapma bilinçli
     * ve tek yerde.
     */
    return NextResponse.json(buildOpenApiDocument(), {
      headers: {
        // Belge derlemeye göre değişiyor (uç listesi, sürüm). Önbelleğe
        // alınırsa yeni dağıtımdan sonra eski belge servis edilir ve
        // "belge yanlış" hatası kodda aranır.
        "Cache-Control": "no-store, max-age=0",
        // Açıldığı ortamda bile arama motoruna girmesin: belgenin okunması
        // istenen kitle geliştiricidir, tarayıcı botu değil.
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
