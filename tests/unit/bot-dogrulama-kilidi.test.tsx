import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { messages } from "@/config/messages";
import { IdentityForm } from "@/features/auth/components/IdentityForm";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { PasswordResetRequestForm } from "@/features/auth/components/PasswordResetRequestForm";

/**
 * Bot doğrulaması ulaşılamazken gönderim kilitleniyor mu (teknik borç #115).
 *
 * ⛔ BU TEST BİR YALAN YORUMDAN DOĞDU. `TurnstileWidget`'ın `onUnavailable`
 * prop'unun yorumu *"form gönderimi kilitlensin diye"* diyordu, ama çağrıldığı
 * beş formun hiçbiri düğmeyi kilitlemiyordu — yalnızca hata metni yazıyordu.
 * Ekranda "servise ulaşılamıyor" yazarken düğme tıklanabilir kalıyor, kullanıcı
 * basıyor, jeton boş gidiyor ve sunucudan ikinci bir hata alıyordu.
 *
 * ⚠️ NEDEN E2E DEĞİL DE BİLEŞEN TESTİ: Playwright koşumlarında bot koruması
 * bilerek kapalı (`playwright.config.ts` → `NEXT_PUBLIC_TURNSTILE_SITE_KEY: ""`),
 * yani orada widget hiç render edilmiyor ve `onUnavailable` tetiklenemiyor.
 * Kilidin ölçülebileceği tek yer burası.
 */

// Formlar başarıda yönlendirme yapıyor; jsdom'da yönlendirici yok.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

const SITE_KEY = "0x-test-site-key";

/**
 * Turnstile betiğini FİİLEN başarısız kılar.
 *
 * `TurnstileWidget` betiği `document.head`'e ekleyip `error` olayını dinliyor;
 * jsdom ağdan bir şey indirmediği için o olayı burada elle yayıyoruz. Böylece
 * test gerçek kod yolunu koşturuyor — `onUnavailable` bizim çağırdığımız için
 * değil, bileşenin kendi hata dalı çalıştığı için tetikleniyor.
 */
function bulmacayiOldur() {
  const betik = document.getElementById("cf-turnstile-script");

  expect(betik, "Turnstile betiği DOM'a hiç eklenmemiş").not.toBeNull();

  /*
   * ⚠️ `act` ŞART. Olay React'in dışından geliyor; sarmalanmazsa durum
   * güncelleniyor ama bileşen yeniden çizilmeden iddiaya geçiliyor ve test
   * "kilitlenmedi" diye YANLIŞ ALARM veriyor.
   */
  act(() => {
    betik!.dispatchEvent(new Event("error"));
  });
}

/*
 * ⚠️ `TurnstileWidget` betiği `document.head`'e ekliyor — yani testing-library'nin
 * otomatik temizlediği render kabının DIŞINA. Temizlenmezse betik sonraki teste
 * sızıyor; bileşen "zaten var" dalına giriyor, yeni betik eklemiyor ve testler
 * birbirini bozuyor (06-testing.md: testler birbirinden bağımsızdır).
 */
beforeEach(() => {
  document.getElementById("cf-turnstile-script")?.remove();
});

const formlar = [
  {
    ad: "kimlik doğrulama (kayıt)",
    render: () => render(<IdentityForm turnstileSiteKey={SITE_KEY} />),
    dugme: messages.auth.register.identity.submit,
    hata: messages.auth.register.errors.botCheckUnavailable,
  },
  {
    ad: "şifre sıfırlama isteği",
    render: () =>
      render(<PasswordResetRequestForm turnstileSiteKey={SITE_KEY} isSimulated={false} />),
    dugme: messages.auth.passwordReset.request.submit,
    hata: messages.auth.passwordReset.errors.botCheckUnavailable,
  },
];

describe("bot doğrulaması ulaşılamazken gönderim kilidi", () => {
  it.each(formlar)("$ad — düğme BAŞLANGIÇTA açık", ({ render: ciz, dugme }) => {
    // Kendini savunan kontrol: düğme baştan kilitliyse aşağıdaki test
    // hiçbir şey kanıtlamaz, çünkü zaten kilitli olanı kilitli bulur.
    ciz();

    expect(screen.getByRole("button", { name: dugme })).toBeEnabled();
  });

  it.each(formlar)("$ad — bulmaca ölünce düğme KİLİTLENİR", ({ render: ciz, dugme }) => {
    ciz();
    bulmacayiOldur();

    expect(screen.getByRole("button", { name: dugme })).toBeDisabled();
  });

  it.each(formlar)("$ad — kullanıcıya Türkçe bir sebep gösterilir", ({ render: ciz, hata }) => {
    // Kilit tek başına yeterli değil: sebebi görünmeyen kilitli bir düğme,
    // kullanıcı için bozuk bir sayfadan farksızdır (07-ui-design-system.md).
    ciz();
    bulmacayiOldur();

    expect(screen.getByText(hata)).toBeInTheDocument();
  });

  it("giriş formunda bulmaca GÖRÜNMEDEN kilit uygulanmaz", () => {
    /*
     * Giriş ekranında bulmaca yalnızca iki başarısız denemeden sonra çıkıyor
     * (PRD §5.0) — `botCheckVisible` bileşenin iç durumu ve başlangıçta kapalı.
     * Bulmaca hiç çizilmemişken kilidin devreye girmesi, ilk kez giriş yapan
     * herkesi engellerdi; bu test o aşırı-kilitlenmeyi yakalar.
     */
    render(<LoginForm turnstileSiteKey={SITE_KEY} redirectTo="/hesabim" />);

    expect(document.getElementById("cf-turnstile-script")).toBeNull();
    expect(screen.getByRole("button", { name: messages.auth.login.submit })).toBeEnabled();
  });
});
