import type { OtpChannelAdapter, OtpSendInput, OtpSendResult } from "@/features/otp/types";

/**
 * Sahte kanal — local ve preview (PRD §5.0 · integrations.md).
 *
 * Hiçbir yere gönderim yapmaz; kodu çağırana geri verir ve kod ekranda
 * gösterilir. `05-auth-security.md`: "Local ve preview ortamlarında sabit kod
 * kullanılabilir; production'da ASLA."
 *
 * PRODUCTION'DA SEÇİLEMEZ: `src/config/env.ts` production etiketinde `mock`
 * değerini açılışta reddediyor. Yanlış yapılandırılmış bir dağıtımın hiç
 * açılmaması, kodu herkese göstermesinden iyidir.
 *
 * KODU LOG'A YAZMAZ. Kod yalnızca dönüş değeriyle taşınır; `console` çıktısına
 * düşerse Vercel log'larında kalıcı olurdu (05-auth-security.md).
 */
export class MockChannel implements OtpChannelAdapter {
  readonly channel = "mock" as const;

  async send(input: OtpSendInput): Promise<OtpSendResult> {
    return { outcome: "sent", revealedCode: input.code };
  }
}
