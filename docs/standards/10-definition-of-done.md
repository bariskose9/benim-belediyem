# 10 — Definition of Done

Bir iş, aşağıdaki maddelerin **tamamı** işaretlenmeden "bitti" sayılmaz.
"Sonra yaparız", "küçük değişiklik", "zaten çalışıyor" geçerli mazeret değildir.

## İşlevsellik
- [ ] PRD'deki kabul kriterlerinin hepsi karşılandı
- [ ] Mutlu yol baştan sona çalışıyor
- [ ] Hata yolları çalışıyor (geçersiz girdi, yetkisiz erişim, boş sonuç)
- [ ] Login olmadan erişimde beklenen davranış doğru (salt okuma / yönlendirme)

## Kod
- [ ] `lint` temiz, `typecheck` temiz, `build` başarılı
- [ ] `any` yok, ölü kod yok, konsol çıktısı bırakılmadı
- [ ] Katman ihlali yok (bileşen içinden DB çağrısı yok)

## Test
- [ ] Yeni davranış için test yazıldı ve geçiyor
- [ ] Hata düzeltmesiyse önce başarısız test yazıldı
- [ ] Tüm test paketi yeşil

## Güvenlik
- [ ] Girdi doğrulama var (Zod)
- [ ] Yetki + sahiplik kontrolü var
- [ ] Hata mesajı iç detay sızdırmıyor
- [ ] Yeni secret varsa `.env.example` güncellendi, `.env` commit edilmedi
- [ ] `npm audit` yeni kritik uyarı üretmiyor

## Arayüz
- [ ] Tarayıcıda 375px ve masaüstünde düzgün
- [ ] **Preview URL gerçek telefondan açılıp denendi** (dokunma, klavye, kaydırma)
      — *bunu ajan işaretleyemez.* Ajan, commit raporunun "telefon testi" satırında
      hangi adımların denenmesi gerektiğini yazar; kutuyu **kullanıcı** işaretler
- [ ] Dark mode ve light mode ikisinde de okunabilir
- [ ] Yükleniyor / boş / hata durumları var
- [ ] Klavye ile gezilebiliyor, kontrast yeterli
- [ ] Kullanıcıya görünen tüm metinler Türkçe ve anlaşılır

## Tarayıcı doğrulaması
- [ ] Akış gerçekten tıklanarak denendi (kod okuyup varsaymak yeterli değil)
- [ ] Konsolda hata yok, network'te başarısız istek yok

## Teslim
- [ ] Commit raporu sunuldu ve onaylandı
- [ ] PR açıldı, CI yeşil, preview URL doğrulandı
- [ ] Mimari karar alındıysa ADR yazıldı
- [ ] Bilinen eksikler açıkça bildirildi (sessizce bırakılmadı)
