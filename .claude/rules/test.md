---
paths:
  - "**/*.{test,spec}.{ts,tsx}"
  - "tests/**"
  - "e2e/**"
  - "**/vitest.config.*"
  - "**/playwright.config.*"
---
# Test yazarken

`docs/standards/06-testing.md` bağlayıcıdır; kural adları aşağıda.

- Beceri: `test-driven-development`. Önce **kırmızı** test, sonra kod; hata
  düzeltmesi hatayı yakalayan testle başlar (`06-testing.md` → *"Kurallar"*).
- Ekran değişince `browser-testing-with-devtools` (chrome-devtools MCP): ajan
  tarayıcıda fiilen tıklar; kullanıcı PC + telefon tarayıcısından ayrıca dener
  (`06-testing.md` → *"Mobil doğrulama — üç ayrı şey, karıştırılmaz"*).
- Piramit: çok unit / orta entegrasyon / az e2e; her uç için mutlu yol + hata
  yolu + yetki testi; yalnızca mock'u doğrulayan test yazılmaz.
- Mimari test: katman sınırı ihlali kırmızıdır.
- Kapı `NODE_ENV`'e bağlanmaz; kendi ortam değişkeni (`06-testing.md` → *"BİR KAPIYI
  NODE_ENV'E BAĞLAMA"*).
- Karakterizasyon testi (eski sistem): beklenen = eskinin çıktısı, doğru mu
  yanlış mı sonra sorulur (`11-agent-workflow.md` → *"ESKİ PROJEYİ YENİDEN YAZMA"*).
- Yeşil test "bitti" değildir: **beş göz** (backend · veri · frontend · UX ·
  güvenlik) ve **etki alanı** — etkilenen yerlerin hepsi açılır (`06-testing.md` →
  *"ÖZELLİK BİTİNCE — BEŞ GÖZLE DOĞRULAMA"*, *"ETKİ ALANI"*).
- Kararsız (flaky) test yeniden koşturularak geçirilmez; kök sebep.
- e2e: masaüstü + 375px; `@axe-core/playwright` kritik ihlal kırmızı.
