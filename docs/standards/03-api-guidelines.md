# 03 — API Tasarım Kuralları

## URL ve metotlar
- Kaynak adları **çoğul ve İngilizce**: `/api/appointments`, `/api/orders`
- URL'de fiil yok. `/api/createOrder` ❌ → `POST /api/orders` ✅
- İç içe kaynak en fazla bir seviye: `/api/orders/{id}/items`
- Filtre/sıralama query string ile: `?status=pending&sort=-createdAt&page=1&limit=20`

## Status kodları
`200` başarılı · `201` oluşturuldu · `204` içerik yok (silme) ·
`400` bozuk istek · `401` giriş yapılmamış · `403` yetkisiz ·
`404` bulunamadı · `409` çakışma (slot dolu) · `422` doğrulama hatası ·
`429` çok fazla istek · `500` sunucu hatası

## Yanıt formatı (tek tip)

Başarılı:
```json
{ "data": { ... }, "meta": { "page": 1, "total": 42 } }
```

Hatalı:
```json
{ "error": { "code": "SLOT_TAKEN", "message": "Seçtiğiniz saat dolmuş.", "details": [] } }
```

`code` makine için sabit ve İngilizce, `message` kullanıcı için Türkçe.
Stack trace, SQL, dosya yolu **asla** yanıta konmaz.

## Doğrulama
- Her endpoint girişi (body, query, params) **Zod ile** doğrulanır. İstisna yok.
- İstemciye güvenilmez: fiyat, indirim, kullanıcı kimliği, rol **sunucuda** belirlenir.
  İstemcinin gönderdiği `price` veya `userId` alanı reddedilir.

## Yetki
- Her korumalı endpoint'te iki soru cevaplanır:
  1. Bu kişi giriş yapmış mı? (401)
  2. Bu kayıt bu kişiye mi ait / bu işlemi yapma yetkisi var mı? (403)
- Kayıt sahipliği kontrolü atlanırsa IDOR açığı oluşur — bu bir hata değil, güvenlik ihlalidir.

## Diğer
- Liste dönen tüm endpoint'ler sayfalanır. Sınırsız liste dönülmez.
- Ödeme/sipariş gibi tekrarlanmaması gereken işlemlerde idempotency anahtarı kullanılır.
- Uzun işlemler senkron beklemez.
- Tüm endpoint'ler OpenAPI (Swagger) ile belgelenir; `/api/docs` altında yayınlanır.
  **Tek istisna:** taklit edilen dış servis uçları (`/api/mock-kps/*`) belgelenmez —
  gerekçe ADR-009. Bu istisna yalnızca dış kurum taklidi için geçerlidir;
  uygulamanın kendi uçlarına genişletilemez.
