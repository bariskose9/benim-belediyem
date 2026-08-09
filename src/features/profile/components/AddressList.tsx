"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import { AddressForm } from "@/features/profile/components/AddressForm";
import type { AddressRow } from "@/features/profile/repositories/address.repository";

/**
 * Adres yönetimi (PRD §5.0 · adım 15).
 *
 * ⛔ BU BİLEŞEN HİÇBİR YETKİ KARARI VERMEZ. Listeyi sunucu, kullanıcının kendi
 * oturumundan üretiyor; silme ve düzenleme isteklerinde sahiplik yine sunucuda,
 * sorgunun `WHERE` koşulunda denetleniyor. İsteği elle atan başkası 404 alır
 * (05-auth-security.md: düğmeyi gizlemek yetki değildir).
 *
 * ⛔ LİSTE İSTEMCİDE TUTULMUYOR. Her yazma sonrası `router.refresh()` çağrılıyor
 * ve liste sunucudan yeniden geliyor. Sebep: istemcide tutulan bir kopya,
 * kullanıcının başka bir sekmede yaptığı değişiklikten sonra sessizce yanlış
 * olurdu — ve sunucuda çizilen sayfa kendiliğinden tazelenmiyor.
 *
 * TEK SEFERDE TEK DÜZENLEME: `editingId` tek bir değer, dizi değil. İki formu
 * aynı anda açık tutmak, hangi hatanın hangi adrese ait olduğunu belirsizleştirir.
 */

const copy = messages.profile.addresses;

type PendingAction = { kind: "create" } | { kind: "update" | "delete"; addressId: string } | null;

export function AddressList({ addresses }: { addresses: readonly AddressRow[] }) {
  const router = useRouter();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  /**
   * Ekleme formunu sıfırlamanın anahtarı.
   *
   * Alanları tek tek `setState("")` ile temizlemek yerine `key` değiştiriliyor:
   * React bileşeni sıfırdan kuruyor ve form durumunu dışarıdan yönetmek
   * gerekmiyor. Alan sayısı arttığında unutulacak bir temizlik de kalmıyor.
   */
  const [formKey, setFormKey] = useState(0);

  /** Formu ve onay kutusunu kapatır — her başarılı işlemden sonra aynı temizlik. */
  function reset() {
    setEditingId(null);
    setConfirmingId(null);
    setPending(null);
  }

  async function create(values: { title: string; fullAddress: string; district: string }) {
    setError(null);
    setPending({ kind: "create" });

    const result = await apiRequest<{ id: string }>("/api/addresses", {
      method: "POST",
      body: values,
    });

    setPending(null);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    setError(null);
    // Form alanları temizlensin diye bileşen `key` ile yeniden kuruluyor.
    setFormKey((current) => current + 1);
    router.refresh();
  }

  async function update(
    addressId: string,
    values: { title: string; fullAddress: string; district: string },
  ) {
    setError(null);
    setPending({ kind: "update", addressId });

    const result = await apiRequest<undefined>(`/api/addresses/${addressId}`, {
      method: "PATCH",
      body: values,
    });

    setPending(null);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    reset();
    router.refresh();
  }

  async function remove(addressId: string) {
    setError(null);
    setPending({ kind: "delete", addressId });

    const result = await apiRequest<undefined>(`/api/addresses/${addressId}`, {
      method: "DELETE",
    });

    setPending(null);

    if (!result.ok) {
      setError(result.message);
      setConfirmingId(null);
      // Hatada da tazeleniyor: adres bu arada silinmiş olabilir ve kullanıcı
      // gerçek durumu görmeli.
      router.refresh();

      return;
    }

    reset();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="adres-listesi" className="flex flex-col gap-4">
        <h2 id="adres-listesi" className="font-heading text-xl font-semibold tracking-tight">
          {copy.listHeading}
        </h2>

        {addresses.length === 0 ? <EmptyState /> : null}

        {addresses.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {addresses.map((address) => (
              <li key={address.id}>
                {editingId === address.id ? (
                  <AddressForm
                    address={address}
                    isPending={pending?.kind === "update" && pending.addressId === address.id}
                    error={error}
                    onSubmit={(values) => void update(address.id, values)}
                    onCancel={() => {
                      setEditingId(null);
                      setError(null);
                    }}
                  />
                ) : (
                  <AddressCard
                    address={address}
                    isConfirming={confirmingId === address.id}
                    isDeleting={pending?.kind === "delete" && pending.addressId === address.id}
                    error={confirmingId === address.id ? error : null}
                    onEdit={() => {
                      setEditingId(address.id);
                      setConfirmingId(null);
                      setError(null);
                    }}
                    onAskRemove={() => {
                      setConfirmingId(address.id);
                      setError(null);
                    }}
                    onDismissRemove={() => setConfirmingId(null)}
                    onConfirmRemove={() => void remove(address.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/*
        Ekleme formu listenin ALTINDA: kullanıcı önce ne olduğunu görüyor,
        sonra ekliyor. `key` değiştiğinde React bileşeni sıfırdan kuruyor ve
        alanlar temizleniyor — durumu dışarıdan yönetmeye gerek kalmıyor.
      */}
      <AddressForm
        key={formKey}
        isPending={pending?.kind === "create"}
        error={editingId === null && confirmingId === null ? error : null}
        onSubmit={(values) => void create(values)}
      />
    </div>
  );
}

function AddressCard({
  address,
  isConfirming,
  isDeleting,
  error,
  onEdit,
  onAskRemove,
  onDismissRemove,
  onConfirmRemove,
}: {
  address: AddressRow;
  isConfirming: boolean;
  isDeleting: boolean;
  error: string | null;
  onEdit: () => void;
  onAskRemove: () => void;
  onDismissRemove: () => void;
  onConfirmRemove: () => void;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-lg font-semibold tracking-tight">{address.title}</h3>
        <p className="text-base wrap-break-word text-muted-foreground">{address.fullAddress}</p>
        <p className="text-base text-muted-foreground">{address.district}</p>
      </div>

      {error ? (
        <p
          aria-live="assertive"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-base text-destructive"
        >
          {error}
        </p>
      ) : null}

      {/*
        ONAY NEDEN AÇILIR PENCERE (modal) DEĞİL: destek talebini kapatmadaki
        kararın aynısı. Satır içi onay yeni bir bağımlılık gerektirmiyor ve
        odak tuzağı, kaçış tuşu, kaydırma kilidi gibi modal'a özgü
        erişilebilirlik yükümlülüklerini doğurmuyor.
      */}
      {isConfirming ? (
        <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
          <p className="text-base font-medium">{copy.remove.confirmTitle}</p>
          <p className="text-base text-muted-foreground">{copy.remove.confirmBody}</p>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              disabled={isDeleting}
              onClick={onConfirmRemove}
            >
              {isDeleting ? copy.remove.pending : copy.remove.confirmAction}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              disabled={isDeleting}
              onClick={onDismissRemove}
            >
              {copy.remove.confirmDismiss}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            aria-label={copy.item.editLabel(address.title)}
            onClick={onEdit}
          >
            {copy.item.edit}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            aria-label={copy.item.removeLabel(address.title)}
            onClick={onAskRemove}
          >
            {copy.item.remove}
          </Button>
        </div>
      )}
    </article>
  );
}

/**
 * Boş durum: kullanıcıya "hiçbir şey yok" demekle kalmayıp NE YAPACAĞINI da
 * söylüyor (07-ui-design-system.md: her ekranda yükleniyor/boş/hata).
 */
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
