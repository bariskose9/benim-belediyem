"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import { SeatHoldCountdown } from "@/features/events/components/SeatHoldCountdown";
import type { SeatBlock, SeatView } from "@/features/events/types";
import { cn } from "@/lib/utils";

/**
 * Salon planı ve koltuk seçimi (PRD §5.2) — adım 11'in ekran tarafı.
 *
 * ═══ EKRANDAKİ HİÇBİR ŞEY KORUMA DEĞİL ═══
 * Dolu koltuğun düğme olmaması, kendi koltuğumun seçili görünmesi, sayının
 * 8'de durması — hepsi KOLAYLIK. Kararı sunucu veriyor: kilit tek ifadeli
 * koşullu yazmayla konuyor ve iki kullanıcı aynı anda talip olursa biri 409
 * alıyor (`seat-hold.service.ts`). Bu dosya silinse uygulama yine doğru çalışır.
 *
 * DOLU KOLTUK DÜĞME DEĞİL: pasif bir düğme klavyeyle gezilemez ve ekran
 * okuyucuda sebebi belirsiz kalır. Hastane ekranındaki "dolu saat" deseninin
 * aynısı — durumu metinle yazan, tıklanamayan bir öğe.
 *
 * SUNUCU DURUMU TAZELİYOR: her başarılı istekten sonra `router.refresh()`
 * çağrılıyor. İstemcide tutulan tek şey "hangi istek sürüyor" bilgisi; koltuk
 * durumlarının tek kaynağı sunucu.
 */

const copy = messages.events.detail;

export function SeatMap({
  eventId,
  blocks,
  isSignedIn,
  canSelect,
}: {
  eventId: string;
  blocks: readonly SeatBlock[];
  isSignedIn: boolean;
  /** Etkinlik başladıysa veya bittiyse seçim kapalı — plan yine görünür. */
  canSelect: boolean;
}) {
  const router = useRouter();
  const [pendingSeatId, setPendingSeatId] = useState<string | null>(null);

  const selectedSeats = blocks.flatMap((block) =>
    block.rows.flatMap((row) => row.seats.filter((seat) => seat.state === "held_by_me")),
  );

  async function toggleSeat(seat: SeatView) {
    setPendingSeatId(seat.id);

    const label = copy.seatLabel(seat.block, seat.rowLabel, seat.seatNumber);

    const result =
      seat.state === "held_by_me" && seat.reservationId
        ? await apiRequest(`/api/events/${eventId}/seat-holds/${seat.reservationId}`, {
            method: "DELETE",
          })
        : await apiRequest(`/api/events/${eventId}/seat-holds`, {
            method: "POST",
            body: { seatId: seat.id },
          });

    setPendingSeatId(null);

    if (result.ok) {
      toast.success(
        seat.state === "held_by_me"
          ? messages.events.toast.released(label)
          : messages.events.toast.held(label),
      );
    } else {
      /**
       * Sunucunun Türkçe mesajı doğrudan gösteriliyor: "bu koltuk az önce
       * başkası tarafından alındı" gibi ANLAMLI bir sebep dönüyor ve genel
       * metne düşmek o sebebi kullanıcıdan saklamak olurdu.
       */
      toast.error(result.message || messages.events.toast.failed);
    }

    // Başarısızlıkta da tazeleniyor: koltuk kapıldıysa plan artık eskimiştir.
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Legend />

      {/*
        SAHNE PLANIN ÜSTÜNDE: kullanıcı hangi sıranın öne düştüğünü bilmeden
        koltuk seçemez. Salon planı bir yön bilgisi olmadan anlamsız.
      */}
      <p className="rounded-lg bg-foreground/85 py-2 text-center text-sm font-semibold tracking-widest text-background">
        {copy.stage}
      </p>

      {/*
        YATAY KAYDIRMA KAPSAYICI İÇİNDE, SAYFADA DEĞİL: 8 koltukluk sıra
        375px'e sığmıyor. Kaydırma sayfaya taşarsa tüm ekran yana kayar —
        bu projede ölçülen ve düzeltilen bir hata (adım 9).
      */}
      <div className="flex flex-col gap-8 overflow-x-auto pb-2">
        {blocks.map((block) => (
          <section key={block.block} className="flex flex-col gap-2">
            <h3 className="font-heading text-base font-semibold">{copy.blockLabel(block.block)}</h3>

            <ul className="flex w-fit flex-col gap-1.5">
              {block.rows.map((row) => (
                <li key={row.rowLabel} className="flex items-center gap-1.5">
                  <span className="w-12 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {copy.rowLabel(row.rowLabel)}
                  </span>

                  {row.seats.map((seat) => (
                    <Seat
                      key={seat.id}
                      seat={seat}
                      disabled={!canSelect || !isSignedIn || pendingSeatId !== null}
                      isPending={pendingSeatId === seat.id}
                      onSelect={() => void toggleSeat(seat)}
                    />
                  ))}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {selectedSeats.length > 0 ? <SelectedSeats seats={selectedSeats} /> : null}
    </div>
  );
}

/**
 * Tek koltuk.
 *
 * DOKUNMA HEDEFİ: 8 koltuklu bir sırada her koltuğa 44px vermek 375px'lik
 * ekranda 350px'lik bir sıra demek ve satır etiketiyle birlikte taşıyor.
 * Koltuklar bu yüzden 36px ve aralarındaki boşlukla birlikte parmak için
 * ayırt edilebilir kalıyor — 07-ui-design-system.md'nin 44px kuralından
 * BİLİNÇLİ bir sapma, gerekçesi ızgaranın kendisi. Sıra ve blok başlıkları
 * hedefi büyütmek yerine yanlış koltuğa basmayı fark ettiriyor: seçilen
 * koltuk aşağıdaki listede tam adresiyle yazıyor.
 */
function Seat({
  seat,
  disabled,
  isPending,
  onSelect,
}: {
  seat: SeatView;
  disabled: boolean;
  isPending: boolean;
  onSelect: () => void;
}) {
  const label = copy.seatLabel(seat.block, seat.rowLabel, seat.seatNumber);

  if (seat.state === "taken") {
    return (
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground tabular-nums"
        // Ekran okuyucu doluluğu duymalı: renk tek başına bilgi taşımaz (WCAG 1.4.1).
        aria-label={copy.seatTakenLabel(seat.block, seat.rowLabel, seat.seatNumber)}
      >
        {seat.seatNumber}
      </span>
    );
  }

  const isMine = seat.state === "held_by_me";

  return (
    <button
      type="button"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md text-xs font-medium tabular-nums",
        "ring-1 transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isMine
          ? "bg-primary text-primary-foreground ring-primary"
          : "bg-card ring-foreground/20 hover:bg-brand-surface",
      )}
      aria-label={label}
      aria-pressed={isMine}
      disabled={disabled || isPending}
      onClick={onSelect}
    >
      {seat.seatNumber}
    </button>
  );
}

/**
 * Seçilen koltuklar ve geri sayımları.
 *
 * Salon planında da gösteriliyor çünkü kullanıcı sepete gitmeden kalan süreyi
 * görebilmeli: koltuk seçip planda gezinmeye devam eden biri süreyi ancak
 * sepete girince öğrenseydi, koltuğu farkında olmadan kaybederdi.
 */
function SelectedSeats({ seats }: { seats: readonly SeatView[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h3 className="font-heading text-base font-semibold">{copy.selectedHeading}</h3>

      <ul className="flex flex-col gap-2">
        {seats.map((seat) => (
          <li key={seat.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm">
              {copy.seatLabel(seat.block, seat.rowLabel, seat.seatNumber)}
            </span>
            {seat.holdExpiresAt ? <SeatHoldCountdown expiresAt={seat.holdExpiresAt} /> : null}
          </li>
        ))}
      </ul>

      <Link href="/sepet" className={cn(buttonVariants(), "min-h-11 w-full sm:w-fit")}>
        {copy.goToCart}
      </Link>
    </section>
  );
}

/** Renklerin ne anlama geldiği — renk tek başına bilgi taşımaz (WCAG 1.4.1). */
function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-4 rounded bg-card ring-1 ring-foreground/20" />
        {copy.legendAvailable}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-4 rounded bg-primary" />
        {copy.legendSelected}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-4 rounded bg-muted" />
        {copy.legendTaken}
      </li>
    </ul>
  );
}

/** Girişsiz kullanıcı için seçim yerine giriş bağlantısı. */
export function SignInToSelect({ returnPath }: { returnPath: string }) {
  return (
    <Link
      href={`/giris?durum=giris-gerekli&donus=${encodeURIComponent(returnPath)}`}
      className={cn(buttonVariants({ variant: "outline" }), "min-h-11 w-full sm:w-fit")}
    >
      {copy.signInToSelect}
    </Link>
  );
}
