# ADR-016 — Haber kaynağı anahtar gerektirmeyen bir RSS akışı; XML'i kendi minimal okuyucumuz ayrıştırır

**Tarih:** 2026-08-09
**Durum:** Kabul edildi

## Bağlam

PRD §5.8 haber widget'ından iki şey istiyor: **güncel başlıklar** ve **kaynağa
bağlantı**. `integrations.md` bunun için **GNews.io veya NewsData.io** yazıyor;
ikisi de API anahtarı gerektiriyor ve günde ~100 istekle sınırlı.

Anahtar gerektiren bir sağlayıcı seçmenin bedeli koddan büyük:

- Proje sahibinin **yeni bir hesap açması** gerekir. `altyapi-durumu.md`
  bugüne kadar altı servis sayıyor; her yeni servis, her yeni anahtar üç ortamda
  ayrı ayrı yönetilecek bir şey demek (`13-environments.md` — canlı anahtar
  local'de kullanılmaz).
- Anahtar girilmeden `main` deploy edilebilir kalmalı (CLAUDE.md §6.1), yani
  "anahtar yoksa widget kapalı" yolunu ayrıca yazmak gerekir.
- Günde 100 istek, önbellek olsa bile üç ortam arasında paylaşılan dar bir bütçe.

Buna karşılık haber başlığı **kişiselleştirilmemiş, herkese açık, salt okunur**
bir veri. Kimlik doğrulaması gerektiren hiçbir yanı yok.

## Karar

**Haberler anahtar gerektirmeyen bir RSS 2.0 akışından okunur (bugün TRT Haber
son dakika akışı). XML, projeye yeni bir paket eklemeden, `src/lib/rss.ts`
içindeki minimal ve test edilmiş bir okuyucuyla ayrıştırılır.**

- Akış adresi `constants.ts` içinde tek yerde; sağlayıcı değişimi tek satır.
- Okuyucu RSS 2.0'ın yalnızca ihtiyaç duyulan alanlarını çıkarır: `title`,
  `link`, `pubDate`. `CDATA` ve temel HTML varlıkları (`&amp;` `&lt;` `&quot;`
  `&#39;` `&#xNN;`) çözülür. Fikstür dosyalarıyla test edilir.
- Sonuç **Zod ile doğrulanır**: başlığı boş veya bağlantısı geçersiz olan kalem
  atılır, listenin tamamı düşmez.
- **Bağlantılar alan adı beyaz listesinden geçer** (`constants.ts`). Akış bir gün
  ele geçirilse bile kullanıcıyı rastgele bir adrese götüren bir bağlantı
  çizilmez. `javascript:` gibi şemalar zaten `https` şartıyla eleniyor.
- Bağlantılar `target="_blank" rel="noopener noreferrer"` ile açılır ve
  başlıklar React'ın kendi kaçışıyla **metin olarak** çizilir; akıştan gelen
  HTML hiçbir yerde ham basılmaz.

## Değerlendirilen alternatifler

| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| **Anahtarsız RSS + kendi okuyucumuz (bu karar)** | Yeni hesap, yeni anahtar, yeni panel işi **yok**; istek limiti yok; Türkçe ve kaynağa bağlantılı; `main` anahtarsız deploy edilebilir kalıyor | XML ayrıştırmak JSON'dan zahmetli; okuyucu genel amaçlı bir XML ayrıştırıcı değil (yalnızca RSS 2.0'ın bu alt kümesi) | **Seçildi** |
| GNews.io / NewsData.io (anahtarlı) | Hazır JSON; kategori ve dil filtresi | Proje sahibine hesap açtırır; günde ~100 istek; anahtar üç ortamda ayrı yönetilir; anahtarsızken widget'ı kapatan ikinci bir yol gerekir | Kazandırdığı şey (JSON şekli) ödettiği bedele değmiyor |
| RSS + `fast-xml-parser` gibi bir paket | Genel ve sağlam ayrıştırma | CLAUDE.md §7: istenmeyen kütüphane eklenmez, önce sorulur. İhtiyaç dört alanla sınırlıyken bağımlılık yüzeyini ve denetim (`npm audit`) yükünü büyütür | İhtiyaç paketin kapsadığı alanın çok küçük bir dilimi |
| Haber widget'ını atlamak | En ucuzu | PRD §5.8 açıkça istiyor | Kapsam daraltmak proje sahibinin kararı, ajanın değil |

## Sonuçlar

- **Olumlu:** adım 14 hiçbir dış dünya işi (hesap açma, anahtar girme, panel
  ayarı) gerektirmeden tamamlanabiliyor; dört bilgi kaynağının **dördü de**
  anahtarsız.
- **Bedel 1 — okuyucu genel değil:** `src/lib/rss.ts` bir XML ayrıştırıcı
  değildir. Yalnızca RSS 2.0 `<item>` listesini ve dört alanı tanır; başka bir
  biçim (Atom, RSS 1.0) verilirse boş liste döner ve widget hata durumuna geçer.
  Bu bilinçli: geniş bir ayrıştırıcı yazmak paketin kendisini yazmak olurdu.
- **Bedel 2 — sağlayıcı sözleşmesi yok:** ücretsiz ve anahtarsız bir akışın
  kesintisi için başvurulacak bir yer yok. ADR-015'teki bayat veri sunumu ve
  devre kesici bu riski karşılıyor; akış tamamen kaybolursa widget hata gösterir,
  sayfa ayakta kalır.
- **Bedel 3 — içerik denetlenmiyor:** başlıklar üçüncü bir kurumun editoryal
  kararı. Site "örnek belediye portalı" olduğunu zaten söylüyor; kartta kaynak
  adı açıkça yazıyor, haber bize aitmiş gibi sunulmuyor.
- **Ne zaman gözden geçirilmeli:** akış biçim değiştirirse, engellenirse ya da
  belediyeye ait gerçek bir duyuru kaynağı gerekirse. `NEWS_API_KEY` ve
  `NEWS_API_PROVIDER` ortam değişkenleri kullanılmadıkları için kaldırıldı;
  anahtarlı bir sağlayıcıya dönülürse yeni bir sağlayıcı dosyası yeter.
