# 08 — Git İş Akışı

## Dallar
- `main` her zaman çalışır ve deploy edilebilir. Doğrudan commit **yok**.
- Dal adı: `feature/<kisa-ad>` · `fix/<kisa-ad>` · `chore/<kisa-ad>` · `docs/<kisa-ad>`
- Bir dal = bir iş. Dal ömrü en fazla birkaç gün.
- ⛔ **AÇIK BİR PR VARKEN YENİ DAL AÇMA — önce onu merge et.**
  Yeni dal her zaman **güncel** `main`'den açılır:
  `git checkout main && git pull && git checkout -b <yeni-dal>`
  Gerekçe aşağıdaki "Çakışan PR" bölümünde; bu bir üslup tercihi değil,
  CI'ı sessizce durduran gerçek bir arıza sebebi.

## ⛔ ÇAKIŞAN PR CI'I SESSİZCE DURDURUR — teşhisi bilinmezse saatler yer

**Belirti:** PR açıldı ama GitHub Actions **hiç** tetiklenmiyor. Ekranda
kırmızı bir kontrol YOK (kontrol hiç oluşmuyor), Actions sayfasında uyarı YOK,
`gh run list` boş dönüyor. İlk akla gelen yanlış teşhisler: "Actions bozulmuş",
"faturalandırma limiti doldu", "workflow dosyası hatalı".

**Gerçek sebep:** `pull_request` ile tetiklenen iş akışları
`refs/pull/<N>/merge` referansı üzerinde koşar. PR **çakışmalıysa** GitHub bu
referansı üretemez ve **hiçbir koşu başlatmaz.**

**Teşhis tek komut:**
```
gh pr view <N> --json mergeable,mergeStateStatus
```
`CONFLICTING` / `DIRTY` görüyorsan sebep budur. CI'ı, faturalandırmayı ve
workflow dosyasını kurcalama.

**Çözüm — force-push YOK:**
```
git merge origin/main   # çakışmayı çöz
git commit && git push
```
PR anında `MERGEABLE` olur ve iş akışları saniyeler içinde başlar.

**Neden düzenli olarak başımıza gelir:** her adım sonunda bir devir/belge PR'ı
açılıyor (`15-oturum-devri-kurallari.md`) ve sonraki adım o PR merge edilmeden `main`'den
dallanıyor. İki adım da aynı devir belgelerine dokunduğu için çakışma
kaçınılmaz. **Kural bu yüzden "açık PR varken dal açma".**

## Commit
- Format: Conventional Commits — `<tip>(<kapsam>): <özet>`
- Tipler: `feat` `fix` `refactor` `test` `docs` `chore` `perf` `style` `ci`
- Özet İngilizce, emir kipi, <= 72 karakter, sonunda nokta yok.
- Gövdede madde madde "ne değişti" ve gerekiyorsa "neden".
- Bir commit tek bir mantıksal değişiklik içerir. Formatlama ile davranış değişikliği aynı commit'te olmaz.
- **Onaysız commit/push/merge yok** (bkz. `00-cekirdek.md` → *"Git ve commit"*).

## ⛔ GIT KİMLİĞİ — bir kez sorulur, sonra sorulmaz

Commit'lerin üstünde bir **ad ve e-posta** durur. Bu bilgi `git config`'den
gelir ve **makinede kalıcıdır.**

### Ajan ne yapar — önce BAKAR, sonra sorar

```
git config user.email  →  DOLU mu?
   │
   ├─ DOLU  → ⛔ SORMA. Zaten ayarlı, geç.
   │          (Yalnızca proje tipiyle uyuşmuyorsa uyar — aşağıda)
   │
   └─ BOŞ   → SOR:  "Commit'lerde hangi ad ve e-posta görünsün?"
              → ayarla → ⛔ bir daha sorma
```

⛔ **Her oturumda sorulmaz.** `git config` bir kez yazıldığında makinede kalır;
tekrar sormak kullanıcıya zaten cevapladığı bir soruyu yöneltmektir.

### ⭐ AYNI MAKİNEDE İKİ KİMLİK — `--local` şart

Kullanıcı aynı bilgisayarda hem **kişisel** hem **kurum** projesi yapıyorsa,
tek bir global ayar ikisine birden **yanlış** olur.

| Ayar | Kapsamı | Ne zaman |
|---|---|---|
| `git config --global` | ⚠️ **Makinedeki tüm depolar** | Yalnızca tek kimlik varsa |
| ⭐ `git config --local` | **Sadece bu depo** | ⛔ Kurum projesinde **zorunlu** |

```bash
# Kurum projesinde — YALNIZCA bu depo için
git config --local user.name  "Ad Soyad"
git config --local user.email "ad.soyad@kurum.gov.tr"
```

⛔ **İşyeri projesinde `--global` kullanılmaz.** Kullanıldığında kişisel
projelerin commit'leri de kurum e-postasıyla imzalanır — geri alınması
commit geçmişini yeniden yazmayı gerektirir.

### Uyuşmazlık kontrolü — sessizce geçilmez

Ajan kurulumda **proje tipini biliyor** (`CLAUDE.md` §0). Mevcut git kimliği
ona uymuyorsa **söyler**:

> *"Bu bir işyeri projesi ama git kimliği kişisel görünüyor
> (`ornek@gmail.com`). Commit'ler bu adresle imzalanacak. Kurumun
> verdiği adresi bu depoya özel ayarlayayım mı?"*

⚠️ **Sorup geçmez, ayarlar.** Kullanıcı *"evet"* derse `--local` ile yazar ve
`altyapi-durumu.md`'ye not düşer.

⛔ **İşyeri projesinde kişisel adres taşınmaz — SORULUR.** Makinede kayıtlı
kişisel adresi işyeri deposuna kopyalamak bir kolaylık gibi görünür; değildir.
Kurum projesinde geçerli adres **kurumun verdiği adrestir** ve onu yalnızca
kullanıcı bilir. Ajan kişisel adresi varsayılan olarak kullanmaz, kurumsal
adresi ister.

| Proje tipi | Adres nereden gelir |
|---|---|
| **Kendi projem** | Makinedeki mevcut `git config` — zaten doğrudur, sorulmaz |
| **İşyeri projesi** | ⛔ Kurumun verdiği adres — **sorulur**, `--local` ile yazılır |

⛔ **İlk commit'ten önce yapılır.** Sonra fark edilirse geçmişteki commit'ler
yanlış kimlikle kalır.

## Pull Request
- Başlık = commit özeti. Açıklamada: ne, neden, nasıl test edildi, ekran görüntüsü.
- PR küçük tutulur (tercihen < 400 satır değişiklik).
- CI yeşil olmadan merge edilmez.
- Merge stratejisi: **squash merge** (geçmiş temiz kalır).
- Merge sonrası dal silinir.

## İki makine, bir dal — merge mi, rebase mi

Aynı depoda iki bilgisayardan çalışıyorsun: evde bir commit attın, işte bir
commit attın, ikisi de `main`'e. GitHub ikinciyi **reddeder** — "önce
birleştir" der; bu hata değil, git'in "iki tarih var, tek tarih yap" demesi.
İki yol var:

| | **merge** | **rebase** |
|---|---|---|
| *Gerçek hayat* | İki defter tutuldu; üçüncü bir sayfaya "şu tarihte ikisini birleştirdim" yazılır | Senin sayfaların, karşı tarafın sayfalarının **arkasına yeniden yazılır** — tek defter, düz sıra |
| Ne yapar | İki dalı bir "birleştirme commit'i" ile bağlar; geçmişte çatal görünür | Senin commit'lerini karşı tarafın son commit'inin **üstüne** yeniden dizer; geçmiş düz kalır |
| Komut | `git pull` (varsayılan) | `git pull --rebase origin main` |
| Ne zaman | PR birleştirirken (GitHub bunu zaten squash ile yapar) | ⭐ **Kendi commit'lerini** henüz kimseyle paylaşmadan güncel dalın üstüne almak — iki makine senaryosu tam bu |

**Kural:** kendi makineleri arasında `git pull --rebase`; çakışma çıkarsa git
dosyayı `<<<<<<<` / `>>>>>>>` işaretleriyle gösterir, sen doğru olanı bırakıp
`git add` + `git rebase --continue` dersin. ⛔ **Push edilmiş ve başkasının
çektiği commit'ler rebase edilmez** — onların defteri de değişmek zorunda
kalır (yukarıdaki *"Asla"*: paylaşılan dala `--force` yok). Tek kişilik iki
makine "başkası" sayılmaz; ikisi de sensin.

⭐ İki makinede aynı dosyaya dokunulduysa satır çakışması çıkar; **anlam
çakışması** (iki yerde aynı kuralı yazmak) git'e görünmez — birleştirdikten
sonra ajana "aynı konuyu iki kez yazmış mıyız" diye baktırılır.

## Asla
`git push --force` (paylaşılan dala) · `git reset --hard` (onaysız) ·
`.env` veya anahtar commit'i · `node_modules`/build çıktısı commit'i ·
başkasının dalına zorla yazma

## Sürümleme
Semantic versioning: `MAJOR.MINOR.PATCH`.
Her sürümde `docs/project/CHANGELOG.md` güncellenir ve git tag atılır (`v1.2.0`).
