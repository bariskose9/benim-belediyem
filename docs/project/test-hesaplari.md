# Test Hesapları (otomatik üretilir)

> ⚠️ **BU DOSYA ELLE DÜZENLENMEZ.** `prisma/seed.ts` her çalıştığında
> yeniden yazar. Numaralar sabit tohumla üretildiği için her kurulumda aynıdır.

> Buradaki kimlik numaralarının **tamamı sentetiktir**: kontrol basamağı
> algoritmasına uyar ve `9` ile başlar; hiçbiri gerçek bir kişiye ait değildir.
> Proje sahibinin bilgileri bu dosyaya **hiçbir koşulda yazılmaz** —
> onlar yalnızca ortam değişkenlerinde durur.

## Kayıt akışı sınır durumları

| Senaryo | Kimlik numarası | Doğum tarihi | Beklenen sonuç |
|---|---|---|---|
| 18 yaş altı | `90822561452` | 2010-05-12 | Kayıt **reddedilir** |
| 18 yaş altı | `97030093102` | 2013-04-21 | Kayıt **reddedilir** |
| 18 yaş altı | `92995594282` | 2011-04-23 | Kayıt **reddedilir** |
| 18 yaş altı | `90220717772` | 2010-03-15 | Kayıt **reddedilir** |
| 18 yaş altı | `92155305482` | 2010-08-24 | Kayıt **reddedilir** |
| Bugün 18 oluyor | `92050662178` | 2008-08-06 | Kayıt **kabul edilir** |
| KPS zaman aşımı | `91038813878` | 1954-10-25 | Sorgu **timeout** döner |
| KPS sunucu hatası | `93397972098` | 1958-10-17 | Sorgu **error** döner |
| KPS'te kayıt yok | `99918365820` | — | Sorgu **not_found** döner |

## Örnek üye hesapları

Şifre: `Test1234!`

> Şifre **argon2id** ile özetlenerek yazılır (ADR-011). Aşağıdaki 10 demo
> hesabın hepsi bu şifreyi kullanır. `/giris` adresinden giriş yapılabilir.

> Arka plandaki 80 hesabın şifresi **yoktur** ve olmayacak: onlar dolu
> randevu ve satılmış koltuk gibi kayıtların sahibi olsunlar diye var,
> giriş yapmaları beklenmiyor.

| # | Ad Soyad | Kimlik numarası | E-posta | Personel mi? |
|---|---|---|---|---|
| 1 | Emre Arslan | `97876775668` | emre.arslan1@ornek.test | ✔ evet |
| 2 | Burak Taş | `94002759196` | burak.tas2@ornek.test | ✔ evet |
| 3 | Nurcan Yılmaz | `91911650170` | nurcan.yilmaz3@ornek.test | ✔ evet |
| 4 | İpek Kurt | `97271368182` | ipek.kurt4@ornek.test | ✘ hayır |
| 5 | Ferhat Tunç | `98551366676` | ferhat.tunc5@ornek.test | ✘ hayır |
| 6 | Nazlı Menteş | `92373556246` | nazli.mentes6@ornek.test | ✘ hayır |
| 7 | Mehmet Duman | `96927119284` | mehmet.duman7@ornek.test | ✘ hayır |
| 8 | Gamze Toprak | `95449943322` | gamze.toprak8@ornek.test | ✘ hayır |
| 9 | Arda Aydın | `90217164022` | arda.aydin9@ornek.test | ✘ hayır |
| 10 | Barış Ateş | `95000320470` | baris.ates10@ornek.test | ✘ hayır |

Personel olan hesaplar hastane randevusu ve spor salonu üyeliğine erişebilir;
diğerleri erişemez (PRD §5.0 erişim kademeleri).

