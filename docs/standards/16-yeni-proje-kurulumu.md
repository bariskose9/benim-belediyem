# 16 — Yeni Proje Kurulumu

> Bu dosya **her projede aynıdır**. Yeni bir projeye başlarken izlenecek tek liste.

## Amaç

Yeni bir projede iskeleti kurmak **kullanıcının işi olmamalı**. Kullanıcı yalnızca
şunları verir:

1. **Analiz dokümanı** (ne yapılacak)
2. **Stack** (varsayılandan farklıysa)

Gerisini ajan bu listeye bakarak kurar.

## Neyi kopyalayacaksın — tek tablo

| Ne | Nereye | Nasıl |
|---|---|---|
| `CLAUDE.md` | repo kökü | **Olduğu gibi kopyala**, sonra yalnızca §0 "Proje Değişkenleri" bloğunu doldur |
| `docs/standards/**` (00–17) | `docs/standards/` | **Olduğu gibi kopyala, İÇİNİ DEĞİŞTİRME.** Stack farklıysa yalnızca `00-stack.md` tablosu güncellenir |
| `docs/standards/sablonlar/**` | `docs/project/` | Kopyala ve **içini doldur** — her şablonun başında ne yazılacağı anlatılıyor |
| `REPO-YAPISI.md` | repo kökü | Kopyala, projeye özel klasör adlarını değiştir |

**Kural:** `docs/standards/` **asla projeye göre değişmez.** Bir kural projeye
özel hale geliyorsa o kural yanlış yazılmıştır — düzelt, dallandırma.

### `sablonlar/` içinde ne var

Klasörün kendi indeksi: `docs/standards/sablonlar/OKUBENI.md`.

| Şablon | Hedef | Zorunlu mu |
|---|---|:---:|
| `PRD.md` | `docs/project/PRD.md` | **Evet** |
| `roadmap.md` | `docs/project/roadmap.md` | **Evet** |
| `altyapi-durumu.md` | `docs/project/altyapi-durumu.md` | **Evet** |
| `CHANGELOG.md` | `docs/project/CHANGELOG.md` | **Evet** |
| `sonraki-adim-prompt.md` | `docs/project/sonraki-adim-prompt.md` | **Evet** |
| `decisions/ADR-000-sablon.md` | `docs/project/decisions/` | **Evet** (doldurulmaz, çoğaltılır) |
| `data-model.md` | `docs/project/data-model.md` | Veritabanı varsa |
| `integrations.md` | `docs/project/integrations.md` | Dış servis varsa |
| `fake-data-guide.md` | `docs/project/fake-data-guide.md` | Sahte veri gerekiyorsa |

Şablonlar **kaynak projeden silinmez** — bir sonraki projeye yine lazım.

## Kurulum sırası

### 1. Dosyaları yerleştir
Yukarıdaki tabloyu uygula. `docs/standards/sablonlar/` klasörü kopyalandıktan
sonra **kaynak projeden silinmez**, hedef projede `docs/project/` altına açılır.

### 2. `CLAUDE.md` §0'ı doldur
Proje adı, stack, deploy hedefi, ana dal, arayüz dili, kod dili.

### 3. PRD'yi çıkar — `interview-me` ile
Kullanıcının analiz dokümanı **her zaman eksiktir**. CLAUDE.md §3 kapı 1:
**tek tek soru sor, varsayım yapma.** Cevaplar `docs/project/PRD.md`'ye yazılır,
"Açık sorular" bölümü boşalana kadar kodlama başlamaz.

### 4. Roadmap'i yaz
Adımlar **bağımlılık sırasına** göre: her adım bir öncekinin üzerine kurulur.
İlk üç adım neredeyse her projede aynıdır:

1. Repo + framework + lint/format + `docs/`
2. Hosting + veritabanı bağlantısı + `/api/health` + CI
3. Veri modeli + migration + tohumlama

### 5. `altyapi-durumu.md`'yi ilk günden aç
Boş bile olsa oluştur. **İlk hesap açıldığı anda yazılmaya başlar.**
Sonradan hatırlamaya çalışmak işe yaramaz — bu dosya tam olarak bu yüzden var
(`15-oturum-devri.md`).

### 6. İlk ADR'yi yaz
Genellikle "neden bu stack / neden tek repo". `ADR-000-sablon.md` biçimi kullanılır.

## Neyin projeye göre DEĞİŞTİĞİ

| Dosya | Değişir mi | Ne değişir |
|---|---|---|
| `docs/standards/00-stack.md` | **Bazen** | Yalnızca sürüm tablosu, o da fiilen kurulanla eşitlenerek |
| `docs/standards/01–17` | **Hayır** | Mühendislik kuralları projeden bağımsızdır |
| `CLAUDE.md` | **Sadece §0** | Geri kalanı çalışma protokolü, sabit |
| `docs/project/PRD.md` | **Tamamen** | Her projenin işi başkadır |
| `docs/project/roadmap.md` | **Tamamen** | Adımlar işe göre |
| `docs/project/data-model.md` | **Tamamen** | — |
| `docs/project/altyapi-durumu.md` | **Yapı sabit, içerik projeye özel** | Hesaplar ve değişken matrisi |
| `docs/project/integrations.md` | **Çoğunlukla** | Dış servisler değişir |
| `docs/project/fake-data-guide.md` | **Tamamen** | Sahte veri gerekiyorsa |

## Proje hafızası — dört dosya, dört ayrı soru

Yapay zekâ oturumu hafızasızdır: sohbet kapanınca **hiçbir şey** hatırlamaz,
yalnızca depodaki dosyaları okuyabilir. "Geçmişte ne yaptık" bilgisi bu dört
dosyada yaşar. Biri boş kalırsa o soru bir daha cevaplanamaz.

| Soru | Dosya | Örnek |
|---|---|---|
| **Hangi teknolojiyi kullanıyoruz, hangi sürümü, neyi kullanMIyoruz** | `docs/standards/00-stack.md` | "Prisma 7 · TypeScript 6 (7 değil, çünkü…) · Redux kullanılmaz" |
| **Hangi hesap açık, panelde ne yapılandırılmış, hangi anahtar nerede** | `docs/project/altyapi-durumu.md` | "Cloudflare hesabı açık, widget Managed modda, 2 hostname tanımlı" |
| **Bir şeyi NEDEN böyle yaptık** | `docs/project/decisions/ADR-*.md` | "Oturum JWT değil veritabanında, çünkü çıkış gerçekten çalışsın" |
| **Nerede kaldık, sırada ne var, hangi eksiği kabul ettik** | `docs/project/roadmap.md` | Adım tablosu + teknik borç listesi |

Üç pratik kural:

1. **`00-stack.md`'deki sürüm sütunu `package.json` ile birebir aynı olur.**
   Tahmini sürüm yazmak, yazmamaktan kötüdür. En yenisi kullanılmıyorsa
   **neden kullanılamadığı** yazılır — yoksa sonraki oturum "unutulmuş" sanıp
   yükseltmeye çalışır ve aynı duvara toslar.
2. **`altyapi-durumu.md` ilk gün açılır**, ilk hesapla dolmaya başlar.
   Sonradan hatırlamaya çalışmak işe yaramaz. ⛔ Anahtar **değeri** yazılmaz —
   yalnızca adı, yeri, ne işe yaradığı.
3. **Geri dönmesi pahalı her karar ADR olur.** Ölçüt: "altı ay sonra biri
   'bu neden böyle' diye sorarsa cevabı nerede?" Cevap sohbet geçmişiyse,
   o cevap **yok** demektir.

## Kullanıcıya sormadan ÖNCE

Yeni projede de eski projede de aynı hata yapılabilir: kullanıcıya zaten
yapılmış bir işi tekrar yaptırmak. Bunun tek panzehiri **önce
`docs/project/altyapi-durumu.md`'yi okumaktır** (CLAUDE.md §1, madde 5).

## İlk oturumun sonunda

`15-oturum-devri.md` protokolünü uygula: `altyapi-durumu.md`, `roadmap.md`,
`CHANGELOG.md` güncellensin ve `sonraki-adim-prompt.md` yazılsın. **İlk oturum
bile devredilebilir olmalı.**
