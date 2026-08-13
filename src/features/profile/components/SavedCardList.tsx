"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import type { SavedCardView } from "@/features/profile/services/saved-card.service";

/**
 * Kayıtlı kart listesi (teknik borç #41).
 *
 * ⛔ EKRANDA KART NUMARASI YOK. Gösterilen tek şey marka, son dört hane ve son
 * kullanma tarihi — çünkü veritabanında da yalnızca bu üçü var (PRD §6.2).
 *
 * ⛔ "KART EKLE" DÜĞMESİ BİLEREK YOK. Kart yalnızca gerçek bir ödeme sırasında,
 * sahte sağlayıcının doğrulamasından geçtikten sonra kaydediliyor. Kullanıcı
 * boşuna aramasın diye bunun NEDENİ ekranda yazıyor (`cards.addNotice`).
 *
 * ⛔ SİLME KARARINI SUNUCU VERİR. Bu bileşen düğmeyi çiziyor; sahiplik
 * kontrolü isteğin gittiği sorgunun `WHERE` koşulunda.
 */

const copy = messages.profile.cards;
const brands = messages.payment.card.brands;
const maskedLabel = messages.payment.card.maskedLabel;

export function SavedCardList({ cards }: { cards: readonly SavedCardView[] }) {
  const router = useRouter();

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(savedCardId: string) {
    setError(null);
    setPendingId(savedCardId);

    const result = await apiRequest<undefined>(`/api/v1/saved-cards/${savedCardId}`, {
      method: "DELETE",
    });

    setPendingId(null);
    setConfirmingId(null);

    if (!result.ok) setError(result.message);

    // İki durumda da tazeleniyor: başarıda kart listeden düşsün, hatada
    // kullanıcı gerçek durumu görsün (kart bu arada silinmiş olabilir).
    router.refresh();
  }

  if (cards.length === 0) return <EmptyState />;

  return (
    // Listenin ADI var: ekran okuyucu "Kayıtlı kartlarınız listesi, 3 öğe"
    // diyebiliyor ve sayfadaki diğer listelerden ayırt ediliyor (WCAG 2.1 AA).
    <ul aria-label={copy.listLabel} className="flex flex-col gap-3">
      {cards.map((card) => (
        <li key={card.id}>
          <article className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex flex-col gap-1">
              <h3 className="font-heading text-lg font-semibold tracking-tight">
                {maskedLabel(brands[card.brand], card.last4)}
              </h3>
              <p className="text-base text-muted-foreground">
                {copy.item.expiry(card.expMonth, card.expYear)}
              </p>

              {card.usedByMembership ? (
                <p className="text-base text-brand-accent">{copy.item.membershipWarning}</p>
              ) : null}
            </div>

            {error && confirmingId === card.id ? (
              <p
                aria-live="assertive"
                className="rounded-lg bg-destructive/10 px-3 py-2 text-base text-destructive"
              >
                {error}
              </p>
            ) : null}

            {confirmingId === card.id ? (
              <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
                <p className="text-base font-medium">{copy.remove.confirmTitle}</p>
                <p className="text-base text-muted-foreground">
                  {/*
                    Üyeliğe bağlı kartta FARKLI metin: kullanıcı "bir sonraki
                    aidat bu karttan çekilemeyecek" bilgisini karar ANINDA
                    görmeli, sonradan bildirimle değil (PRD §5.6).
                  */}
                  {card.usedByMembership
                    ? copy.remove.confirmMembershipBody
                    : copy.remove.confirmBody}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    className="min-h-11"
                    disabled={pendingId === card.id}
                    onClick={() => void remove(card.id)}
                  >
                    {pendingId === card.id ? copy.remove.pending : copy.remove.confirmAction}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11"
                    disabled={pendingId === card.id}
                    onClick={() => setConfirmingId(null)}
                  >
                    {copy.remove.confirmDismiss}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  aria-label={copy.item.removeLabel(card.last4)}
                  onClick={() => {
                    setConfirmingId(card.id);
                    setError(null);
                  }}
                >
                  {copy.item.remove}
                </Button>
              </div>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <section
      role="status"
      className="flex flex-col gap-2 rounded-xl bg-card p-6 ring-1 ring-foreground/10"
    >
      <h3 className="font-heading text-lg font-semibold tracking-tight">{copy.empty.title}</h3>
      <p className="max-w-prose text-base text-muted-foreground">{copy.empty.description}</p>
    </section>
  );
}
