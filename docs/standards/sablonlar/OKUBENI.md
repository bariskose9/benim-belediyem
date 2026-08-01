# Şablonlar — ne, nereye

> Bu klasör **her projede aynıdır** ve `docs/standards/` ile birlikte kopyalanır.
> İçindeki dosyalar hedef projede `docs/project/` altına açılır ve **doldurulur**.
> Kaynak projeden **silinmez** — bir sonraki projeye yine lazım olacak.

Adım adım kurulum: `docs/standards/16-yeni-proje-kurulumu.md`.

## Dosya listesi

| Şablon | Hedef | Zorunlu mu | Ne zaman doldurulur |
|---|---|:---:|---|
| `PRD.md` | `docs/project/PRD.md` | **Evet** | İlk oturumda, `interview-me` ile |
| `roadmap.md` | `docs/project/roadmap.md` | **Evet** | PRD bitince |
| `altyapi-durumu.md` | `docs/project/altyapi-durumu.md` | **Evet** | İlk gün boş açılır, ilk hesapla dolmaya başlar |
| `CHANGELOG.md` | `docs/project/CHANGELOG.md` | **Evet** | İlk adım bitince |
| `sonraki-adim-prompt.md` | `docs/project/sonraki-adim-prompt.md` | **Evet** | Her oturum sonunda **yeniden yazılır** |
| `data-model.md` | `docs/project/data-model.md` | Veritabanı varsa | Veri modeli adımında |
| `integrations.md` | `docs/project/integrations.md` | Dış servis varsa | İlk dış servisten önce |
| `fake-data-guide.md` | `docs/project/fake-data-guide.md` | Sahte veri gerekiyorsa | Tohumlama adımından önce |
| `decisions/ADR-000-sablon.md` | `docs/project/decisions/ADR-000-sablon.md` | **Evet** | Kopyalanır, **doldurulmaz** — her yeni karar bunu çoğaltır |

## Kopyalanmayacaklar

`docs/standards/00–16` projeye göre **değişmez**. Bir kural projeye özel hale
geliyorsa o kural yanlış yazılmıştır — kuralı düzelt, dallandırma.
Tek istisna: `00-stack.md` sürüm tablosu, **fiilen kurulan** sürümlerle eşitlenir.

## Doldururken

- Her şablonun başında `<!-- ... -->` içinde **neden var olduğu** ve **ne zaman
  güncellendiği** yazıyor. Doldurduktan sonra o blok **silinir**.
- `<köşeli>` yer tutucular ve boş tablo satırları doldurulur ya da satır silinir.
  Boş şablon bırakmak, dosyayı hiç açmamaktan daha kötüdür — sonraki oturum
  "burada bilgi var" sanır.
