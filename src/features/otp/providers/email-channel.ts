import { sendEmail } from "@/features/otp/providers/email-transport";
import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
  buildStaffVerificationEmail,
  type OtpEmailContent,
} from "@/features/otp/templates/email-templates";
import type { OtpChannelAdapter, OtpSendInput, OtpSendResult } from "@/features/otp/types";
import type { OtpPurpose } from "@/generated/prisma/enums";

/**
 * Gerçek e-posta kanalı — production'da E-POSTA kodunu taşır.
 *
 * Kodu ekrana ASLA döndürmez: `revealedCode` alanı doldurulmaz, dolayısıyla
 * bu kanal seçiliyken kodun arayüze ulaşabileceği bir yol yoktur.
 */
export class EmailChannel implements OtpChannelAdapter {
  readonly channel = "email" as const;

  async send(input: OtpSendInput): Promise<OtpSendResult> {
    const content = buildContent(input.purpose, input.code);

    const result = await sendEmail({
      to: input.destination.value,
      subject: content.subject,
      text: content.text,
    });

    return result === "sent" ? { outcome: "sent" } : { outcome: "unavailable" };
  }
}

/**
 * Amaca göre e-posta metni.
 *
 * ⛔ `switch` DEĞİL, AÇIK EŞLEME: `OtpPurpose` enum'una yeni bir değer
 * eklendiğinde TypeScript bu nesneyi eksik bulup derlemede durduruyor.
 * Üçlü koşul zinciri olsaydı yeni amaç sessizce "e-posta doğrulama" metnini
 * alırdı — adım 17c'de tam olarak bu risk doğdu, çünkü personel kodu
 * kullanıcının kendi kutusuna değil kurumun kutusuna gidiyor ve yanlış metin
 * alıcıyı yanıltırdı.
 */
const CONTENT_BUILDERS: Record<OtpPurpose, (code: string) => OtpEmailContent> = {
  register_email: buildEmailVerificationEmail,
  // Telefon kodu bu kanaldan HİÇ geçmiyor (`email_sms_simulation` taşıyor);
  // eşleme yine de tam olmak zorunda ve en yakın metin bu.
  register_phone: buildEmailVerificationEmail,
  password_reset: buildPasswordResetEmail,
  staff_verification: buildStaffVerificationEmail,
};

function buildContent(purpose: OtpPurpose, code: string): OtpEmailContent {
  return CONTENT_BUILDERS[purpose](code);
}
