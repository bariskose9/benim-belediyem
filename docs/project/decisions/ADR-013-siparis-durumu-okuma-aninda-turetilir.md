# ADR-013 — Sipariş durumu okuma anında türetilir; bildirimler tembel yazılır

**Tarih:** 2026-08-08
**Durum:** Kabul edildi

## Bağlam

PRD §5.5 dört durumlu bir sipariş akışı tanımlıyor
(`Alındı → Hazırlanıyor → Yola çıktı → Teslim edildi`) ve durumların
**"zamanlayıcı ile simüle edileceğini"** söylüyor. Ayrıca "durum değiştikçe
bildirim güncellenir" diyor.

**Sorun:** bu projede sık çalışan bir zamanlayıcı **yok**. Vercel'in ücretsiz
planında zamanlanmış görev günde bir kez çalışıyor (teknik borç #3) ve yönetici
paneli de yok (teknik borç #4), yani durumu ilerletecek bir insan da yok.

Durumu günde bir çalışan bir cron'a yazdırmanın üç ayrı sonucu olurdu:

- Kullanıcı siparişten 40 dakika sonra baksa hâlâ "Alındı" görürdü
- Görev gecikirse veya hata alırsa veri **yanlış duruma** düşerdi
- Görev iki kez çalışırsa aynı bildirim iki kez yazılırdı

Aynı problem ADR-007'de (koltuk kilidi, OTP, oturum) çözülmüştü ve orada
verilen karar burada da geçerli: **doğruluğu bir zamanlayıcının çalışmasına
bağlamak kırılgandır.**

İkinci bir gerilim var: durum hesaplanabilir bir şey, ama **bildirim kalıcı
olmak zorunda.** Kullanıcı üç gün sonra girip "siparişim ne zaman yola çıktı"
diye bakabilmeli. Hesaplanan bir durum bu geçmişi tutamaz.

## Karar

**Sipariş durumu, siparişin YAŞINDAN okuma anında hesaplanır; bildirimler o
hesabın sonucuna göre TEMBEL yazılır.**

- `orders.status` kolonu yalnızca iki gerçeği tutar: siparişin nasıl **doğduğu**
  (`received`, bilet ise `delivered`) ve **iptal** edilip edilmediği
  (`cancelled`). Aradaki ilerleme hiçbir yere yazılmaz.
- Aşama eşikleri modül başına bir **kural tablosundan** okunur
  (`ORDER_TIMELINE_RULES`), koda gömülmez — teslimat ücretindeki
  `DELIVERY_RULES` deseninin aynısı.
- Hesap **saf bir fonksiyondadır** (`deriveOrderState`): veritabanı,
  `Date.now()` ve rastgelelik yoktur, `now` dışarıdan verilir. Testin zamanı
  ileri sarabilmesi bu yüzden mümkün.
- **İptal penceresi = ilk eşik.** Ekrandaki düğme de sunucudaki kapı da aynı
  fonksiyonu çağırır; kural iki yerde yazılmaz.
- Sipariş veya bildirim listesi okunduğunda, geçilmiş ama yazılmamış aşamaların
  bildirimleri **o anda** yazılır. Hangi durumun bildirildiği
  `orders.notified_status` kolonunda tutulur ve **koşullu UPDATE** ile
  ilerletilir (`WHERE notified_status = <önceki>`), böylece iki eşzamanlı okuma
  aynı bildirimi iki kez yazamaz.
- Atlanan aşamalar **kaybolmaz**: kullanıcı yarım saat sonra bakarsa
  `Hazırlanıyor` ve `Yola çıktı` bildirimlerinin ikisi birden yazılır.

Eşik değerleri (PRD ve `fake-data-guide.md` süre vermiyor; proje sahibinin
onayına açık bir varsayım):

| Modül | Hazırlanıyor | Yola çıktı | Teslim edildi | İptal penceresi |
|---|---|---|---|---|
| Restoran | 10 dk | 25 dk | 45 dk | 10 dk |
| Market | 20 dk | 90 dk | 240 dk | 20 dk |
| Bilet | — | — | doğuşta | hiç yok |

## Değerlendirilen alternatifler

| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| **Okuma anında türetme + tembel bildirim** | Zamanlayıcıdan bağımsız doğruluk; ücretsiz planda çalışır; test zamanı ileri sarabilir | Durum kolonu ile ekranda görünen durum ayrışır; bunu bilmeyen bir okuyucu `orders.status`'a bakıp yanılabilir | **Seçildi** |
| Sık çalışan cron durumu ilerletir | PRD'nin lafzına birebir uyar; `orders.status` her zaman doğru | Ücretsiz planda **mümkün değil**; gecikirse veri yanlış; iki kez çalışırsa çift bildirim | Bütçe dışı ve kırılgan |
| Durumu ilk okuyan istek veritabanına YAZAR | Kolon güncel kalır | Her okuma bir yazma demek (GET'in yan etkisi); hiç bakılmayan sipariş sonsuza dek "Alındı" kalır; eşzamanlı okumalar yarışır | Okuma yolunu yazma yoluna çevirmek daha büyük bir bedel |
| Yönetici paneli açıp durumu insana ilerlettirmek | En gerçekçi | Faz 2 kapsamı (PRD §2); tek kullanıcılı bir gösterim projesinde kimse tıklamaz | Kapsam dışı |

## Sonuçlar

- **Olumlu:** sipariş durumu cron çalışmasa da doğru görünür; ücretsiz planda
  kalınır; iptal penceresi tek bir kaynaktan yönetilir; eşikler tek satırda
  değiştirilebilir; bildirimler tekrarlanamaz (koşullu UPDATE).
- **Bedel 1:** `orders.status` kolonu ekranda görünen durumla **aynı değildir**.
  Kolona doğrudan bakan bir sorgu (rapor, ileride bir yönetici ekranı) siparişi
  "Alındı"da görür. Bu yüzden durum okuyan her yol `deriveOrderState`'ten
  geçmek zorunda; şemadaki alanın üstünde de bu not yazılı.
- **Bedel 2:** bildirim ancak kullanıcı uygulamaya girdiğinde oluşur.
  Uygulama içi bildirimde pratik karşılığı yok (görülmesi için zaten girmek
  gerekiyor), ama ileride e-posta/push bildirimi eklenirse bu yaklaşım
  **yetmez** — o noktada gerçek bir kuyruk veya zamanlayıcı gerekir.
- **Bedel 3:** eşikler gerçek bir mutfak/depo doluluğunu yansıtmıyor; sabit bir
  simülasyon. Ekranda gösterilen bir sonraki güncelleme saati bu yüzden
  "tahmini" diye yazılıyor.
- **Ne zaman gözden geçirilmeli:** ücretli plana geçilip sık cron mümkün
  olduğunda; yönetici paneli (faz 2) geldiğinde; veya uygulama dışına çıkan
  bir bildirim kanalı (e-posta, push) eklendiğinde.
