# 10 — Definition of Done

Bir iş, aşağıdaki maddelerin **tamamı** işaretlenmeden "bitti" sayılmaz.
"Sonra yaparız", "küçük değişiklik", "zaten çalışıyor" geçerli mazeret değildir.

## İşlevsellik
- [ ] PRD'deki kabul kriterlerinin hepsi karşılandı
- [ ] Mutlu yol baştan sona çalışıyor
- [ ] Hata yolları çalışıyor (geçersiz girdi, yetkisiz erişim, boş sonuç)
- [ ] Login olmadan erişimde beklenen davranış doğru (salt okuma / yönlendirme)

## Kod
- [ ] `lint` temiz, `typecheck` temiz, `build` başarılı
- [ ] `any` yok, ölü kod yok, konsol çıktısı bırakılmadı
- [ ] ⛔ **Kalite çıtası düşürülmedi** (`11-agent-workflow.md`): yeni susturma
      yorumu (`@ts-ignore`, `eslint-disable`) yok · atlanan/silinen test yok ·
      zayıflatılmış iddia yok · aşağı çekilmiş eşik yok · boş `catch` yok
- [ ] Zorunlu bir susturma varsa **gerekçesi yazıldı ve commit raporunda
      bildirildi** — sessizce bırakılmadı
- [ ] Katman ihlali yok (bileşen içinden DB çağrısı yok)
- [ ] ⛔ **İlgili yorumlar güncellendi** (`02-coding-standards.md`): değişen
      kodun `NEREDEN` / `NE` / `NEREYE` / `SONUÇ` başlık bloğu ve satır içi
      gerekçeleri hâlâ doğru mu. *Bayat bir yorum, yorumsuz bırakmaktan kötüdür* —
      okuyan yanlış bilgilenir ve etki taraması onu yanlış dosyaya götürür

## Test
- [ ] Yeni davranış için test yazıldı ve geçiyor
- [ ] Hata düzeltmesiyse önce başarısız test yazıldı
- [ ] Tüm test paketi yeşil

## Güvenlik
- [ ] Girdi doğrulama var (Zod)
- [ ] Yetki + sahiplik kontrolü var
- [ ] Hata mesajı iç detay sızdırmıyor
- [ ] Yeni secret varsa `.env.example` güncellendi, `.env` commit edilmedi
- [ ] `pnpm audit` yeni kritik uyarı üretmiyor

## Arayüz
- [ ] Tarayıcıda 375px ve masaüstünde düzgün
- [ ] **Preview URL gerçek telefondan açılıp denendi** (dokunma, klavye, kaydırma)
      — *bunu ajan işaretleyemez.* Ajan, commit raporunun "telefon testi" satırında
      hangi adımların denenmesi gerektiğini yazar; kutuyu **kullanıcı** işaretler
- [ ] Dark mode ve light mode ikisinde de okunabilir
- [ ] Yükleniyor / boş / hata durumları var
- [ ] Klavye ile gezilebiliyor, kontrast yeterli
- [ ] Kullanıcıya görünen tüm metinler Türkçe ve anlaşılır
- [ ] Tasarım yönü ADR'sine uyuluyor; AI varsayılanlarına düşülmedi
      (`07-ui-design-system.md` → *AI varsayılanı*)
- [ ] Animasyon varsa `prefers-reduced-motion` destekleniyor, yalnızca
      `transform`/`opacity` animasyonlanıyor

## SEO — yalnızca indekslenecek sayfalarda (`18-seo.md`)
- [ ] JavaScript'siz gelen HTML'de ana içerik var (`curl` ile bakıldı)
- [ ] Sayfanın kendine özgü `title` + `description`'ı ve canonical adresi var
- [ ] Tek `h1`, başlık seviyesi atlanmıyor
- [ ] `sitemap.xml` bu sayfayı içeriyor (ya da bilerek dışarıda)
- [ ] Yapılandırılmış veri varsa sayfada görünenle **aynı**

## Tarayıcı doğrulaması
- [ ] Akış gerçekten tıklanarak denendi (kod okuyup varsaymak yeterli değil)
- [ ] Konsolda hata yok, network'te başarısız istek yok

## Beş gözle doğrulama (`06-testing.md`)
- [ ] Backend · Veri · Frontend · Tasarım/UX · Güvenlik gözlerinin **beşi de** geçildi
- [ ] **Etki alanı** yazıldı: hangi ekranlar, hangi API uçları, hangi eski kayıtlar
- [ ] Etkilenen yerlerin **hepsi fiilen açılıp** kontrol edildi (ekran, uç, test); 5+ yer varsa risk olarak bildirildi
- [ ] Kullanıcıya *ne kontrol edildi ve neden* anlatıldı; yeni terimler
      `calisilacak-konular.md`'ye eklendi


## Commit önerisi raporu — onaydan önce sunulan biçim

Üç doğrulama (lint/typecheck/test/build · güvenlik · tarayıcı) geçtikten sonra
commit **önerilir**, atılmaz. Rapor Türkçe, kod göstermeden, şu biçimde:

```
━━━ COMMIT ÖNERİSİ ━━━

📌 NE YAPILDI (Türkçe özet)
   • <eklenen özellik 1>
   • <değiştirilen davranış>
   • <düzeltilen hata>

📁 DEĞİŞEN DOSYALAR (N dosya, +X / -Y satır)
   yeni       : <dosya> — <ne işe yarıyor>
   güncellendi: <dosya> — <ne değişti>
   silindi    : <dosya> — <neden>

🗄️ VERİTABANI
   <migration var mı? tablo/kolon değişti mi? yoksa "değişiklik yok">

🔐 GÜVENLİK
   <yeni girdi noktası / yetki kontrolü / secret var mı? yoksa "yeni risk yok">

✅ DOĞRULAMA
   lint/typecheck : <sonuç>
   testler        : <X geçti, Y başarısız>
   build          : <sonuç>
   güvenlik       : <denetim sonucu — bulgu varsa listele, yoksa "temiz">
   tarayıcı testi : <tıklayarak denediğim akışlar ve sonuçları>
   konsol/network : <hata var mı>
   mobil (375px)  : <sonuç>
   telefon testi  : <senin telefondan denemen gereken adımlar>
   dark mode      : <sonuç>

👀 SENİN KONTROL ETMEN GEREKENLER
   <preview URL + 3-5 maddelik tıklama adımı>

⚠️ DİKKAT
   <bilinen eksik, teknik borç, sonraya bırakılan iş — yoksa "yok">

📝 ÖNERİLEN COMMIT MESAJI
   <tip>(<kapsam>): <özet>

   - <detay>
   - <detay>

━━━━━━━━━━━━━━━━━━━━━━━
Onaylıyor musun? (evet / düzelt: ... / hayır)
```

*"evet"* → commit + push + PR/MR açılır, link verilir. *"düzelt"* → düzeltilir,
rapor yeniden sunulur. Onaysız `git commit` / `push` / `merge` çalıştırılmaz
(`.claude/rules/00-cekirdek.md` → *"Git ve commit"*).

## Teslim
- [ ] Commit raporu sunuldu ve onaylandı
- [ ] PR açıldı, CI yeşil, preview URL doğrulandı
- [ ] Mimari karar alındıysa ADR yazıldı
- [ ] Bilinen eksikler açıkça bildirildi (sessizce bırakılmadı)

### ⭐ Dört dış kanıt — kit hazırlar, sonucu dışarıdan bekler

Bu dördünün **nasıl** yapılacağı bilinir ve hazırlığı ajanındır; ama sonucu
ajan üretemez, çünkü kanıt gerçek dünyadan gelir: **ölçüm · bağımsızlık ·
sorumluluk · gerçek insan.** "Canlıya hazır" bunlar gelmeden söylenmez;
gelmeyeceği biliniyorsa **risk olarak yazılır**, sessizce atlanmaz.

| Kanıt | Ajan ne hazırlar | Sonuç neden dışarıdan gelir |
|---|---|---|
| **Yük testi sayıları** | k6 senaryosu (eş zamanlı kullanıcı, %95 gecikme eşiği), CI'a bağlı | Sayı bir **ölçümdür**: kurumun sunucusunda, gerçek ağda, gerçek veri boyutuyla koşulunca çıkar; DevOps koşturur (`12-operations-and-scaling.md` → *"ANİ YÜK"*) |
| **Sızma testi (pentest)** | İç güvenlik incelemesi (`05-auth-security.md` OWASP listesi, `security-and-hardening`) | Pentest tanım gereği **bağımsızdır** — kodu yazan taraf kendi kodunu "test etti" diyemez; yazılı yetki ister; gerçek sistemde denenir |
| **KVKK metinlerinin hukuk onayı** | Aydınlatma metni, işleyici listesi, saklama politikası **taslağı** (`14-privacy-and-compliance.md`) | Mesele doğruluk değil **sorumluluk**: imza atan hukukçu cezai sorumluluğu taşır; devredilemez |
| **Gerçek kullanıcıyla erişilebilirlik** | axe CI'da, klavye ve ekran okuyucu akışı kurulu (`07-ui-design-system.md`) | Otomatik denetim WCAG sorunlarının kabaca **üçte birini** yakalar; "görme engelli vatandaş formu bitirebiliyor mu" ancak o insanın denemesiyle bilinir |

- [ ] Dördü için hazırlık teslim paketinde; sonuç geldiyse `altyapi-durumu.md`'de,
      gelmediyse `PRD.md` → *"Varsayımlar — doğrulanmayı bekleyen kararlar"*'da **açıkça** yazılı
