/**
 * Bilgi widget'larının ortak dönüş tipi (PRD §5.8 · ADR-015).
 *
 * NEDEN İSTİSNA DEĞİL, AYRIK BİRLEŞİM: "dış servis çökerse sayfa çalışmaya
 * devam eder" kuralı, hatanın ekranın YUKARISINA sızmamasını gerektiriyor.
 * Ayrık birleşimde çağıran `status`'a bakmak zorunda kalır; unutursa TypeScript
 * derlemeyi durdurur. Fırlatılan bir istisna ise yakalanmayı unutabilir ve
 * unutulduğunda tüm sayfayı düşürürdü.
 *
 * VERİ ŞEKİLLERİ BURADA DEĞİL `schemas/snapshots.ts` İÇİNDE: aynı şekil hem
 * çalışma anında doğrulanıyor (önbellekten okunan JSON) hem de tip olarak
 * kullanılıyor. İkisini ayrı yazmak, birini güncelleyip diğerini unutmak demek.
 */
export type WidgetResult<T> =
  | {
      status: "ok";
      data: T;
      /** Verinin sağlayıcıdan gerçekte alındığı an — ekranda gösteriliyor. */
      fetchedAt: Date;
      /**
       * `true` ise sağlayıcıya ULAŞILAMADI ve elde kalan eski kayıt gösteriliyor.
       * Ekran bunu açıkça yazar; sessizce eski veri sunmak yanıltıcı olurdu.
       */
      isStale: boolean;
    }
  | { status: "error" };
