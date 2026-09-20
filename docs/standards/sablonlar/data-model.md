# Veri Modeli

<!--
ŞABLON — `docs/project/data-model.md` olarak kopyalanır ve doldurulur.
Bu yorum bloğu doldurduktan sonra silinir.

BU DOSYA NEDEN VAR
Şema dosyası (`schema.prisma` vb.) NE olduğunu söyler; bu dosya NEDEN öyle
olduğunu söyler: hangi alan neden var, ne kadar süre tutuluyor, kim erişiyor.
KVKK/gizlilik soruları da buradan cevaplanır (`14-privacy-and-compliance.md`).

NE ZAMAN GÜNCELLENİR
Şema her değiştiğinde — migration ile AYNI PR'da. Sonraya bırakılmaz.
-->

**Son güncelleme:** <!-- TARİH -->
**Kaynak şema:** <!-- örn. `prisma/schema.prisma` -->

## Genel kurallar

<!-- Projede her tabloda geçerli olan ortak kararlar. Bir kez yazılır, her
tabloda tekrar tartışılmaz. -->

- Birincil anahtar: <örn. `cuid()`>
- Zaman damgaları: `created_at` / `updated_at` her tabloda
- Silme: <yumuşak silme mi (`deleted_at`), gerçek silme mi — hangi tablolarda>
- İsimlendirme: tablo ve kolon adları İngilizce, `snake_case`
- Para: <birim ve tip — kuruş cinsinden tamsayı önerilir, float ASLA>
- Tarih/saat: UTC saklanır, arayüzde yerel saate çevrilir

## Tablolar

<!--
Alan alan kopyalamak yerine, her tablo için şunları yaz:
· Ne tutuyor, hangi modüle ait
· Kritik alanların GEREKÇESİ (neden var, neden bu tip)
· İlişkiler ve silme davranışı (cascade / restrict — ve neden)
· Zorunlu index'ler (hangi sorgu için)
· Benzersizlik kuralları
-->

### <tablo adı>

| Alan | Tip | Neden var |
|---|---|---|
| | | |

- **İlişkiler:** <... → ... , silinince ne olur>
- **Index:** <alan> — <hangi sorgu için>
- **Benzersiz:** <alan(lar)>

## Kişisel veri envanteri

<!--
KVKK/GDPR açısından ZORUNLU bölüm. Her kişisel veri alanı için üç soru
cevaplanır. Cevaplanamayan alan TOPLANMAZ (veri minimizasyonu).
Bu tablo aydınlatma metninin ve "verimi indir / hesabımı sil" özelliğinin
kaynağıdır — sonradan çıkarmak çok pahalıdır.
-->

| Alan | Neden toplanıyor | Ne kadar tutulur | Kim erişir | Şifreli mi |
|---|---|---|---|:---:|
| | | | | |

**Loglara asla yazılmayacaklar:** <!-- şifre, token, kimlik numarası, kart no... -->

## Saklama süreleri ve imha

<!--
ZORUNLU. Kural ve gerekçeler `14-privacy-and-compliance.md` → "Hesap silme".
Üç şeyi birden yaz: süre, süre dolunca NE OLACAĞI, ve süreyi ZORUNLU KILAN
kanun (varsa). "Silinir" ile "anonim hale getirilir" AYNI ŞEY DEĞİLDİR.

⛔ Kişisel alanları boşaltıp satırı bırakmaya "anonimleştirme" DEME — satır bir
kullanıcı kimliği üzerinden başka kayıtlara bağlı kaldığı sürece yapılan şey
takma adlaştırmadır. Doğru ad: "kişisel alanlar silinir, mali kayıtlar
kişiselleştirilmeden saklanır".

Türkiye'de en sık çarpılan iki süre: TTK m.82 → ticari defter/belge 10 yıl ·
VUK m.253 → defter ve vesikalar 5 yıl. Çakışırsa uzun olan uygulanır.
-->

| Tablo | Süre | Süre dolunca | Süreyi zorunlu kılan |
|---|---|---|---|
| | | <silinir / yok edilir / anonim hale getirilir> | <kanun veya "yok"> |

- **Hesap silinince:** <hangi alanlar silinir · hangi kayıtlar hangi gerekçeyle kalır>
- **İmha görevi:** <periyodik imha aralığı — Yönetmelik m.11/2 gereği altı ayı geçemez>

## Tohumlama (seed)

<!-- Tohumlama İDEMPOTENT olmalı: iki kez çalışınca veri ikilenmemeli.
Sahte kayıtlar gerçeklerden ayırt edilebilmeli (örn. `is_seed_data` bayrağı),
yoksa production'a sızan sahte veri fark edilmez. -->

- İdempotanlık yöntemi: <örn. sabit id / upsert>
- Sahte veri işareti: <örn. `is_seed_data = true`>
- Miktar ve gerekçe: `fake-data-guide.md`
