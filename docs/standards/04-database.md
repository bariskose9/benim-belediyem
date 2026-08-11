# 04 — Veritabanı Kuralları

## Şema ve migration
- Şemanın tek kaynağı `prisma/schema.prisma`.
- Veritabanına **elle** tablo/kolon eklenmez. Her değişiklik migration ile.
- Migration adı ne yaptığını söyler: `20260729_add_order_status_index`
- Üretim ortamında veri silen/kolon düşüren migration **ayrı PR** ve açık onay ister.
- Geri alma yolu (down/rollback planı) migration açıklamasında belirtilir.

## İsimlendirme
- Tablo: çoğul `snake_case` (`appointments`, `order_items`)
- Kolon: `snake_case` · Prisma model adı: `PascalCase` tekil (`Appointment`)
- Yabancı anahtar: `<tekil_tablo>_id` (`user_id`)
- Boolean: `is_`/`has_` öneki (`is_active`)
- Tarih: `created_at`, `updated_at`, `deleted_at` (UTC saklanır, ekranda TR saatine çevrilir)

## Zorunlu alanlar
Her tabloda: `id` (uuid/cuid), `created_at`, `updated_at`.
Kullanıcı verisi tutan tablolarda `user_id` + yabancı anahtar kısıtı.

## Bütünlük
- İlişkiler veritabanı seviyesinde yabancı anahtarla zorlanır — uygulamaya bırakılmaz.
- Benzersizlik kuralları unique index ile zorlanır (örn. aynı doktor + aynı saat).
- Para **asla** float değil: `Decimal` veya kuruş cinsinden `Integer`.
- Enum benzeri alanlar için Prisma enum kullanılır, serbest metin değil.

## Performans
- Sık filtrelenen ve sıralanan kolonlara index eklenir.
- N+1 sorgu yasak: ilişkili veri `include`/`select` ile tek sorguda çekilir.
- `select` ile sadece gereken kolonlar çekilir; `SELECT *` alışkanlığı yok.
- Birden fazla yazma içeren işlemler (sipariş + stok düşme) **transaction** içinde.

## Güvenlik
- Ham SQL yazılacaksa parametreli. String birleştirme ile sorgu kurulmaz.
- Kişisel veri gerekmedikçe saklanmaz; log'a kişisel veri yazılmaz.

### Soft delete VARSAYILAN DEĞİLDİR — tablo tablo karar verilir

⛔ **"Her şeyi soft delete yap" yaygın ama yanlış bir varsayılandır.** İki ayrı
sorun üretir:

1. **Kişisel veride hukuka aykırıdır.** KVKK/GDPR silme hakkı, satırın yerinde
   durup yalnızca gizlenmesini değil, verinin **gerçekten yok edilmesini veya
   geri döndürülemez biçimde anonimleştirilmesini** ister. `deleted_at` dolduran
   bir "silme", silme değil **saklamaya devam etmedir**
   (`14-privacy-and-compliance.md`).
2. **Sessiz veri sızıntısı üretir.** Filtreyi bir sorguda unutmak yeterlidir:
   hata vermez, çökme olmaz — silinmiş kayıt bir listede, bir sayımda veya bir
   dışa aktarmada geri belirir.

**Doğrusu — üçe ayır:**

| Ne siliniyor | Davranış |
|---|---|
| **Kişisel veri** (hesap, adres, iletişim bilgisi) | Gerçekten silinir ya da **geri döndürülemez** anonimleştirilir |
| **Ticari/mali kayıt** (sipariş, ödeme, fatura) | Silinmez — yasal saklama süresi boyunca durur, kişiye bağı koparılır |
| **Kullanıcının geri alabilmesi beklenen kayıt** | Soft delete meşrudur; süresi ve otomatik temizliği **baştan tanımlanır** |

**Soft delete kullanılan her tablo için zorunlu üç şey:**
- Tablo, gerekçesiyle birlikte `data-model.md` içinde **sayılı olarak** listelenir
  ("bu 8 tablo") — belirsiz bir "gerektiğinde" listesi denetlenemez
- Filtre **tek bir noktadan** uygulanır (repository katmanı / Prisma extension).
  Her sorguya elle `deleted_at IS NULL` yazmak, unutulacak bir şeyi tekrar etmektir
- `deleted_at` üzerinde index bulunur ve kayıtların **ne zaman kalıcı silineceği**
  saklama politikasında yazılıdır. Süresiz duran soft delete, gizlenmiş bir sızıntıdır

## Metin arama
- **Veritabanının "büyük/küçük harf duyarsız" araması kullanıcının dilini bilmez.**
  ORM'in `insensitive` kipi ASCII kurallarına göre çalışır; Türkçe'de `I` harfini
  `i`'ye katlar (doğrusu `ı`), Almanca `ß`, Fransızca aksanlar da eşleşmez.
  Sonuç sessizdir: hata yok, çökme yok, sadece **kullanıcı ürünü bulamaz.**
- **Arama davranışı tahmin edilmez, GERÇEK VERİYE KARŞI ÖLÇÜLÜR.** Bir arama
  kutusu yazmadan önce birkaç örnek kelimeyi veritabanında dene ve sonucu gör.
- **Sorgu ile aranan alan AYNI sadeleştirmeden geçer** (`unaccent` eklentisi,
  dile uygun collation veya eşdeğeri). Yalnızca bir tarafı normalleştirmek
  eşleşmeyi bozar.
- Sadeleştirmenin yeri **veritabanıdır**, uygulama katmanı değil: iki yerde
  yapılırsa ikinci bir doğruluk kaynağı doğar ve zamanla sapar.
- **Kullanıcı metni bir `LIKE` desenine giriyorsa `%` ve `_` kaçırılır** ve
  `ESCAPE` belirtilir. Bu bir enjeksiyon açığı değildir (değer parametreyle
  bağlanır) ama sorgunun **anlamını** kullanıcıya devretmektir: tek bir `%`
  yazan kişi tüm tabloyu eşleştirir.
- Aksan/harf katlaması için index gerekiyorsa **önce ölç**: küçük tablolarda
  ifade index'i, onu mümkün kılan sarmalayıcı fonksiyonlar ve bakım yükü
  kazançtan büyüktür.
- Yazım hatası toleransı, eş anlamlı ve alaka sıralaması **veritabanının işi
  değildir**; gerçekten gerekiyorsa ayrı bir arama motoru ADR ile kararlaştırılır.

## Seed
- `prisma/seed.ts` idempotent olur (tekrar çalıştırınca veri katlanmaz).
- Tüm örnek veri **açıkça sahtedir**: isimler uydurma, kart numaraları test aralığında.
- Gerçek kişi adı, gerçek telefon, gerçek TCKN kullanılmaz.

## Eşzamanlılık
- Aynı kaynağa iki kişi aynı anda talip olabiliyorsa (randevu saati, koltuk, stok):
  benzersiz index + transaction ile korunur; "önce kontrol et sonra yaz" yeterli değildir.
- Güncellemede kayıp yazma riski varsa iyimser kilitleme (`version` kolonu) kullanılır.
- Transaction mümkün olduğunca kısa tutulur; içinde dış API çağrısı yapılmaz.

## Denetim ve saklama
- `audit_logs` tablosu: kim, ne zaman, hangi kayıt, hangi işlem. Append-only.
- Her tablo için saklama süresi `docs/standards/14-privacy-and-compliance.md` uyarınca tanımlıdır.
- Kişisel veri içeren tablolarda anonimleştirme yolu baştan düşünülür.

## Bakım
- Migration'lar sırayla ve tekrarlanabilir çalışmalıdır; local'de sıfırdan kurulum denenir.
- `prisma migrate diff` ile şema ile veritabanı arasındaki sapma düzenli kontrol edilir.
- Yavaş sorgular (>200ms) tespit edilip index veya sorgu düzeltmesiyle giderilir.
