---
paths:
  - "Dockerfile*"
  - "**/docker-entrypoint*"
  - "compose*.y*ml"
  - "docker-compose*.y*ml"
  - ".github/**"
  - ".gitlab-ci.yml"
  - "src/config/**"
  - ".env*"
  - "scripts/**"
---
# Paketleme, yayın, ortam ve çalışma zamanı dosyalarında

`docs/standards/09-ci-cd-deploy.md`, `12-operations-and-scaling.md`,
`13-environments.md` bağlayıcıdır; kural adları aşağıda.

- CI adımları tek betikte `ci:verify`; platform dosyası onu çağırır; iki
  platform dosyası da yazılır. Kurumda hat merkezî `include` ise yerel
  `verify` işi sorulur, kapı `pre-push` kancasına (`09-ci-cd-deploy.md`).
- Kancalar: husky — `pre-commit` lint-staged, `pre-push` tip + test
  (kurumda tam `ci:verify`).
- Ortamlar: kendi projede local → preview → production; kurumda local →
  **test** → **canlı**, `main` → test, etiket → canlı; testten geçmeyen
  canlıya çıkmaz (`13-environments.md` → *"Yol C"*).
- Ortam değişkenleri `src/config/env.ts`'te Zod ile; `.env.example`
  eksiksiz, değerler DevOps'ta; `NODE_ENV` ile ortam ayrımı yapılmaz, `APP_ENV`.
- Dockerfile çok aşamalı, sır yok, kurum ağı için npm yeniden deneme;
  migration eksikse derleme bilinçli kırılır; `docker-entrypoint.sh` `exec`
  ile başlatır.
- Açılış sırası: env → migration (kurum) → DI → DB → Redis → worker → HTTP →
  `/api/health`; ne yokken düşer, ne yokken degraded — tablo `12-operations-and-scaling.md` →
  *"Açılış sırası"*.
- Log JSON (pino), istek kimliği, kişisel veri süzgeci; `console.log` yasak.
  Hata takibi Sentry, kurumda GlitchTip/kurumun aracı.
- Yüklenen dosya konteynere yazılmaz; `FileStorage` adaptörü.
- Sürekli açık worker yoksa BullMQ yok; sunucusuzda Inngest/QStash.
- Geri alma: önceki etiket; migration geriye uyumlu. Yayın sonrası duman
  testi. Dört dış kanıt (yük testi, pentest, hukuk, gerçek kullanıcı) hazırlığı
  teslimde (`10-definition-of-done.md` → *"Dört dış kanıt"*).
