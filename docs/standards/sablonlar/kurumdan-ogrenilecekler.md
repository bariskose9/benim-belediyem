# Kurumdan Öğrenilecekler

<!--
ŞABLON — YALNIZCA İŞYERİ PROJELERİNDE açılır (`docs/project/` altına).
Kendi projende bu dosyaya gerek yok: soracak bir kurum yok.
Bu yorum bloğu doldurduktan sonra silinir.

BU DOSYA NEDEN VAR
Bir kurum projesinde bazı bilgileri YALNIZCA kurum bilir. Ajan bunları
türetemez, tahmin ederse yanlış varsayım tüm katmanlara yayılır.
Bu dosya o soruları toplar ve cevapları takip eder.

⛔ BURAYA MÜHENDİSLİK SORUSU YAZILMAZ. "Cursor mı offset mi", "hangi index",
"UUID mi artan sayı mı" gibi sorular AJANA aittir
(`11-agent-workflow.md` → "Mühendislik seçimi kullanıcıya devredilmez").
Buraya yalnızca kurumun bilebileceği OLGULAR girer.

NE ZAMAN SİLİNİR
Bütün cevaplar `PRD.md` ve `altyapi-durumu.md`'ye işlendiğinde.
-->

**Son güncelleme:** <!-- TARİH -->

## Nasıl kullanılır

| Durum | Ne yap |
|---|---|
| Cevabı aldın | **Cevap** kolonunu doldur, ilgili belgeye işle |
| Cevap *"bilmiyorum"* geldi | ⚠️ **Varsayım** yaz → `PRD.md` → *Varsayımlar* |
| Soru gereksiz çıktı | Sil, ama **neden gereksizdi** yaz |

⭐ Her soruda üç şey bulunur: **neden soruyorum · cevaba göre ne değişir ·
cevap gelmezse ne yaparım.** Üçü olmadan soru karşı tarafta havada kalır.

## ⭐ AŞAMA HARİTASI — ne, hangi adımda, kimden, neden o zaman

Her soru **cevabının işe yarayacağı son andan önce** sorulur; ne daha erken
(kurum "daha PRD yok" der), ne daha geç (migration yeniden yazılır). Kurumda
üç ayrı muhatap vardır ve her biri yalnızca kendi alanını bilir:

| Muhatap | Ne bilir |
|---|---|
| **İş birimi** (projeyi isteyen müdürlük) | Kullanıcılar, süreç, kapsam, kişisel veri, hedef kitle |
| **Veritabanı birimi / DBA** | Sunucu, şema, hesaplar, izinler, standart, havuz, yedek |
| **DevOps** | Sunucular, hat (pipeline), gizli değerler, kalıcı disk, ağ çıkışı, yayına alma |

| Aşama (`SKILL.md`) | Öğrenilecek | Kimden | Neden bu aşamada |
|---|---|---|---|
| **Adım 1 — mod** | Kod nereye (GitLab adresi, hesap) · teslim tarihi · kurumun yazılı standartları var mı (**belge istenir**, PDF'i alınır) | Proje sahibi · DevOps | Bunlar bilinmeden tek dosya doğru açılmaz; standart PDF'i alınmadan veri modeli kurulmaz |
| **Adım 3 — PRD** | Hedef kitle ve **tarayıcı tabanı** (eski Android/WebView payı) · API'yi **başka kurum modülü** tüketecek mi · **kendiliğinden** çalışan iş var mı · **kişisel / özel nitelikli** veri var mı (KVKK) · aynı anda kaç kullanıcı | İş birimi | Stack kararı (Adım 3b) bu cevaplara dayanır; PRD'siz sorulursa kurum tahmin eder |
| **Adım 3b — stack** | Veritabanı **PostgreSQL mi Oracle mı** · kurumda hazır **kuyruk / önbellek** altyapısı var mı · kurum ağından **dış servise çıkış** var mı (Google, Cloudflare, npm registry) · **paket yöneticisi** (npm/pnpm — DevOps hattı hangisini koşturuyor) · kurumun **SMS / e-posta** servisleri | DB birimi · DevOps | ORM, bot koruması, kuyruk aracı ve Docker imajı bunlara göre seçilir; sonradan değişmesi projeyi yeniden kurar |
| **Adım 4 — kurulum** | **Şema adı** ve iki hesap (`svc_` / `mig_` örneği) · **havuz üst sınırı** · **eklenti (extension)** kurulabilir mi (`unaccent`, `pgcrypto`) · **DDL'i kim koşturuyor** · **gizli değerleri kim, nereye giriyor** · CI hattı **merkezî mi**, kendi adımımızı ekleyebiliyor muyuz | DB birimi · DevOps | İlk migration, `Dockerfile` ve `.env.example` bunlara göre yazılır |
| **Adım 5 — veri modeli** | **Audit tablosunun** zorunlu yapısı · **KVKK şifreleme** yöntemi ve anahtar yönetimi · isimlendirme **istisnaları** (modül öneki) · **lookup tablosu** kuralı · PK biçimi (`BIGINT IDENTITY`) | DB birimi | ⛔ İlk migration'dan **önce**; sonrası kolon yeniden adlandırma migration'ı demek |
| **Adım 6b — teslim** | **Test sunucusuna** kim, ne zaman, hangi daldan alıyor · **canlıya çıkış** nasıl tetikleniyor · test DB'si **kopya mı boş mu** · **kalıcı disk** (yüklenen dosyalar) · **geri almayı** kim yapıyor · **log toplama** biçimi ve izleme | DevOps | Teslim paketi ve `altyapi-durumu.md` bununla dolar; `13-environments.md` → *"Yol C"* |

⭐ **Her sorunun cümlesi, "neden soruyorum · ne değişir · cevap gelmezse"
üçlüsüyle aşağıdaki bölümlerde (BÖLÜM 4–6).** Bu tablo yalnızca **zamanlamayı** verir.

⚠️ **Emsalden gelen bilgi "doğrulanacak" işaretlenir.** Kurumdaki önceki bir
projeden (`00-stack.md` → *"DAYATILAN SEÇİM, KİTİN VARSAYILANINI YENER"* → *Emsal ≠ dayatma*) öğrenilen olgu — hesap adı
deseni, SMS servisi, hat yapısı — cevap sayılmaz; **bu proje için** sorulur,
cevap gelene kadar varsayım olarak durur.

---

---

# BÖLÜM 1 — Altyapı ve teslim

## 1.1 Kod nereye gönderilecek

> *"Kodu nereye göndermemi istersiniz — GitHub mı, kurumun GitLab'ı mı?
> Hesap ve adres verilecek mi?"*

| | |
|---|---|
| **Neden soruyorum** | Değişiklik önerisi (PR/MR) yalnızca bir barındırma servisinde olur; `git` tek başına üretemez |
| **Ne değişir** | Hangi CI dosyasının birincil olduğu ve teslim linkinin nereden verileceği |
| **Cevap gelmezse** | GitHub'da başlanır. ⭐ CI adımları `package.json` betiğinde olduğu için iki platform dosyası da hazır bekler; adres sonra gelirse ikinci remote eklenir |
| **Cevap** | *(doldurulacak)* |

## 1.2 Teslim tarihi ve varsa ara teslimler

> *"Son tarih nedir? Ara teslim veya demo bekleniyor mu?"*

| | |
|---|---|
| **Neden soruyorum** | Kapsam kararları buna göre verilir |
| **Ne değişir** | Süre darsa **zorunlu olmayan** maddeler kapsam dışı kalır |
| **Cevap gelmezse** | Yol haritası tam kapsamla kurulur, riskli maddeler işaretlenir |
| **Cevap** | *(doldurulacak)* |

## 1.3 Kurumun kendi standartları var mı

> *"Veri tabanı isimlendirme, kod standardı, API sözleşmesi gibi kurum içi
> yazılı kurallarınız var mı?"*

| | |
|---|---|
| **Neden soruyorum** | Varsa ve uyulmazsa teslim doğrudan kural ihlali sayılır |
| **Ne değişir** | ⚠️ **Veri modelinin tamamı** — tablo/kolon adları, birincil anahtar biçimi, tarih alanları |
| **Cevap gelmezse** | Yaygın pratik: `snake_case`, çoğul tablo adı, `id` birincil anahtar, `created_at`/`updated_at`. `PRD.md` → Varsayımlar'a yazılır |
| **Cevap** | *(doldurulacak)* |

⚠️ **Bu soruyu ilk gün sor.** Cevap sonradan gelirse tüm migration'lar
yeniden yazılır.

---

# BÖLÜM 2 — DevOps sınırı

⭐ **Üç sorunun tamamı ve "bu ne demek" açıklamaları
`CALISMA-KILAVUZU.md` → *"DevOps sınırı — işe başlamadan sorulacak üç soru"*
bölümünde.** Burada yalnızca cevaplar tutuluyor.

| # | Soru | Cevap |
|---|---|---|
| 2.1 | Migration'ı canlıda kim çalıştırıyor | *(doldurulacak)* |
| 2.2 | Gizli değerleri kim, nereye giriyor | *(doldurulacak)* |
| 2.3 | Bir sürüm bozarsa geri almayı kim yapıyor | *(doldurulacak)* |

⛔ Cevaplar `docs/project/altyapi-durumu.md`'ye de işlenir — kodda
görünmezler.

---

# BÖLÜM 3 — Kapsam soruları

<!--
Analiz dokümanında GEÇMEYEN ama "şu da olsa iyi olurdu" denebilecek maddeler.
Sorulmazsa gündeme getirilmez; sorulursa cevabın hazır olsun.
Her satırda: istenirse ne gerekir, süreye etkisi ne.
-->

| Konu | Belgede var mı | Eklenirse ne gerekir |
|---|---|---|
| <konu> | ⛔ Yok | <ek süre / ek servis / ek risk> |

⭐ Kapsam dışı bırakılan her madde `PRD.md` → *Kapsam dışı* bölümüne
**gerekçesiyle** yazılır. Yazmak zayıflık değil, kapsama hâkim olmaktır.

---

# BÖLÜM 4 — Veritabanı birimi

<!--
Adım 3b, 4 ve 5'te sorulur. Muhatap: DBA / veritabanı birimi.
Önce dizin tablosu, altında her sorunun tam hâli.
-->

| # | Konu | Aşama | Cevap |
|---|---|---|---|
| 4.1 | PostgreSQL mi Oracle mı | 3b | *(doldurulacak)* |
| 4.2 | Şema adı · uygulama hesabı · şema sahibi hesabı | 4 | *(doldurulacak)* |
| 4.3 | DDL'i kim koşturuyor · migration biçimi · koşucu · `schema_history` | 4 | *(doldurulacak)* |
| 4.4 | Bağlantı havuzu üst sınırı | 4 | *(doldurulacak)* |
| 4.5 | Eklenti kurulabilir mi | 4 | *(doldurulacak)* |
| 4.6 | İsimlendirme · modül öneki · PK · `public_id` | 5 | *(doldurulacak)* |
| 4.7 | Audit tablosu | 5 | *(doldurulacak)* |
| 4.8 | KVKK şifreleme | 5 | *(doldurulacak)* |
| 4.9 | Test veritabanı | 6b | *(doldurulacak)* |

## 4.1 Veritabanı PostgreSQL mi, Oracle mı

> *"Bu proje için veritabanı PostgreSQL'de mi açılacak, yoksa mevcut bir Oracle
> şemasına mı bağlanacağız? Kurum Oracle'dan PostgreSQL'e geçiyor diye
> biliyoruz — yeni projeler hangisinde açılıyor?"*

| | |
|---|---|
| **Neden soruyorum** | Kitin ORM'i Prisma, Oracle'ı **hiç desteklemez**. Cevap Oracle ise ORM dahil veri katmanı değişir (TypeORM/Knex + `node-oracledb`) ve tip karşılıkları farklıdır (`NUMBER`, `VARCHAR2`, boolean yok) |
| **Ne değişir** | Stack'in veri katmanı; `00-stack.md` ORM satırı; migration biçimi |
| **Cevap gelmezse** | PostgreSQL varsayılır; ADR'ye "Oracle çıkarsa yeniden kurulur" riski yazılır |
| **Cevap** | *(doldurulacak)* |

## 4.2 Şema adı ve iki hesap

> *"Bize PostgreSQL'de ayrı bir şema mı açılacak (adı ne olacak), yoksa kendi
> veritabanımız mı olacak? Uygulama için iki hesap istiyoruz: biri yalnızca
> okuma/yazma yetkili (uygulama çalışırken), biri tablo açma/değiştirme yetkili
> (yalnızca migration için). Hesap adlandırma kuralınız var mı (`svc_` /
> `mig_` gibi)?"*

| | |
|---|---|
| **Neden soruyorum** | **Şema** (schema): paylaşımlı veritabanı içinde bize ayrılan bölme; tablolarımız orada yaşar, `DATABASE_URL`'e `?schema=…` olarak girer. **İki hesap**: en az yetki ilkesi — çalışan uygulama tabloyu değiştiremez (`04-database.md` → *"MIGRATION ARACI"*) |
| **Ne değişir** | `.env.example`'daki değişken adları; `GRANT` satırları; migration koşucusunun hangi hesapla çalışacağı |
| **Cevap gelmezse** | Şema `<kurum>_<proje>`, hesaplar `svc_<proje>` (DML) ve `mig_<proje>` (DDL) diye **talep** edilir; standart yoksa öneri olarak sunulur |
| **Cevap** | *(doldurulacak)* |

## 4.3 Migration'ı kim koşturuyor, hangi biçimde

> *"Şema değişikliklerini (migration) canlıda kim uyguluyor: uygulama açılışta
> DDL hesabıyla kendisi mi, yoksa siz elle mi? Dosyaları Flyway biçiminde
> (`V1__ad.sql`, `R__`, `U__`) teslim edeceğiz — sizde Flyway kurulu mu, yoksa
> koşucuyu biz mi yazalım? Kayıt tablosunun (`schema_history`) adı ve şeması
> konusunda beklentiniz var mı?"*

| | |
|---|---|
| **Neden soruyorum** | Cevap `Dockerfile`'ın başlangıç komutunu belirler: uygulama koşturuyorsa açılışta `migrate.mjs`, hata varsa kap düşer; DB birimi koşturuyorsa `DB_MIGRATE_ON_START=false` ve dosyalar teslim paketine girer. Biçim ve kayıt tablosu adı bilinmezse DBA'nin defteriyle bizimki uyuşmaz |
| **Ne değişir** | Dockerfile, `docker-entrypoint.sh`, teslim paketi, `13-environments.md` → *"Yol C"* senaryosu |
| **Cevap gelmezse** | "DB birimi elle koşturur" varsayılır (kurumsal yaygın); koşucu bizde yazılır, `schema_history` adı kullanılır |
| **Cevap** | *(doldurulacak)* |

## 4.4 Bağlantı havuzu üst sınırı

> *"Uygulamamız için kaç eşzamanlı veritabanı bağlantısı hakkımız var? Sunucu
> paylaşımlı olduğu için havuz üst sınırını ona göre ayarlayacağız."*

| | |
|---|---|
| **Neden soruyorum** | **Bağlantı havuzu** (connection pool): açık bağlantıların yeniden kullanıldığı taksi durağı. PostgreSQL her bağlantı için ayrı süreç açar; sunucunun toplam sınırı var (`max_connections`), kırk proje paylaşıyor. Biz 50 dersek başkasını düşürürüz; DBA "10" diyorsa `pool.max = 10`, iki kopya varsa 5+5 |
| **Ne değişir** | Havuz ayarı; kopya sayısıyla çarpımı; ani yük planı (`12-operations-and-scaling.md`) |
| **Cevap gelmezse** | 10 varsayılır, `altyapi-durumu.md`'ye "doğrulanmadı" yazılır |
| **Cevap** | *(doldurulacak)* |

## 4.5 Eklenti (extension) kurulabilir mi

> *"Şemamızda PostgreSQL eklentisi kullanabilir miyiz — `unaccent` (Türkçe
> aksansız arama), `pg_trgm` (benzer metin arama), `pgcrypto`? Kurulum sizde
> mi, talep mi ediyoruz?"*

| | |
|---|---|
| **Neden soruyorum** | Eklenti kurmak süper kullanıcı ister; bizim hesabımız kuramaz. Arama davranışı (`04-database.md` → *"Metin arama"*) eklentiye bağlı |
| **Ne değişir** | Arama tasarımı; yoksa sadeleştirme uygulama tarafında yapılır (ikinci doğruluk kaynağı riski bilinerek) |
| **Cevap gelmezse** | Eklenti **yok** varsayılır; arama tam eşleşme + `ILIKE` ile başlar |
| **Cevap** | *(doldurulacak)* |

## 4.6 İsimlendirme, birincil anahtar, `public_id`

> *"Veritabanı standardınızdaki isimlendirme (`tbl_` öneki, Türkçe karaktersiz
> Türkçe ad, tekil tablo, `aktif`/`olusturma_tarihi` kolonları) yeni projeler
> için bağlayıcı mı? Tablo adında modül öneki (`tbl_hr_personel` gibi) bekliyor
> musunuz? Birincil anahtar için `BIGINT IDENTITY` bağlayıcı mı; vatandaşın
> gördüğü kayıtlarda ayrıca tahmin edilemez bir `public_id` kolonu tutmamıza
> itiraz var mı?"*

| | |
|---|---|
| **Neden soruyorum** | Bu cevaplar **ilk migration'dan önce** lazım — sonradan yeniden adlandırma migration'ı ve veri taşıma riski. `public_id`: `…/basvuru/4813` diye ardışık sayı URL'de görünürse komşu kayıt tahmin edilir (IDOR); yetki kontrolü asıl çözüm, `public_id` ek katman |
| **Ne değişir** | Kod modunda kod dili (`02-coding-standards.md`), `@map` satırları, PK tipi, migration SQL düzeltmesi (`BIGSERIAL` → `IDENTITY`) |
| **Cevap gelmezse** | Standart PDF aynen uygulanır; `public_id` eklenir (zararsız) |
| **Cevap** | *(doldurulacak)* |

## 4.7 Denetim kaydı (audit) tablosu

> *"`tbl_app_audit` merkezî tek tablo mu, her proje kendi şemasında kendi audit
> tablosunu mu açıyor? Kolonlar standarttaki gibi mi (before-image JSONB,
> `ic_ip`/`dis_ip`, `os_kullanici`, `makine_adi`)? İstemci IP'sini ters vekil
> (reverse proxy) arkasından `X-Forwarded-For` başlığıyla mı alacağız? Tanım
> tablolarında `sira` ve `aktif` kolonlarını da bekliyor musunuz?"*

| | |
|---|---|
| **Neden soruyorum** | **Ters vekil**: kurumun önündeki kapı sunucusu (Nginx gibi); isteği o karşılar, bize iletir; gerçek IP'yi bir başlıkta taşımazsa hep onun IP'sini görürüz ve audit'teki `dis_ip` anlamsız olur. Tablo yapısı `04-database.md` → *"Denetim kaydı"* |
| **Ne değişir** | Audit yazan mekanizmanın hedefi ve kolonları; IP okuma kodu |
| **Cevap gelmezse** | Proje şemasında kendi tablosu, standart kolonlar; IP için `X-Forwarded-For` okunur, yoksa `req.ip` |
| **Cevap** | *(doldurulacak)* |

## 4.8 KVKK şifreleme

> *"Kişisel veri kolonlarını (TCKN, telefon, e-posta…) uygulama katmanında
> AES-256-GCM ile şifreleyip `BYTEA` tutacağız; arama için yanına tuzlu HMAC
> özet kolonu koyacağız (tam eşleşme). Hangi alanların kapsamda olduğunu
> birlikte listeleyelim. Şifreleme anahtarı nerede duracak — DevOps'un girdiği
> ortam değişkeni mi, kurumun anahtar kasası mı? Anahtar döndürme (rotation)
> beklentiniz var mı?"*

| | |
|---|---|
| **Neden soruyorum** | Şifreli kolonda `LIKE` yok; hangi alanla arama yapılacağı **tasarımı** belirler. Anahtar yeri `.env.example`'ı ve teslim talimatını değiştirir. Kural `14-privacy-and-compliance.md` → *"Kişisel veriyi şifreli saklamak"* |
| **Ne değişir** | Şifrelenen kolon listesi (`data-model.md`), anahtar yönetimi, arama ekranları |
| **Cevap gelmezse** | Standart PDF listesi (TCKN, ad-soyad, telefon, e-posta, adres) şifrelenir; anahtar ortam değişkeni; `v1:` sürüm öneki baştan konur |
| **Cevap** | *(doldurulacak)* |

## 4.9 Test veritabanı

> *"Test sunucusundaki veritabanı canlının kopyası mı, boş mu? Kopyaysa kişisel
> veriler maskeleniyor mu?"*

| | |
|---|---|
| **Neden soruyorum** | Canlı kişisel veri maskesiz teste kopyalanamaz (KVKK). Boşsa seed (sahte veri) yazılır |
| **Ne değişir** | Seed betiği ve `fake-data-guide.md`; teste erişim yetkileri |
| **Cevap gelmezse** | Boş + seed varsayılır |
| **Cevap** | *(doldurulacak)* |

---

# BÖLÜM 5 — Ağ, dış servisler ve hat

> Bu bölümün cevapları **teslim paketine** girer (`SKILL.md` → *"Adım 6b"*):
> Dockerfile, compose, `.env.example`, README, migration stratejisi, `/api/health`.

<!-- Adım 3b ve 4'te sorulur. Muhatap: DevOps. -->

| # | Konu | Aşama | Cevap |
|---|---|---|---|
| 5.1 | Kurum ağından dış servise çıkış | 3b | *(doldurulacak)* |
| 5.2 | Kurumun SMS ve e-posta servisi | 3b | *(doldurulacak)* |
| 5.3 | Hazır kuyruk / önbellek altyapısı | 3b | *(doldurulacak)* |
| 5.4 | Paket yöneticisi | 3b | *(doldurulacak)* |
| 5.5 | CI hattı | 4 | *(doldurulacak)* |
| 5.6 | Yüklenen dosyalar | 4 | *(doldurulacak)* |
| 5.7 | Log ve izleme | 6b | *(doldurulacak)* |

## 5.1 Dış ağa çıkış

> *"Test ve canlı sunucular kurum ağından dışarı çıkabiliyor mu — Google
> (reCAPTCHA, Fonts), Cloudflare (Turnstile), npm registry, harici API'ler?
> Çıkış yoksa hangi adresler için izin (whitelist) istenebiliyor?"*

| | |
|---|---|
| **Neden soruyorum** | Bot koruması (Turnstile/reCAPTCHA) ve derleme (npm) dış ağa çıkış ister. Çıkış yoksa bot koruması **fail-closed** (Google'a ulaşılamayınca girişi reddetme) kullanıcıyı kilitler; Docker derlemesi npm'e ulaşamazsa imaj çıkmaz |
| **Ne değişir** | Bot koruması seçimi/ayarı; fontların self-host edilmesi; imajın DevOps'un registry aynasından derlenmesi |
| **Cevap gelmezse** | "Çıkış yok" varsayılır: dış servisler simüle (`00-stack.md` → *"SİMÜLE EDİLEN DIŞ SERVİS"*), fontlar self-host |
| **Cevap** | *(doldurulacak)* |

## 5.2 SMS ve e-posta servisi

> *"Kurumun SMS ve e-posta gönderim servisleri neler (adres, kimlik doğrulama
> yöntemi, belge)? Test ortamından gerçek SMS gidebiliyor mu, yoksa test
> ortamı için sahte kanal mı var?"*

| | |
|---|---|
| **Neden soruyorum** | Kit kendi projede Resend kullanır; kurumda kurumun ağ geçidi. İki adımlı giriş (OTP) bu servise bağlı; belgesi olmadan bağlanılamaz (`integrations.md`) |
| **Ne değişir** | `integrations.md`, `.env.example`'daki değişkenler, OTP kanalı |
| **Cevap gelmezse** | Simüle kanal (konsola/e-posta kutusuna yazan sahte gönderici); gerçeğine geçiş yolu ADR'de |
| **Cevap** | *(doldurulacak)* |

## 5.3 Kuyruk ve önbellek altyapısı

> *"Kurumda hazır bir Redis / RabbitMQ / Kafka var mı; projeler kendi Redis'ini
> mi çalıştırıyor?"*

| | |
|---|---|
| **Neden soruyorum** | Arka plan işi (SMS kuyruğu, rapor) için BullMQ Redis ister. Kurumunki varsa yenisi kurulmaz (`00-stack.md` → *"İş kuyruğu"*) |
| **Ne değişir** | Compose'a Redis girer mi; bağlantı bilgisi |
| **Cevap gelmezse** | Kendi Redis konteynerimiz Compose'da; DevOps'a "kalıcı Redis gerekir" notu |
| **Cevap** | *(doldurulacak)* |

## 5.4 Paket yöneticisi

> *"CI hattınız `npm ci` mi `pnpm install` mi çalıştırıyor? Lock dosyasını ona
> göre üreteceğiz."*

| | |
|---|---|
| **Neden soruyorum** | Kit `pnpm` tercih eder; hat `npm ci` koşturuyorsa `pnpm-lock.yaml` ile ilk adımda kırılır. Kural: kurum hangisini koşturuyorsa o (`00-stack.md` → *"DAYATILAN SEÇİM"*) |
| **Ne değişir** | `package.json` → `packageManager`, lock dosyası, Dockerfile |
| **Cevap gelmezse** | `npm` varsayılır (kurumsal yaygın) |
| **Cevap** | *(doldurulacak)* |

## 5.5 CI hattı

> *"Hat merkezî DevOps deposundan `include` ile mi geliyor? `include` yanına
> kendi doğrulama işimizi (`verify: pnpm ci:verify` — lint, tip, test, derleme)
> ekleyebiliyor muyuz; ekleyemiyorsak hattınız bu adımları koşturuyor mu?
> Dal → ortam eşlemesi nasıl: `main` test sunucusuna mı, etiket canlıya mı?"*

| | |
|---|---|
| **Neden soruyorum** | Hattı biz yazmıyorsak "CI kırmızıysa merge yok" kapısı kaybolabilir; kapı `pre-push` kancasına taşınır. Dal eşlemesi bilinmezse deneme etiketi canlıya çıkabilir (`09-ci-cd-deploy.md` → *"HAT KURUMUN MERKEZÎ DEPOSUNDAN GELİYORSA"*) |
| **Ne değişir** | `.gitlab-ci.yml` içeriği, kanca kapsamı, etiketleme disiplini |
| **Cevap gelmezse** | Yerel iş eklenemez varsayılır: `pre-push` tam `ci:verify`; etiket atmadan önce DevOps'a sorulur |
| **Cevap** | *(doldurulacak)* |

## 5.6 Yüklenen dosyalar

> *"Yüklenen dosyalar için kurumda S3-uyumlu bir nesne deposu (MinIO vb.) var
> mı? Yoksa konteynere kalıcı disk (volume) kim bağlıyor, yedeğini kim alıyor?
> Uygulama kaç kopya (replica) çalışacak? Yüklenen dosyalar için virüs taraması
> (ClamAV vb.) var mı?"*

| | |
|---|---|
| **Neden soruyorum** | Konteyner geçicidir; dosya dışarıda durmalı. İki kopya varsa yerel disk çalışmaz. Kural `05-auth-security.md` → *"Dosya yükleme ve depolama"* |
| **Ne değişir** | `FILE_STORAGE_DRIVER` (`s3` / `local` / `db`), Compose volume, yedek sorumluluğu |
| **Cevap gelmezse** | `local` sürücü + tek kopya varsayılır; volume ve yedek `altyapi-durumu.md`'ye DevOps sorumluluğu olarak yazılır |
| **Cevap** | *(doldurulacak)* |

## 5.7 Log ve izleme

> *"Uygulama loglarını nasıl topluyorsunuz — JSON satır bekliyor musunuz, hangi
> araca gidiyor (ELK, Loki, Graylog)? Canlıda hata ve performansı izlemek için
> bizim erişebileceğimiz bir panel var mı, yoksa DevOps mu izliyor?"*

| | |
|---|---|
| **Neden soruyorum** | Log biçimi kurumun toplama sistemiyle **sözleşmedir** (`12-operations-and-scaling.md`); düz metin toplanamaz. İzlemeyi biz yapmıyorsak Sentry kurulmaz, JSON log üretilir |
| **Ne değişir** | Logger ayarı (pino JSON), Sentry'nin kurulup kurulmayacağı |
| **Cevap gelmezse** | JSON log stdout'a; Sentry kurulmaz |
| **Cevap** | *(doldurulacak)* |

---

# BÖLÜM 6 — Hedef kitle ve kapsam

<!-- Adım 3'te, PRD görüşmesinde sorulur. Muhatap: iş birimi. -->

| # | Konu | Aşama | Cevap |
|---|---|---|---|
| 6.1 | Tarayıcı tabanı | 3 | *(doldurulacak)* |
| 6.2 | API'yi başkası tüketecek mi | 3 | *(doldurulacak)* |
| 6.3 | Kendiliğinden çalışan iş | 3 | *(doldurulacak)* |
| 6.4 | Kişisel veri ve arama alanı | 3 | *(doldurulacak)* |
| 6.5 | Çok dillilik: İngilizce (veya başka dil) sürüm isteniyor mu; arayüz mü, içerik de mi | 3 | *(doldurulacak)* |
| 6.6 | Yenilenecek eski sistem var mı: kaynak kodu · veritabanı erişimi · belge · kim kullanıyor · "yazılı olmayan kurallar" | 3 | *(doldurulacak)* |

## 6.1 Tarayıcı tabanı

> *"Bu sistemi kimler kullanacak — vatandaş mı, yalnızca personel mi? Vatandaşa
> açıksa eski Android telefon ve kurum içi uygulama içinden (WebView) açılma
> payı yüksek mi?"*

| | |
|---|---|
| **Neden soruyorum** | Modern CSS (Tailwind v4) eski tarayıcıda **hiç** görünmeyebilir; kamu sitesinde eski Android payı yüksektir. Hedef bilinirse `browserslist` ve düşürme zinciri baştan kurulur; sonradan fark edilirse stil katmanı yeniden yazılır |
| **Ne değişir** | `browserslist`, PostCSS ayarı, test matrisi |
| **Cevap gelmezse** | Vatandaşa açıksa "Chrome/WebView 80+" varsayılır ve PRD'ye yazılır |
| **Cevap** | *(doldurulacak)* |

## 6.2 API'yi başkası tüketecek mi

> *"Bu sistemin verisini başka bir kurum sistemi, mobil uygulama ya da dış
> kuruluş kullanacak mı — bugün veya öngörülebilir gelecekte?"*

| | |
|---|---|
| **Neden soruyorum** | Cevap mimariyi belirler: "evet" → arayüz ve API ayrı programlar (Next + NestJS), OpenAPI belgesi, sürümleme (`00-stack.md` → *"DÖRT KURGU"*). Sonradan ayırmak servis katmanını yeniden yazmaktır |
| **Ne değişir** | Kurgu [B] mi [C] mi; monorepo; sözleşme paketi |
| **Cevap gelmezse** | Kurum projesinde "evet" varsayılır — kurum sistemleri birbirine bağlanır |
| **Cevap** | *(doldurulacak)* |

## 6.3 Kendiliğinden çalışan iş

> *"Kimse ekranı açmasa da çalışması gereken bir iş var mı — gece raporu,
> hatırlatma SMS'i, dış sistemden gelen bildirimi karşılama, zamanlanmış
> aktarım?"*

| | |
|---|---|
| **Neden soruyorum** | Varsa sürekli açık bir worker ve kuyruk (BullMQ + Redis) gerekir; sunucusuz Next tek başına bunu yapamaz |
| **Ne değişir** | Kurgu; Redis; DevOps'a "worker konteyneri" talebi |
| **Cevap gelmezse** | "Yok" varsayılır; servis katmanı HTTP'den bağımsız yazıldığı için sonradan eklenebilir |
| **Cevap** | *(doldurulacak)* |

## 6.4 Kişisel veri ve arama alanı

> *"Sistemde hangi kişisel veriler tutulacak (TCKN, telefon, adres, sağlık
> bilgisi…)? Personel kayıtları hangi alanla arayacak — TCKN ile mi, ad-soyad
> ile mi, başvuru numarası ile mi?"*

| | |
|---|---|
| **Neden soruyorum** | Şifreli alanda kısmi arama yapılamaz; "ad-soyadla arasınlar" isteniyorsa ad-soyad şifrelenemez ve KVKK gerekçesi ADR'ye yazılır. Özel nitelikli veri (sağlık) varsa kapsam ve saklama süresi baştan belirlenir (`14-privacy-and-compliance.md`) |
| **Ne değişir** | Şifrelenen kolon listesi, hash kolonları, arama ekranı tasarımı |
| **Cevap gelmezse** | Arama TCKN + başvuru no ile (tam eşleşme); ad-soyad şifreli |
| **Cevap** | *(doldurulacak)* |


## 6.5 Çok dillilik

> *"Sitenin İngilizce (ya da başka dilde) sürümü isteniyor mu? İsteniyorsa
> yalnızca menü ve düğmeler mi, yoksa haber/duyuru gibi içerikler de mi
> çevrilecek — içeriği kim çevirecek?"*

| | |
|---|---|
| **Neden soruyorum** | Çok dillilik sonradan eklenemez: URL yapısı, sözlük dosyaları ve içerik tabloları baştan ona göre kurulur (`02-coding-standards.md` → *"Çok dillilik"*). İçerik çevirisi ayrı bir iş yükü ve panel ekranı demektir |
| **Ne değişir** | `next-intl` kurulumu, `/en` URL'leri, çeviri tabloları, panelde dil sekmesi |
| **Cevap gelmezse** | Tek dil (Türkçe); metinler yine tek yerden — yapı hazır |
| **Cevap** | *(doldurulacak)* |


## 6.6 Yenilenecek eski sistem

> *"Bu proje mevcut bir sistemin yerine mi geçiyor? Öyleyse: kaynak koduna
> erişebiliyor muyuz, veritabanına (salt okunur) bağlanabiliyor muyuz, belge
> var mı, bugün kimler hangi ekranı ne için kullanıyor? Herkesin bildiği ama
> yazılı olmayan kurallar var mı — ay sonu düzeltmesi, istisna listesi gibi?"*

| | |
|---|---|
| **Neden soruyorum** | Eski sistemin davranışının yarısı kodda değil, veride ve alışkanlıkta; kaynak yoksa davranış yalnızca **ölçülerek** (karakterizasyon testi) sabitlenir. Akış `11-agent-workflow.md` → *"ESKİ PROJEYİ YENİDEN YAZMA"* |
| **Ne değişir** | Harita çıkarma süresi, test stratejisi, veri aktarım planı, strangler dilimleri |
| **Cevap gelmezse** | Kaynak ve DB erişimi **yok** varsayılır: davranış yalnızca ekrandan ve çıktıdan ölçülür; roadmap'e "harita" ayrı ve uzun bir adım olarak yazılır |
| **Cevap** | *(doldurulacak)* |

---

# BÖLÜM 7 — Sorulmayacaklar

<!--
Karara bağlanmış mühendislik seçimleri. Kuruma SORULMAZ; buraya yazılmasının
sebebi, ileride "bunu da soralım mı" tartışması çıkmasın diye.
Her satır kendi gerekçesine işaret eder.
-->

| Konu | Karar | Gerekçe nerede |
|---|---|---|
| <konu> | <karar> | `docs/project/decisions/ADR-*.md` |
