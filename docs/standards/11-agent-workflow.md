# 11 — Ajanla Çalışma Düzeni

Bu proje **vibecoding** ile geliştirilir: kullanıcı kodu elle yazmaz ve
kodun tamamını okuyup doğrulayamaz. Bu nedenle süreç disiplini kodun yerine geçer.

## Oturum düzeni
**Bir oturum = bir feature.** Birden fazla sayfayı aynı oturumda karıştırma.
Oturum başında: `git status` temiz mi, hangi daldayız, PRD'de bu feature ne diyor.

## Aşamalar

Komut adları **tam yazılır**. Ortamda aynı adı taşıyan başka skill paketleri
olabilir (`/spec`, `/review`, `/plan` birden fazla pakette bulunur); bu projede
kastedilen **her zaman `agent-skills:` önekli olanlardır** (CLAUDE.md §2).

```
/agent-skills:spec   → gereksinimi netleştir (interview-me ile soru sor)  [ONAY]
/agent-skills:plan   → 2-5 dakikalık küçük adımlara böl                   [ONAY]
                     → yeni dal aç
/agent-skills:build  → adım adım kodla, her adımda test yaz
/agent-skills:test   → unit + entegrasyon + E2E yeşil olmalı
                     → güvenlik denetimi (security-auditor)
                     → tarayıcıda fiilen tıklayarak doğrula
/agent-skills:review → code-reviewer ile denetle
                     → commit raporu sun                                  [ONAY]
                     → commit + push + PR
```

**Skill etiketi gerçek olmalı:** CLAUDE.md §2 gereği her cevabın ilk satırında
kullanılan skill bildirilir. Etiketi yazmak yetmez — skill **fiilen yüklenip
uygulanır**. Yüklenmeden yazılan etiket yanlış beyandır.

## Bağlam yönetimi
- Uzun oturumda bağlam kirlenir. Feature bitince oturumu kapat, yeni oturum aç.
- Konu değiştiğinde `/clear` kullan.
- Her oturum başında CLAUDE.md ve ilgili PRD bölümü yeniden okunur.

## Belirsizlikte davranış
Varsayım yapma. Sor. Yanlış varsayımla yazılmış 200 satır,
sorulmuş 1 sorudan pahalıdır.

## Devralınan kaydın ÖNERDİĞİ ÇÖZÜM de bir iddiadır

`06-testing.md` bir kaydın **sebebinin** doğrulanmadan devralınamayacağını
söylüyor. Bir adım ötesi de geçerli: teknik borcun, devir notunun veya ADR'nin
**"şöyle çözülür"** satırı da doğrulanmamış bir iddiadır — ve genellikle o iş
hiç yapılmadan, sebep henüz ölçülmemişken yazılmıştır.

Ölçülmüş üç sapma biçimi:

| Sapma | Ne olur |
|---|---|
| **Çözüm etkisiz** | Kayıt "A yerine B'yi oku" der; belge ikisinin **aynı** değer olduğunu söyler. İş yapılmış görünür, hiçbir şey değişmez |
| **İş zaten yapılmış** | Kayıt iki maddeden söz eder, biri önceki bir adımda çoktan yapılmıştır. Yapılmışı "yaptım" diye raporlamak, denetimi yalancı çıkarır |
| **Risk gerçek değil** | Kaydın anlattığı saldırı, platform veya kütüphane tarafından zaten engelleniyordur |

**Kural:** Bir borcu ödemeye başlarken **üçünü ayrı ayrı ölç** — (1) sorun bugün
hâlâ var mı, (2) sebep doğru mu, (3) önerilen çözüm o sebebi gerçekten
çözüyor mu. Üçü de doğrulanmadan koda dokunma.

Bir kaydı kapatırken, **yanlış çıkan kısmını da yaz.** "Ödendi" demek yetmez;
sonraki oturum aynı yanlış cümleyi yeniden devralır.

## Dış dünya bilgisi: ezberden DEĞİL, güncelinden

Ajanın eğitim verisi eskidir. Üçüncü parti paneller, API'ler, kütüphane sürümleri
ve fiyatlandırma **haftalar içinde** değişir. Ezberden verilen yönlendirme,
kullanıcıyı artık var olmayan bir ekranı aramaya gönderir.

**Kural:** Kullanıcıya bir dış servis hakkında "şuraya gir, şuna bas" demeden
**önce**, o bilgiyi bu oturumda güncel resmî kaynağından **bizzat gör**.

Bu kapsama girenler:
- Sağlayıcı panel gezinmesi (Google Cloud, Vercel, Cloudflare, Neon, Resend…)
- Kütüphane API'si, sürüm numarası, bakım durumu → paket kaydı + resmî doküman
- CLI komutu ve bayrakları
- Ücretsiz katman sınırları, fiyat, kota
- Ortam değişkeni adları ve zorunlulukları

Nasıl doğrulanır: `WebFetch` ile resmî doküman · `npm view` ile paket kaydı ·
`--help` ile CLI · sağlayıcının changelog'u. Ekran görüntüsü gerekiyorsa
`browser-testing-with-devtools` ile fiilen aç.

**Kaynağa ulaşılamıyorsa** "doğrulayamadım, ezberimden söylüyorum, arayüz
değişmiş olabilir" diye **açıkça yaz**. Sessizce tahmin etme.

**Neden bu kadar sert:** doğrulama ajan için saniyeler sürer; yanlış yönlendirme
kullanıcının onlarca dakikasını yakar ve güveni bozar. **Maliyet asimetriktir.**

Tipik ödenen bedeller (gerçek örneklerden):
- Sağlayıcı, ayarı başka bir menünün altına taşımıştır; kullanıcı **var olmayan
  bir sayfayı** arar ve "ben mi beceremiyorum" diye düşünür
- Panelde bir değer girilmiştir ama **kaydetme adımı** tarifte yoktur; hata
  saatlerce **kodda** aranır
- Bir kütüphanenin önerdiği yol değişmiştir; ezberden verilen kurulum,
  projenin yazılı bir kararını sessizce bozan bir paket getirir

## ⛔ GERÇEK PROJE VARSAYILANI — demo çözümü varsayılan olamaz

Bu proje bir **öğrenme projesi** olabilir; ama **öğrenilen şey gerçek üretim
pratiğidir.** İki seçenek arasında kalındığında ölçüt "hangisi daha hızlı
biter" veya "portföyde daha iyi görünür" değil, **"gerçek kullanıcısı ve
gerçek nöbetçisi olan bir üründe hangisi doğru olurdu"**dur.

**Kural:** Her teknik seçimde önce sektörde yerleşik pratiği tespit et ve
**varsayılan olarak onu uygula.** Ondan sapılacaksa sapma bilinçli, yazılı ve
gerekçeli olur — sessizce değil.

### Bu neden bir kural, tercih değil

Demo kısayolu tek başına zararsız görünür; zarar **birikince** çıkar. Kısayolla
yazılan kod, gerçek yüke, gerçek saldırgana ve gerçek nöbetçiye çarptığında
"düzeltilecek bir detay" değil **yeniden yazılacak bir katman** olur. Üstelik
kısayol öğrenilen alışkanlığı da bozar: yanlış refleks bir sonraki projeye
bedava taşınır.

### Sapma nasıl yazılır

Gerçek pratikten sapan her karar şu üçünü söyler:

1. **Yerleşik pratik ne?** (kaynağıyla — resmî doküman, RFC, sağlayıcı kılavuzu)
2. **Biz ne yapıyoruz ve neden?** (somut kısıt: ücretsiz katman sınırı, gerçek
   sağlayıcının olmaması, kapsam dışılık)
3. **Gerçeğine ne zaman ve nasıl geçilir?** (roadmap adımı veya teknik borç no)

Kısıt gerçekse sapma meşrudur. ⛔ **Meşru olmayan tek şey, sapmayı yazmamaktır** —
yazılmayan sapma, sonraki okuyucuya "burada doğru olan buymuş" diye görünür.

⚠️ **"Portföy projesi" bir sapma gerekçesi DEĞİLDİR.** Portföyün değeri tam da
gerçeğine benzemesindedir. Sahte olması gereken tek şey **veridir** (sahte kimlik
servisi, sahte ödeme, uydurma isimler); **mühendislik sahte olmaz.**

### Ölçütü tersinden oku

Bir kararı savunurken şu cümlelerden birini kuruyorsan dur ve yeniden düşün:

- "Nasıl olsa gerçek kullanıcı yok" → yarın var. Kod kalır
- "Bu sadece bir demo" → demo olduğu için değil, **doğru olduğu için** yapılır
- "Şimdilik böyle kalsın" → o hâlde teknik borç numarası nerede?
- "Zaten depo herkese açık" → açık kaynak olmak, saldırı yüzeyini genişletmek
  için gerekçe değildir. İkisi ayrı sorulardır

## Kapsam kontrolü
İstenmeyen iyileştirme yapma. "Bu arada şunu da düzelttim" yasak —
gördüğün sorunu **bildir**, ayrı iş olarak planla.

## Öğretme yükümlülüğü
Kullanıcı bu projeyle öğreniyor. Her adımdan sonra kod göstermeden,
Türkçe, en fazla 5 madde: ne yaptın, neden böyle yaptın, alternatifi neydi.
