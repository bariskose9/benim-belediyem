import type { ReactNode } from "react";
import { AlertTriangleIcon, type LucideIcon } from "lucide-react";

import { messages } from "@/config/messages";
import { formatIstanbulTime, toMachineDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

import type { WidgetResult } from "../types";

/**
 * Üç widget'ın ORTAK kabuğu: başlık, ikon, içerik ve altta "ne zaman alındı".
 *
 * NEDEN ORTAK: "yükleniyor / hata / bayat" üç durumu her kartta aynı görünmeli
 * (07-ui-design-system.md). Üç yerde ayrı yazılsaydı biri güncellenip diğerleri
 * unutulurdu — destek modülünde aynı ders alınmıştı.
 */

const copy = messages.infoWidgets;

export type WidgetCardProps = {
  title: string;
  icon: LucideIcon;
  /** Kartın kendi başlığına bağlanan bölge kimliği — ekran okuyucu için. */
  headingId: string;
  children: ReactNode;
  /** Verinin alındığı an; hata durumunda `null`. */
  fetchedAt?: Date | null;
  isStale?: boolean;
};

export function WidgetCard({
  title,
  icon: Icon,
  headingId,
  children,
  fetchedAt,
  isStale = false,
}: WidgetCardProps) {
  return (
    <section
      aria-labelledby={headingId}
      className="flex h-full flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-surface text-brand-surface-foreground">
          <Icon aria-hidden="true" className="size-4.5" />
        </span>
        <h3 id={headingId} className="font-heading text-base font-medium">
          {title}
        </h3>
      </div>

      <div className="flex flex-1 flex-col gap-3">{children}</div>

      {fetchedAt ? (
        <p
          className={cn(
            "mt-auto text-xs",
            // Bayat uyarısı vurgulu ama "hata" rengi değil: veri var, sadece eski.
            isStale ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {/*
            Saat `<time>` içinde: ekran okuyucu ve arama motoru Türkçe metni
            değil makine biçimini okur. Sunucuda çizilen bu metin istemcide
            yeniden hesaplanmadığı için hidrasyon uyuşmazlığı üretmiyor.
          */}
          <time dateTime={toMachineDateTime(fetchedAt)}>
            {isStale
              ? copy.staleNotice(formatIstanbulTime(fetchedAt))
              : copy.updatedAt(formatIstanbulTime(fetchedAt))}
          </time>
        </p>
      ) : null}
    </section>
  );
}

/**
 * Dış servise hiç ulaşılamadığında gösterilen içerik.
 *
 * Kartın kendisi ayakta kalıyor ve mesaj sayfanın çalışmaya devam ettiğini
 * SÖYLÜYOR (PRD §5.8). Boş bir kutu bırakmak kullanıcıya sitenin bozuk olduğunu
 * düşündürürdü.
 */
export function WidgetErrorState() {
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <AlertTriangleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {copy.unavailable}
    </p>
  );
}

/** `WidgetResult`'ın hata dalını kartın içine sarmalayan kısayol. */
export function isWidgetError<T>(result: WidgetResult<T>): result is { status: "error" } {
  return result.status === "error";
}
