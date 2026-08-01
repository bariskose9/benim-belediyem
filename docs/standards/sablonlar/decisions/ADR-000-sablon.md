# ADR-000 — Şablon

<!--
ŞABLON — `docs/project/decisions/ADR-000-sablon.md` olarak kopyalanır ve
OLDUĞU GİBİ bırakılır. Her yeni karar bu dosyayı çoğaltarak yazılır.
Bu yorum bloğu SİLİNMEZ — şablonun kendisi hedef projede de şablon kalır.

ADR NE ZAMAN YAZILIR
Geri dönmesi pahalı olan her kararda: veritabanı seçimi, oturum stratejisi,
şifreleme yöntemi, dış servis bağımlılığı, "bu kütüphaneyi kullanmıyoruz".
Ölçüt: "altı ay sonra biri 'bu neden böyle' diye sorarsa cevabı nerede?"

NEDEN ÖNEMLİ
Yapay zekâ oturumu hafızasızdır. Gerekçe yazılmazsa sonraki oturum kararı
"yanlışlıkla böyle olmuş" sanıp geri alır. CLAUDE.md: bir ADR'ye aykırı kod
yazılmaz. Karar değişecekse ÖNCE yeni ADR yazılır, kod sonra.

DOSYA ADI: `ADR-<numara>-<kisa-ad>.md` — numara asla yeniden kullanılmaz.
Kararı değişen ADR SİLİNMEZ; durumu "Yerini aldı: ADR-XXX" olur.
-->

> Her mimari karar için bu şablonu kopyala: `ADR-<numara>-<kisa-ad>.md`

**Tarih:** YYYY-AA-GG
**Durum:** Önerildi | Kabul edildi | Reddedildi | Yerini aldı: ADR-XXX
**İlgili:** <bağlantılı ADR'ler — varsa>

## Bağlam

<!-- Hangi problemi çözüyoruz? Hangi kısıtlar var? Hangi kural/standart bunu
zorluyor? Kararı okuyanın seçenekleri anlaması için yeterli arka plan. -->

## Karar

<!-- Ne yapmaya karar verdik? Tek cümle, net. "Şunu deneyeceğiz" değil. -->

## Değerlendirilen alternatifler

<!-- En az iki alternatif. Seçilen de tabloda yer alır ve "Seçildi" yazar.
Alternatif yazılmazsa karar tartışılmamış görünür ve sonraki oturum baştan
tartışır. -->

| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| | | | |

## Sonuçlar

- **Olumlu:** <bu karar sayesinde ne kolaylaştı>
- **Bedel:** <kabul edilen olumsuzluk — "yok" nadiren doğrudur>
- **Gözden geçirme:** <hangi ölçüm veya olay bu kararı yeniden açtırır>
