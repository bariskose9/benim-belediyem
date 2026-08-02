import { messages } from "@/config/messages";
import { cn } from "@/lib/utils";

/**
 * Marka işareti — SIFIRDAN ÇİZİLDİ.
 *
 * Hiçbir gerçek belediyenin logosu, arması veya rengi kullanılmadı ve
 * kullanılamaz: depo herkese açık, site canlı. Belediye armaları dairesel ya da
 * kalkan biçimli, dallı ve yıldızlıdır; bu işaret bilinçli olarak o dile hiç
 * girmiyor — yuvarlak köşeli bir karo içinde sadeleştirilmiş kemerli bir kamu
 * binası cephesi var (alınlık + saçak + üç kemer + zemin).
 *
 * NEDEN SVG, `next/image` DEĞİL: işaret rengini temadan alıyor (`fill-primary`),
 * her boyutta net kalıyor, ayrı bir ağ isteği doğurmuyor ve düzen kaymasına
 * (CLS) yol açmıyor. `<img>` olsaydı koyu temada ayrı bir dosya gerekirdi.
 */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      // Karo ve içindeki cephe DEKORATİF: erişilebilir ad yanındaki yazıdan
      // geliyor. İkisi birden okunsaydı ekran okuyucu adı iki kez söylerdi.
      aria-hidden="true"
      focusable="false"
      className={cn("size-8 shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <g className="fill-primary-foreground">
        {/* Alınlık (üçgen cephe) */}
        <path d="M16 4.6 26.4 9.4H5.6z" />
        {/* Saçak */}
        <rect x="5.2" y="10.4" width="21.6" height="2.2" rx="1.1" />
        {/* Üç kemer — cephenin kimliği burada */}
        <path d="M7 23.4v-6.6a2.5 2.5 0 0 1 5 0v6.6z" />
        <path d="M13.5 23.4v-6.6a2.5 2.5 0 0 1 5 0v6.6z" />
        <path d="M20 23.4v-6.6a2.5 2.5 0 0 1 5 0v6.6z" />
        {/* Zemin */}
        <rect x="5.2" y="24.4" width="21.6" height="2.4" rx="1.2" />
      </g>
    </svg>
  );
}

/**
 * Kelime-logo: işaret + "benim belediyem".
 *
 * Yazı SVG'nin içine gömülmedi, gerçek metin olarak duruyor — böylece ekran
 * okuyucu okuyor, kullanıcı arayüz yazı tipiyle aynı görünüyor ve tarayıcı
 * yazı boyutu ayarına uyuyor.
 *
 * `withWordmark={false}` yalnızca dar alanlar içindir; o durumda ad
 * `sr-only` metinle korunur, yani erişilebilir ad hiçbir zaman kaybolmaz.
 */
export function Logo({
  className,
  withWordmark = true,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark />
      {/* Yazı dar ekranda bir punto küçük: 375px'te logo + tema düğmesi + giriş
          düğmesi + menü düğmesi tek satıra ancak sığıyor. Tahmin değil, ölçüldü:
          bir punto büyükken menü düğmesi alt satıra düşüyordu. */}
      {withWordmark ? (
        <span className="text-sm leading-none font-semibold tracking-tight sm:text-base">
          <span className="font-normal text-muted-foreground">{messages.app.brand.first}</span>{" "}
          <span className="text-foreground">{messages.app.brand.second}</span>
        </span>
      ) : (
        <span className="sr-only">{messages.app.name}</span>
      )}
    </span>
  );
}
