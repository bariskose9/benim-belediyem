# Sahte Veri Rehberi (Seed)

`prisma/seed.ts` bu dosyaya uyar. Amaç: gerçekçi görünen ama **kesinlikle sahte**
veri üretmek. Değerler 2026 Türkiye koşullarına göre makul seçilmiştir;
gerekirse tek yerden güncellenir.

---

## Değişmez kurallar

- **Gerçek kişi adı kullanılmaz.** Tanınmış hiçbir isim (sanatçı, doktor, yönetici) geçmez.
- **Gerçek marka kullanılmaz.** Ürünler jenerik adlandırılır: "Tam Buğday Ekmeği 500 g".
- **Gerçek adres kullanılmaz.** İlçe adı gerçek, sokak ve numara uydurmadır.
- **E-posta alan adı `.test`** olur: `ayse.demir@ornek.test` — yanlışlıkla gerçek
  bir adrese e-posta gidemez (`.test` RFC ile ayrılmıştır).
- **Telefonlar sahte bloktan:** `0555 0XX XX XX` — sıralı üretilir.
- **Kart numaraları yalnızca standart test numaralarıdır** (aşağıda).
- Seed **idempotent**tir: iki kez çalışınca veri katlanmaz.
- Her tabloda `isSeedData: true` benzeri bir işaret ya da bilinen sabit id kullanılır ki
  sahte veri her zaman ayırt edilebilsin.

---

## Sahte KPS kayıtları (200 vatandaş)

`kps_citizens` tablosu 200 sahte vatandaş içerir. Uygulama üyeleri **bu havuzdan** kayıt olur.

- **Kimlik numarası:** standart kontrol basamağı algoritmasına uyar (doğrulama kodu
  test edilebilsin diye) ve **`9` ile başlar**. Gerçekte kullanımda olan numaralarla
  çakışma ihtimalini azaltmak içindir; yine de bu veri tamamen sentetiktir ve
  hiçbir gerçek kişiyi temsil etmez. Seed dosyasının başına bu not yazılır.
- **Doğum tarihi:** 1950–2008 arası. En az 5 kayıt **18 yaş altı** olsun — bunlar
  kayıt akışının **reddetmesi gereken** kayıtlardır (PRD §5.0 yaş kuralı).
  Ayrıca 1 kayıt **tam bugün 18 yaşını dolduruyor** olsun (sınır durum testi:
  kabul edilmeli).
- **Ad, soyad, baba/anne adı:** Türkçe ad-soyad havuzundan üretilir.
- **Nüfus il/ilçe:** çoğunluğu İzmir, bir kısmı diğer illerden.
- **Nüfus adresi:** İzmir ilçeleri + uydurma mahalle/sokak.
- **Özel durumlar (hata yollarını test etmek için):** `KpsCitizen.simulationBehavior`
  alanı bu davranışı işaretler.

  | Senaryo | `simulationBehavior` | Adet |
  |---|---|---|
  | Normal kayıt | `normal` | ~190 |
  | 18 yaş altı | `normal` | 5 |
  | Sorguda zaman aşımı simüle eder | `timeout` | 1 |
  | Sorguda sunucu hatası simüle eder | `error` | 1 |
  | KPS'te bulunamayan numara | tabloda **kayıt yok** | — sorgu `not_found` döner |

**Test numaraları nasıl belirlenir:** seed çalıştığında bu özel kayıtların
numaraları `prisma/seed.ts` çıktısına ve `docs/project/test-hesaplari.md`
dosyasına yazılır. Numaralar seed'de sabit tohumla (deterministik) üretilir;
böylece her kurulumda aynı numaralar oluşur ve testler bunlara güvenebilir.
Local ve preview ortamında giriş ekranında "test kayıtları" olarak gösterilebilir;
**production'da gösterilmez.**

## Proje sahibi hesabı (tek gerçek kayıt)

Seed, aşağıdaki ortam değişkenleri **tanımlıysa** bir gerçek hesap oluşturur:

```
OWNER_TCKN=  OWNER_FULL_NAME=  OWNER_EMAIL=  OWNER_PHONE=
```

- Bu değerler **hiçbir dosyaya yazılmaz**; yalnızca `.env` ve dağıtım platformunun
  ortam değişkeni panelinde bulunur. `.env.example` sadece anahtar adlarını içerir.
- Değişkenler yoksa seed bu hesabı atlar ve hatasız tamamlanır.
- Bu hesap hem `kps_citizens` tablosuna hem de `StaffMember` tablosuna eklenir:
  **Bilgi İşlem Dairesi Başkanlığı → Yazılım Geliştirme Şube Müdürlüğü**.
- Böylece KPS ile giriş yaptığında `isStaff = true` olur ve hastane + spor salonu açılır.
- Aynı kişi Google ile ayrı bir hesap açarsa o hesap doğrulanmamış kalır ve
  bu iki hizmete erişemez — erişim kademelerini canlı gösterebilmek için kasıtlıdır.
- Personel rehberinde (Hakkımızda) bu kayıt da diğerleri gibi görünür; **ekranda
  yalnızca kurumsal e-posta ve dahili numara gösterilir**, kişisel telefon gösterilmez.

## İnsan verisi

- **İsimler:** yaygın Türkçe ad + soyad havuzundan rastgele eşleştirilerek üretilir.
  Aynı ad-soyad ikilisi tekrarlanmaz. Havuz en az 60 ad + 60 soyad içerir.
- **Adresler:** İzmir ilçeleri (Konak, Karşıyaka, Bornova, Buca, Bayraklı, Çiğli,
  Gaziemir, Balçova, Narlıdere, Güzelbahçe, Karabağlar) + uydurma mahalle/sokak +
  `No: 1-120`, `Daire: 1-20`.
- **Örnek üye hesapları:** 10 adet, sahte KPS havuzundaki kişilerden seçilir.
  Şifre hepsinde `Test1234!` ve bu **yalnızca** local/preview seed'inde bulunur;
  production seed'i örnek kullanıcı oluşturmaz.
- **Doğrulama kodu (OTP):** local ve preview'da sabit `123456`, ekranda gösterilir.
  Production'da rastgele üretilir ve **e-posta ile gönderilir** — hem e-posta kodu
  hem telefon kodu (telefon kodu "SMS simülasyonu" başlığıyla, yine e-postaya).
  Production'da kod **hiçbir koşulda ekranda gösterilmez.**
- **Personel eşleştirmesi:** 100 sahte personelin kimlik numarası da sahte KPS
  havuzundan seçilir; böylece "KPS doğrulandı → personel çıktı" akışı test edilebilir.
  Sahte üye hesaplarının **en az 3'ü personel, 7'si normal vatandaş** olsun.

## Test kartları (kayıtlı kart olarak seed edilir)

| Numara | Marka | Sonuç |
|---|---|---|
| 4111 1111 1111 1111 | Visa | Başarılı |
| 5555 5555 5555 4444 | Mastercard | Başarılı |
| 4000 0000 0000 0002 | Visa | **Reddedildi** (hata yolu testi) |
| 4000 0000 0000 9995 | Visa | **Yetersiz bakiye** (hata yolu testi) |

Son kullanma `12/2030`, CVV `123`. Bu numaralar sektörde bilinen test numaralarıdır,
gerçek bir karta ait değildir. Veritabanına yalnızca son 4 hane yazılır.

---

## Fiyat bantları (TL, 2026 referansı)

Seed bu aralıkların dışına çıkmaz. Fiyatlar `.90` / `.50` gibi gerçekçi kuruşlarla biter.

**Market** (≈40 ürün, 6 kategori)
| Kategori | Aralık |
|---|---|
| Ekmek ve unlu mamul | 15 – 60 |
| Süt ürünleri (süt, peynir, yoğurt) | 55 – 350 |
| Temel gıda (pirinç, makarna, yağ, şeker) | 60 – 240 |
| Meyve–sebze (kg) | 35 – 160 |
| İçecek | 25 – 110 |
| Temizlik ve kağıt | 90 – 400 |

Stok: 0 – 200. En az 2 ürün **stok = 0** olsun (boş durum testi için).
Teslimat ücreti 59 TL; 750 TL üzeri siparişte ücretsiz.

**Restoran** (≈30 kalem, 5 kategori)
| Kategori | Aralık |
|---|---|
| Ana yemek | 180 – 340 |
| Ara sıcak | 90 – 170 |
| Yan ürün / salata | 55 – 120 |
| İçecek | 35 – 90 |
| Tatlı | 85 – 160 |

En az 2 kalem `isAvailable = false` (tükendi durumu için).

Teslimat ücreti 49,90 TL; 400 TL üzeri siparişte ücretsiz. Tahmini hazırlık
süresi 30–45 dakika — bu bir TAHMİN, sipariş kaydına yazılmaz, yalnızca ekranda
gösterilir. Değerleri proje sahibi belirledi (2026-08-07, adım 9): daha önce
hiçbir doküman restoran için ücret tanımlamıyordu. Eşik market'inkinden düşük,
çünkü bir öğün siparişi bir market alışverişinden küçüktür.

**Etkinlik** (≈12 etkinlik)
| Tür | Bilet aralığı |
|---|---|
| Tiyatro | 220 – 650 |
| Konser | 450 – 2.200 |
| Çocuk gösterisi | 150 – 350 |

Salon: 3 mekân, blok/sıra/koltuk düzeni (örn. 12 sıra × 16 koltuk).
Her etkinlikte koltukların **%20–40'ı satılmış** olarak seed edilir.

**Spor salonu**
| Paket | Taahhüt | Aylık ücret | İndirim (hesaplanır, saklanmaz) |
|---|---|---|---|
| Aylık (taahhütsüz) | yok | 949,90 | — (referans fiyat) |
| 3 Aylık | 3 ay | 854,90 | ≈ %10 |
| 6 Aylık | 6 ay | 807,40 | ≈ %15 |
| Yıllık | 12 ay | 712,40 | ≈ %25 |

Peşin toplu ödeme **yoktur**; her paket aylık tahsil edilir.
Fiyatlar `.90` / `.40` ile biter (dosyanın genel kuralı: gerçekçi kuruş).
İndirim yüzdesi veritabanında **tutulmaz**, taahhütsüz fiyattan hesaplanıp
yalnızca ekranda gösterilir (`data-model.md` → `MembershipPlan`).

**Tesis bilgisi, salon saatleri ve ders programı VERİTABANINDA DEĞİL**,
`src/features/gym/data/facility.ts` içinde sabit içerik olarak durur (adım 12).
Veri modelinde karşılığı olan bir tablo yok ve onu değiştirecek bir yönetici
paneli de yok; salt okunur, hiç yazılmayan bir içeriği tabloya taşımak bugün
hiçbir şey kazandırmazdı. İçeriğin tamamı uydurmadır: adres gerçek bir tesise
ait değildir, ders adları ve saatleri örnektir.

**Üyelik tohumlanmaz.** Hiçbir demo hesabın açılışta üyeliği yoktur; ekranın
"aktif üyeliğiniz yok" durumu da satın alma akışı da böylece ilk açılışta
denenebilir.

**Hastane randevu**
Ücret yoktur. 8 branş × 3–5 doktor. Her doktor için önümüzdeki 14 güne
20 dakikalık slotlar (09:00–12:00, 13:30–16:30). Slotların %30'u dolu seed edilir.

---

## Teşkilat şeması ve personel (100 kişi)

**Üst yapı (gösterim amaçlı, isimsiz):**
Büyükşehir Belediye Başkanlığı → Genel Sekreterlik → Genel Sekreter Yardımcılığı

Genel Sekreter Yardımcılığı altında **9 daire başkanlığı** seed edilir. Bunlardan
yalnızca **Bilgi İşlem Dairesi Başkanlığı** doludur; diğerleri şemada ismen
görünür ve altlarında birim/personel bulunmaz (PRD §5.9):

1. Fen İşleri Dairesi Başkanlığı
2. İtfaiye Dairesi Başkanlığı
3. Park ve Bahçeler Dairesi Başkanlığı
4. Ulaşım Dairesi Başkanlığı
5. Çevre Koruma ve Kontrol Dairesi Başkanlığı
6. İmar ve Şehircilik Dairesi Başkanlığı
7. Sağlık İşleri Dairesi Başkanlığı
8. Kültür ve Sosyal İşler Dairesi Başkanlığı
9. **Bilgi İşlem Dairesi Başkanlığı** ← 7 şube müdürlüğü + 100 personel

Daire adları gerçek belediye teşkilatlarına benzer seçilmiştir ama içerikleri
tamamen sahtedir; hiçbir gerçek personel veya iletişim bilgisi yoktur.

**Bilgi İşlem Dairesi Başkanlığı — 7 şube müdürlüğü:**
1. Yazılım Geliştirme Şube Müdürlüğü
2. Sistem ve Ağ Yönetimi Şube Müdürlüğü
3. Bilgi Güvenliği Şube Müdürlüğü
4. Coğrafi Bilgi Sistemleri (CBS) Şube Müdürlüğü
5. Veri Yönetimi ve Raporlama Şube Müdürlüğü
6. Teknik Destek ve Kullanıcı Hizmetleri Şube Müdürlüğü
7. Proje Yönetimi ve İdari İşler Şube Müdürlüğü

Her müdürlük altında 2–3 şeflik. Örnek şeflikler:
Web Uygulamaları Şefliği · Mobil Uygulamalar Şefliği · Entegrasyon Şefliği ·
Sunucu ve Sanallaştırma Şefliği · Ağ ve İletişim Şefliği · Siber Olaylara Müdahale Şefliği ·
Harita Üretim Şefliği · Veri Ambarı Şefliği · Çağrı ve Destek Şefliği · Satınalma Şefliği

**Kadro dağılımı — toplam 100:**
| Unvan | Adet |
|---|---|
| Daire Başkanı | 1 |
| Şube Müdürü | 7 |
| Şef | 16 |
| Mühendis (yazılım / ağ / harita) | 34 |
| Uzman / Sistem Uzmanı | 18 |
| Teknisyen | 12 |
| Memur / İdari Personel | 8 |
| Sözleşmeli Personel | 4 |

**Personel kaydı alanları:** ad soyad · unvan · bağlı birim (şeflik → müdürlük) ·
kurumsal e-posta (`ad.soyad@ornek.test`) · dahili numara (`1000–1999`, benzersiz) ·
işe başlama yılı (2005–2026).

**Gösterilmeyecekler:** cep telefonu, özel e-posta, doğum tarihi, kimlik numarası,
fotoğraf, adres. Rehber yalnızca kurumsal iletişim bilgisi gösterir.

---

## Görseller
- Ürün ve menü görselleri `public/images/` altında yerel dosyalardır; dış siteden
  sıcak bağlantı (hotlink) verilmez.
- Telifli görsel kullanılmaz: düz renk + ürün adı içeren üretilmiş placeholder
  görseller veya açık lisanslı görseller kullanılır.
- Her görselde anlamlı `alt` metni bulunur.
