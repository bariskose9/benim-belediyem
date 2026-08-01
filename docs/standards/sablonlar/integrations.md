# Dış Servisler (Entegrasyonlar)

<!--
ŞABLON — `docs/project/integrations.md` olarak kopyalanır ve doldurulur.
Bu yorum bloğu doldurduktan sonra silinir.

BU DOSYA NEDEN VAR
Dış servis, uygulamanın kontrol etmediği tek parçadır: çöker, limit koyar,
şema değiştirir, ücretlendirir. Hangi servise NEYE güvendiğimiz tek yerde
yazılmazsa, servis çöktüğünde ne olacağı kimse bilmez.

`altyapi-durumu.md` ile FARKI:
· BU dosya  → servisin KURALLARI (limit, önbellek, hata davranışı) — kod kararı
· altyapi-durumu.md → HESABIN DURUMU (açık mı, panelde ne seçilmiş) — dış dünya

NE ZAMAN GÜNCELLENİR
Yeni servis eklenince, limit/fiyat değişince, hata davranışı değişince.
-->

Tüm çağrılar **sunucu tarafında** yapılır ve önbelleklenir. Anahtarlar `.env`
içindedir, tarayıcıya gönderilmez. Bir servis çökerse ilgili bölüm kendi başına
hata durumu gösterir, **sayfa ayakta kalır**.

| Amaç | Servis | Anahtar | Ücretsiz limit | Önbellek |
|---|---|---|---|---|
| | | | | |

## Kurallar

- Limitler değişebilir; entegrasyondan önce **güncel dokümantasyon okunur**
  (`source-driven-development`). Tahminle kodlanmaz.
- Her dış çağrıda **zaman aşımı zorunlu**; yeniden deneme en fazla 2 kez ve
  üstel geri çekilmeli. Üst üste hata alınırsa devre kesici devreye girer.
- Anahtar gerektiren servislerde limit aşımı beklenir, `429` durumu ele alınır.
- Cevap şeması Zod (veya eşdeğeri) ile **doğrulanır** — dış servis bozuk veri
  gönderirse uygulama patlamaz.
- Yerel geliştirmede ağ yoksa sahte veriye düşülür; boş ekran gösterilmez.
- Testlerde gerçek istek atılmaz, yanıtlar mock'lanır.
- Dış servise giden veride kişisel veri **minimuma** indirilir.

## Servis çökerse ne olur

<!--
Her servis için TEK CÜMLE. "Bilmiyoruz" cevabı kabul edilmez — çökeceği kesin.
Güvenlik kapısı olan servislerde (bot koruması gibi) doğru cevap genellikle
"akış DURUR"dur; kapı açık bırakılarak atlanmaz. Bu istisna açıkça yazılır.
-->

| Servis | Çökerse | Kullanıcı ne görür |
|---|---|---|
| | | |

## Yurt dışına aktarım

<!-- KVKK: yurt dışında işleyen her servis aydınlatma metninde açıkça yazılır.
Hangi servis, hangi ülke, hangi veri gidiyor. -->

| Servis | İşleyici ülkesi | Giden veri |
|---|---|---|
| | | |
