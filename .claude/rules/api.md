---
paths:
  - "**/api/**"
  - "**/*.controller.ts"
  - "**/*.dto.ts"
  - "**/actions.ts"
  - "packages/contracts/**"
---
# API ucu yazarken — sözleşme ve doğrulama

`docs/standards/03-api-guidelines.md` bağlayıcıdır; kural adları aşağıda.

- Her giriş (body, query, params) Zod'dan geçer — Server Action dahil; istemciye
  güvenilmez, fiyat/rol/kimlik sunucuda belirlenir (`03-api-guidelines.md` → *"Doğrulama"*).
- Zod kuralı sırası: hazır kural → `.regex()` → `.refine()`; regex kısa ve
  bağlı, `.max()` regex'ten önce; Türkçe harf için `\p{L}` + `u`.
- Şema tek yerde (`features/<x>/schemas/` ya da `packages/contracts`); form ve
  sunucu aynı şemayı kullanır.
- Yetki: 401 giriş var mı, 403 bu kayıt onun mu (IDOR) — her korumalı uçta.
- Tek tip hata `{ error: { code, message, details? } }`; iç detay sızmaz;
  gövde boyutu sınırı sunucuda; `429` yalnızca `Retry-After` ile.
- Tekrar edilemez her yazma (başvuru, ödeme, randevu) **`Idempotency-Key`**;
  istemcide yazma isteği otomatik yeniden denenmez (`03-api-guidelines.md` → *"İdempotency"*).
- REST: çoğul kaynak, doğru durum kodu, `/api/v1` sürümleme (mobil/dış
  tüketici varsa zorunlu), OpenAPI şemadan üretilir.
- Sayfalama: cursor; `?page=999999` yok. Uzun iş senkron beklemez → kuyruk,
  `queue.add` **commit'ten sonra** (`00-stack.md` → *"Kuyruğa ne zaman atılır"*).
