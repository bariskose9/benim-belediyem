# 14 — Gizlilik, KVKK ve Denetlenebilirlik

Kamu/vatandaş odaklı uygulamalarda bu bölüm isteğe bağlı değildir.
Bu proje sahte veriyle çalışsa bile alışkanlık doğru kurulur.

## Veri minimizasyonu
- Gerekmeyen veri **toplanmaz**. "İleride lazım olur" gerekçesiyle alan eklenmez.
- Her yeni kişisel veri alanı için cevaplanır: neden gerekli, ne kadar saklanacak,
  kim erişebilir, nasıl silinecek.
- Sağlık verisi, din, biyometri gibi özel nitelikli veri **hiç toplanmaz**.
- Kimlik numarası yalnızca kimlik doğrulama zorunluysa toplanır (bkz. sahte KPS akışı);
  şifrelenerek saklanır, maskelenerek gösterilir, log'a yazılmaz ve
  başka hiçbir amaçla kullanılmaz.

## Saklama ve silme
- Her tablo için saklama süresi tanımlıdır (örn. destek eki 1 yıl, sipariş kaydı 10 yıl).
- Kullanıcı hesabını silebilir: kişisel alanlar anonimleştirilir, mali kayıtlar
  yasal süre boyunca kişiselleştirilmeden korunur.
- Kullanıcı kendi verisini dışa aktarabilir (JSON indirme).
- Süresi dolan veriyi temizleyen planlı görev tanımlıdır.

## Aydınlatma ve rıza
- KVKK aydınlatma metni, çerez politikası, kullanım şartları sayfaları bulunur
  (`/gizlilik`, `/cerez-politikasi`, `/kullanim-sartlari`).
- Zorunlu olmayan çerez/analitik **rıza alınmadan** çalıştırılmaz.
- Rıza kaydı zaman damgasıyla saklanır.

## Denetim kaydı (audit log)
Kim, ne zaman, hangi kayıtta, ne yaptı — ayrı `audit_logs` tablosunda tutulur.
- Kapsam: giriş/çıkış, yetki değişikliği, ödeme, iptal, silme, yönetici işlemleri.
- Kayıt **değiştirilemez ve silinemez** (append-only).
- İçeriğe hassas veri yazılmaz; referans kimlik yazılır.

## Log ve hata takibinde gizlilik
- Log'a asla: şifre, token, kart numarası, kimlik numarası, adres, e-posta gövdesi.
- Hata takip aracına gönderilen veriler maskelenir.
- Üçüncü parti bir servise veri gönderiliyorsa bu listelenir ve gerekçelendirilir.

## Erişim
- En az yetki ilkesi: her rol yalnızca işini yapacak kadar erişir.
- Üretim veritabanına doğrudan erişim istisnadır; yapıldığında kaydedilir.
- Yetki değişiklikleri denetim kaydına düşer.

## Erişilebilirlik yükümlülüğü
Kamu hizmeti sunan arayüzlerde erişilebilirlik yasal bir beklentidir.
WCAG 2.1 AA hedefi `07-ui-design-system.md` altında tanımlıdır ve
otomatik denetim (axe) CI'da çalışır.
