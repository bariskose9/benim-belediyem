"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TimerIcon } from "lucide-react";

import { messages } from "@/config/messages";
import { cn } from "@/lib/utils";

/**
 * Koltuk kilidinin kalan süresi (PRD §5.2: "sepet ekranında her biletin
 * yanında kalan süre geri sayar").
 *
 * ═══ GERİ SAYIM BİR SÜS, KURAL DEĞİL ═══
 * Süre burada bittiğinde koltuk KAYBEDİLMİŞ SAYILMAZ; kararı sunucu veriyor.
 * Bu bileşen sıfıra ulaştığında yalnızca sayfayı tazeliyor ve sunucu o an
 * satırı düşürüp bildirimi yazıyor (`seat-expiry.service.ts`). Sayaç hiç
 * çalışmasa bile — sekme arka planda uyusa, JavaScript kapalı olsa —
 * sonuç değişmez: ödeme anında koşullu UPDATE süresi dolmuş kilidi satmıyor.
 *
 * DAKİKA:SANİYE gösteriliyor, yalnızca dakika değil: son 59 saniyede "1 dakika"
 * yazmak kullanıcıya hâlâ vakti olduğunu düşündürüp koltuğu kaybettirirdi.
 */

const copy = messages.events.countdown;

/** Saniyede bir yeterli: daha sık güncellemek pil harcar, gözle fark edilmez. */
const TICK_MS = 1_000;

export function SeatHoldCountdown({
  expiresAt,
  className,
}: {
  expiresAt: Date;
  className?: string;
}) {
  const router = useRouter();
  const expiresAtMs = expiresAt.getTime();

  /**
   * Başlangıç değeri ilk çizimde hesaplanıyor (`useState` başlatıcısı).
   * Efekt içinde `setState` YOK — ESLint bunu yasaklıyor ve haklı.
   */
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, expiresAtMs - Date.now()));

  useEffect(() => {
    const timer = setInterval(() => {
      const left = Math.max(0, expiresAtMs - Date.now());

      setRemainingMs(left);

      /**
       * Süre bitince sunucudan taze sepet isteniyor: satırı düşürecek ve
       * bildirimi yazacak olan orası. İstemcinin kendi başına satır silmesi,
       * sunucunun bilmediği bir "gerçek" üretmek olurdu.
       */
      if (left === 0) {
        clearInterval(timer);
        router.refresh();
      }
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [expiresAtMs, router]);

  const isExpired = remainingMs === 0;

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-sm font-medium tabular-nums",
        isExpired ? "text-destructive" : "text-muted-foreground",
        className,
      )}
      /**
       * Sunucuda çizilen değerle tarayıcıdaki ilk değer saniye farkıyla
       * ayrışabilir; bu bir hata değil, zamanın kendisi. Uyarıyı bastırmak
       * React'in bu durum için önerdiği yol.
       */
      suppressHydrationWarning
    >
      <TimerIcon aria-hidden="true" className="size-4 shrink-0" />
      {isExpired ? copy.expired : copy.label(formatRemaining(remainingMs))}
    </span>
  );
}

/** `9:07` biçimi — dakika sıfır dolgusuz, saniye iki haneli. */
function formatRemaining(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
