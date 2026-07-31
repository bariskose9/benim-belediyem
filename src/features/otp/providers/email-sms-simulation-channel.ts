import { sendEmail } from "@/features/otp/providers/email-transport";
import { buildPhoneSimulationEmail } from "@/features/otp/templates/email-templates";
import type { OtpChannelAdapter, OtpSendInput, OtpSendResult } from "@/features/otp/types";

/**
 * SMS SİMÜLASYONU — production'da TELEFON kodunu taşır (PRD §5.0).
 *
 * Kod telefona değil, kullanıcının E-POSTA adresine gönderilir. Gerekçe:
 * Türkiye'de gerçek SMS ücretli ve İYS/marka onayı gerektiriyor (PRD §2
 * kapsam dışı).
 *
 * BİLİNEN VE KABUL EDİLMİŞ SINIR (roadmap teknik borç #1): kod e-postadan
 * geldiği için bu adım telefon numarasının gerçekten kullanıcıya ait olduğunu
 * KANITLAMAZ. Yani telefon doğrulaması bugün bir güvenlik katkısı sağlamıyor;
 * akışın, veri modelinin ve hız sınırlarının doğru kurulması amaçlanıyor.
 * Gerçek sağlayıcı eklenirse yalnızca bu sınıf değişir.
 *
 * Simülasyon olduğu kullanıcıdan GİZLENMEZ: e-posta konusunda ve gövdesinde,
 * ayrıca doğrulama ekranında açıkça yazar.
 */
export class EmailSmsSimulationChannel implements OtpChannelAdapter {
  readonly channel = "email_sms_simulation" as const;

  async send(input: OtpSendInput): Promise<OtpSendResult> {
    const content = buildPhoneSimulationEmail(input.code, maskPhone(input.destination.value));

    const result = await sendEmail({
      to: input.contactEmail,
      subject: content.subject,
      text: content.text,
    });

    return result === "sent" ? { outcome: "sent" } : { outcome: "unavailable" };
  }
}

/** `05321234567` → `0532***4567`. Tam numara e-postada da geçmez. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 8) return "***";

  return `${digits.slice(0, 4)}***${digits.slice(-4)}`;
}
