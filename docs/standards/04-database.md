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
- Silme varsayılan olarak soft delete (`deleted_at`); kalıcı silme açık talep ister.
- Kişisel veri gerekmedikçe saklanmaz; log'a kişisel veri yazılmaz.

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
