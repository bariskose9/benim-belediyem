# 07 — Arayüz ve Tasarım Sistemi

## İlkeler
Modern ama sade. Süs değil, netlik. Az sayıda bileşen, tutarlı kullanım.
Kullanıcı her ekranda "şimdi ne yapmalıyım" sorusunu bir bakışta cevaplayabilmeli.

## Token'lar (sayısal değer koda dağıtılmaz)
- Renk: `--background --foreground --primary --secondary --muted --destructive --border`
- Spacing: 4px katları (4, 8, 12, 16, 24, 32, 48, 64)
- Radius: `sm 4px · md 8px · lg 12px` — tek ölçek
- Tipografi: tek yazı ailesi, 6 boy ölçeği. Gövde metni en az 16px.

## Dark mode
İlk günden token seviyesinde. `class` stratejisi (`.dark`).
Kullanıcı tercihi kalıcı saklanır; ilk girişte sistem tercihi kullanılır.
Her ekran **iki modda da** kontrol edilir. Sabit `#fff`/`#000` yazılmaz.

## Responsive
- **Mobile-first.** Varsayılan stil mobil; büyük ekran `md:` `lg:` ile eklenir.
- Kırılım noktaları: `sm 640 · md 768 · lg 1024 · xl 1280`
- Her ekran 375px'te yatay kaydırma olmadan çalışır.
- Dokunma hedefi en az 44x44px.

## Zorunlu ekran durumları
Her veri gösteren bileşende dördü de tanımlıdır:
**yükleniyor** (skeleton) · **boş** (açıklama + eylem) · **hata** (mesaj + tekrar dene) · **dolu**

## Formlar
- Etiket her zaman görünür (placeholder etiket yerine geçmez).
- Doğrulama alan bazlı ve anlaşılır Türkçe.
- Gönder butonu işlem sırasında kilitlenir (çift gönderim engellenir).
- Yıkıcı işlemler (silme, iptal) onay ister.

## Erişilebilirlik (WCAG 2.1 AA)
- Sadece klavye ile tüm akış tamamlanabilir; odak halkası görünür.
- Metin kontrastı >= 4.5:1.
- Anlamsal HTML (`button`, `nav`, `main`); tıklanabilir `div` yok.
- Her görselde anlamlı `alt`; dekoratifse `alt=""`.
- Bilgi sadece renkle aktarılmaz.

## Geri bildirim
Her kullanıcı eylemi 100ms içinde görsel karşılık verir.
Başarı/hata bildirimleri toast ile; kritik olanlar ekranda kalıcı.

## Görseller
- `next/image` kullanılır; genişlik-yükseklik verilir (düzen kayması olmaz).
- Modern format (WebP/AVIF), lazy loading, ekran boyutuna göre `sizes`.
- Kullanıcı yüklediği görseller ayrı depolamadan servis edilir, boyutu sınırlanır.

## Performans bütçesi (aşılırsa PR merge edilmez)
- LCP < 2.5s · INP < 200ms · CLS < 0.1
- İlk yüklemede JS < 200KB (gzip)
- Ana sayfa istek sayısı makul; her dış widget kendi başına yüklenir, sayfayı bloklamaz

## SEO ve meta
- Her sayfada başlık ve açıklama (`generateMetadata`), Open Graph görseli.
- `sitemap.xml` ve `robots.txt` üretilir.
- **Preview ve local ortamlarda `noindex`** — test ortamı arama motoruna düşmez.
- Anlamsal başlık hiyerarşisi (tek `h1`).

## Otomatik erişilebilirlik denetimi
`axe-core` Playwright testlerine bağlanır; kritik ihlal varsa CI kırmızı olur.
Manuel kontrol de yapılır: sadece klavye ile tüm akış tamamlanabilmeli.
