import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";

/**
 * Tasarım sisteminin (shadcn/ui + Tailwind v4) fiilen kurulu ve çalışır
 * olduğunu kanıtlar. Bileşenin kendi iç yapısı değil, kullanıcının gördüğü
 * davranış test edilir (docs/standards/06-testing.md).
 */
describe("Button", () => {
  it("anlamsal bir button öğesi üretir", () => {
    render(<Button>Randevuyu onayla</Button>);

    expect(screen.getByRole("button", { name: "Randevuyu onayla" })).toBeInTheDocument();
  });

  it("tıklanınca eylemi çalıştırır", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Kaydet</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("devre dışıyken tıklama eylemi tetiklemez", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Gönder
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Gönder" })).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
