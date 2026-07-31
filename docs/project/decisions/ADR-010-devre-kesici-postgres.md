# ADR-010 — Devre kesici durumu Postgres'te, hız sınırı tablosu üzerinde

**Tarih:** 2026-07-31
**Durum:** Kabul edildi

## Bağlam

PRD §5.0 ve CLAUDE.md §5.9, dış servis çağrılarında "üst üste hata alınırsa
devre kesici" istiyor. Devre kesicinin çalışması için bir **durum** gerekiyor:
"son zamanlarda kaç hata oldu, devre ne zaman açıldı".

ADR-006 hız sınırı sayacı için aynı sorunu çözmüştü ve gerekçesi burada da
birebir geçerli: uygulama Vercel'de sunucusuz çalışıyor, her istek ayrı bir
örneğe düşebilir ve örnekler paylaşılan bellek görmez. **Bellekte tutulan bir
devre kesici çoğu zaman hiçbir şey saymaz** — koruma sağladığı sanılır, sağlamaz.

## Karar

Devre kesici durumu **mevcut `rate_limit_counters` tablosunda** tutulur.
Yeni tablo ve yeni migration yoktur. Anahtar `circuit:<servis adı>` biçiminde
ön ekle ayrılır, hız sınırı anahtarlarıyla karışmaz.

Ölçüt **"pencere içinde N hata"**dır, "ardışık N hata" değil:

- Ardışıklığı takip etmek isteklerin sırasını bilmeyi gerektirir; sunucusuz
  ortamda istekler paralel örneklere dağıldığı için sıra zaten güvenilir değildir.
- "Son bir dakikada 5 hata" ölçütü aynı işi tek atomik `UPSERT` ile, yarış
  koşulu olmadan yapar.
- Başarılı bir çağrı sayacı **siler**; böylece geçmiş hatalar sonsuza kadar
  birikip sağlıklı bir servisi haksız yere kesemez.

Soğuma süresi dolduğunda devre kendiliğinden kapanır ve bir sonraki çağrıya
izin verilir ("half-open"); o çağrı başarılıysa sayaç sıfırlanır.

## Değerlendirilen alternatifler

| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| **Mevcut Postgres tablosu** | Yeni tablo/migration/servis yok; sayaç örnekler arasında paylaşılır; yedeğe dahil | Her hata bir veritabanı yazımı; "ardışık" anlamı "pencere içinde"ye dönüşür | **Seçildi** |
| Yeni ayrı tablo (`circuit_breaker_states`) | Anlamsal olarak daha temiz, "açıldı" anı ayrıca tutulabilir | Yeni migration, yeni temizlik görevi; sakladığı bilgi mevcut tablonun sakladığından farklı değil | Kazancı, ek şema karmaşıklığını karşılamıyor |
| Bellek içi sayaç | Sıfır altyapı, en hızlı | Sunucusuzda çalışmaz — ADR-006'nın "en tehlikeli seçenek" dediği şeyin aynısı | Yanlış güvenlik hissi |
| Devre kesici hiç olmasın | Daha az kod | Çöken servis her istekte 3 kez, 3'er saniye denenir: kullanıcı 9 saniye bekler, servis büsbütün boğulur | PRD §5.0 ve CLAUDE.md §5.9 açıkça istiyor |

## Sonuçlar

- **Olumlu:** koruma gerçekten çalışır ve süre dolumu testiyle kanıtlanmıştır
  (soğuma bitince devre kendiliğinden kapanıyor, `tests/unit/circuit-breaker.test.ts`).
- **Olumlu:** ek servis, ek hesap, ek aylık maliyet yok.
- **Bedel:** hız sınırıyla aynı tabloyu paylaştığı için `rate_limit_counters`
  büyür; ADR-007'deki temizlik görevi her iki satır türünü de kapsamalıdır.
- **Bedel:** "pencere içinde N hata" ölçütü, hataların araya karışan başarılı
  çağrılarla seyreldiği durumlarda ardışık ölçütünden biraz daha erken açılabilir.
  Bu takas bilinçlidir: erken açılan devre kullanıcıyı bir süre bekletir,
  hiç açılmayan devre servisi düşürür.
- **Gözden geçirme:** ADR-006 ile birlikte — ölçüm sayaç yazımının darboğaz
  olduğunu gösterirse ikisi birlikte Redis'e taşınır.
