/**
 * Yüklenen dosyanın NEREDE durduğunu bilen tek katman (ADR-014).
 *
 * ═══ NEDEN ADAPTÖR ═══
 *
 * `00-stack.md` dosya depolama için Vercel Blob diyor, ama bugün dış dünyada
 * açılmış bir Blob store YOK (`altyapi-durumu.md`) ve `13-environments.md`
 * canlı anahtarın local'de kullanılmasını yasaklıyor — yani store açılsa bile
 * local, CI ve `tests/db` için ikinci bir yol her hâlükârda gerekli.
 *
 * Bu, projede daha önce iki kez çözülmüş bir problem: sahte KPS (ADR-003) ve
 * OTP kanalı. İkisinde de uygulama bir ARAYÜZE konuşuyor, hangi uygulamanın
 * devrede olduğunu ortam belirliyor. Burada da öyle: çağıran taraf dosyanın
 * veritabanında mı yoksa bir nesne deposunda mı olduğunu bilmez.
 *
 * ŞU AN TEK SÜRÜCÜ VAR (`db`). İkincisi (Blob) yazılmadı çünkü yazılsaydı
 * hiçbir ortamda çalıştırılamaz, dolayısıyla test edilemez bir kod olurdu
 * (YAGNI). Eklenmesi tek dosyalık bir iş ve ADR-014 yolu tarif ediyor.
 */

/** `db` sürücüsünün referans öneki — içerik satırın kendi `data` kolonunda. */
const DB_REFERENCE = "db:inline";

export type PutFileInput = {
  /** Sanitize edilmiş dosya adı — ham kullanıcı girdisi DEĞİL. */
  fileName: string;
  /** Baytlardan doğrulanmış tür — istemcinin beyanı DEĞİL. */
  contentType: string;
  bytes: Uint8Array;
};

export type StoredFile = {
  /**
   * Depolama referansı; `ticket_attachments.file_url` kolonuna yazılır.
   * Ekrana ASLA verilmez — ek her zaman kendi yetkili ucumuzdan servis edilir.
   */
  reference: string;
  /**
   * Satırla birlikte yazılacak içerik. Yalnızca `db` sürücüsünde dolu; dış
   * depolamada `null` olur ve baytlar veritabanına hiç girmez.
   */
  inlineData: Uint8Array | null;
};

/** Okuma tarafının elindeki her şey: referans + (varsa) satırdaki içerik. */
export type StoredFileRef = {
  reference: string;
  inlineData: Uint8Array | null;
};

export interface FileStorage {
  readonly name: string;
  put(input: PutFileInput): Promise<StoredFile>;
  read(stored: StoredFileRef): Promise<Uint8Array>;
}

/**
 * Veritabanı sürücüsü: içerik `ticket_attachments.data` kolonunda durur.
 *
 * `put` ağa çıkmaz ve bir şey YAZMAZ — baytları satırla birlikte yazılmak
 * üzere geri verir. Bu bilinçli: ek satırı zaten talebin transaction'ı içinde
 * oluşuyor, dosyayı ayrı bir yere yazmak "talep geri alındı ama dosya orada
 * kaldı" durumunu üretirdi. Dış depolamaya geçildiğinde bu ihtimal gerçek
 * olacak ve ADR-014'te artık kaydı yazılı.
 */
const databaseFileStorage: FileStorage = {
  name: "db",

  async put(input: PutFileInput): Promise<StoredFile> {
    return { reference: DB_REFERENCE, inlineData: input.bytes };
  },

  async read(stored: StoredFileRef): Promise<Uint8Array> {
    if (!isDatabaseReference(stored.reference) || !stored.inlineData) {
      // Referans bu sürücüye ait değilse sessizce boş içerik dönmek, bozuk bir
      // görseli "yüklendi" gibi göstermek olurdu. Çağıran bunu 404'e çevirir.
      throw new Error(`Bu referans ${databaseFileStorage.name} sürücüsüyle okunamıyor.`);
    }

    return stored.inlineData;
  },
};

export function isDatabaseReference(reference: string): boolean {
  return reference.startsWith("db:");
}

/**
 * Devredeki sürücü.
 *
 * Bugün tek seçenek olduğu için ortam değişkeni YOK: karşılığı olmayan bir
 * ayar, ileride yanlış değerle deploy edilebilen bir tuzaktır. İkinci sürücü
 * eklendiğinde seçim burada ve `env.ts` içinde yapılacak (ADR-014).
 */
export function getFileStorage(): FileStorage {
  return databaseFileStorage;
}
