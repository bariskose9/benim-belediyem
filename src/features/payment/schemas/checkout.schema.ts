import { z } from "zod";

import {
  CARD_CVV_MAX_DIGITS,
  CARD_CVV_MIN_DIGITS,
  CARD_HOLDER_MAX_LENGTH,
  CARD_HOLDER_MIN_LENGTH,
  CARD_NUMBER_MAX_DIGITS,
  CARD_NUMBER_MIN_DIGITS,
  CART_ITEM_NOTE_MAX_LENGTH,
  CART_MAX_QUANTITY_PER_ITEM,
} from "@/config/constants";
import { messages } from "@/config/messages";

/**
 * Ödeme ucunun girdi şeması (03-api-guidelines.md: her uç Zod ile doğrulanır).
 *
 * ⛔ TUTAR İSTEMCİDEN ALINMAZ. `expectedTotalKurus` bir FİYAT DEĞİL, bir
 * MUTABAKAT alanıdır: kullanıcının ekranda gördüğü toplam. Sunucu tutarı yine
 * kendi hesaplar (`summarizeCart`) ve ikisi tutmuyorsa ödemeyi durdurur —
 * kullanıcı 250 TL yazan ekrana bakıp onayladıysa 310 TL çekilmemeli.
 * İstemcinin gönderdiği değer hiçbir koşulda tahsil edilen tutar olmaz.
 *
 * ⛔ CVV VE KART NUMARASI HİÇBİR YERE YAZILMAZ. Şemadan geçip servise, oradan
 * sahte sağlayıcıya gider ve unutulur; ne veritabanına ne log'a düşer.
 */

const copy = messages.payment.errors;

/** Kart numarası — boşluk ve tireye izin var, kullanıcı gruplayarak yazıyor. */
const cardNumber = z
  .string()
  .trim()
  .min(CARD_NUMBER_MIN_DIGITS, { error: copy.invalidNumber })
  // Ayırıcılarla birlikte üst sınır: 19 hane + 4 ayırıcı.
  .max(CARD_NUMBER_MAX_DIGITS + 4, { error: copy.invalidNumber })
  .regex(/^[\d\s-]+$/, { error: copy.invalidNumber });

const cvv = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${CARD_CVV_MIN_DIGITS},${CARD_CVV_MAX_DIGITS}}$`), {
    error: copy.invalidCvv,
  });

/**
 * Yeni kartla ödeme.
 *
 * Luhn ve son kullanma kontrolü BURADA DEĞİL serviste: ikisi de "şimdi"ye
 * bağlı veya saf kural dosyasında yaşıyor ve tek yerde durmaları gerekiyor
 * (`card-rules.ts`). Şema yalnızca biçimi süzüyor.
 */
const newCardSchema = z.object({
  kind: z.literal("new"),
  number: cardNumber,
  holderName: z
    .string()
    .trim()
    .min(CARD_HOLDER_MIN_LENGTH, { error: copy.invalidHolder })
    .max(CARD_HOLDER_MAX_LENGTH, { error: copy.invalidHolder }),
  expMonth: z.coerce.number().int().min(1).max(12),
  expYear: z.coerce.number().int().min(2000).max(2100),
  cvv,
  /** "Kartımı kaydet" kutusu (PRD §6.2 adım 2). */
  save: z.boolean().default(false),
});

/** Kayıtlı kartla ödeme — numara zaten yok, yalnızca CVV isteniyor. */
const savedCardSchema = z.object({
  kind: z.literal("saved"),
  savedCardId: z.string().trim().min(1).max(128),
  cvv,
});

export const checkoutCardSchema = z.discriminatedUnion("kind", [newCardSchema, savedCardSchema]);

/**
 * Teslimat bilgisi (PRD §6.1: her modülün ayarı kendi bölümünde).
 *
 * Adres ve zaman aralığı yalnızca market/restoran için gerekli; bilet teslim
 * edilmiyor. Zorunluluk kontrolü serviste, çünkü sepetin İÇİNDE ne olduğuna
 * bağlı — şema sepeti görmüyor.
 */
export const checkoutDeliverySchema = z.object({
  addressId: z.string().trim().min(1).max(128).optional(),
  deliverySlot: z.string().trim().min(1).max(80).optional(),
});

export const checkoutSchema = z.object({
  /**
   * Çift tahsilat kalkanı. İstemci ödeme formunu açtığında üretir ve aynı
   * denemenin tekrarlarında AYNI değeri gönderir; veritabanındaki benzersiz
   * kısıt ikinci yazmayı reddeder (data-model.md).
   */
  idempotencyKey: z.string().trim().min(8).max(128),
  expectedTotalKurus: z.number().int().min(0),
  card: checkoutCardSchema,
  delivery: checkoutDeliverySchema,
});

export type CheckoutPayload = z.infer<typeof checkoutSchema>;
export type CheckoutCardPayload = z.infer<typeof checkoutCardSchema>;

/** Sepete ekleme ucunun şeması. */
export const addCartItemSchema = z.object({
  itemType: z.enum(["market", "restaurant", "event"]),
  refId: z.string().trim().min(1).max(128),
  quantity: z.coerce.number().int().min(1).max(CART_MAX_QUANTITY_PER_ITEM),
  note: z.string().trim().max(CART_ITEM_NOTE_MAX_LENGTH).optional(),
});

/**
 * Sepet satırı güncelleme ucunun şeması.
 *
 * İKİ ALAN DA İSTEĞE BAĞLI ama en az biri zorunlu: ekranda adet düğmeleri ve
 * mutfak notu AYRI işlemler (biri her tıklamada, diğeri "kaydet" ile gider).
 * `quantity` zorunlu kalsaydı not kaydeden istek adedi de göndermek zorunda
 * kalırdı ve aradaki bir adet değişikliğini geri alırdı.
 *
 * `quantity: 0` = satırı sil. `note: null` = notu temizle.
 */
export const updateCartItemSchema = z
  .object({
    quantity: z.coerce.number().int().min(0).max(CART_MAX_QUANTITY_PER_ITEM).optional(),
    note: z.string().trim().max(CART_ITEM_NOTE_MAX_LENGTH).nullable().optional(),
  })
  .refine((data) => data.quantity !== undefined || data.note !== undefined, {
    error: "Güncellenecek bir alan gönderilmedi.",
  });

/** Ödeme ekranından yeni adres eklemenin şeması. */
export const newAddressSchema = z.object({
  title: z.string().trim().min(2).max(60),
  fullAddress: z.string().trim().min(10).max(300),
  district: z.string().trim().min(2).max(60),
});
