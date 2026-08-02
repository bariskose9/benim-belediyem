"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import { formatIstanbulTime } from "@/lib/datetime";

/**
 * Seçilen günün saatleri ve randevu alma isteği.
 *
 * BU BİLEŞEN NEDEN İSTEMCİ TARAFINDA: randevu almak bir yazma işlemi ve
 * kullanıcıya anında geri bildirim gerekiyor — düğme devre dışı kalmalı, hata
 * çıkarsa sayfa değişmeden görünmeli. Akışın geri kalanı (branş, doktor, gün
 * seçimi) sunucuda çiziliyor; yalnızca bu son adım etkileşimli.
 *
 * DOLU SAAT BURADA DA TIKLANAMAZ, AMA BU KORUMA DEĞİL. Gerçek kural sunucuda
 * (`appointment.service.ts`); buradaki `disabled` yalnızca kullanıcıyı boşuna
 * uğraştırmamak için. Adresi bilen biri isteği doğrudan atarsa aynı 409'u alır.
 */

const copy = messages.hospital;

export type SlotOption = {
  id: string;
  startsAt: Date;
  isBooked: boolean;
};

export function SlotList({
  slots,
  doctorLabel,
}: {
  slots: readonly SlotOption[];
  /** Erişilebilir düğme adında geçer: "09:20 · Prof. Dr. Ayşe K. · randevu al". */
  doctorLabel: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [isNavigating, startNavigation] = useTransition();

  async function book(slotId: string) {
    setError(null);
    setPendingSlotId(slotId);

    const result = await apiRequest<{ id: string }>("/api/appointments", {
      method: "POST",
      body: { slotId },
    });

    if (!result.ok) {
      setPendingSlotId(null);
      // Sunucunun Türkçe mesajı olduğu gibi gösteriliyor: hangi kuralın
      // devreye girdiğini en iyi sunucu biliyor ve mesajları `messages.ts`
      // içinde zaten kullanıcıya göre yazılmış.
      setError(result.message);

      // Saat kapıldıysa veya takvim eskiyse liste tazelenmeli, yoksa kullanıcı
      // aynı dolu saate tekrar basar.
      if (result.code === "SLOT_TAKEN" || result.code === "SLOT_NOT_FOUND") router.refresh();

      return;
    }

    startNavigation(() => {
      router.push("/hastane/randevularim?durum=alindi");
      // Sunucu bileşenlerinin önbelleği tazelenmezse yeni randevu listede
      // görünmez — kullanıcı işlemin başarısız olduğunu sanar.
      router.refresh();
    });
  }

  if (slots.length === 0) {
    return (
      <p role="status" className="text-base text-muted-foreground">
        {copy.empty.daySlots}
      </p>
    );
  }

  const isBusy = pendingSlotId !== null || isNavigating;

  return (
    <div className="flex flex-col gap-3">
      {/*
        `role="alert"` DEĞİL: Next.js her sayfaya kendi boş duyurucusunu
        koyuyor ve testlerde ikisi karışıyor. Burada mesaj METİNLE bulunuyor;
        `aria-live` yine de ekran okuyucuya değişikliği bildiriyor.
      */}
      {error ? (
        <p
          aria-live="assertive"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <ul className="flex flex-wrap gap-2">
        {slots.map((slot) => {
          const time = formatIstanbulTime(slot.startsAt);
          const isPending = pendingSlotId === slot.id;

          return (
            <li key={slot.id}>
              {slot.isBooked ? (
                <span
                  aria-label={copy.slots.bookedLabel(time)}
                  className="flex min-h-11 items-center rounded-lg bg-muted px-3 text-sm text-muted-foreground line-through"
                >
                  {time}
                </span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  aria-label={copy.slots.bookLabel(time, doctorLabel)}
                  disabled={isBusy}
                  onClick={() => void book(slot.id)}
                  className="min-h-11"
                >
                  {isPending ? copy.slots.booking : time}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
