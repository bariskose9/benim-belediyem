import type { OtpChannel, OtpPurpose } from "@/generated/prisma/enums";

/**
 * Doğrulama kodu gönderim kanalı — KPS gibi ADAPTÖR arkasındadır
 * (PRD §5.0 "Doğrulama kodu (OTP) kanalı").
 *
 * Neden adaptör: gerçek bir SMS sağlayıcısı eklendiğinde yalnızca bu arayüzün
 * yeni bir uygulaması yazılır; kayıt akışı, hız sınırı ve testler değişmez.
 */

/** Kodun mantıksal hedefi — kullanıcının hangi kanalı doğruladığı. */
export type OtpDestinationKind = "email" | "phone";

export type OtpDestination = {
  kind: OtpDestinationKind;
  /** E-posta adresi veya telefon numarası. */
  value: string;
};

export type OtpSendInput = {
  purpose: OtpPurpose;
  code: string;
  expiresAt: Date;
  destination: OtpDestination;

  /**
   * Kullanıcının e-posta adresi — TELEFON kodu da buraya gönderilir.
   *
   * Neden ayrı bir alan: production'da telefon kodu gerçek SMS ile değil,
   * "SMS simülasyonu" başlığıyla e-postayla taşınıyor (PRD §5.0). Teslimat
   * adresini seçmek kanalın işidir; bu bilgiyi çağıran servise sızdırmamak için
   * adaptöre hem mantıksal hedef hem teslimat adresi veriliyor.
   */
  contactEmail: string;
};

export type OtpSendResult =
  | {
      outcome: "sent";
      /**
       * YALNIZCA sahte kanal doldurur ve YALNIZCA local/preview'da ekrana
       * ulaşabilir. Production'da sahte kanal seçilemez — `src/config/env.ts`
       * açılışta reddediyor. Yanıta kopyalanmadan önce ayrıca
       * `revealCodeIfAllowed()` süzgecinden geçer.
       */
      revealedCode?: string;
    }
  | { outcome: "unavailable" };

export type OtpChannelAdapter = {
  /** Prisma `OtpChannel` enum karşılığı — hangi kanalın gönderdiği kayda yazılır. */
  readonly channel: OtpChannel;
  send(input: OtpSendInput): Promise<OtpSendResult>;
};
