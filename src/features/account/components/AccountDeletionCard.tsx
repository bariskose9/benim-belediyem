"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import type { AccountDeletionState } from "@/features/account/services/account-deletion.service";
import { apiRequest } from "@/features/auth/components/api-client";
import { TextField } from "@/features/auth/components/TextField";

/**
 * "Hesabımı sil" kartı (PRD §5.11 · KVKK Yönetmeliği m.12).
 *
 * ⛔ İKİ LİSTE (SİLİNENLER / SAKLANANLAR) ONAYDAN ÖNCE VE HER ZAMAN GÖRÜNÜR.
 * Yönetmelik m.12/1-c, kısmen karşılanan silme talebinin GEREKÇESİYLE
 * bildirilmesini istiyor. Bu listeyi bir "ayrıntılar" düğmesinin arkasına
 * saklamak, bildirimi görmemiş bir kullanıcı üretirdi — yükümlülük
 * "yazdık ama açmadı" ile karşılanmaz.
 *
 * ⛔ DIALOG YOK, SATIR İÇİ ONAY VAR (07-ui-design-system.md).
 *
 * SİLME BAŞARILI OLUNCA `router.refresh()` ÇAĞRILMIYOR: oturum artık yok,
 * tazeleme kullanıcıyı giriş ekranına atardı. Bunun yerine herkese açık
 * `/hesap-silindi` sayfasına gidiliyor — orada ne saklandığı bir kez daha
 * yazıyor. `replace` kullanılıyor ki geri tuşu silinmiş hesabın sayfasına
 * dönmesin.
 */

const copy = messages.account.deletion;

export function AccountDeletionCard({ state }: { state: AccountDeletionState }) {
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setError(null);
    setPending(true);

    const result = await apiRequest<undefined>("/api/account/deletions", {
      method: "POST",
      body: state.requiresPassword ? { password } : {},
    });

    if (!result.ok) {
      setPending(false);
      setError(result.message);

      return;
    }

    // `pending` bilerek `true` bırakılıyor: yönlendirme başlayana kadar düğme
    // kapalı kalsın, kullanıcı ikinci kez basmasın.
    router.replace("/hesap-silindi");
  }

  return (
    <section
      aria-labelledby="hesabimi-sil"
      className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-destructive/30"
    >
      <h2 id="hesabimi-sil" className="font-heading text-xl font-semibold tracking-tight">
        {copy.heading}
      </h2>

      <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
          <h3 className="text-base font-medium">{copy.erased.heading}</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-base text-muted-foreground">
            {copy.erased.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
          <h3 className="text-base font-medium">{copy.retained.heading}</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-base text-muted-foreground">
            {copy.retained.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/*
        PRD §5.11: "Aktif taahhütlü üyeliği olan kullanıcı silmeden ÖNCE
        uyarılır." İki ayrı uyarı çünkü iki ayrı durum: üyeliğin varlığı ile
        taahhüdün sürüyor olması aynı şey değil.
      */}
      {state.hasLiveMembership ? (
        <p className="max-w-prose rounded-lg bg-muted px-3 py-2 text-base">
          {copy.membershipWarning}
        </p>
      ) : null}

      {state.hasOpenCommitment ? (
        <p className="max-w-prose rounded-lg bg-destructive/10 px-3 py-2 text-base text-destructive">
          {copy.commitmentWarning}
        </p>
      ) : null}

      <p className="max-w-prose text-base text-muted-foreground">{copy.reRegisterNotice}</p>

      {confirming ? (
        <div className="flex flex-col gap-3 rounded-lg bg-muted p-3">
          <p className="text-base font-medium">{copy.confirmTitle}</p>
          <p className="max-w-prose text-base text-muted-foreground">{copy.confirmBody}</p>

          {state.requiresPassword ? (
            <TextField
              label={copy.passwordLabel}
              help={copy.passwordHint}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          ) : null}

          {error ? (
            <p
              aria-live="assertive"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-base text-destructive"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              disabled={pending}
              onClick={() => void remove()}
            >
              {pending ? copy.pending : copy.confirmAction}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              disabled={pending}
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
            >
              {copy.confirmDismiss}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11"
            onClick={() => {
              setConfirming(true);
              setError(null);
            }}
          >
            {copy.action}
          </Button>
        </div>
      )}
    </section>
  );
}
