---
paths:
  - "src/**/*.{ts,tsx}"
  - "apps/**/*.{ts,tsx}"
  - "packages/**/*.ts"
---
# Kod yazarken — mimari ve kod standardı

Bu dosyalarla çalışırken `docs/standards/01-architecture.md` ve
`02-coding-standards.md` bağlayıcıdır — kural adları aşağıda, gerekçe orada.

- Katman sırası tek yön: UI → API (Route Handler / Server Action / Controller)
  → servis → repository → Prisma → DB. İş kuralı API'de ya da UI'da yazılmaz;
  repository'de `if` olmaz (`01-architecture.md` → *"BU KOD HANGİ KATMANA AİT"*).
- Kendi formların için Server Action, dışa açılan uç için Route Handler;
  `"use server"` güvenli yapmaz — kimlik + Zod action içinde (`01-architecture.md` →
  *"Server Action mı, Route Handler mı"*).
- Durum değişikliği tek kapıdan: `transition()`, geçiş tablosu, olay tablosu
  (`01-architecture.md` → *"Durum makinesi"*).
- Okuma etiketlenir, yazma sonrası `revalidateTag`; `force-dynamic` her rotaya
  yazılmaz (`01-architecture.md` → *"Önbellek ve tazelik"*).
- TypeScript strict; `any` yasak. Kod dili `CLAUDE.md` §0'daki moda göre;
  yorumlar her zaman Türkçe (`02-coding-standards.md` → *"KOD DİLİ PROJE MODUNA GÖRE"*).
- Her dosya sabit başlık bloğuyla başlar: `NEREDEN · NE · NEREYE · SONUÇ · KAYNAK
  · NEDEN · DİKKAT` (gerçek dosya yolları — aranabilir harita); bloklar akış ·
  neden · etki üçlüsüyle yorumlanır (`02-coding-standards.md` → *"HER DOSYANIN
  BAŞINDA BAŞLIK BLOĞU"*, *"KOD, OKUYAMAYAN BİRİ İÇİN"*).
- Dosya > 300 satır, fonksiyon > 50 satır → böl. Sabitler `src/config/`.
- Soyutlama eklemeden önce üç soru — ikinci kullanım şimdi var mı, kural mı
  tahmin mi, silmek kolay mı (`11-agent-workflow.md` → *"AŞIRI MÜHENDİSLİK KAPISI"*).
- Çok dillilik ve zaman dilimi kararları koda gömülmez (`02-coding-standards.md` → *"Çok
  dillilik"*, *"Zaman dilimi"*).
