---
paths:
  - "apps/mobile/**"
  - "app.json"
  - "app.config.*"
  - "**/*.native.tsx"
---
# Mobil (Expo) dosyalarında

`docs/standards/17-mobile.md` bağlayıcıdır — ⚠️ **bu standart iskelettir**
(dosyanın başındaki "BİLİNEN EKSİK" notu): deep link, push, çevrimdışı, zorunlu
güncelleme, mağaza reddi, izin akışı, biyometri, Maestro için kural yok. Bu
konularda ajan **"kural yok"** der, araştırır, ADR ile karar verir ve riski
`PRD.md` varsayımlarına yazar — kural varmış gibi davranmaz.

- Aynı REST API (`/api/v1`), Bearer JWT; jeton SecureStore'da, asla
  AsyncStorage.
- Her istekte zaman aşımı; yeniden deneme yalnızca idempotent isteklerde.
- Oturum kararı baştan hem çerez hem jetonu kapsar (`05-auth-security.md` + `17`).
- Sürümleme zorunlu: uygulama kullanıcının telefonunda eski sürümde kalır.
