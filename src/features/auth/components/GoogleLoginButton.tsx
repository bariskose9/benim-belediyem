import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";

/**
 * "Google ile devam et" düğmesi (PRD §5.0 · adım 4c).
 *
 * BU BİR BAĞLANTI, DÜĞME DEĞİL — ve bu bilinçli. Akış bir sayfa yönlendirmesi
 * (`GET /api/v1/auth/google`); JavaScript ile `fetch` atılsaydı Google'ın giriş
 * ekranı bir yönlendirmenin ucunda kalırdı. Bağlantı olması ayrıca şunu
 * kazandırıyor: JavaScript çalışmasa bile giriş çalışır ve klavye ile
 * gezinme kendiliğinden doğru olur (WCAG 2.1 AA).
 *
 * `asChild` sayesinde görünüm düğme, anlamı bağlantı.
 */
export function GoogleLoginButton({ redirectTo }: { redirectTo: string }) {
  const copy = messages.auth.login.google;
  const href = `/api/v1/auth/google?donus=${encodeURIComponent(redirectTo)}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{copy.divider}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button asChild variant="outline" className="w-full">
        <a href={href}>
          <GoogleMark />
          {copy.cta}
        </a>
      </Button>

      {/*
        Google'ın kimlik doğrulamadığı EN BAŞTA söyleniyor. Kullanıcı hastane
        randevusuna neden erişemediğini sonradan öğrenmemeli (PRD §5.0).
        `role="status"` — sayfada duran bilgi kutusu ekran okuyucuyu bölmez.
      */}
      <p role="status" className="text-xs text-muted-foreground">
        {copy.identityNotice}
      </p>
    </div>
  );
}

/**
 * Google'ın renkli "G" işareti, satır içi SVG olarak.
 *
 * Dış kaynaktan çekilmiyor: uzak bir görsel hem ek istek hem de üçüncü tarafa
 * sızan bir ziyaret kaydı demekti. `aria-hidden` çünkü anlamı yandaki metin
 * zaten taşıyor; ekran okuyucunun iki kez "Google" demesine gerek yok.
 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-4" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
