# 01 — Mimari ve Klasör Yapısı

## Katmanlar (yukarıdan aşağıya, tek yön)

```
UI (React bileşeni)
   ↓ sadece veri ister, iş kuralı bilmez
API katmanı (route handler)   → doğrulama (Zod) + auth + HTTP çevirisi
   ↓
Servis katmanı (iş mantığı)   → kurallar burada. "Aynı gün ikinci randevu alınamaz" burada
   ↓
Repository katmanı (Prisma)   → sadece veri erişimi. İş kuralı içermez
   ↓
Veritabanı
```

**Kural:** Katman atlanmaz. Bileşen içinden Prisma çağrılmaz. Route handler içine
iş mantığı yazılmaz. Servis katmanı `Request`/`Response` nesnesi tanımaz.

## Klasör yapısı — özellik bazlı

```
src/
├── app/
│   ├── (public)/          → login gerektirmeyen sayfalar
│   ├── (protected)/       → login zorunlu sayfalar
│   ├── api/<kaynak>/      → route handler'lar
│   ├── layout.tsx
│   └── page.tsx
├── features/<özellik>/    → HER ÖZELLİK KENDİ KLASÖRÜNDE
│   ├── components/
│   ├── services/          → iş mantığı
│   ├── repositories/      → Prisma erişimi
│   ├── schemas/           → Zod şemaları
│   └── types.ts
├── components/ui/         → paylaşılan tasarım sistemi bileşenleri
├── lib/                   → auth, db client, http, cache, utils
└── config/                → sabitler, env okuma (tek yerden)
```

## İsimlendirme
- Klasör ve dosya: `kebab-case` (`appointment-service.ts`)
- React bileşen dosyası: `PascalCase.tsx`
- Değişken/fonksiyon: `camelCase` · Tip/Interface: `PascalCase` · Sabit: `UPPER_SNAKE`
- Tüm kod isimleri **İngilizce**. Kullanıcıya görünen metinler Türkçe.

## Boyut sınırları
Dosya > 300 satır → böl. Fonksiyon > 50 satır → böl. İç içe if > 3 seviye → erken return.

## Veri akışı kuralları
- Sunucu bileşeni varsayılandır; `"use client"` sadece etkileşim gerekiyorsa.
- Gizli anahtar veya iş kuralı istemciye gönderilmez.
- Dış API çağrıları **sunucu tarafında** yapılır ve cache'lenir.
