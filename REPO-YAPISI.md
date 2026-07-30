# Zorunlu Repo Yapısı

Klasör ve dosya adları **birebir** budur. Claude Code bu şemaya uyar,
kendi kafasına göre klasör açmaz veya isim değiştirmez.

```
~/Desktop/baris_projects/benim-belediyem/
├── CLAUDE.md                      ← ZORUNLU · repo kökünde · Claude otomatik okur
├── REPO-YAPISI.md                 ← bu dosya
├── README.md                      ← proje tanıtımı + kurulum adımları
├── .gitignore                     ← .env, node_modules, .next, coverage
├── .env.example                   ← ZORUNLU · anahtar ADLARI (değerler boş)
├── .env                           ← ASLA COMMIT EDİLMEZ
├── .nvmrc                         ← Node sürümü sabiti
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── eslint.config.mjs
├── .prettierrc
├── vitest.config.ts
├── playwright.config.ts
├── docker-compose.yml             ← local Postgres
├── Dockerfile                     ← çok aşamalı build
├── .dockerignore
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 ← lint + typecheck + test + build
│   │   └── e2e.yml                ← Playwright
│   └── pull_request_template.md
│
├── docs/
│   ├── standards/                 ← ★ 15 DOSYA · HER PROJEDE AYNI · kopyalanır
│   │   ├── 00-stack.md
│   │   ├── 01-architecture.md
│   │   ├── 02-coding-standards.md
│   │   ├── 03-api-guidelines.md
│   │   ├── 04-database.md
│   │   ├── 05-auth-security.md
│   │   ├── 06-testing.md
│   │   ├── 07-ui-design-system.md
│   │   ├── 08-git-workflow.md
│   │   ├── 09-ci-cd-deploy.md
│   │   ├── 10-definition-of-done.md
│   │   ├── 11-agent-workflow.md
│   │   ├── 12-operations-and-scaling.md
│   │   ├── 13-environments.md
│   │   └── 14-privacy-and-compliance.md
│   └── project/                   ← ☆ SADECE BU PROJE · her projede değişir
│       ├── PRD.md                 ← analiz dokümanı (ne yapılacak)
│       ├── data-model.md
│       ├── integrations.md        ← dış API'ler, limitler, önbellek
│       ├── fake-data-guide.md     ← seed kuralları, fiyat bantları, sahte KPS, teşkilat şeması
│       ├── roadmap.md             ← adımlar + teknik borç
│       ├── CHANGELOG.md
│       └── decisions/
│           ├── ADR-000-sablon.md
│           ├── ADR-001-tek-repo-nextjs.md
│           ├── ADR-002-oturum-cerezi.md
│           ├── ADR-003-sahte-kps-adaptor.md
│           ├── ADR-004-bot-korumasi-turnstile.md
│           ├── ADR-005-oturum-veritabaninda.md
│           ├── ADR-006-hiz-siniri-postgres.md
│           └── ADR-007-suresi-dolan-kayitlar-tembel-temizlik.md
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                    ← sahte veri (idempotent)
│   └── migrations/
│
├── public/
│   ├── logo.svg
│   └── images/                    ← ürün ve menü görselleri
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx               ← anasayfa + widget'lar
│   │   ├── globals.css            ← sadece tasarım token'ları
│   │   ├── (public)/              ← giriş gerektirmeyen sayfalar
│   │   │   ├── etkinlik/
│   │   │   ├── market/
│   │   │   ├── restoran/
│   │   │   ├── hastane/          ← SADECE tanıtım · randevu alma protected
│   │   │   ├── spor-salonu/      ← SADECE tanıtım · üyelik alma protected
│   │   │   ├── hakkimizda/        ← teşkilat şeması + personel rehberi
│   │   │   ├── sepet/            ← ziyaretçi de görebilir (anonim sepet)
│   │   │   ├── giris/  kayit/  sifremi-unuttum/
│   │   │   ├── iletisim/
│   │   │   └── gizlilik/  cerez-politikasi/  kullanim-sartlari/
│   │   ├── (protected)/           ← giriş zorunlu
│   │   │   ├── profil/
│   │   │   ├── hesabim/          ← verimi indir + hesabımı sil (PRD §5.11)
│   │   │   ├── odeme/
│   │   │   ├── siparislerim/
│   │   │   ├── randevularim/     ← personel değilse 403
│   │   │   ├── uyeligim/         ← personel değilse 403
│   │   │   └── destek/
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── docs/              ← OpenAPI/Swagger (03-api-guidelines zorunlu)
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── account/           ← veri dışa aktarma + hesap silme
│   │       ├── consents/          ← çerez rızası (ziyaretçi dahil)
│   │       ├── mock-kps/          ← sahte KPS servisi (dış servis gibi ele alınır)
│   │       ├── appointments/
│   │       ├── events/  seats/
│   │       ├── products/  menu/
│   │       ├── cart/  orders/  payments/
│   │       ├── memberships/
│   │       ├── org/               ← birimler ve personel (salt okunur)
│   │       ├── tickets/
│   │       ├── notifications/
│   │       ├── cron/              ← planlı görevler (rezervasyon serbest bırakma, aidat)
│   │       └── info/ (weather, news, markets)
│   │
│   ├── features/                  ← HER MODÜL KENDİ KLASÖRÜNDE
│   │   ├── auth/                  ← her feature klasörü AYNI alt yapıya sahiptir:
│   │   │    ├── components/
│   │   │    ├── services/         ← iş mantığı
│   │   │    ├── repositories/     ← Prisma erişimi
│   │   │    ├── schemas/          ← Zod
│   │   │    └── types.ts
│   │   ├── identity/              ← IdentityProvider arayüzü + MockKpsProvider
│   │   ├── otp/                   ← OtpChannel adaptörleri
│   │   ├── appointments/
│   │   ├── events/
│   │   ├── market/
│   │   ├── restaurant/
│   │   ├── gym/
│   │   ├── cart/
│   │   ├── payment/
│   │   ├── orders/
│   │   ├── notifications/
│   │   ├── org/
│   │   ├── support/
│   │   ├── account/               ← veri dışa aktarma + hesap silme
│   │   └── info-widgets/
│   │
│   ├── components/
│   │   ├── ui/                    ← shadcn bileşenleri
│   │   └── layout/                ← Navbar, Footer, ThemeToggle, Logo, EnvBanner
│   ├── lib/
│   │   ├── db.ts  auth.ts  http.ts  cache.ts  errors.ts  logger.ts  utils.ts
│   │   ├── rate-limit.ts          ← Postgres sayacı (ADR-006)
│   │   ├── crypto.ts              ← kimlik numarası şifreleme/özet
│   │   └── turnstile.ts           ← bot doğrulama jetonu (ADR-004)
│   └── config/
│       ├── env.ts                 ← env okuma TEK YERDEN, Zod ile doğrulanır
│       ├── constants.ts           ← süreler, limitler, fiyat kuralları
│       └── messages.ts            ← kullanıcıya görünen TÜM Türkçe metinler
│
└── tests/
    ├── unit/
    ├── integration/
    ├── e2e/
    └── fixtures/
```

## Değişmez kurallar
- `CLAUDE.md` **kökte**, klasör içinde değil.
- `docs/standards/` içeriği projeye özel bilgi içermez. Proje adı bile geçmez.
- `docs/project/` içeriği yeni projede tamamen değişir.
- Yeni bir üst düzey klasör açılmadan önce onay alınır.
