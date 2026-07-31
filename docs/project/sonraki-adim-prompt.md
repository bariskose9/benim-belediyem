# Sonraki oturum için hazır prompt — adım 4b

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 4b bitince güncellenir veya silinir.

---

benim-belediyem projesinde roadmap adım 4b'ye geçiyoruz. Başlamadan önce
MEMORY.md'ye ve ~/Desktop/baris_projects/benim-belediyem/ içindeki CLAUDE.md +
docs/ klasörüne bak. MEMORY.md'deki TUZAKLAR bölümünü mutlaka oku.

## DURUM

Roadmap adım 0-4a bitti ve `main`'e merge edildi (PR #1-#6).

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu /api/health
- Depo public: github.com/bariskose9/benim-belediyem
- 37 tablo + seed: 200 sahte KPS vatandaşı, 100 personel, 90 üye
- Test hesapları ve sınır durum numaraları: docs/project/test-hesaplari.md
- Testler: 134 unit/entegrasyon + 25 veritabanı (npm run test:db) + 28 E2E

**Adım 4a'da kurulan ve HAZIR BEKLEYEN parçalar — bunları YENİDEN YAZMA, KULLAN:**

- `lookupIdentity()` (src/features/identity/services/) — kimlik sorgusunun
  tamamı: hız sınırı, devre kesici, denetim kaydı, sabit yanıt süresi, tek tip
  hata mesajı. Uçtan uca doğrulandı. Sadece onu çağıracak uç ve ekran yok.
- `consumeRateLimit()` + `rateLimitKey()` (src/lib/rate-limit.ts) — her yeni
  korumalı uç bunu kullanacak. Yeni bir hız sınırı mekanizması KURMA.
- `hashActorIp()` ve `readActorIp()` — IP'yi okuma ve tuzlama.
- `encryptNationalId` / `hashNationalId` / `maskNationalId` (src/lib/crypto.ts).
- ADR-009 (dış servis ucu koruması) ve ADR-010 (devre kesici) okunmalı.

## YAPILACAK — roadmap adım 4b

"Auth: TCKN ile kayıt (KPS sorgusu + e-posta ve telefon OTP), giriş, çıkış,
veritabanı oturumu (ADR-005), rol, korumalı route, hız sınırı (ADR-006),
bot koruması (ADR-004)"

**Bu adım büyük. Planı sunarken kaç parçaya bölünmesi gerektiğini SÖYLE** —
tek PR'a sığmıyorsa bunu baştan söyle, sonuna saklama.

Kapsam:

1. Kayıt akışı (PRD §5.0): TCKN + doğum yılı → `lookupIdentity()` → **18 yaş
   kontrolü sunucuda, KPS'ten gelen doğum tarihinden** → kimlik alanları salt
   okunur gösterilir → kullanıcı e-posta, telefon, şifre girer → **iki ayrı
   OTP** (e-posta + telefon) → ikisi de doğrulanmadan hesap AÇILMAZ
2. `OtpChannel` adaptörü (PRD "Doğrulama kodu kanalı"): local/preview'da mock,
   production'da e-posta gerçek + telefon kodu "SMS simülasyonu" başlığıyla
   yine e-postaya. **Kod hiçbir ortamda ekranda görünmez.**
3. Giriş: TCKN + şifre. Giriş anında KPS sorgulanmaz. 2 başarısız denemeden
   sonra bot doğrulaması
4. Çıkış + **veritabanı oturumu** (ADR-005): Auth.js `database` stratejisi,
   çerez sadece oturum kimliği taşır. Çıkış ve şifre değişimi tüm oturumları
   ANINDA düşürür
5. Şifre sıfırlama: TCKN → kayıtlı e-postaya 6 haneli kod. **Hesap sayımı
   koruması: numara kayıtlı olsun olmasın aynı mesaj VE aynı yanıt süresi**
6. Rol ve korumalı route: yetki SUNUCUDA hesaplanır, UI'da buton gizlemek
   yetki değildir
7. Bot koruması (ADR-004, Cloudflare Turnstile) — jeton sunucuda doğrulanır

## ÖNCE PLAN SUN, ONAYIMI BEKLE

Kod yazmadan önce her zaman (CLAUDE.md §3 kapı 2).

## ⚠️ ÖNCE ÇÖZÜLMESİ GEREKEN: PREVIEW VE PRODUCTION VERİTABANLARI BOŞ

Adım 4a bitiminde fark edildi: her iki Neon dalında da migration'lar çalışmış
ama **seed hiç çalışmamış**. `kps_citizens = 0`, `users = 0`, `staff_members = 0`.
Sadece local dolu.

Sonuç: kayıt akışı canlıda ve preview'da **çalışmaz** — girilen her kimlik
numarası "bulunamadı" döner ve neden olduğu anlaşılmaz.

Tuzak: seed'i çalıştırmak `NATIONAL_ID_ENCRYPTION_KEY` ve `NATIONAL_ID_HASH_SALT`
istiyor, ama Vercel bu değerleri geri vermiyor (`vercel env pull` → `[SENSITIVE]`).
Veritabanları boş olduğu için **anahtarları yenilemek şu an bedelsiz** — sonra
dolduğunda yenilemek tüm şifreli kayıtları okunamaz hale getirir.

Planında bunu ayrı bir madde olarak ele al ve bana sor: production veritabanına
yazmak onayımı gerektiriyor (CLAUDE.md §7).

## BU ADIMDA ÖZELLİKLE DİKKAT

- **Şifre kütüphanesi yeni bir bağımlılık** (argon2 veya bcrypt cost>=12).
  `00-stack.md` tabloda olmayan her paket için ONAY + ADR şartı koyuyor.
  Planda hangisini neden seçtiğini yaz, kurmadan önce sor. Teknik borç #15.
- **Veri minimizasyonu (PRD §5.0):** KPS'ten gelen baba adı, anne adı, doğum
  yeri, medeni hal ve nüfus adresi **veritabanına YAZILMAZ**, sadece kayıt
  ekranında gösterilir. Kalıcı tutulanlar: ad, soyad, doğum tarihi, şifreli
  TCKN, nüfus il/ilçe, son senkron tarihi. Bunu bir testle kanıtla.
- **KPS yanıtı en fazla 15 dakika önbellekte** tutulur ve önbellek anahtarı
  TCKN **değil**, oturuma bağlı rastgele bir kimliktir.
- Kimlik numarası: log'a, hata mesajına, URL'e, önbellek anahtarına yazılmaz.
  Adım 4a'da bunun için testler var, aynı disiplini sürdür.
- Auth.js v5 + Prisma 7 driver adapter uyumunu **varsayma, doğrula** — Prisma 7
  bağlantıyı şemadan değil adaptörden alıyor (ADR-008), Auth.js Prisma
  adapter'ı bununla çalışmayabilir. Emin değilsen "emin değilim" de.
- Süreye bağlı her kural için süre dolumu testi zorunlu (06-testing.md):
  OTP 5 dakika, oturum süresi, hız sınırı penceresi.
- Sunucu tarafı testlerinde dosya başına `/** @vitest-environment node */`
  docblock'u gerekiyor — yoksa `serverEnv` erişimi hata veriyor.
- Bu adımda EKRAN VAR: CLAUDE.md §6.3 1c tarayıcı kapısı geçerli, tıklayarak
  doğrula (mutlu yol, hata yolu, yükleniyor/boş/hata, dark mode, 375px).

## KOMUTLAR

npm run db:up · db:migrate · db:reset · db:studio
npm run test · test:db · test:e2e · lint · typecheck · build
gh PATH'te kurulu. vercel ve neonctl PATH'te DEĞİL — `npx vercel ...` kullan.

## BENİMLE İLETİŞİM

Kodu okuyup anlayamıyorum. Her adımı Türkçe, kod göstermeden, en fazla 5 maddede
anlat. Sadece "ne" değil "neden" de söyle. Emin olmadığın yerde "emin değilim"
de, uydurma.

## TEMİZLİK İŞİ (küçük ama artık ciddi)

macOS senkron aracı depoya sürekli kopya dosya üretiyor: `package-lock 2.json`,
`package 3.json`, `tsconfig 2.json` gibi. İki zararı var:

1. Yerel `npm run format:check` kırmızı görünüyor (dosyalar takipsiz, CI'ya gitmiyor)
2. **`.git` klasörünün içine de sızıyor.** Adım 4a'da `.git/refs/remotes/origin/main 2`
   ve `.git/index 2` oluştu, `git pull` "bad object" hatasıyla kırıldı.
   Kurtarma: `find .git -name "* [0-9]*" -delete` sonra `git fetch --prune`.

`git add` yaparken `':!* [0-9].*' ':!* [0-9]'` ile dışla. Kalıcı çözüm için
bana sor — klasörün senkron kapsamı dışına alınması gerekebilir.
