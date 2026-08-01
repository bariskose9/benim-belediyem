# Yol Haritası

<!--
ŞABLON — `docs/project/roadmap.md` olarak kopyalanır ve doldurulur.
Bu yorum bloğu doldurduktan sonra silinir.

BU DOSYA NEDEN VAR
İki soruyu cevaplar: "nerede kaldık" ve "kabul ettiğimiz eksikler neler".
Yeni bir oturum bu dosyaya bakarak sıradaki işi bulur.

NASIL SIRALANIR
Bağımlılık sırasına göre — her adım bir öncekinin üzerine kurulur, tahmini
süreye göre DEĞİL. İlk üç adım neredeyse her projede aynıdır:
  1. Repo + framework + lint/format + docs/
  2. Hosting + veritabanı bağlantısı + /api/health + CI
  3. Veri modeli + migration + tohumlama

NE ZAMAN GÜNCELLENİR
· Bir adım bitince → üstü çizilir + **BİTTİ** yazılır (satır SİLİNMEZ)
· Yeni bir eksik kabul edilince → teknik borç tablosuna satır eklenir
· Bir borç ödenince → üstü çizilir + **ÖDENDİ (tarih)** + ne yapıldığı yazılır
-->

Sıra kasıtlıdır: her adım bir öncekinin üzerine kurulur. Bir adım
`docs/standards/10-definition-of-done.md` kapılarını geçmeden sonrakine geçilmez.

| # | Adım | Çıktı |
|---|---|---|
| 0 | Repo, framework, TypeScript, lint/format, `docs/`, `CLAUDE.md` | Boş proje ayakta |
| 1 | Hosting + veritabanı bağlantısı, `/api/health`, CI pipeline | **Canlı boş sayfa** |
| 2 | Local veritabanı (Docker), ORM kurulumu, ilk migration | Local DB çalışıyor |
| 3 | Veri modeli + tablolar + idempotent tohumlama | Veri var |
| 4 | <ilk gerçek özellik> | Test + PR + deploy |

<!-- Biten adım şöyle işaretlenir:
| 3 | ~~Veri modeli + tablolar~~ **BİTTİ** | 37 tablo + idempotent seed |
-->

## Teknik borç

<!--
BOŞ BIRAKILMAZ, GİZLENMEZ. Buraya sadece BİLİNEN ve KABUL EDİLMİŞ eksikler
yazılır. "Neden kabul edildi" sütunu gerçek gerekçe ister — "vakit yoktu"
gerekçe değildir; neyin karşılığında feda edildiği yazılır.

Bir borç ödendiğinde satır SİLİNMEZ, üstü çizilir. Sebebi: sonraki oturum
"bu neden böyle yapılmış" diye aynı tartışmayı baştan açmasın.
-->

| # | Borç | Neden kabul edildi | Ne zaman ödenir |
|---|---|---|---|
| 1 | | | |
