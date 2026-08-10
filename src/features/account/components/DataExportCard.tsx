"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";

/**
 * "Verimi indir" kartı (PRD §5.11 · KVKK m.11).
 *
 * ═══ NEDEN DÜZ BİR `<a download>` DEĞİL ═══
 * Denendi ve seçilmedi: uç hata döndüğünde (hız sınırı, oturum düşmesi)
 * tarayıcı ham JSON hata gövdesini yeni bir sekmede açardı ve kullanıcı
 * `{"error":{"code":"RATE_LIMITED"}}` görürdü. `fetch` ile alıp yanıtı
 * kontrol etmek, hatayı ekranda Türkçe bir cümleye çevirmeyi mümkün kılıyor.
 *
 * ⛔ ÜRETİLEN `blob:` ADRESİ HEMEN SERBEST BIRAKILIYOR (`revokeObjectURL`).
 * Bırakılmazsa dosyanın tamamı — yani kullanıcının kişisel verisi — sekme
 * kapanana kadar tarayıcı belleğinde tutulur.
 *
 * ⛔ DOSYA ADI SUNUCUDAN GELEN `Content-Disposition`'DAN OKUNMUYOR, istemcide
 * yeniden üretiliyor: sunucudan gelen bir metni `download` özniteliğine
 * yazmak, başlığı etkileyebilen bir açık bulunduğunda kullanıcının diskine
 * seçilmiş bir dosya adı yazdırmak olurdu.
 */

const copy = messages.account.export;

export function DataExportCard() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/account/export", { cache: "no-store" });

      if (!response.ok) {
        // Hata gövdesi tek tip zarfta (`{ error: { message } }`); ayrıştırma
        // patlarsa da kullanıcı genel cümleyi görüyor, ham gövdeyi değil.
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;

        setError(payload?.error?.message ?? copy.failed);

        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `benim-belediyem-verilerim-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();

      URL.revokeObjectURL(url);
    } catch {
      setError(copy.failed);
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="verimi-indir"
      className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10"
    >
      <h2 id="verimi-indir" className="font-heading text-xl font-semibold tracking-tight">
        {copy.heading}
      </h2>

      <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
      <p className="max-w-prose text-base text-muted-foreground">{copy.safety}</p>
      <p className="max-w-prose rounded-lg bg-muted px-3 py-2 text-base">{copy.warning}</p>

      {error ? (
        <p
          aria-live="assertive"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-base text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div>
        <Button
          type="button"
          className="min-h-11"
          disabled={pending}
          onClick={() => void download()}
        >
          {pending ? copy.pending : copy.action}
        </Button>
      </div>
    </section>
  );
}
