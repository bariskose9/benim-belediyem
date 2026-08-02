"use client";

import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { toggleTheme } from "@/lib/theme";

/**
 * Açık / koyu tema düğmesi.
 *
 * REACT DURUMU YOK — ve bu bilinçli. Sunucu, kullanıcının tema tercihini
 * bilmiyor (tercih tarayıcıda saklanıyor). Durum React'te tutulsaydı sunucunun
 * ürettiği HTML ile tarayıcının bildiği tema ayrışır ve hidrasyon uyarısı
 * çıkardı. Onun yerine hangi ikonun ve hangi metnin görüneceğine CSS karar
 * veriyor (`dark:` varyantı), yani karar zaten doğru olan tek yerde: DOM'da.
 *
 * ERİŞİLEBİLİR AD DA DEĞİŞİYOR: `aria-label` sabit kalsaydı ekran okuyucu
 * kullanıcısı hangi yöne geçeceğini bilemezdi. İki `sr-only` metinden yalnızca
 * biri `display` ile açık olduğu için, o an geçerli olan okunur.
 */
export function ThemeToggle() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      // Dokunma hedefi en az 44x44px (07-ui-design-system.md)
      className="size-11"
      onClick={() => toggleTheme()}
    >
      <SunIcon aria-hidden="true" className="dark:hidden" />
      <MoonIcon aria-hidden="true" className="hidden dark:block" />
      <span className="sr-only dark:hidden">{messages.theme.switchToDark}</span>
      <span className="sr-only hidden dark:block">{messages.theme.switchToLight}</span>
    </Button>
  );
}
