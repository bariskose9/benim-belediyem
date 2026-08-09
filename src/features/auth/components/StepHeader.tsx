import { messages } from "@/config/messages";

const TOTAL_STEPS = 3;

/**
 * Adım başlığı ve ilerleme göstergesi.
 *
 * Adım numarası METİN olarak veriliyor ("Adım 2 / 3"); yalnızca renkli
 * noktalarla gösterilseydi ekran okuyucu kullanıcısı nerede olduğunu
 * anlayamazdı (07-ui-design-system.md · WCAG 2.1 AA).
 */
export function StepHeader({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description?: string;
}) {
  return (
    <header className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted-foreground">
        {messages.auth.register.stepLabel
          .replace("{current}", String(step))
          .replace("{total}", String(TOTAL_STEPS))}
      </p>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description ? <p className="text-base text-muted-foreground">{description}</p> : null}
    </header>
  );
}
