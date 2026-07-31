# CLAUDE.md — Çalışma Protokolü ve Mühendislik Standartları

> Bu dosya her projede aynıdır. Projeye özel hiçbir bilgi (amaç, sayfa, iş kuralı)
> BURAYA yazılmaz — onlar `docs/project/PRD.md` içindedir.
> Yeni projede: bu dosyayı ve `docs/standards/` klasörünü kopyala, `docs/project/` içini değiştir.

---

## 0. Proje Değişkenleri

Her yeni projede sadece bu blok doldurulur:

```
PROJE ADI      : benim-belediyem
STACK          : Next.js 15 App Router + TypeScript (strict) + Tailwind + shadcn/ui
                 + Prisma + PostgreSQL 16 + Auth.js v5 + Zod
DEPLOY         : Vercel + Neon + GitHub Actions
ANA DAL        : main
DİL (arayüz)   : Türkçe
DİL (kod)      : İngilizce (değişken, fonksiyon, tablo, kolon, enum, commit mesajı)
```

---

## 1. Kaynak Hiyerarşisi

1. `docs/standards/*` — mühendislik kuralları. **Bağlayıcıdır.**
2. `docs/project/PRD.md` — iş gereksinimleri. Ne yapılacağının tek kaynağı.
3. `docs/project/data-model.md` — veri modeli.
4. `docs/project/decisions/ADR-*.md` — alınmış mimari kararlar. Bir ADR'ye aykırı kod yazma.
5. `docs/project/altyapi-durumu.md` — **dış dünyanın durumu**: hangi hesap açık,
   panelde ne yapılandırılmış, hangi ortam değişkeni nerede tanımlı.
   **Kullanıcıya "şunu aç / şunu ayarla" demeden ÖNCE burayı oku** — zaten
   yapılmış bir işi ona tekrar yaptırma.

**Çakışma kuralı:** Kural ile benim isteğim çakışırsa **DUR, sor.** Kendi başına karar verme.

---

## 2. Skill Seçimi ve Şeffaflık

**Skill kaynağı:** `agent-skills@addy-agent-skills` (github.com/addyosmani/agent-skills).
Kurulu değilse bana haber ver. Bu paketteki skill'ler ve persona'lar
(`code-reviewer`, `test-engineer`, `security-auditor`, `web-performance-auditor`)
bu projede birincil çalışma yöntemidir.

Hangi skill'i kullanacağına sen karar ver — ben bilmiyorum, bilmek zorunda da değilim.

Her cevabın **ilk satırında** bildir:

```
[SKILL: <isim>] — <tek cümle: neden bu>
```

Hiçbir skill uygun değilse `[SKILL: yok]` yaz. Birden fazla kullandıysan hepsini yaz.

---

## 3. Zorunlu Kapılar (atlanamaz, "sonra yaparız" denemez)

| # | Kapı | Ne zaman |
|---|------|----------|
| 1 | `interview-me` ile **tek tek** soru sor, varsayım yapma | Gereksinim belirsiz veya eksikse |
| 2 | Plan sun, **onayımı bekle** | Kod yazmadan önce, her zaman |
| 3 | `security-and-hardening` çalıştır | Kullanıcı girdisi, auth, ödeme, dosya yükleme, dış API içeren her işte |
| 4 | Test yaz, çalıştır, yeşil olduğunu göster | Her davranış değişikliğinde. Testsiz "bitti" deme |
| 5 | `code-review-and-quality` çalıştır | Her commit öncesi |
| 6 | `docs/standards/10-definition-of-done.md` kapılarını geç | "Tamamlandı" demeden önce |
| 7 | `docs/standards/15-oturum-devri.md` protokolünü uygula | Her adım bitiminde, oturum kapanmadan |

Bu kapılardan birini atlamak için gerekçe üretme. Zaman baskısı, "küçük değişiklik",
"zaten çalışıyor" geçerli mazeret değildir.

---

## 4. Bana Karşı Davranış

- **Ben kodu okuyup anlayamıyorum.** Bunu her adımda hatırla.
- Her adımdan sonra ne yaptığını **kod göstermeden, Türkçe, en fazla 5 madde** halinde anlat.
- Sadece "ne" değil **"neden"** de anlat — bu projeyi öğrenmek için yapıyorum.
- Emin olmadığın yerde **"emin değilim"** de. Uydurma. Kütüphane/API davranışını
  tahmin etme, dokümantasyona bak (`source-driven-development`).
- Aynı anda **tek** sayfa/modül üzerinde çalış. Kapsamı kendiliğinden genişletme.
- Bir şeyi bozduğunu fark edersen saklama, hemen söyle.
- Beni memnun etmek için "tamamdır, çalışıyor" deme. Kanıt göster (test çıktısı, ekran, log).

---

## 5. Mühendislik Standartları (özet — detay `docs/standards/`)

### 5.1 Mimari
- Katmanlar net ayrılır: **UI → API/route → servis (iş mantığı) → repository/ORM → DB**.
- İş mantığı UI bileşeninin içine yazılmaz. SQL/ORM çağrısı UI'da olmaz.
- Klasör yapısı özellik bazlı (`features/randevu/...`), tip bazlı değil.
- Bir dosya 300 satırı geçiyorsa böl. Bir fonksiyon 50 satırı geçiyorsa böl.

### 5.2 Kod
- TypeScript **strict**. `any` yasak; kaçınılmazsa satır üstüne gerekçe yorumu.
- ESLint + Prettier commit öncesi çalışır, hata varsa commit yok.
- İsimlendirme İngilizce ve açık: `getUserAppointments()`, `x2()` değil.
- Yorum satırı "ne" değil **"neden"** anlatır.
- YAGNI: istenmeyen özellik eklenmez. DRY: aynı mantık ikinci kez yazılmaz.

### 5.3 API
- REST: kaynak adları çoğul (`/api/appointments`), fiil yok.
- Doğru status kodları: 200/201/204, 400/401/403/404/409/422, 500.
- **Tek tip hata formatı:** `{ error: { code, message, details? } }`.
- **Her endpoint girişi Zod (veya eşdeğeri) ile doğrulanır.** İstemciye asla güvenilmez.
- İç hata detayı (stack trace, SQL) istemciye sızdırılmaz.
- Endpoint'ler OpenAPI/Swagger ile belgelenir.

### 5.4 Veritabanı
- Şema değişiklikleri **sadece migration** ile. Elle DB'ye dokunulmaz.
- Migration'lar geri alınabilir olmalı; production'da veri silen migration onay ister.
- Parametreli sorgu zorunlu — string birleştirerek SQL kurulmaz.
- Yabancı anahtarlar ve gerekli index'ler baştan tanımlanır.
- Seed verisi ayrı dosyada, tekrar çalıştırılabilir (idempotent).

### 5.5 Güvenlik (OWASP temelli)
- Şifreler hash'lenir (bcrypt/argon2). Düz metin asla.
- Oturum tokenı **httpOnly + secure + sameSite cookie**'de. localStorage'da JWT tutulmaz.
- Yetkilendirme **sunucu tarafında** kontrol edilir; UI'da butonu gizlemek yetki değildir.
- Her korumalı endpoint'te "bu kayıt bu kullanıcıya mı ait?" kontrolü yapılır (IDOR).
- Secret'lar `.env` içinde, `.env` **asla** commit edilmez. `.env.example` commit edilir.
- Dosya yüklemede: tip, boyut, uzantı doğrulanır; dosya adı sanitize edilir.
- Login ve yazma endpoint'lerinde rate limit.
- Güvenlik başlıkları (CSP, HSTS, X-Frame-Options) yapılandırılır.
- Bağımlılıklar düzenli denetlenir (`npm audit`).

### 5.6 Test
- Piramit: **çok unit / orta entegrasyon / az E2E**.
- Her endpoint için: mutlu yol + en az bir hata yolu + bir yetki testi.
- Her hata düzeltmesi önce **hatayı yakalayan testle** başlar (kırmızı → yeşil).
- Testler gerçek davranışı test eder; sadece mock'u doğrulayan test yazılmaz.
- CI'da tüm testler geçmeden merge yok.

### 5.7 Arayüz
- **Mobile-first.** Her ekran 375px'te de düzgün görünür.
- Renk/spacing/tipografi token üzerinden; sayısal değerler dağıtılmaz.
- Dark mode ilk günden token seviyesinde desteklenir.
- Erişilebilirlik WCAG 2.1 AA: klavye ile gezinilebilir, kontrast yeterli,
  form alanlarında label, resimlerde alt.
- Her ekranda **yükleniyor / boş / hata** durumları tanımlıdır.
- Kullanıcıya gösterilen hata mesajları Türkçe ve anlaşılır.

### 5.8 Paketleme, Yayın ve Ortamlar
- **Tek repo, tek proje, üç ortam:** `local` (Docker) → `preview` (her PR otomatik)
  → `production` (`main`'e merge). Ayrı "test projesi" açılmaz. Detay: `13-environments.md`
- Her ortamın kendi veritabanı ve kendi anahtarları vardır. Ortamlar veri paylaşmaz;
  production verisiyle test yapılmaz. Canlı anahtar local'de kullanılmaz.
- `migrate dev` sadece local'de; preview ve production'da `migrate deploy`.
- Preview ve local ortamlar `noindex` olur ve ekranda ortam etiketi gösterir.
- Uygulama **12-factor**: yapılandırma ortam değişkeninden gelir, süreç durumsuzdur,
  aynı yapı her ortamda çalışır. Ortam değişkeni koda gömülmez.
- Pipeline: `lint → typecheck → test → build → e2e → audit`. Kırmızıysa merge ve deploy yok.
- Şema değişikliği geriye uyumlu adımlara bölünür: önce kolon eklenir, kod yeni kolonu
  kullanır, eski kolon sonraki sürümde düşürülür. Tek adımda kolon silen deploy yapılmaz.
- Her deploy öncesi "bozulursa nasıl geri dönerim" sorusunun cevabı hazır olur.
  Production migration öncesi yedek alınır.
- Yayın sonrası duman testi: giriş, ana akış, `/api/health`.

### 5.9 Çalıştırma, İzleme ve Bakım
- Sağlık ucu `GET /api/health` (uygulama + veritabanı) her projede bulunur.
- Loglar yapılandırılmış (JSON); `console.log` ile hata ayıklama çıktısı bırakılmaz.
  Log'a şifre, token, kart numarası, kimlik numarası **yazılmaz**.
- Üretimdeki her istisna hata takip aracına (Sentry) düşer. Sessiz hata kabul edilmez.
- Dış servis çökerse uygulama çökmez: ilgili bölüm hata durumu gösterir, sayfa ayakta kalır.
  Dış çağrılarda timeout zorunlu, yeniden deneme en fazla 2 kez ve üstel geri çekilmeli.
- Yedek otomatik ve **denenmiş** olur; denenmemiş yedek yedek sayılmaz.

### 5.10 Büyütme (ölçekleme)
Büyütme kararı **ölçümle** verilir, tahminle değil. Erken optimizasyon yapılmaz.
Sıra: `1) sorgu + index → 2) önbellek → 3) CDN/görsel optimizasyonu →
4) bağlantı havuzu → 5) yatay ölçekleme → 6) kuyruk → 7) okuma replikası`
5. adımdan sonrası ADR gerektirir. Önce ölç, sonra düzelt, sonra tekrar ölç.

### 5.11 Gizlilik ve Denetlenebilirlik
- Gerekmeyen kişisel veri toplanmaz; her alan için "neden, ne kadar süre, kim erişir" cevaplanır.
- Kritik işlemler (giriş, ödeme, iptal, silme, yetki değişikliği) denetim kaydına yazılır.
- Log ve hata takibine şifre, token, kart, kimlik numarası **yazılmaz**.
- Yasal sayfalar (KVKK, çerez, kullanım şartları) ve rıza kaydı bulunur.
  Detay: `14-privacy-and-compliance.md`

### 5.12 Bakım
- Haftalık: hata panosu + `npm audit`. Aylık: bağımlılık güncellemeleri ayrı PR ile.
- Teknik borç `docs/project/roadmap.md` içinde açıkça listelenir, gizlenmez.
- Kullanılmayan özellik, tablo ve bağımlılık silinir.
- Olay (incident) sonrası kısa not yazılır: ne oldu, neden, tekrarı nasıl önlenir.

---

## 6. Git ve Commit Protokolü

### 6.1 Dal (branch) kuralı
- `main` her zaman çalışır ve deploy edilebilir durumdadır. `main`'e doğrudan commit yok.
- Her iş için ayrı dal: `feature/<kisa-ad>`, `fix/<kisa-ad>`, `chore/<kisa-ad>`.

### 6.2 Commit ne zaman
Bir **feature / sayfa / modül tamamlandığında** (tüm zorunlu kapılar geçildikten sonra).
Yarım işi commit'leme; ama tek commit'e 10 farklı iş de tıkma.

### 6.3 Commit akışı — ONAYSIZ COMMIT YOK

Feature bitince şu sırayı izle:

1. **DOĞRULA — üç aşama, sırayla. Hepsi geçmeden commit teklifi yapma.**

   **1a. Otomatik testler**
   `lint` → `typecheck` → `test` → `build` çalıştır. Çıktıyı bana göster.
   Kırmızı varsa dur ve düzelt; "önemsiz uyarı" diyerek geçme.

   **1b. Güvenlik denetimi** — `security-and-hardening` + `security-auditor`
   Bu feature özelinde kontrol et ve her maddeye açık cevap ver:
   - Yeni girdi noktaları Zod ile doğrulanıyor mu?
   - Yetki kontrolü sunucu tarafında var mı? Başkasının kaydına erişilebiliyor mu (IDOR)?
   - Sorgular parametreli mi? XSS'e açık render var mı?
   - Yeni secret/env eklendi mi, `.env`'de mi, `.env.example` güncellendi mi?
   - Hata mesajları iç detay (stack, SQL, dosya yolu) sızdırıyor mu?
   - Yeni bağımlılık eklendiyse `npm audit` sonucu ne?

   **1c. Ekranlar gerçekten çalışıyor mu** — `browser-testing-with-devtools`
   Uygulamayı ayağa kaldır, tarayıcıda **fiilen tıklayarak** doğrula.
   Kod okuyup "çalışması lazım" demek yeterli değil; kanıt getir.
   Her ekran için kontrol et:
   - Mutlu yol baştan sona işliyor mu? (örn. giriş → seçim → kayıt → liste)
   - Hatalı girdide doğru hata mesajı çıkıyor mu?
   - Login olmadan girildiğinde salt-okunur davranış doğru mu?
   - Yükleniyor / boş / hata durumları görünüyor mu?
   - Dark mode açık-kapalı ikisinde de okunabilir mi?
   - 375px genişlikte (mobil) düzen bozuluyor mu?
   - (Mobil uygulama fazındaysak: cihazda/emülatörde akış çalışıyor mu?)
   - Tarayıcı konsolunda hata veya network'te başarısız istek var mı?

   Bulduğun her sorunu **önce düzelt**, sonra 1a'dan yeniden başla.

2. **Değişiklik raporunu sun** — aşağıdaki formatta, Türkçe, kod göstermeden:

```
━━━ COMMIT ÖNERİSİ ━━━

📌 NE YAPILDI (Türkçe özet)
   • <eklenen özellik 1>
   • <değiştirilen davranış>
   • <düzeltilen hata>

📁 DEĞİŞEN DOSYALAR (N dosya, +X / -Y satır)
   yeni       : <dosya> — <ne işe yarıyor>
   güncellendi: <dosya> — <ne değişti>
   silindi    : <dosya> — <neden>

🗄️ VERİTABANI
   <migration var mı? tablo/kolon değişti mi? yoksa "değişiklik yok">

🔐 GÜVENLİK
   <yeni girdi noktası / yetki kontrolü / secret var mı? yoksa "yeni risk yok">

✅ DOĞRULAMA
   lint/typecheck : <sonuç>
   testler        : <X geçti, Y başarısız>
   build          : <sonuç>
   güvenlik       : <denetim sonucu — bulgu varsa listele, yoksa "temiz">
   tarayıcı testi : <tıklayarak denediğim akışlar ve sonuçları>
   konsol/network : <hata var mı>
   mobil (375px)  : <sonuç>
   telefon testi  : <senin telefondan denemen gereken adımlar>
   dark mode      : <sonuç>

👀 SENİN KONTROL ETMEN GEREKENLER
   <preview URL + 3-5 maddelik tıklama adımı>

⚠️ DİKKAT
   <bilinen eksik, teknik borç, sonraya bırakılan iş — yoksa "yok">

📝 ÖNERİLEN COMMIT MESAJI
   <tip>(<kapsam>): <özet>

   - <detay>
   - <detay>

━━━━━━━━━━━━━━━━━━━━━━━
Onaylıyor musun? (evet / düzelt: ... / hayır)
```

3. **"evet" dersem** commit + push yap, PR aç, PR linkini ve preview URL'i ver.
4. **"düzelt" dersem** düzelt, raporu yeniden sun.
5. **Ben onaylamadan `git commit`, `git push`, `git merge` çalıştırma.**

### 6.4 Commit mesaj formatı
`<tip>(<kapsam>): <özet>` — Conventional Commits.
Tipler: `feat` `fix` `refactor` `test` `docs` `chore` `perf` `style` `ci`
Örnek: `feat(appointments): add booking flow with slot validation`
Özet İngilizce, 72 karakteri geçmez, emir kipi. Gövdede madde madde detay.

### 6.5 Asla commit edilmeyecekler
`.env` · gerçek API anahtarı, şifre, token · `node_modules` · build çıktıları ·
gerçek kişisel veri · `console.log` bırakılmış hata ayıklama kodu ·
`// TODO: fix later` ile geçiştirilmiş bilinen hata (bunu ⚠️ DİKKAT bölümünde bildir)

---

## 7. Asla Yapma

- İzinsiz `git push --force`, `git reset --hard`, dal silme
- İzinsiz production veritabanına yazma veya migration çalıştırma
- İstemediğim kütüphaneyi projeye ekleme (önce sor, gerekçe göster)
- "Çalışması için" güvenlik kontrolünü, testi veya validasyonu devre dışı bırakma
- Anlamadığın hatayı üstünü örterek geçiştirme (try/catch içine gömüp susturma)
- Test'i geçsin diye test'i zayıflatma — kodu düzelt
- Aynı anda birden fazla feature'a dokunma
