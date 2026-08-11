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
açılıyor (`15-oturum-devri.md`) ve sonraki adım o PR merge edilmeden `main`'den
dallanıyor. İki adım da aynı devir belgelerine dokunduğu için çakışma
kaçınılmaz. **Kural bu yüzden "açık PR varken dal açma".**

## Commit
- Format: Conventional Commits — `<tip>(<kapsam>): <özet>`
- Tipler: `feat` `fix` `refactor` `test` `docs` `chore` `perf` `style` `ci`
- Özet İngilizce, emir kipi, <= 72 karakter, sonunda nokta yok.
- Gövdede madde madde "ne değişti" ve gerekiyorsa "neden".
- Bir commit tek bir mantıksal değişiklik içerir. Formatlama ile davranış değişikliği aynı commit'te olmaz.
- **Onaysız commit/push/merge yok** (bkz. CLAUDE.md §6.3).

## Pull Request
- Başlık = commit özeti. Açıklamada: ne, neden, nasıl test edildi, ekran görüntüsü.
- PR küçük tutulur (tercihen < 400 satır değişiklik).
- CI yeşil olmadan merge edilmez.
- Merge stratejisi: **squash merge** (geçmiş temiz kalır).
- Merge sonrası dal silinir.

## Asla
`git push --force` (paylaşılan dala) · `git reset --hard` (onaysız) ·
`.env` veya anahtar commit'i · `node_modules`/build çıktısı commit'i ·
başkasının dalına zorla yazma

## Sürümleme
Semantic versioning: `MAJOR.MINOR.PATCH`.
Her sürümde `docs/project/CHANGELOG.md` güncellenir ve git tag atılır (`v1.2.0`).
