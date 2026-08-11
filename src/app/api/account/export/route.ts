import { buildDataExport } from "@/features/account/services/data-export.service";
import { requireAccess } from "@/features/auth/services/api-guard";
import { fail } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * `GET /api/account/export` — kullanıcının kendi verisini JSON dosyası olarak
 * indirir (PRD §5.11 · KVKK m.11 veri taşınabilirliği).
 *
 * Bu dosyada İŞ MANTIĞI YOKTUR (01-architecture.md): kapıdan geçirir, servisi
 * çağırır, yanıtı indirilebilir hâle getirir.
 *
 * ═══ NEDEN `ok()` KULLANILMIYOR ═══
 * Projedeki tek tip zarf (`{ data: ... }`) bir API yanıtı için doğru, ama bu
 * uç bir DOSYA üretiyor ve kullanıcı onu bir metin düzenleyicide açacak.
 * Zarfın içindeki `data` anahtarı, dosyayı okuyan insanı gereksizce bir
 * seviye derine indirirdi. Uç istemci koduyla değil TARAYICI İNDİRMESİYLE
 * tüketiliyor — sözleşmenin muhatabı farklı.
 *
 * ⛔ `Cache-Control: no-store` ŞART: yanıt kullanıcının kişisel verisinin
 * TAMAMI. Araya giren bir vekil veya CDN bunu saklarsa, aynı adrese gelen
 * başka bir kullanıcıya servis edilebilir (`14-privacy-and-compliance.md`).
 *
 * ⛔ `Content-Disposition: attachment` ŞART: `inline` olsaydı tarayıcı JSON'u
 * sekmede açar ve dosya tarayıcı geçmişinde/oturum geri yüklemesinde kalırdı.
 *
 * ⛔ `X-Content-Type-Options: nosniff`: içerik kullanıcının kendi yazdığı
 * metinleri (destek talebi açıklaması) taşıyor. Tarayıcının türü tahmin edip
 * gövdeyi HTML sanması, kullanıcının kendi verisiyle kendi tarayıcısında
 * betik çalıştırması demek olurdu.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requireAccess("authenticated");
    const now = new Date();

    const document = await buildDataExport({
      userId: session.userId,
      actorIp: readActorIp(request.headers),
      now,
    });

    return new Response(JSON.stringify(document, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${buildFileName(now)}"`,
        "cache-control": "no-store, max-age=0",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Dosya adı: `benim-belediyem-verilerim-2026-08-10.json`.
 *
 * ⛔ ADA KULLANICI ADI VEYA KİMLİK NUMARASI KONMUYOR. Dosya adı, dosyanın
 * içeriğinden çok daha görünür bir yerdedir: indirilenler klasöründe, ekran
 * paylaşımında, e-posta ekinde. Tarih yeterli ayırt ediciliği veriyor.
 *
 * ⛔ ADIN TAMAMI SABİT VE ASCII — hiçbir parçası kullanıcı girdisinden
 * gelmiyor, yani `Content-Disposition` başlığına satır sonu veya tırnak
 * enjekte edilebilecek bir yol yok (başlık enjeksiyonu).
 */
function buildFileName(now: Date): string {
  const day = now.toISOString().slice(0, 10);

  return `benim-belediyem-verilerim-${day}.json`;
}
