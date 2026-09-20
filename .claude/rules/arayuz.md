---
paths:
  - "**/*.tsx"
  - "**/*.css"
  - "**/components/**"
  - "**/globals.css"
---
# Arayüz yazarken — tasarım sistemi ve ekran durumları

`docs/standards/07-ui-design-system.md` (ve indekslenecek sayfalarda `18-seo.md`)
bağlayıcıdır; kural adları aşağıda.

- Tek satır arayüz kodundan önce **tasarım yönü ADR'si** (yazı ailesi, palet,
  karakter, referans ürün) var mı — yoksa önce o (`07-ui-design-system.md` → *"Tasarım yönü"*).
- "AI işi" kalıpları yasak listesi (`07-ui-design-system.md` → *"AI varsayılanı"*).
- Sayısal değer koda dağıtılmaz: token (`globals.css`); dark mode ilk günden.
- Mobile-first; 375px'te yatay kaydırma yok; dokunma hedefi ≥ 44px.
- Okuma dört durum: yükleniyor (skeleton) · boş · hata · dolu. Yazma üç durum:
  gönderiliyor · başarılı · başarısız (veri kaybolmaz). İyimser güncelleme
  yalnızca geri alması zararsız işlerde (`07-ui-design-system.md` → *"Yazma sırasında da durum
  vardır"*).
- Form: etiket görünür, örnek değer alanın altında; RHF + aynı Zod şeması.
- Erişilebilirlik WCAG 2.1 AA: klavye, kontrast, `label`, `alt`; axe CI'da.
- Animasyon yalnızca `transform`/`opacity`; görsel WebP/AVIF, lazy.
- Sunucu bileşeni varsayılan; `"use client"` yalnızca etkileşimde.
- Hedef tarayıcı tabanı PRD'de (eski Android/WebView varsa `browserslist`).
- Performans bütçesi aşılırsa PR birleşmez; görsel doğrulama yapılmadan
  "bitti" denmez (`07-ui-design-system.md` → *"Görsel doğrulama"*).
