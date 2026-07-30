import { envLabel } from "@/config/env";
import { messages } from "@/config/messages";

/**
 * Local ve preview ortamlarında ekranın üstünde renkli şerit gösterir
 * (docs/standards/13-environments.md → "Ortam ayrımı için görsel işaret").
 *
 * Neden gerekli: test ortamı canlı sanılıp gerçek veri girilmesin diye.
 * Production'da hiç render edilmez.
 *
 * Renkler bilinçli olarak temadan bağımsız sabittir: şerit açık ve koyu modda
 * aynı görünmeli ki "hangi ortamdayım" sorusu temaya göre değişmesin.
 * Bilgi yalnızca renkle aktarılmaz — metin de yazar (07-ui-design-system.md).
 */
export function EnvBanner() {
  if (envLabel === "production") {
    return null;
  }

  const isPreview = envLabel === "preview";
  const { label, description } = isPreview ? messages.envBanner.preview : messages.envBanner.local;

  return (
    <div
      role="status"
      className={
        isPreview
          ? "flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-violet-300 px-4 py-2 text-center text-sm text-violet-950"
          : "flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-amber-300 px-4 py-2 text-center text-sm text-amber-950"
      }
    >
      <span className="font-bold tracking-wide">{label}</span>
      <span>{description}</span>
    </div>
  );
}
