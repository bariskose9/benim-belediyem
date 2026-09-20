# Altyapı Durumu

<!--
ŞABLON — `docs/project/altyapi-durumu.md` olarak kopyalanır ve doldurulur.
Bu yorum bloğu doldurduktan sonra silinir.

BU DOSYA NEDEN VAR
Depo yalnızca KODU görür. Üçüncü parti panellerini, açılmış hesapları ve
hangi ortam değişkeninin nerede tanımlı olduğunu göremez. Bunlar yazılmazsa
bir sonraki oturum bilemez ve kullanıcıya ZATEN YAPILMIŞ bir işi tekrar
yaptırır. (Bu gerçekten yaşandı: Cloudflare hesabı açılmıştı, sonraki oturum
"git hesap aç" dedi.)

NE ZAMAN GÜNCELLENİR
· Yeni bir hesap açıldığında
· Bir panelde ayar değiştiğinde
· Yeni ortam değişkeni eklendiğinde veya değeri yenilendiğinde
· Bir şey BİLEREK yapılmadığında (yoksa eksik sanılıp tekrar yapılır)

⛔ ASLA: gizli anahtar DEĞERİ yazılmaz. Yalnızca adı, nerede durduğu, ne işe
yaradığı. Değerler `.env` (commit edilmez) ve sağlayıcı panelindedir.
-->

> **Bu dosya "dış dünyada ne var" sorusunun tek cevabıdır.**
> Kullanıcıya "şu hesabı aç / şunu ayarla" demeden **önce burayı oku**.

## ⛔ HER SATIR ÜÇ ŞEYİ BİRDEN YAZAR: NE · NEREDE · NEDEN

"Neden" olmadan satır bir **kayıt** olur ama **karar** olmaz. Altı ay sonra o
ayarı değiştirmek isteyen biri neyi bozacağını bilemez.

```
2026-08-24 · Neon'da "proje-prod" veritabanı açıldı, bölge: Frankfurt
             Neden: KVKK — kişisel veri AB/Türkiye içinde kalsın. ⛔ Bölge
             sonradan DEĞİŞTİRİLEMEZ.
```

⚠️ Özellikle **geri alınamaz** kararlarda (veri bölgesi, alan adı, hesap
sahipliği) "neden" satırı zorunludur.

## ⭐ Bu dosya iki proje tipinde FARKLI dolar

`CLAUDE.md` §0'daki proje tipine bak:

| | **Kendi projem** | **İşyeri projesi** |
|---|---|---|
| Paneli kim açıyor | Kullanıcı — hesap ve ödeme onda | **Kurumun DevOps ekibi** |
| Dosya ne anlatır | **Yapılanları**: hangi servise üye olundu, hangi bölge seçildi, hangi değişken nereye girildi | **Gerekenleri**: canlıda neyin tanımlı olması gerektiği ve neden |
| Kim okur | Gelecekteki kullanıcı ve sonraki oturum | Teslimde **DevOps ekibi** |
| Örnek satır | *"Neon'da prod açıldı, Frankfurt — KVKK"* | *"Uygulama DIRECT_URL bekliyor; migration içindir, havuzsuz adres olmalı"* |

⛔ **İşyeri projesinde bu dosya bir "yapıldı defteri" değil, bir GEREKSİNİM
LİSTESİDİR.** Kullanıcı paneli açmıyor; açacak kişiye neyin **neden**
gerektiğini anlatıyor. Teslim paketinin en çok işe yarayan parçası budur.
> ⛔ Gizli anahtar DEĞERİ buraya yazılmaz.

**Son güncelleme:** <!-- TARİH · hangi adım sonrası -->

---

## Hesaplar

<!-- Hangi serviste hesap var, hangi e-postayla, ücretsiz katman sınırı ne. -->

| Servis | Hesap / proje kimliği | Ücretsiz katman | Ne için |
|---|---|---|---|
| | | | |

## Panelde yapılandırılanlar

<!--
Her servis için AYRI başlık. "Hesap var" yetmez; panelde ne SEÇİLDİĞİ yazılır:
widget adı, izin verilen alan adları, seçilen mod, anahtarın izin kapsamı,
doğrulanmış alan adı olup olmadığı. Sonraki oturum bunu göremez.
-->

### <servis adı>
- <ne yapılandırıldı>
- <hangi sınır / hangi kısıt>

## Ortam değişkeni matrisi

<!--
EN KRİTİK BÖLÜM. "Eksikse ne olur" sütunu boş bırakılmaz: uygulama hiç açılmıyor
mu, yoksa yalnızca bir özellik mi kapanıyor? Bu ayrım bir sonraki oturumun
paniklemesini veya gereksiz uğraşmasını engeller.
-->

| Değişken | local | preview | production | Eksikse ne olur |
|---|:---:|:---:|:---:|---|
| | | | | |

**Anahtarlar ortama özeldir** (`13-environments.md`): aynı değişkenin üç ortamda
**farklı değeri** olur. Canlı anahtar local'de kullanılmaz.

## Bilinçli olarak YAPILMAYANLAR

<!--
Eksik DEĞİL, KARAR olan şeyler. Yazılmazsa bir sonraki oturum "bu eksik kalmış"
deyip geri alır veya kullanıcıya gereksiz iş çıkarır.
-->

- **<yapılmayan şey>** — <gerekçe>

## Ajanın erişebildikleri

<!--
Hangi CLI kurulu ve giriş yapılmış, hangisi `npx` ile çağrılıyor, hangisi hiç
yok. Ayrıca sağlayıcının geri VERMEDİĞİ şeyler (örn. gizli değerler).
-->

| Araç | Durum | Not |
|---|---|---|
| | | |

## Canlı adresler

- **Production:** <adres>
- **Sağlık ucu:** <adres>/api/health
- **Preview:** <biçim>
- **Depo:** <adres>
