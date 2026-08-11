"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import type { IdentityUnlinkState } from "@/features/account/services/identity-unlink.service";
import { apiRequest } from "@/features/auth/components/api-client";
import { TextField } from "@/features/auth/components/TextField";

/**
 * "Kimlik bağlantım" kartı (ADR-017 ilke 3).
 *
 * ⛔ KARAR SUNUCUNUN. Bu bileşen `state.canUnlink` değerine bakıp düğmeyi
 * gizliyor, ama bu bir YETKİ KONTROLÜ DEĞİL — kullanıcıyı yapamayacağı bir
 * işleme sokmamak için. Kapı `unlinkIdentity` servisinde; isteği elle atan
 * biri aynı duvara çarpıyor (05-auth-security.md).
 *
 * ⛔ SONUÇ LİSTESİ ONAY PANELİNDEN ÖNCE GÖSTERİLİYOR, sonra değil. Kullanıcı
 * "şifreyle giriş kapanıyor" bilgisini karar ANINDA görmeli; onayladıktan
 * sonra öğrenmesi geri alınamaz bir sürpriz olurdu.
 *
 * ⛔ DIALOG YOK, SATIR İÇİ ONAY VAR — shadcn'de Dialog bileşeni bilerek
 * eklenmedi (07-ui-design-system.md); yıkıcı işlem onayı bu projede satır içi.
 */

const copy = messages.account.identity;

export function IdentityUnlinkCard({ state }: { state: IdentityUnlinkState }) {
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function unlink() {
    setError(null);
    setPending(true);

    const result = await apiRequest<undefined>("/api/account/identity-unlinks", {
      method: "POST",
      // Şifresi olmayan hesapta alan hiç çizilmiyor ve gövdeye de girmiyor;
      // sunucu "gerekiyor mu" kararını kendi veriyor.
      body: state.requiresPassword ? { password } : {},
    });

    setPending(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    setConfirming(false);
    setPassword("");
    setDone(true);

    // Sunucuda çizilen sayfa istemci bir şey yazdıktan sonra kendiliğinden
    // tazelenmiyor; kart yeni durumuyla yeniden çizilsin.
    router.refresh();
  }

  return (
    <section
      aria-labelledby="kimlik-baglantim"
      className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10"
    >
      <h2 id="kimlik-baglantim" className="font-heading text-xl font-semibold tracking-tight">
        {copy.heading}
      </h2>

      {done ? (
        <p aria-live="polite" className="rounded-lg bg-muted px-3 py-2 text-base">
          {copy.success}
        </p>
      ) : null}

      {!state.isLinked ? (
        <>
          <p className="text-base text-muted-foreground">{copy.notLinked}</p>
          <p className="text-base text-muted-foreground">{copy.notLinkedHint}</p>
          <div>
            <Link
              href="/kimlik-dogrulama"
              className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4"
            >
              {copy.goVerify}
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="text-base">{copy.linked}</p>
          <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>

          <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
            <p className="text-base font-medium">{copy.consequences.heading}</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-base text-muted-foreground">
              {copy.consequences.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          {!state.canUnlink ? (
            <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
              <p className="text-base font-medium">{copy.blocked.title}</p>
              <p className="max-w-prose text-base text-muted-foreground">{copy.blocked.body}</p>
              <Link
                href="/hesabim"
                className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4"
              >
                {copy.blocked.cta}
              </Link>
            </div>
          ) : null}

          {state.canUnlink ? (
            confirming ? (
              <div className="flex flex-col gap-3 rounded-lg bg-muted p-3">
                <p className="text-base font-medium">{copy.confirmTitle}</p>
                <p className="max-w-prose text-base text-muted-foreground">{copy.confirmBody}</p>

                {state.requiresPassword ? (
                  <TextField
                    label={messages.account.deletion.passwordLabel}
                    help={messages.account.deletion.passwordHint}
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
                    onClick={() => void unlink()}
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
                  variant="outline"
                  className="min-h-11"
                  onClick={() => {
                    setConfirming(true);
                    setError(null);
                    setDone(false);
                  }}
                >
                  {copy.action}
                </Button>
              </div>
            )
          ) : null}
        </>
      )}
    </section>
  );
}
