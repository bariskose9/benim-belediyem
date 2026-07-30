import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * EnvBanner ortam etiketini modül yüklenirken okuduğu için, her senaryoda
 * modüller sıfırlanıp yeniden içe aktarılıyor.
 */
async function renderBannerFor(envLabel: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_ENV_LABEL", envLabel);

  const { EnvBanner } = await import("@/components/layout/EnvBanner");
  render(<EnvBanner />);
}

describe("ortam şeridi", () => {
  it("local ortamda LOCAL etiketi gösterir", async () => {
    await renderBannerFor("local");

    expect(screen.getByRole("status")).toHaveTextContent("LOCAL");
  });

  it("preview ortamda PREVIEW etiketi gösterir", async () => {
    await renderBannerFor("preview");

    expect(screen.getByRole("status")).toHaveTextContent("PREVIEW");
  });

  it("production ortamda hiç görünmez", async () => {
    await renderBannerFor("production");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("bilgiyi sadece renkle değil, metinle de aktarır", async () => {
    // docs/standards/07-ui-design-system.md: "Bilgi sadece renkle aktarılmaz."
    await renderBannerFor("preview");

    expect(screen.getByRole("status")).toHaveTextContent(/canlı site değildir/i);
  });
});
