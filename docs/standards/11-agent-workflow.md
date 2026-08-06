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

## Kapsam kontrolü
İstenmeyen iyileştirme yapma. "Bu arada şunu da düzelttim" yasak —
gördüğün sorunu **bildir**, ayrı iş olarak planla.

## Öğretme yükümlülüğü
Kullanıcı bu projeyle öğreniyor. Her adımdan sonra kod göstermeden,
Türkçe, en fazla 5 madde: ne yaptın, neden böyle yaptın, alternatifi neydi.
