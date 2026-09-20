# Şablonlar — ne, nereye

> Bu klasör **her projede aynıdır** ve `docs/standards/` ile birlikte kopyalanır.
> İçindeki dosyalar hedef projede açılır ve **doldurulur**. ⛔ **Hepsi aynı yere
> gitmez:** çoğu `docs/project/` altına, ⭐ **iki defter `docs/kullanici/` altına**
> gider — aşağıdaki tablonun *Hedef* sütunu bunu satır satır yazar.
> Kaynak projeden **silinmez** — bir sonraki projeye yine lazım olacak.

Adım adım kurulum: `docs/standards/16-yeni-proje-kurulumu.md`.

## Dosya listesi

| Şablon | Hedef | Zorunlu mu | Ne zaman doldurulur |
|---|---|:---:|---|
| `PRD.md` | `docs/project/PRD.md` | **Evet** | İlk oturumda, `interview-me` ile |
| `roadmap.md` | `docs/project/roadmap.md` | **Evet** | PRD bitince |
| `altyapi-durumu.md` | `docs/project/altyapi-durumu.md` | **Evet** | İlk gün boş açılır, ilk hesapla dolmaya başlar |
| `CHANGELOG.md` | `docs/project/CHANGELOG.md` | **Evet** | İlk adım bitince |
| `yeni-oturuma-verilecek-sonraki-adim-promptu.md` | `docs/project/yeni-oturuma-verilecek-sonraki-adim-promptu.md` | **Evet** | Her oturum sonunda **yeniden yazılır** |
| `data-model.md` | `docs/project/data-model.md` | Veritabanı varsa | Veri modeli adımında |
| `integrations.md` | `docs/project/integrations.md` | Dış servis varsa | İlk dış servisten önce |
| `fake-data-guide.md` | `docs/project/fake-data-guide.md` | Sahte veri gerekiyorsa | Tohumlama adımından önce |
| `teknoloji-ve-plan.md` | `docs/project/teknoloji-ve-plan.md` | **Evet** | Adım 4'te açılır, her adımda büyür |
| `vscode-eklentileri.md` | `docs/project/vscode-eklentileri.md` | **Evet** | Kurulumda, hangi eklenti neden önerildi |
| `decisions/ADR-000-sablon.md` | `docs/project/decisions/ADR-000-sablon.md` | **Evet** | Kopyalanır, **doldurulmaz** — her yeni karar bunu çoğaltır |
| ⭐ `calisilacak-konular.md` | `docs/kullanici/calisilacak-konular.md` | **Evet** | Kitten **birleştirilerek** gelir, sıfırlanmaz |
| ⭐ `ogrendigim-konular.md` | `docs/kullanici/ogrendigim-konular.md` | **Evet** | Aynı — kapanmış konular buraya taşınır |
| `kurumdan-ogrenilecekler.md` | `docs/project/kurumdan-ogrenilecekler.md` | ⛔ Yalnızca **işyeri** projesinde | Kuruma sorulacaklar biriktikçe |

⛔ **Bu tablo klasörle birebir aynı olmalıdır** — **14 şablon** var. Sayıyı
ezberden yazma:

```bash
ls docs/standards/sablonlar/*.md | grep -v OKUBENI | wc -l   # 13
ls docs/standards/sablonlar/decisions/*.md | wc -l           # 1
```

⚠️ Tabloda olmayan bir şablon **hiç açılmaz** ve kimse fark etmez — denetim
betiği dosya sayısını ölçemez.

## Kopyalanmayacaklar

`docs/standards/00–18` (19 dosya) projeye göre **değişmez**. Bir kural projeye özel hale
geliyorsa o kural yanlış yazılmıştır — kuralı düzelt, dallandırma.
Tek istisna: `00-stack.md` sürüm tablosu, **fiilen kurulan** sürümlerle eşitlenir.

## Doldururken

- Her şablonun başında `<!-- ... -->` içinde **neden var olduğu** ve **ne zaman
  güncellendiği** yazıyor. Doldurduktan sonra o blok **silinir**.
- `<köşeli>` yer tutucular ve boş tablo satırları doldurulur ya da satır silinir.
  Boş şablon bırakmak, dosyayı hiç açmamaktan daha kötüdür — sonraki oturum
  "burada bilgi var" sanır.
