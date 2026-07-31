import { OTP_TTL_MS } from "@/config/constants";
import { messages } from "@/config/messages";

/**
 * Doğrulama kodu e-postalarının metinleri.
 *
 * `messages.ts` KULLANICI ARAYÜZÜ metinlerini tutuyor; bunlar arayüzde değil
 * e-posta gövdesinde görünen metinler, o yüzden ayrı dosyada. Yine de tek
 * yerde toplanıyorlar ve Türkçe.
 *
 * PRD §5.0: "E-postaya giden iki kod birbirinden AYRI konu başlığı ve ayrı
 * geçerlilik taşır." Kullanıcı iki e-postayı karıştırmamalı.
 */

const MINUTES = Math.round(OTP_TTL_MS / 60_000);

export type OtpEmailContent = { subject: string; text: string };

export function buildEmailVerificationEmail(code: string): OtpEmailContent {
  return {
    subject: `${messages.app.name} — e-posta doğrulama kodunuz`,
    text: [
      "Merhaba,",
      "",
      `${messages.app.name} hesabınızı açmak için E-POSTA doğrulama kodunuz:`,
      "",
      `    ${code}`,
      "",
      `Kod ${MINUTES} dakika geçerlidir ve yalnızca bir kez kullanılabilir.`,
      "",
      "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz;",
      "kod kullanılmadığı sürece hiçbir işlem yapılmaz.",
    ].join("\n"),
  };
}

/**
 * Telefon kodu — gerçek SMS DEĞİL.
 *
 * PRD §5.0 ve roadmap teknik borç #1: Türkiye'de gerçek SMS ücretli ve İYS/marka
 * onayı istiyor. Kod e-postayla taşınıyor. Bunu gizlemek kullanıcıyı yanıltmak
 * olurdu — konu başlığında ve gövdede AÇIKÇA "SMS simülasyonu" yazıyor.
 */
export function buildPhoneSimulationEmail(code: string, maskedPhone: string): OtpEmailContent {
  return {
    subject: `${messages.app.name} — SMS simülasyonu: telefon doğrulama kodunuz`,
    text: [
      "Merhaba,",
      "",
      `${maskedPhone} numarası için TELEFON doğrulama kodunuz:`,
      "",
      `    ${code}`,
      "",
      `Kod ${MINUTES} dakika geçerlidir ve yalnızca bir kez kullanılabilir.`,
      "",
      "── SMS SİMÜLASYONU ──",
      "Bu bir örnek/portföy uygulamasıdır ve gerçek SMS göndermez.",
      "Telefon kodunuz bu yüzden e-posta ile gönderildi. Dolayısıyla bu adım",
      "numaranın gerçekten size ait olduğunu KANITLAMAZ.",
      "",
      "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.",
    ].join("\n"),
  };
}

export function buildPasswordResetEmail(code: string): OtpEmailContent {
  return {
    subject: `${messages.app.name} — şifre sıfırlama kodunuz`,
    text: [
      "Merhaba,",
      "",
      "Şifre sıfırlama kodunuz:",
      "",
      `    ${code}`,
      "",
      `Kod ${MINUTES} dakika geçerlidir ve yalnızca bir kez kullanılabilir.`,
      "",
      "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz;",
      "şifreniz değişmedi.",
    ].join("\n"),
  };
}
