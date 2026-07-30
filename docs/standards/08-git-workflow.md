# 08 — Git İş Akışı

## Dallar
- `main` her zaman çalışır ve deploy edilebilir. Doğrudan commit **yok**.
- Dal adı: `feature/<kisa-ad>` · `fix/<kisa-ad>` · `chore/<kisa-ad>` · `docs/<kisa-ad>`
- Bir dal = bir iş. Dal ömrü en fazla birkaç gün.

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
