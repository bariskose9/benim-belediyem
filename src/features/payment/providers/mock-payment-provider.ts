import { randomBytes } from "node:crypto";

import { MOCK_PAYMENT_MAX_DELAY_MS, MOCK_PAYMENT_MIN_DELAY_MS } from "@/config/constants";
import { normalizeCardNumber } from "@/features/payment/services/card-rules";
import type { PaymentStatus } from "@/generated/prisma/enums";
import { sleep } from "@/lib/utils";

/**
 * Sahte ödeme sağlayıcısı (PRD §6.2 adım 4-5).
 *
 * ═══ GERÇEK TAHSİLAT YAPILMAZ ═══
 *
 * Sahte KPS ile aynı mimari (ADR-003): dış servis bir ADAPTÖR arkasında
 * duruyor, uygulama onun gerçek mi sahte mi olduğunu bilmiyor. İleride
 * gerçek bir ödeme kuruluşuna geçilirse yalnızca bu dosyanın yerine yenisi
 * konur; ödeme servisi ve ekranlar değişmez.
 *
 * ⛔ KART NUMARASI BU DOSYADAN DIŞARI ÇIKMAZ. Girdi olarak gelir, sonucu
 * belirlemek için okunur ve unutulur. Dönen nesnede numara YOKTUR — yalnızca
 * marka, son 4 hane ve sahte işlem kodu (05-auth-security.md → kart numarası
 * log'a, hata takibine, analitiğe ASLA yazılmaz).
 */

export type PaymentAttempt = {
  /** Yalnızca sonucu belirlemek için okunur; hiçbir yere yazılmaz. */
  cardNumber: string;
  /**
   * Kayıtlı kartla ödemede sonucu belirleyen alan.
   *
   * ═══ NEDEN GEREKLİ (adım 12) ═══
   * Kayıtlı kartın numarası HİÇ SAKLANMIYOR, dolayısıyla `cardNumber` boş
   * geliyor ve sağlayıcı varsayılan "başarılı" yolunu izliyordu. Tek seferlik
   * ödemede bunun bedeli küçüktü; üyelikte büyük: aidat her ay KAYITLI
   * KARTTAN çekiliyor, yani "kart reddedilirse üyelik ödeme bekliyora geçer"
   * kuralının (PRD §5.6) hiçbir zaman tetiklenmemesi demekti.
   *
   * Son 4 hane test kartlarını ayırt etmeye yetiyor (`fake-data-guide.md`);
   * gerçek bir entegrasyonda bunun karşılığı sağlayıcıdaki kart jetonudur.
   * Son 4 hane zaten veritabanında duruyor — yeni bir sır saklanmıyor.
   */
  cardLast4?: string;
  amountKurus: number;
};

export type PaymentResult = {
  status: PaymentStatus;
  /** Sahte işlem kodu — gerçek bir sağlayıcıdaki referans numarasının karşılığı. */
  transactionId: string;
};

/**
 * Sonucu belirleyen test kartları (`fake-data-guide.md`).
 *
 * NEDEN NUMARAYA GÖRE: hata yollarının test edilebilmesi için sonucun
 * ÖNGÖRÜLEBİLİR olması gerekiyor (PRD §6.2 adım 5). Rastgele başarısızlık
 * üretmek testleri kararsızlaştırır ve kullanıcıya "bazen olmuyor" dedirtirdi.
 */
const RESULT_BY_CARD: Readonly<Record<string, PaymentStatus>> = {
  "4000000000000002": "declined",
  "4000000000009995": "insufficient_funds",
};

/** Aynı kartların son 4 hanesi — kayıtlı kartta numara olmadığı için tek ipucu bu. */
const RESULT_BY_LAST4: Readonly<Record<string, PaymentStatus>> = {
  "0002": "declined",
  "9995": "insufficient_funds",
};

/**
 * Ödemeyi dener.
 *
 * Yapay gecikme var çünkü ekranın "işleniyor" durumu gerçekten görünmeli ve
 * çift tıklama koruması sınanabilmeli (sahte KPS ile aynı gerekçe).
 * YENİDEN DENEME YOK: tahsilat tekrarlanabilir bir işlem değildir; ağ
 * kopmasında ikinci kez denemek çift çekim riski demektir. Tekrarı
 * idempotency anahtarı güvenceye alıyor.
 */
export async function attemptPayment(attempt: PaymentAttempt): Promise<PaymentResult> {
  await sleep(randomDelayMs());

  const digits = normalizeCardNumber(attempt.cardNumber);

  // Numara varsa o karar verir; yoksa (kayıtlı kart) son 4 haneye bakılır.
  const status =
    RESULT_BY_CARD[digits] ??
    (digits === "" && attempt.cardLast4 ? RESULT_BY_LAST4[attempt.cardLast4] : undefined) ??
    "success";

  return { status, transactionId: buildTransactionId() };
}

/**
 * `TRX-<zaman>-<rastgele>` biçiminde sahte işlem kodu.
 *
 * Rastgele parça şart: `payments.fake_transaction_id` benzersiz ve aynı
 * milisaniyede iki ödeme olabilir. Kart numarasından TÜRETİLMEZ — türetilseydi
 * kod, numara hakkında bilgi taşırdı.
 */
function buildTransactionId(): string {
  return `TRX-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function randomDelayMs(): number {
  const span = MOCK_PAYMENT_MAX_DELAY_MS - MOCK_PAYMENT_MIN_DELAY_MS;

  return MOCK_PAYMENT_MIN_DELAY_MS + Math.floor(Math.random() * (span + 1));
}
