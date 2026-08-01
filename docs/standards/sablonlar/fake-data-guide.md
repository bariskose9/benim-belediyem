# Sahte Veri Rehberi

<!--
ŞABLON — `docs/project/fake-data-guide.md` olarak kopyalanır ve doldurulur.
Sahte veri gerekmiyorsa bu dosya hiç açılmaz.
Bu yorum bloğu doldurduktan sonra silinir.

BU DOSYA NEDEN VAR
Boş ekran hiçbir şeyi doğrulamaz: sayfalama, uzun isim taşması, "boş durum" ile
"veri var" farkı, sıralama, dark mode kontrastı ancak GERÇEKÇİ veriyle görünür.
Miktar ve dağılım burada yazılmazsa tohumlama her seferinde farklı olur ve
testler kararsızlaşır.

NE ZAMAN GÜNCELLENİR
Yeni tablo tohumlanınca, miktar değişince.
-->

**Son güncelleme:** <!-- TARİH -->

## Kurallar

- **İdempotent:** tohumlama iki kez çalışınca veri ikilenmez.
- **Ayırt edilebilir:** her sahte kayıt işaretlidir (örn. `is_seed_data = true`).
  Production'a sızarsa fark edilmeli ve temizlenebilmeli.
- **Gerçek kişisel veri kullanılmaz.** Gerçek isim, gerçek telefon, gerçek
  e-posta, gerçek kimlik numarası tohumlanmaz — depo herkese açık olabilir.
- **Deterministik:** rastgelelik sabit tohum (seed) ile üretilir; aynı komut
  aynı veriyi üretir, yoksa testler kararsız olur.
- **Sınır durumları bilerek eklenir:** çok uzun isim, boş liste, tek elemanlı
  liste, tükenmiş stok, geçmiş tarih, gelecek tarih. Mutlu yol tek başına
  arayüzü doğrulamaz.

## Miktarlar

<!-- Sayı ver ve GEREKÇESİNİ yaz: "12 kayıt — sayfalama 10'da başlıyor,
ikinci sayfa görünsün diye". Gerekçesiz sayı sonra kimseye bir şey söylemez. -->

| Tablo | Adet | Neden bu kadar |
|---|---:|---|
| | | |

## Dağılımlar

<!-- Durum alanlarının dağılımı: hepsi "aktif" olursa diğer durumların ekranı
hiç test edilmez. Yüzde ver. -->

| Alan | Dağılım | Neden |
|---|---|---|
| | | |

## Demo hesaplar

<!--
⛔ GERÇEK ŞİFRE YAZILMAZ. Yalnızca demo hesapların ŞİFRESİ OLDUĞU bilgisi ve
şifrenin hangi dosyada durduğu. Demo şifre yalnızca local ve preview içindir;
production'da demo hesap AÇILMAZ.
-->

- Kaç hesabın şifresi var: <sayı> — <hangi dosyada listeleniyor>
- Geri kalan hesapların şifresi **bilerek yok**: <gerekçe — örn. giriş
  yapmaları beklenmiyor, gereksiz özet hesaplama tohumlamayı yavaşlatır>
