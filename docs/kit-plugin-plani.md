# `proje-kiti` plugin'i — onaylanmış plan

> Bu dosya **benim-belediyem'in ürün işi değil.** Bu depoda duruyor çünkü
> plugin'in içeriği (`CLAUDE.md` + `docs/standards/`) buradan çıkıyor.
> İş bitince plugin kendi deposuna taşınır ve bu dosya orada yaşamaya devam eder.

**Durum:** onaylandı, **henüz başlanmadı**
**Karar tarihi:** 2026-08-01

---

## Amaç

Barış yeni bir projeye başlarken elle dosya kopyalamasın. Tek komut yazsın,
ajan sorularını sorsun ve proje **canlıda çalışır** halde kurulsun. Kurulum
bilgisi tek yerde toplansın ve her makineden indirilebilsin.

## Onaylanmış kararlar

| Konu | Karar |
|---|---|
| **Marketplace adı** | `bariskose-skills` |
| **Plugin adı** | `proje-kiti` |
| **Komutlar** | `/yeni-proje` ve `/kit-senkron` |
| **GitHub deposu** | `github.com/bariskose9/bariskose-skills` — **public** |
| **Kit dili** | **Türkçe** (kod, commit, değişken adları İngilizce kalır) |
| **Kapsam** | Canlıya çıkana kadar: dokümanlar → iskelet → GitHub → hosting + DB → CI → çalışan `/api/health` |
| **Stack** | Varsayılan benim-belediyem'inki; kullanıcı farklı söylerse (başka sunucu, başka veritabanı) ona göre kurulur |
| **Mobil** | `docs/standards/17-mobile.md` **şimdi yazılır**; mobil uygulama roadmap'in son adımı olarak kalır |

**Mobil kararının gerekçesi** (tekrar tartışılmasın): mobil uygulamayı sona
bırakmak doğru, ama *"mobil olacak mı"* kararı **baştan** verilmeli çünkü API'yi
etkiliyor. Somut örnek: ADR-005 oturum kararına "mobil için kısa ömürlü jeton +
yenilenebilir jeton" satırı, mobilin geleceği bilindiği için eklendi. Bilinmeseydi
kimlik doğrulama mobil geldiğinde baştan yazılacaktı.

## Doğrulanmış teknik gerçekler — yeniden araştırma

Bunlar bu makinede `--help` çıktılarından ve kurulu marketplace'lerden **fiilen
doğrulandı**, tahmin değil:

- **Marketplace = özel bir platform değil, belirli düzende bir GitHub deposu.**
  Anthropic'e başvuru, onay veya ücret yok
- Gerekli yapı (`addy-agent-skills` deposundan birebir görüldü):
  - `.claude-plugin/marketplace.json` — marketplace manifesti, içindeki plugin'leri listeler
  - `plugin.json` — plugin manifesti (`name`, `version`, `description`)
  - `skills/<isim>/SKILL.md` — `name` ve `description` alanlı frontmatter ile
- Çalışan CLI komutları:
  - `claude plugin marketplace add <owner>/<repo>`
  - `claude plugin install <plugin>@<marketplace>` (`--scope user|project|local`, varsayılan `user`)
  - `claude plugin list` — kurulu olanları listeler (**eksik kontrolü buradan yapılır**)
  - `claude plugin update <plugin>` — *"restart required to apply"*
  - `claude plugin marketplace update [name]`
  - `claude plugin validate <path>` — manifest doğrular, **kurmadan önce çalıştır**
  - `claude plugin tag [path]` — `{name}--v{version}` git etiketi üretir, sürüm yayınlarken
- **Güncelleme çekmeli, itmeli değil.** Depoya push edince kullananlara
  kendiliğinden inmez; onlar `marketplace update` + `plugin update` + yeniden
  başlatma yapar. Bu bilinçli olarak iyi: başkasının işi ortasında altı kaymaz
- **Kurulum anında hiçbir kod çalışmaz.** Plugin kurulunca talimat çalıştıran bir
  kanca yok. Bu yüzden bağımlılık kurulumu `/yeni-proje`'nin **ilk adımı** olmak
  zorunda, plugin kurulumunun yan etkisi olamaz
- **Emin olunmayan tek nokta:** yeni kurulan bir plugin aynı oturumda mı görünür
  yoksa yeniden başlatma mı gerekir. `plugin update` için "restart required"
  yazıyor; kurulum için **kurarken fiilen denenecek** ve sonuç buraya yazılacak

## Depo yapısı

```
bariskose9/bariskose-skills
├── .claude-plugin/marketplace.json
├── plugin.json
├── README.md                        ← kurulum anlatımı (Türkçe)
└── skills/
    ├── yeni-proje/
    │   ├── SKILL.md
    │   └── dosyalar/                ← kitin kendisi
    │       ├── CLAUDE.md
    │       ├── REPO-YAPISI.md
    │       └── docs/standards/**    ← 00–17 + sablonlar/
    └── kit-senkron/
        └── SKILL.md
```

## `/yeni-proje` — adım adım ne yapar

1. **Bağımlılık kontrolü.** `claude plugin list` ile bakar. Eksikse
   `agent-skills@addy-agent-skills` ve `chrome-devtools-mcp@chrome-devtools-plugins`
   kurulumunu **önce sorar, sonra kurar**. Zaten kurulu olana **dokunmaz**
   (kullanıcının makinesinde kurulu olabilir; sormadan kurmak CLAUDE.md'deki
   "istemediğim kütüphaneyi ekleme" kuralının ihlali olurdu)
2. **Proje tipi:** web / mobil (Expo) / ikisi. Cevap stack'i ve roadmap'i değiştirir
3. **Stack:** varsayılan bizimki; kullanıcı farklı söylerse `00-stack.md` ona göre
   yazılır — sürüm sütunu **fiilen kurulanla** eşitlenir, tahmini sürüm yazılmaz
4. **Kit dosyalarını yazar:** `CLAUDE.md` (§0 doldurulur), `docs/standards/**`,
   `REPO-YAPISI.md`
5. **PRD:** analiz dokümanını ister, eksikleri `interview-me` ile **tek tek** sorar.
   "Açık sorular" boşalmadan kod yazılmaz
6. **`roadmap.md`, `ADR-001`, `altyapi-durumu.md`** oluşturulur;
   `sonraki-adim-prompt.md` *"henüz doldurulmadı — ilk adım bitince yazılacak"*
   notuyla açılır
7. **İskelet:** framework kurulur, `git init`, ilk commit
8. **Dış dünya:** GitHub deposu açılır, hosting + veritabanı bağlanır, CI kurulur.
   Hesap gerektiren adımlarda kullanıcıya **ne yapacağı adım adım söylenir** ve
   beklenir. Yapılan her şey anında `altyapi-durumu.md`'ye yazılır
9. **Biter:** canlı adres + çalışan `/api/health` + duman testi
10. **Son kontrol:** hangi şablon boş kaldı, hangi soru cevapsız — eksik varsa sorar

**Sınır — kullanıcıya açıkça söylenir:** buradan sonra özellikler otomatik
yazılmaz. Roadmap adım adım ilerler, her adımda plan sunulur ve onay beklenir
(CLAUDE.md §3 kapıları). Vaat "tek promptla uygulama" değil, **"tek promptla
doğru kurulmuş proje ve net yol haritası"**.

## `/kit-senkron` — ne işe yarar

Bir projede öğrenilen ders o projenin `docs/standards/` klasöründe kalır; kitteki
kopya eski kalır ve **bir sonraki proje o dersi almadan başlar.**

Gerçek örnek: E2E testlerinde her koşuya rastgele IP verilmesi gerektiği bu
projede öğrenildi ve `06-testing.md`'ye yazıldı — kitte yok.

`/kit-senkron` çalışınca: içinde bulunulan projenin `docs/standards/` klasörünü
kittekiyle karşılaştırır, farkları **Türkçe** listeler, *"hangileri kalıcı kural
olsun?"* diye sorar, seçilenleri kit deposuna yazar ve push eder. Ters yön de
çalışır: kitte iyileşme varsa projeye getirir.

## Bitirme koşulu — kanıt olmadan "oldu" denmez

1. `claude plugin validate` ile manifestler doğrulanır
2. Depo push edilir
3. **Bu makinede fiilen kurulur:** `claude plugin marketplace add bariskose9/bariskose-skills`
   → `claude plugin install proje-kiti@bariskose-skills`
4. `/plugin` ekranında **Marketplaces**'te `bariskose-skills`, **Plugins**'te
   `proje-kiti@bariskose-skills` göründüğü doğrulanır
5. **Boş bir klasörde `/yeni-proje` çalıştırılıp** en az PRD adımına kadar
   gidildiği görülür
6. Yeniden başlatma gerekip gerekmediği bu dosyaya yazılır

## Sonra

Bu iş bittiğinde bu dosya `bariskose-skills` deposuna taşınır ve buradan silinir —
benim-belediyem'in ürün dokümantasyonu değil.
