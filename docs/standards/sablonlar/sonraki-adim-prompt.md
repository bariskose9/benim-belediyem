# Sonraki oturum için hazır prompt — adım <X>

<!--
ŞABLON — `docs/project/sonraki-adim-prompt.md` olarak kopyalanır.
Bu yorum bloğu doldurduktan sonra silinir.

BU DOSYA NEDEN VAR
Yeni bir yapay zekâ oturumu HİÇBİR ŞEY hatırlamaz; yalnızca depodaki dosyaları
okuyabilir. Bu dosya kullanıcının kopyalayıp yeni oturuma yapıştıracağı tek
metindir. Doğru yazılırsa yeni oturum SORU SORMADAN çalışmaya başlar.

⛔ ADIM BİTİNCE ÜSTÜNE EKLENMEZ — YENİDEN YAZILIR.
Eski talimat kalırsa yeni oturum biten işi tekrar yapar.

KENDİNE SOR: "bunu bilmeyen bir oturum ne yapar?" Cevap "yanlış iş yapar" ise
o bilgi buraya (veya tablodaki doğru dosyaya) yazılır — `15-oturum-devri.md`.
-->

> Bu dosya bir sonraki oturuma kopyala-yapıştır yapılmak için var.
> Adım `<X>` bitince **yeniden yazılır** (üstüne eklenmez).

---

<Proje adı> projesinde roadmap adım **<X>**'e geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu üçü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/roadmap.md` — nerede kalındı + teknik borç listesi
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

<!-- Nerede kalındı, ne ÇALIŞIYOR (kod var değil — canlıda çalışıyor), canlı
adresler, test sayıları, veritabanında ne var. Somut sayı ver. -->

- Roadmap adım **<...>** bitti ve `<ana dal>`'da canlıda
- Canlı: <adres> · sağlık ucu `/api/health`
- Testler: <N> unit · <N> entegrasyon · <N> E2E

## ÖNCE ÇÖZÜLECEK MESELELER

<!--
Dokümanlar arası çelişki, verilmemiş karar, ADR gerektiren fork.
Yeni oturum kodlamaya başlamadan ÖNCE bunları çözmeli.
Yoksa "yok" yaz — boş bırakma.

Karar isteyen bir mesele varsa: seçenekleri, her birinin bedelini ve hangi
kuralla/ADR ile çakıştığını yaz. "Kararı dokümantasyona bakarak ver, tahminle
değil" (`source-driven-development`).
-->

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

<!--
EN ÇOK İŞ TEKRARINI ÖNLEYEN BÖLÜM. Yazılmış ama henüz bağlanmamış her şey:
yardımcı fonksiyon, servis, tablo, enum değeri, hazır bekleyen şema alanı.
Dosya yolunu ve NE İŞE YARADIĞINI yaz — yeni oturum arayıp bulamazsa
aynısını ikinci kez yazar.
-->

- `<dosya yolu>` — <ne yapıyor, neden şimdi lazım>

## YAPILACAK — roadmap adım <X>

<!-- Kapsam maddeleri. PRD'nin ilgili bölümüne referans ver, kopyalama.
"Bu adımda özellikle dikkat" alt başlığında bu adıma özgü kuralları say. -->

### Kapsam

1.

### Bu adımda özellikle dikkat

-

## TUZAKLAR — daha önce vakit kaybettirenler

<!--
Bu projede FİİLEN vakit kaybettirmiş şeyler. Genel tavsiye değil, yaşanmış
olay: "şu komut şunu eziyor", "şu test şu docblock olmadan patlıyor",
"şu CLI PATH'te değil". Kütüphane/araç adına göre grupla.
Çözülmüş ama tekrar edebilecek her sorun buraya.
-->

**<araç / kütüphane>**
-

## KOMUTLAR

<!-- Kopyalanıp çalıştırılabilir olsun. Hangi CLI'ın PATH'te OLMADIĞI da yazılır. -->

## BENİMLE İLETİŞİM

<!-- Kullanıcının çalışma tarzı: neyi okuyabiliyor, nasıl anlatılmasını
istiyor, neye kızıyor. Bu bilgi ajanın kişisel hafızasında da durabilir ama
BAŞKA bir makinede/araçta açılan oturum onu göremez — repoda dursun. -->
