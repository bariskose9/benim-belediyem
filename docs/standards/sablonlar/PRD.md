# <Proje Adı> — Ürün Gereksinim Dokümanı (PRD)

<!--
ŞABLON — `docs/project/PRD.md` olarak kopyalanır ve doldurulur.
Bu yorum bloğu doldurduktan sonra silinir.

BU DOSYA NEDEN VAR
"Ne yapılacak" sorusunun TEK kaynağıdır. Kod, test ve roadmap buradan türer.
Burada yazmayan bir özellik yapılmaz; yapılması isteniyorsa ÖNCE buraya yazılır.

NASIL DOLDURULUR
Kullanıcının verdiği analiz dokümanı HER ZAMAN eksiktir. CLAUDE.md §3 kapı 1:
`interview-me` ile TEK TEK soru sor, varsayım yapma. "§9 Açık sorular" bölümü
boşalmadan kodlama başlamaz.

NE ZAMAN GÜNCELLENİR
· Yeni bir özellik kararlaştırıldığında
· Bir iş kuralı değiştiğinde (eskisi silinmez, değişiklik CHANGELOG'a düşer)
· Bir açık soru cevaplandığında → §9'dan "Kapatılan sorular"a taşınır
-->

**Son güncelleme:** <!-- TARİH -->

## 1. Amaç

<!-- Kim, hangi problemi, neden bu uygulamayla çözüyor? En fazla bir paragraf +
birkaç madde. "Herkes için her şey" yazma — hedef kitleyi daralt. -->

- **Kimin için:** <hedef kullanıcı>
- **Hangi problem:** <bugün nasıl çözülüyor, neden yetersiz>
- **Başarı ölçütü:** <bu proje başarılı sayılırsa hangi somut şey doğru olur>

## 2. Kapsam dışı

<!--
EN ÇOK ZAMAN KAZANDIRAN BÖLÜM. Yapılmayacakları yazmak, yapılacakları yazmak
kadar önemlidir. Buraya yazılmayan her şey "belki yapılır" sanılır ve kapsam
sessizce büyür.
-->

- <yapılmayacak şey> — <neden: faz 2 / gereksiz / yasal engel / maliyet>

## 2b. Varsayımlar — doğrulanmayı bekleyen kararlar

<!--
BU BÖLÜM NEDEN VAR
Gereksinim belgeleri eksik gelir (docs/standards/11-agent-workflow.md →
"Gereksinim doğru varsayılmaz"). Cevabı beklerken iş durmasın diye bazı
noktalarda makul bir varsayımla ilerlenir.

⛔ Varsayım YAPILMASI yasak değil; SESSİZCE yapılması yasak. Yazılmayan
varsayım, altı ay sonra "gereksinim buymuş" sanılır ve kimse sorgulamaz.

⚠️ Yalnızca EKRAN METNİ / GÖRÜNÜM düzeyindeki eksikler varsayımla geçilir.
Veri modelini veya iş kuralını etkileyen eksikte İŞ DURUR ve sorulur —
yanlışsa geri dönüş pahalıdır.

Doğrulanan satır buradan silinir ve ilgili bölüme GERÇEK gereksinim olarak
yazılır. Yanlış çıkan satır ise ADR'ye "şu varsayım yanlıştı, şu değişti"
diye geçer.
-->

| # | Varsayım | Neden böyle varsaydık | Yanlışsa ne değişir | Kim onaylayacak | Durum |
|---|---|---|---|---|---|
| V1 | <ne varsayıldı> | <belgede yoktu, şu yüzden bu makuldü> | <hangi kod/tablo/ekran etkilenir> | <kişi/kurum> | ⬜ bekliyor |

## 3. Kullanıcı rolleri

<!-- Her rol için: ne görebilir, ne yapabilir, neyi ASLA yapamaz. Yetki
kararları bu tablodan türetilir ve SUNUCUDA uygulanır. -->

| Rol | Görebildiği | Yapabildiği | Yapamadığı |
|---|---|---|---|
| Ziyaretçi (giriş yok) | | | |
| | | | |

## 4. Ortak özellikler

<!-- Birden fazla modülde tekrar eden davranışlar: arama, sayfalama, bildirim,
boş/yükleniyor/hata durumları, dil, dark mode. Tek yerde tanımlanır ki her
modülde yeniden tartışılmasın. -->

## 5. Modüller

<!--
Her modül ayrı `### 5.x` başlığı. Her modülde en az şunlar olsun:
· Kullanıcı ne yapar (akış, adım adım)
· İŞ KURALLARI — sayı vererek ("aynı gün en fazla 1 randevu")
· Kim erişebilir (§3'teki rollere referans)
· Hata durumunda ne olur
Belirsiz bırakılan her cümle sonra yanlış kodlanır. Sayı ver, örnek ver.
-->

### 5.0 <ilk modül>

### 5.x Hesap yönetimi ve veri hakları — ZORUNLU, SİLİNMEZ

<!--
Kullanıcı hesabı olan HER projede bu modül vardır ve kapsam dışı bırakılamaz;
KVKK m.11 bunu ilgili kişinin hakkı sayıyor. Kuralların tamamı ve gerekçeleri
`14-privacy-and-compliance.md` → "Hesap silme" bölümünde. Buraya yalnızca bu
projeye özel cevaplar yazılır.

Doldurulacak üç soru:
 1. VERİMİ İNDİR — hangi tablolar dosyaya girer? (⛔ şifre özeti, oturum
    jetonu, ham/şifreli kimlik numarası GİRMEZ; kimlik numarası maskeli verilir)
 2. HESABIMI SİL — hangi alanlar SİLİNİR, hangi kayıtlar hangi KANUN gereği
    ne kadar süre SAKLANIR? Bu liste ekranda kullanıcıya gösterilir
    (Yönetmelik m.12/1-c: kısmen reddedilen talep gerekçesiyle bildirilir)
 3. KABUL KRİTERİ — silinen hesabın kimlik bilgisiyle yeniden kayıt olunabilir
    mi, eski kayıtlar kişiye bağlanamaz hâle geldi mi? Test bu cümleyi ölçer

⚠️ Silme ONAY ister, geri alınamaz olduğu yazılır, tüm oturumlar kapanır ve
işlem denetim kaydına düşer — o kayıt hesapla BİRLİKTE SİLİNMEZ (m.7/3: imha
işleminin kaydı en az üç yıl saklanır).
-->

- **Verimi indir:** <kapsam>
- **Hesabımı sil — silinenler:** <alanlar>
- **Hesabımı sil — saklananlar:** <kayıt> · <gerekçe: kanun + süre>
- **Kabul kriteri:** <ölçülebilir cümle>

## 6. <Uçtan uca kritik akış>

<!-- Ödeme, başvuru, sipariş gibi birden fazla modülü kesen akış varsa ayrı
başlık. Modül içine gömülürse kimse tamamını göremez. -->

## 7. Sahte veri gereksinimi

<!-- Ekranların boş görünmemesi için ne kadar veri gerekiyor? Detay
`fake-data-guide.md`'ye yazılır, buraya sadece MİKTAR ve GEREKÇE. -->

## 8. Kalite gereksinimleri

<!-- Ölçülebilir yaz. "Hızlı olsun" değil, "liste sayfası p95 < 500ms". -->

- **Performans:** <bütçe>
- **Erişilebilirlik:** WCAG 2.1 AA
- **Tarayıcı/cihaz:** <en dar ekran, desteklenen tarayıcılar>
- **Dil:** <arayüz dili>

## 9. Açık sorular

<!--
BOŞ BIRAKILMAZ. Cevabı bilinmeyen her şey buraya yazılır ve KULLANICIYA
sorulur. Ajan kendi kendine cevaplayıp geçmez — yanlış varsayım en pahalı
hatadır. Cevaplanan soru "Kapatılan sorular"a TAŞINIR, silinmez: sonraki
oturum "bu neden böyle" diye tekrar sormasın.
-->

| # | Soru | Kimden cevap gerekiyor | Durum |
|---|---|---|---|
| 1 | | | Açık |

### Kapatılan sorular

| # | Soru | Cevap | Tarih |
|---|---|---|---|
