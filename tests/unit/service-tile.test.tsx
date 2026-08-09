import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ServiceTile } from "@/components/layout/ServiceTile";
import { messages } from "@/config/messages";
import { serviceCards } from "@/config/navigation";

/**
 * "AÇILMAMIŞ HİZMET TIKLANABİLİR BAĞLANTI DEĞİLDİR" kuralının testi.
 *
 * ═══ NEDEN ARTIK BURADA, `layout.spec.ts`'TE DEĞİL ═══
 *
 * Bu kural uçtan uca testte örnek bir KAPALI hizmet kartına bakarak
 * ölçülüyordu ve örnek üç kez taşındı: market (adım 8), restoran (adım 9),
 * etkinlik (adım 11). Adım 13'te destek de açılınca **kapalı hizmet
 * kalmadı** — dördüncü taşıma yapılacak bir kart yok.
 *
 * Kuralı silmek yanlış olurdu: yeni bir modül eklendiğinde ilk hâli her zaman
 * "sayfası yok" oluyor. Bu yüzden ölçüm, gerçek veriye değil UYDURMA bir
 * kapalı karta bakan bir birim testine taşındı. Böylece kural, bugün kapalı
 * bir hizmet olmasa bile korunuyor ve gelecekte açılan/kapanan hizmetlerden
 * etkilenmiyor.
 *
 * Uçtan uca testte kalan ölçüm ise "gerçek ızgara bu kurala uyuyor mu"
 * sorusudur — orası veriye, burası davranışa bakıyor.
 */

describe("hizmet kartı", () => {
  it("SAYFASI OLMAYAN kart bağlantı DEĞİLDİR ve 'Yakında' yazar", () => {
    render(<ServiceTile serviceKey="support" href={null} staffOnly={false} />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText(messages.badges.comingSoon)).toBeInTheDocument();
    // Kart yine de görünür: hizmetin varlığı gizlenmiyor, durumu yazılıyor.
    expect(screen.getByText(messages.services.support.title)).toBeInTheDocument();
  });

  it("SAYFASI OLAN kart bağlantıdır ve 'Açık' yazar", () => {
    render(<ServiceTile serviceKey="support" href="/destek" staffOnly={false} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/destek");
    expect(screen.getByText(messages.badges.open)).toBeInTheDocument();
  });

  it("personele özel hizmet ayrıca ROZETLE işaretlenir", () => {
    render(<ServiceTile serviceKey="gym" href="/spor-salonu" staffOnly />);

    expect(screen.getByText(messages.badges.staffOnly)).toBeInTheDocument();
  });
});

describe("hizmet ızgarası verisi", () => {
  it("her hizmetin ekranda bir karşılığı vardır", () => {
    for (const service of serviceCards) {
      expect(messages.services[service.key]).toBeDefined();
    }
  });

  it("tanımlı adresler kendi yollarıyla başlar — boş string kaza eseri geçmez", () => {
    for (const service of serviceCards) {
      if (service.href === null) continue;

      expect(service.href.startsWith("/")).toBe(true);
    }
  });
});
