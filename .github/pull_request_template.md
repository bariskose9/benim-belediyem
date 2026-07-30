## Ne

<!-- Bir cümle: bu PR ne yapıyor? Sonra madde madde değişiklikler. -->

## Neden

<!-- Hangi ihtiyaç/sorun? Varsa PRD veya roadmap adımına bağla. -->

## Nasıl test edildi

| Kapı | Sonuç |
| --- | --- |
| `npm run lint` | |
| `npm run typecheck` | |
| `npm run test` | |
| `npm run test:e2e` | |
| `npm run build` | |

<!-- Tarayıcıda hangi akışları TIKLAYARAK denedin? Kod okuyup varsaymak yeterli değil. -->

## Ekran görüntüsü

<!-- Arayüz değiştiyse: açık mod, koyu mod ve 375px. Değişmediyse "arayüz değişmedi". -->

## Veritabanı

<!-- Migration var mı? Geri alma planı ne? Yoksa "değişiklik yok". -->

## Güvenlik

<!-- Yeni girdi noktası / yetki kontrolü / secret var mı? Yoksa "yeni risk yok". -->

## Ortam değişkeni

<!-- Yeni değişken eklendiyse: adı, hangi ortamlara girilmesi gerekiyor, .env.example güncellendi mi? -->

---

## Definition of Done

`docs/standards/10-definition-of-done.md`

- [ ] `lint`, `typecheck`, `build` temiz
- [ ] `any` yok, ölü kod yok, `console.log` bırakılmadı
- [ ] Katman ihlali yok (bileşen içinden DB çağrısı yok)
- [ ] Yeni davranış için test yazıldı ve geçiyor
- [ ] Girdi doğrulama var (Zod); yetki + sahiplik kontrolü var
- [ ] Hata mesajı iç detay sızdırmıyor
- [ ] Yeni secret varsa `.env.example` güncellendi, `.env` commit edilmedi
- [ ] `npm audit` yeni kritik uyarı üretmiyor
- [ ] Tarayıcıda 375px ve masaüstünde düzgün
- [ ] Dark mode ve light mode ikisinde de okunabilir
- [ ] Yükleniyor / boş / hata durumları var
- [ ] Klavye ile gezilebiliyor, kontrast yeterli
- [ ] Kullanıcıya görünen tüm metinler Türkçe ve anlaşılır
- [ ] Konsolda hata yok, network'te başarısız istek yok
- [ ] Mimari karar alındıysa ADR yazıldı
- [ ] Bilinen eksikler açıkça bildirildi

**Bu kutuyu yalnızca depo sahibi işaretler — ajan işaretleyemez:**

- [ ] **Preview URL gerçek telefondan açılıp denendi** (dokunma, klavye, kaydırma)
