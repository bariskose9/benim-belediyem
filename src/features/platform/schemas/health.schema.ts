import { z } from "zod";

/**
 * `GET /api/health` yanıt sözleşmesi (borç #107 · adım 107a).
 *
 * ⭐ NEDEN ROUTE DOSYASINDA DEĞİL: API belgesi bu şemayı okuyor. Route dosyasında
 * dursaydı belge üreticisi `prisma` ve `logger` dahil tüm sağlık ucunu içeri
 * çekerdi — belge üretmek için veritabanı istemcisini yüklemek gerekirdi.
 *
 * ⛔ BU UÇ SÜRÜMLENMİYOR (`/api/v1/` altında değil): adresini izleme araçları,
 * duman testi ve README sabitledi (ADR-020). Yanıt gövdesine alan EKLEMEK
 * kırıcı değildir, alan çıkarmak veya tip değiştirmek kırıcıdır
 * (03-api-guidelines.md → "Sözleşme ömrü").
 */
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  app: z.literal("ok"),
  db: z.literal("ok"),
  /**
   * Ortam etiketi (`local` · `preview` · `production`).
   *
   * ⚠️ BİLEREK `z.enum` DEĞİL: değer listesi `config/env.ts` içinde yaşıyor ve
   * onu buraya kopyalamak, bu borcun kapatmaya çalıştığı şeyi — sapan ikinci
   * kaynağı — yeniden üretirdi. Şemayı `env.ts`'e bağlamak ise belge üretimini
   * sunucu ortam doğrulamasına bağlardı (`vi.mock("@/config/env")` kullanan
   * testler kırılırdı). Alan teşhis amaçlı; istemci ona göre dallanmıyor.
   */
  env: z.string().min(1),
  version: z.string().min(1),
  commit: z.string().min(1),
  timestamp: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
