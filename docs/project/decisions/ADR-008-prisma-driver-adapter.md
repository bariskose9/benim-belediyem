# ADR-008 — Prisma bağlantısı için `@prisma/adapter-pg` kullanılması

**Tarih:** 2026-07-30
**Durum:** Kabul edildi

## Bağlam

Prisma 7, önceki sürümlerdeki bağlantı modelini kaldırdı:

- `datasource` bloğundaki `url` ve `directUrl` **artık şemada tanımlanamıyor**
  (`P1012: The datasource property 'url' is no longer supported in schema files`)
- Migration'ların kullandığı adres `prisma.config.ts` içine taşındı
- Uygulamanın çalışma anı bağlantısı için `PrismaClient` yapıcısına ya bir
  **driver adapter** ya da `accelerateUrl` verilmesi **zorunlu** hale geldi

Yani bu bir tercih değil, Prisma 7'ye geçmenin ön koşulu. Seçim yalnızca
"hangi adapter" sorusunda.

Kısıtlarımız: local ortam Docker Postgres'e TCP ile bağlanıyor, preview ve
production Neon kullanıyor. `docs/standards/13-environments.md` "aynı yapı her
ortamda çalışır" diyor; ortama göre dallanan bağlantı kodu bu kuralı bozar.

## Karar

Çalışma anı bağlantısı **`@prisma/adapter-pg`** ile kurulur (`pg` sürücüsü).
Tek kod yolu hem local Docker Postgres'te hem Neon'da çalışır.

İki adres ayrımı korunur:

| Nerede | Hangi adres | Neden |
|---|---|---|
| `src/lib/db.ts` (uygulama) | `DATABASE_URL` — **havuzlu** | Sunucusuz ortamda bağlantı sayısı patlamasın |
| `prisma.config.ts` (migration) | `DIRECT_URL` — **havuzsuz** | Havuzlayıcı DDL çalıştıramaz |

## Değerlendirilen alternatifler

| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| `@prisma/adapter-pg` | Her ortamda aynı kod · standart TCP · local Docker ile çalışır | Serverless'ta soğuk başlangıçta Neon sürücüsünden bir tık yavaş | **Seçildi** |
| `@prisma/adapter-neon` | Neon'un WebSocket/HTTP sürücüsü, serverless'ta daha hızlı | Local Docker Postgres ile **çalışmaz** → ortama göre dallanan kod gerekir | 13-environments.md "aynı yapı her ortamda çalışır" kuralını bozardı |
| Prisma Accelerate (`accelerateUrl`) | Bağlantı havuzu + önbellek yönetilen hizmet olarak gelir | Ek ücretli hizmete bağımlılık, ek hesap | Bu ölçekte gereksiz; Neon havuzlayıcısı zaten var |
| Prisma 6'da kalmak | Bilinen bağlantı modeli, değişiklik yok | Yeni proje eski major ile başlar, ileride daha zor taşınır | Proje boşken taşımak, içi dolunca taşımaktan ucuz |

## Sonuçlar

- **Olumlu:** local ve uzak ortamlar tek kod yolunu paylaşıyor; havuzlu/havuzsuz
  ayrımı tek yerde ve gerekçesi yazılı; `DATABASE_URL` ve `DIRECT_URL` artık
  `src/config/env.ts` içinde **zorunlu** ve protokol doğrulaması yapılıyor.
- **Olumsuz / kabul edilen bedel:** iki ek bağımlılık (`@prisma/adapter-pg`, `pg`).
  Sunucusuz soğuk başlangıçta Neon'un kendi sürücüsüne göre küçük bir gecikme farkı.
- **Ne zaman gözden geçirilmeli:** ölçüm sunucusuz soğuk başlangıcı darboğaz
  gösterirse (`docs/standards CLAUDE.md §5.10`: önce ölç, sonra düzelt).
  O noktada `@prisma/adapter-neon`'a geçiş yalnızca `src/lib/db.ts`'i etkiler,
  ama local Docker için ayrı bir yol gerektireceği unutulmamalı.
