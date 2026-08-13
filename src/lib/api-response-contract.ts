import type { ZodType } from "zod";

/**
 * Başarılı yanıt gövdesini belgede yazan şemasına karşı doğrular
 * (borç #107 · adım 107a).
 *
 * ⛔ BU DOSYA NEDEN VAR — BELGE YALAN SÖYLEYEBİLİR VE HİÇBİR DERLEME GÖREMEZ.
 *
 * `ok()` çağrısındaki tip bağı, route'un döndürdüğü NESNENİN şemayla aynı
 * biçimde olmasını derleme anında zorluyor. Ama o bağ JSON'a hayatta kalmıyor:
 * `Date` alanı TypeScript'te `Date`, telde ISO metin; `Decimal` nesnesi telde
 * metin; `undefined` alan telde HİÇ YOK. Yani derleme yeşilken belge yanlış
 * olabilir — ve yanlış belge, belgesizlikten kötüdür (03-api-guidelines.md).
 *
 * Burada gövde, `NextResponse.json`'ın göreceği hâline çevrilip şemadan
 * geçiriliyor. Kontrol yalnızca `API_RESPONSE_CONTRACT_CHECK=true` iken çalışır;
 * production'da bayrak açılamıyor (`env.ts` tutarlılık kuralı).
 */

/**
 * Bayrağı okur.
 *
 * ⛔ NEDEN `serverEnv` DEĞİL, DOĞRUDAN `process.env` — ÖLÇÜLEREK BULUNDU.
 * `serverEnv` tarayıcıda okunduğunda BİLEREK istisna fırlatıyor (gizli değer
 * koruması, `env.ts`). Bu modül `lib/http.ts` üzerinden her yerden içe
 * aktarılabiliyor; `jsdom` ortamında koşan bir entegrasyon testi ucu çağırdığı
 * anda kontrol, koruma amaçlı bir istisnaya dönüştü ve `tests/integration/
 * health.test.ts` içindeki 5 test kırmızıya döndü. Yani teşhis aracının
 * kendisi arıza kaynağı olmuştu.
 *
 * Değer yine de denetimsiz değil: `env.ts` şeması onu `"true" | "false"` olarak
 * doğruluyor ve production'da açılmasını YASAKLIYOR. Burada yalnızca okunuyor.
 *
 * ⚠️ `=== "true"` karşılaştırması bilinçli: `Boolean("false")` `true` döner ve
 * bu hata bayrağı sessizce her yerde açardı.
 */
function isContractCheckEnabled(): boolean {
  return process.env.API_RESPONSE_CONTRACT_CHECK === "true";
}

/**
 * Gövdeyi TELDEKİ hâline çevirir.
 *
 * ⭐ `JSON.parse(JSON.stringify(...))` bilinçli ve ucuz bir taklit değil, tam
 * olarak `NextResponse.json`'ın yaptığı dönüşümün kendisi: `toJSON()` çağrılır
 * (`Date` → ISO metin), `undefined` alanlar düşer, sınıf örnekleri düz nesneye
 * iner. Şemayı ham nesneye uygulasaydık kontrol, istemcinin ASLA görmediği bir
 * biçimi doğrulardı — yani yeşil kalıp yanlış belgeyi geçirirdi.
 */
function asTransmitted(body: unknown): unknown {
  return JSON.parse(JSON.stringify(body));
}

export class ResponseContractError extends Error {
  constructor(detail: string) {
    super(
      `Yanıt sözleşmesi ihlali:\n${detail}\n\n` +
        "Ya uç belgede yazandan farklı bir gövde döndürüyor ya da belgedeki şema eskimiş. " +
        "Hangi uç olduğu aşağıdaki yığın izinde yazıyor. " +
        "Kütük: src/features/api-docs/registry/ · borç #107.",
    );
    this.name = "ResponseContractError";
  }
}

/**
 * Şema tutuyorsa sessizce geçer, tutmuyorsa İSTİSNA FIRLATIR.
 *
 * ⛔ LOG'LAYIP GEÇMİYOR ve bu bilinçli: log'lansaydı kırmızı bir test olmazdı,
 * satır CI çıktısında kaybolurdu ve sapma aylarca yaşardı. Kapının anlamı
 * kırmızıya dönebilmesinden geliyor (06-testing.md).
 */
export function assertResponseContract(schema: ZodType | undefined, body: unknown): void {
  if (!schema || !isContractCheckEnabled()) return;

  const result = schema.safeParse(asTransmitted(body));

  if (result.success) return;

  const detail = result.error.issues
    .map((issue) => `- ${issue.path.join(".") || "(kök)"}: ${issue.message}`)
    .join("\n");

  throw new ResponseContractError(detail);
}
