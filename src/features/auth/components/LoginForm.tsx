"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { FormAlert } from "@/features/auth/components/FormAlert";
import { TextField } from "@/features/auth/components/TextField";
import { TurnstileWidget } from "@/features/auth/components/TurnstileWidget";
import { apiRequest } from "@/features/auth/components/api-client";

/**
 * Giriş formu — T.C. kimlik numarası + şifre (PRD §5.0).
 *
 * BOT KUTUSU BAŞTA GİZLİ: PRD "2 başarısız denemeden sonra" diyor. Kutuyu
 * herkese göstermek, şifresini doğru bilen kullanıcıya gereksiz sürtünme olurdu.
 * Kararı SUNUCU veriyor; ekran yalnızca yanıttaki bayrağa bakıp kutuyu açıyor.
 * İstemci bu bayrağı yok saysa bile sunucu isteği reddeder — kutuyu gizlemek
 * ya da göstermek bir yetkilendirme değildir.
 */

const copy = messages.auth.login;

export function LoginForm({
  turnstileSiteKey,
  redirectTo,
}: {
  turnstileSiteKey: string | undefined;
  /** Girişten sonra gidilecek sayfa. Sunucuda temizlenmiş hâliyle gelir. */
  redirectTo: string;
}) {
  const router = useRouter();
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [botCheckVisible, setBotCheckVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /*
   * ⛔ BULMACA ÖLDÜĞÜNDE GÖNDERİM KİLİTLENİR — sadece hata YAZMAK yetmez.
   * Bu bayrak olmadan ekranda "servise ulaşılamıyor" yazarken düğme
   * tıklanabilir kalıyordu: kullanıcı basıyor, jeton boş gidiyor, sunucu
   * reddediyor ve ikinci bir hata görüyordu (teknik borç #115).
   * Bulmaca kendini toparlar da jeton gelirse kilit AÇILIR.
   */
  const [botCheckUnavailable, setBotCheckUnavailable] = useState(false);

  const handleToken = useCallback((token: string) => {
    setTurnstileToken(token);
    // Jeton geldiyse bulmaca yeniden ayaktadır; kilidi açık tutmanın anlamı yok.
    if (token) setBotCheckUnavailable(false);
  }, []);
  const handleUnavailable = useCallback(() => {
    setBotCheckUnavailable(true);
    setError(copy.errors.botCheckUnavailable);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await apiRequest("/api/v1/sessions", {
      method: "POST",
      body: { nationalId, password, turnstileToken },
    });

    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);
      setPassword("");

      if (requiresBotCheck(result.code, result.details)) setBotCheckVisible(true);

      return;
    }

    /**
     * `refresh()` ŞART: üst menü bir sunucu bileşeni ve oturum durumunu
     * sunucuda okuyor. Yalnızca `push` yapılsaydı menü önbellekten gelir ve
     * kullanıcı giriş yaptığı hâlde "Giriş yap" düğmesini görmeye devam ederdi.
     */
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={error} />

      <TextField
        label={copy.nationalIdLabel}
        help={copy.nationalIdHelp}
        value={nationalId}
        onChange={(event) => setNationalId(event.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        maxLength={11}
        // Kimlik numarası tarayıcıya kaydettirilmez.
        autoComplete="off"
        required
      />

      <TextField
        label={copy.passwordLabel}
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        // Şifre yöneticisinin mevcut şifreyi önermesi için standart ipucu.
        autoComplete="current-password"
        required
      />

      {botCheckVisible ? (
        <TurnstileWidget
          siteKey={turnstileSiteKey}
          onToken={handleToken}
          onUnavailable={handleUnavailable}
        />
      ) : null}

      <Button
        type="submit"
        disabled={isSubmitting || botCheckUnavailable}
        className="w-full sm:w-auto"
      >
        {isSubmitting ? copy.submitting : copy.submit}
      </Button>
    </form>
  );
}

/**
 * İki yol da kutuyu açar:
 *  · `details.botCheckRequired` → bu deneme başarısızdı, SONRAKİ deneme kutu ister
 *  · `BOT_CHECK_REQUIRED`       → sunucu kutuyu şimdiden istedi (örn. sayfa
 *    yenilendi ve istemci sayacı sıfırlandı, ama sunucudaki sayaç duruyor)
 */
function requiresBotCheck(code: string, details: unknown): boolean {
  if (code === "BOT_CHECK_REQUIRED" || code === "BOT_CHECK_FAILED") return true;

  return (
    typeof details === "object" &&
    details !== null &&
    "botCheckRequired" in details &&
    (details as { botCheckRequired: unknown }).botCheckRequired === true
  );
}
