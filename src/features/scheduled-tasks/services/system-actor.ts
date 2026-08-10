import { hashActorIp } from "@/lib/rate-limit";

/**
 * Planlı görevin denetim kaydına yazdığı "aktör" özeti.
 *
 * ═══ NEDEN GERÇEK BİR IP DEĞİL ═══
 * `audit_logs.ip_hash` zorunlu ve `recordAuditLog` yalnızca ÖZET kabul ediyor
 * (düz IP parametresi bilerek yok — `lib/audit.ts`). Görevi bir istemci
 * başlatmıyor; isteği Vercel'in zamanlayıcısı gönderiyor ve o adresin kimlikle
 * ilgisi yok. Gerçek istek IP'sini yazmak, denetim kaydına anlamsız ve
 * yanıltıcı bir iz bırakmak olurdu: "bu işi şu adresten biri yaptı" gibi
 * okunurdu.
 *
 * Sabit bir etiketin özeti yazılıyor: kayıt "bunu sistem yaptı" diyor,
 * kişiselleştirilebilir hiçbir şey taşımıyor ve süzülebilir kalıyor.
 *
 * Sabit değil FONKSİYON: `hashActorIp` tuzu ortam değişkeninden okuyor ve
 * modül yüklenirken hesaplanan bir sabit, ortamın hazır olmasını içe aktarma
 * sırasına bağımlı kılardı.
 */
export function systemActorIpHash(): string {
  return hashActorIp("system");
}
