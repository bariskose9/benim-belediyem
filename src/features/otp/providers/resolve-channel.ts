import { serverEnv } from "@/config/env";
import { EmailChannel } from "@/features/otp/providers/email-channel";
import { EmailSmsSimulationChannel } from "@/features/otp/providers/email-sms-simulation-channel";
import { MockChannel } from "@/features/otp/providers/mock-channel";
import type { OtpChannelAdapter, OtpDestinationKind } from "@/features/otp/types";

/**
 * Ortam değişkenine göre kanalı seçer.
 *
 * `SmsChannel` bilerek YAZILMADI: hiçbir şey göndermeyen boş bir sınıf ölü
 * koddur ve `02-coding-standards.md` ölü kod bırakılmasını yasaklıyor.
 * Yer tutucu olan şey `OtpChannelAdapter` arayüzünün kendisidir — gerçek
 * sağlayıcı eklenirse tek yeni dosya ve bu switch'e tek satır yeter.
 *
 * Production'da `mock` seçilemez; kural şemada (`src/config/env.ts`) duruyor ve
 * uygulama yanlış yapılandırmayla hiç açılmıyor. Buradaki `mock` dalları bu
 * yüzden yalnızca local ve preview'da çalışabilir.
 */
export function resolveOtpChannel(kind: OtpDestinationKind): OtpChannelAdapter {
  if (kind === "email") {
    return serverEnv.OTP_EMAIL_CHANNEL === "email" ? new EmailChannel() : new MockChannel();
  }

  return serverEnv.OTP_PHONE_CHANNEL === "email_sim"
    ? new EmailSmsSimulationChannel()
    : new MockChannel();
}
