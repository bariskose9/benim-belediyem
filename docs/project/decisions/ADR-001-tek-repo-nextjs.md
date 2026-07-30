# ADR-001 — Ayrı Express sunucusu yerine Next.js Route Handlers

**Tarih:** 2026-07-29
**Durum:** Kabul edildi

## Bağlam
Müfredat React + ayrı Express backend öğretiyor. Proje tek geliştirici tarafından,
kod okunmadan (vibecoding) geliştirilecek ve tek kişi tarafından bakılacak.

## Karar
Backend, Next.js App Router'ın Route Handler'ları içinde yazılacak; ayrı Express
sunucusu kurulmayacak. Tek repo, tek deploy.

## Değerlendirilen alternatifler
| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| Ayrı Express API | Klasik ayrım, müfredata birebir uyum | İki deploy, CORS, iki ortam değişkeni seti, iki CI | Tek kişilik projede maliyeti faydasından fazla |
| tRPC | Uçtan uca tip güvenliği | Mobil istemci için REST yine gerekli | REST hem web hem Expo tarafından tüketilecek |

## Sonuçlar
- Olumlu: tek deploy, ortak tipler, daha az yapılandırma
- Bedel: backend'i başka bir platforma taşımak ileride refactor gerektirir
- Gözden geçirme: backend bağımsız ölçeklenmesi gerekirse
