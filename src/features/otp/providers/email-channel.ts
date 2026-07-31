import { sendEmail } from "@/features/otp/providers/email-transport";
import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
} from "@/features/otp/templates/email-templates";
import type { OtpChannelAdapter, OtpSendInput, OtpSendResult } from "@/features/otp/types";

/**
 * Gerçek e-posta kanalı — production'da E-POSTA kodunu taşır.
 *
 * Kodu ekrana ASLA döndürmez: `revealedCode` alanı doldurulmaz, dolayısıyla
 * bu kanal seçiliyken kodun arayüze ulaşabileceği bir yol yoktur.
 */
export class EmailChannel implements OtpChannelAdapter {
  readonly channel = "email" as const;

  async send(input: OtpSendInput): Promise<OtpSendResult> {
    const content =
      input.purpose === "password_reset"
        ? buildPasswordResetEmail(input.code)
        : buildEmailVerificationEmail(input.code);

    const result = await sendEmail({
      to: input.destination.value,
      subject: content.subject,
      text: content.text,
    });

    return result === "sent" ? { outcome: "sent" } : { outcome: "unavailable" };
  }
}
