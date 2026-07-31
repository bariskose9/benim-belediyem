"use client";

import { useEffect, useId, useRef } from "react";

import { TURNSTILE_SCRIPT_ORIGIN } from "@/config/constants";

/**
 * Cloudflare Turnstile bulmacası (ADR-004).
 *
 * HAZIR PAKET KULLANILMADI (`@marsidev/react-turnstile`): `00-stack.md`
 * "tek fonksiyon için paket eklenmez" diyor ve burada yapılan iş bir betik
 * etiketi eklemek ve bir geri çağrı dinlemekten ibaret.
 *
 * Jeton İSTEMCİDE HİÇBİR ŞEYE YETMEZ; sunucu her istekte Cloudflare'a karşı
 * yeniden doğrular. Buradaki tek görev jetonu alıp forma taşımak.
 *
 * Site anahtarı yoksa hiçbir şey render edilmez ve boş jeton gönderilir —
 * yalnızca local'de anlamlıdır, sunucu preview ve production'da boş jetonu
 * reddeder.
 */

type TurnstileRenderOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
  theme: "auto";
  language: "tr";
};

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: TurnstileRenderOptions) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = `${TURNSTILE_SCRIPT_ORIGIN}/turnstile/v0/api.js?render=explicit`;

export type TurnstileWidgetProps = {
  siteKey: string | undefined;
  onToken: (token: string) => void;
  /** Bulmaca yüklenemezse form gönderimi kilitlensin diye. */
  onUnavailable?: () => void;
};

export function TurnstileWidget({ siteKey, onToken, onUnavailable }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const labelId = useId();

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;

    function renderWidget() {
      if (cancelled || !window.turnstile || !containerRef.current) return;
      if (widgetIdRef.current !== null) return;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey!,
        callback: onToken,
        // Jeton 5 dakika sonra ölüyor; sessizce geçersiz kalmasın diye
        // formdaki jeton temizleniyor ve widget kendini yeniliyor.
        "expired-callback": () => onToken(""),
        "error-callback": () => {
          onToken("");
          onUnavailable?.();
        },
        theme: "auto",
        language: "tr",
      });
    }

    if (window.turnstile) {
      renderWidget();

      return () => {
        cancelled = true;
      };
    }

    const existing = document.getElementById(SCRIPT_ID);

    if (existing) {
      existing.addEventListener("load", renderWidget);
    } else {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", renderWidget);
      script.addEventListener("error", () => onUnavailable?.());
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;

      if (widgetIdRef.current !== null) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onToken, onUnavailable]);

  if (!siteKey) return null;

  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-sm text-muted-foreground">
        Güvenlik doğrulaması
      </span>
      <div ref={containerRef} aria-labelledby={labelId} />
    </div>
  );
}
