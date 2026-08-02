import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Logo } from "@/components/brand/Logo";
import { HeaderShell } from "@/components/layout/HeaderShell";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { messages } from "@/config/messages";
import { DARK_CLASS, THEME_STORAGE_KEY } from "@/lib/theme";
import { installLocalStorage } from "../helpers/local-storage";

// `usePathname` gerçek bir yönlendirici gerektiriyor; jsdom'da o yok.
// Adres değişimine bağlı davranış (menünün kapanması) tarayıcı testinde
// doğrulanıyor — burada yalnızca sabit bir adres yeterli.
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("kelime-logo", () => {
  it("marka adını metin olarak taşır", () => {
    render(<Logo />);

    // Ad iki parçaya bölünmüş olsa da tek bir okunabilir ad oluşturmalı.
    expect(screen.getByText(messages.app.brand.first)).toBeInTheDocument();
    expect(screen.getByText(messages.app.brand.second)).toBeInTheDocument();
  });

  it("işaret dekoratiftir; ekran okuyucu adı iki kez okumaz", () => {
    const { container } = render(<Logo />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("yazı gizlendiğinde ad kaybolmaz", () => {
    render(<Logo withWordmark={false} />);

    expect(screen.getByText(messages.app.name)).toBeInTheDocument();
  });
});

describe("tema düğmesi", () => {
  it("tıklayınca temayı değiştirir ve tercihi saklar", async () => {
    document.documentElement.classList.remove(DARK_CLASS);
    installLocalStorage();

    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button"));

    expect(document.documentElement).toHaveClass(DARK_CLASS);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    await userEvent.click(screen.getByRole("button"));

    expect(document.documentElement).not.toHaveClass(DARK_CLASS);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("her iki yön için de erişilebilir bir ad taşır", () => {
    render(<ThemeToggle />);

    // İkisi de DOM'da; hangisinin okunacağına CSS karar veriyor (`dark:` varyantı).
    expect(screen.getByText(messages.theme.switchToDark)).toBeInTheDocument();
    expect(screen.getByText(messages.theme.switchToLight)).toBeInTheDocument();
  });
});

describe("üst menü çerçevesi", () => {
  function renderShell() {
    render(
      <HeaderShell
        brand={<span>marka</span>}
        nav={<a href="/hastane">Hastane</a>}
        actions={<button type="button">Giriş yap</button>}
      />,
    );
  }

  it("mobilde menü kapalı başlar", () => {
    renderShell();

    expect(screen.getByRole("button", { name: messages.nav.openMenu })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("menü düğmesi açıp kapatır ve durumunu bildirir", async () => {
    renderShell();

    await userEvent.click(screen.getByRole("button", { name: messages.nav.openMenu }));

    const closeButton = screen.getByRole("button", { name: messages.nav.closeMenu });
    expect(closeButton).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(closeButton);

    expect(screen.getByRole("button", { name: messages.nav.openMenu })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("menü düğmesi hangi bölümü açtığını söyler", () => {
    renderShell();

    // `aria-controls` olmadan ekran okuyucu kullanıcısı düğmenin neyi açtığını bilemez.
    const button = screen.getByRole("button", { name: messages.nav.openMenu });
    const panelId = button.getAttribute("aria-controls");

    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId!)).toHaveAttribute("aria-label", messages.nav.label);
  });

  it("giriş eylemi menünün içinde değildir", () => {
    // Mobilde menü kapalıyken bile giriş/çıkış görünmeli; menüye girseydi
    // kullanıcı önce menüyü açmak zorunda kalırdı.
    renderShell();

    const nav = screen.getByRole("navigation");
    expect(nav).not.toContainElement(screen.getByRole("button", { name: "Giriş yap" }));
  });
});

describe("alt bilgi", () => {
  it("her sayfada gerçek kurum olmadığını yazar", () => {
    render(<SiteFooter />);

    expect(screen.getByText(/gerçek bir belediyeye ait değildir/i)).toBeInTheDocument();
  });

  it("dış bağlantı yeni sekmede ve güvenli açılır", () => {
    render(<SiteFooter />);

    const link = screen.getByRole("link", { name: messages.footer.sourceCode });
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
