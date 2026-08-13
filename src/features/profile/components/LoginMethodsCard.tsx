"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2Icon, CircleDashedIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import { TextField } from "@/features/auth/components/TextField";
import { FormAlert } from "@/features/auth/components/FormAlert";

/**
 * Giriş yöntemleri kartı — şifre ve Google (PRD §5.0 · teknik borç #33).
 *
 * ═══ İKİ EYLEM, İKİ FARKLI YOL ve bu bilinçli ═══
 *  · BAĞLAMA sıradan bir `POST` FORMU: sunucu Google'a yönlendirmek zorunda,
 *    yani sonuç bir sayfa geçişi. Form JavaScript kapalıyken de çalışıyor
 *  · KALDIRMA `fetch` ile `DELETE`: sonuç bir sayfa geçişi değil, aynı
 *    ekrandaki bir değişiklik. Kayıtlı kart kaldırmadaki desenin aynısı
 *
 * ⛔ ONAY KUTUSU SATIR İÇİ, MODAL DEĞİL: shadcn'de Dialog bileşeni bilerek yok
 * (odak tuzağı ve kaçış tuşu yükümlülüğü doğurmasın diye — adım 15 kararı).
 *
 * ⛔ KARARI SUNUCU VERİR. Bu bileşen "kaldır" düğmesini son giriş yönteminde
 * hiç çizmiyor ama bu bir KOLAYLIK; kural sunucuda (`login-methods.ts`) ve
 * ucu elle çağıran biri aynı duvara çarpıyor.
 */

const copy = messages.profile.loginMethods;

export type LoginMethodsView = {
  hasPassword: boolean;
  hasGoogle: boolean;
  /** Ekranda gösterilecek biçime ÇEVRİLMİŞ tarih — sunucuda üretiliyor. */
  googleLinkedAtLabel: string | null;
  /** Google yapılandırılmamışsa bağlama hiç önerilmez. */
  googleAvailable: boolean;
  /** Parola yöneticisinin hangi hesabı kastettiğini bilmesi için (gizli alan). */
  accountLabel: string;
};

export function LoginMethodsCard({ methods }: { methods: LoginMethodsView }) {
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlink() {
    setError(null);
    setPending(true);

    const result = await apiRequest<undefined>("/api/v1/auth/google/connections", {
      method: "DELETE",
    });

    setPending(false);
    setConfirming(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    // Sayfa sunucuda çiziliyor; istemci bir şey değiştirdiğinde kendiliğinden
    // tazelenmiyor (adım 15'te öğrenilen tuzak).
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.heading}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>

        <dl className="flex flex-col gap-3">
          <MethodRow
            label={copy.password.label}
            active={methods.hasPassword}
            activeText={copy.password.active}
            inactiveText={copy.password.missing}
          />
          {/*
            DURUM KELİMESİ VE TARİH AYRI: önce "Bağlı", altında ne zaman
            bağlandığı. Tek satırda birleştirilseydi ("… tarihinde bağlandı")
            kullanıcı durumu görmek için cümleyi okumak zorunda kalırdı —
            tarayıcıda ölçüldü, ekranda durumun kendisi kaybolmuştu.
          */}
          <MethodRow
            label={copy.google.label}
            active={methods.hasGoogle}
            activeText={copy.google.linked}
            inactiveText={copy.google.notLinked}
            note={
              methods.googleLinkedAtLabel ? copy.google.linkedAt(methods.googleLinkedAtLabel) : null
            }
          />
        </dl>

        <FormAlert message={error} />

        {methods.hasGoogle ? (
          <UnlinkSection
            canUnlink={methods.hasPassword}
            confirming={confirming}
            pending={pending}
            onAsk={() => setConfirming(true)}
            onDismiss={() => setConfirming(false)}
            onConfirm={unlink}
          />
        ) : (
          <LinkSection available={methods.googleAvailable} accountLabel={methods.accountLabel} />
        )}
      </CardContent>
    </Card>
  );
}

function MethodRow({
  label,
  active,
  activeText,
  inactiveText,
  note = null,
}: {
  label: string;
  active: boolean;
  activeText: string;
  inactiveText: string;
  /** İkincil bilgi (ör. bağlanma tarihi) — durum kelimesinin ALTINDA. */
  note?: string | null;
}) {
  const Icon = active ? CheckCircle2Icon : CircleDashedIcon;

  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="text-base text-muted-foreground sm:w-48 sm:shrink-0">{label}</dt>
      <dd className="flex flex-col gap-0.5">
        <span className="flex items-center gap-2 text-base font-medium">
          {/*
            Durum RENKLE DEĞİL METİNLE veriliyor; ikon yalnızca destek.
            Renk körü kullanıcı da "Bağlı / Bağlı değil" yazısını okuyor
            (07-ui-design-system.md · WCAG 2.1 AA).
          */}
          <Icon
            aria-hidden="true"
            className={active ? "size-4 text-brand-accent" : "size-4 text-muted-foreground"}
          />
          {active ? activeText : inactiveText}
        </span>

        {/* Tarih ikincil bilgi: 14px kalabilir (gövde metni kuralı sayaç ve
            yardım metinlerini kapsamıyor). */}
        {active && note ? <span className="text-sm text-muted-foreground">{note}</span> : null}
      </dd>
    </div>
  );
}

/**
 * Bağlama formu.
 *
 * ŞİFRE ALANI BU FORMUN ÖZÜ: hesaba kalıcı bir giriş yolu ekleniyor ve
 * çalınmış bir oturumun tek başına yetmemesi gerekiyor. Nedeni ekranda yazıyor
 * ki kullanıcı "neden yine şifre soruyor" diye tedirgin olmasın.
 */
function LinkSection({ available, accountLabel }: { available: boolean; accountLabel: string }) {
  if (!available) return null;

  return (
    <form
      action="/api/v1/auth/google/connections"
      method="post"
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <p className="max-w-prose text-sm text-muted-foreground">{copy.link.passwordNotice}</p>

      {/*
        GİZLİ KULLANICI ADI ALANI — tarayıcıda ölçülen bir uyarının çözümü:
        "Password forms should have (optionally hidden) username fields".
        Yalnız başına duran bir şifre alanında parola yöneticisi hangi hesabın
        şifresi olduğunu bilemiyor ve yanlış kaydı önerebiliyor. Alan
        `readOnly` ve ekran dışında; sunucuya gönderilse bile HİÇ OKUNMUYOR —
        kullanıcı kimliği oturumdan geliyor.
      */}
      <input
        type="text"
        name="kullanici"
        value={accountLabel}
        autoComplete="username"
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />

      <div className="max-w-sm">
        <TextField
          label={copy.link.passwordLabel}
          name="sifre"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div>
        <Button type="submit" className="min-h-11">
          {copy.link.submit}
        </Button>
      </div>
    </form>
  );
}

function UnlinkSection({
  canUnlink,
  confirming,
  pending,
  onAsk,
  onDismiss,
  onConfirm,
}: {
  canUnlink: boolean;
  confirming: boolean;
  pending: boolean;
  onAsk: () => void;
  onDismiss: () => void;
  onConfirm: () => void;
}) {
  // Şifresi olmayan kullanıcıya düğme yerine SEBEP gösteriliyor: tıklayıp
  // reddedilmek, neden olmadığını anlamayan bir kullanıcı bırakırdı.
  if (!canUnlink) {
    return (
      <p className="border-t border-border pt-4 text-sm text-muted-foreground">
        {copy.unlink.blocked}
      </p>
    );
  }

  if (!confirming) {
    return (
      <div className="border-t border-border pt-4">
        <Button type="button" variant="outline" className="min-h-11" onClick={onAsk}>
          {copy.unlink.action}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium">{copy.unlink.confirmTitle}</p>
        <p className="max-w-prose text-sm text-muted-foreground">{copy.unlink.confirmBody}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="destructive"
          className="min-h-11"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? copy.unlink.pending : copy.unlink.confirmAction}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={pending}
          onClick={onDismiss}
        >
          {copy.unlink.confirmDismiss}
        </Button>
      </div>
    </div>
  );
}
