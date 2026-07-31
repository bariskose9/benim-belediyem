# Veri Modeli

Detaylı şema `prisma/schema.prisma` içindedir. Bu dosya üst düzey haritadır.

> **İsimlendirme:** tüm model, alan ve enum adları **İngilizcedir**
> (`01-architecture.md` → "Tüm kod isimleri İngilizce"). Kullanıcıya görünen
> metinler Türkçedir ama veritabanına Türkçe alan adı yazılmaz.
> Prisma modeli `PascalCase` tekil, tablo adı `@@map` ile çoğul `snake_case`,
> kolon adı `@map` ile `snake_case`.

## Her tabloda ortak alanlar

| Alan | Tip | Not |
|---|---|---|
| `id` | `cuid` | Birincil anahtar |
| `createdAt` | `DateTime` | UTC |
| `updatedAt` | `DateTime` | UTC — append-only tablolarda bulunmaz |
| `isSeedData` | `Boolean` | Sahte veri her zaman ayırt edilebilsin diye (`fake-data-guide.md`) |

**Yumuşak silme (`deletedAt`)** yalnızca kullanıcının geri isteyebileceği veya
denetim gereği kaybolmaması gereken tablolarda bulunur: `User`, `Address`,
`SupportTicket`, `SavedCard`, `Product`, `MenuItem`, `StaffMember`, `OrgUnit`.
`OtpChallenge`, `RateLimitCounter`, `Session` gibi kısa ömürlü kayıtlar
gerçekten silinir; `AuditLog`, `ConsentRecord`, `KpsQueryLog`, `Payment`,
`MembershipPayment` append-only olduğu için hiç silinmez.

---

## Sahte KPS (dış servis simülasyonu — uygulama tablolarından AYRI)

- **KpsCitizen** — `nationalId` (unique), `firstName`, `lastName`, `birthDate`,
  `birthPlace`, `fatherName`, `motherName`, `registeredProvince`,
  `registeredDistrict`, `gender`, `maritalStatus`, `registeredAddress`,
  `simulationBehavior` (`normal` / `timeout` / `error` / `not_found`)

  - `gender` ve `maritalStatus` enum'larında ayrıca `unspecified` değeri vardır:
    proje sahibinin kaydında bu alanlar **istenmez ve doldurulmaz** (veri
    minimizasyonu). Sahte kayıtların hepsinde gerçek bir değer bulunur

> Bu tablo **dış kurum veritabanı** gibi ele alınır. Uygulama buraya doğrudan
> JOIN atmaz; yalnızca `/api/mock-kps/*` ucu üzerinden okur (ADR-003).
> `simulationBehavior`, hata yollarını test edebilmek için özel kayıtları işaretler.

## Çekirdek

- **User** — `nationalIdEncrypted` (şifreli, nullable), `nationalIdHash`
  (**unique**, tuzlanmış özet, nullable), `nationalIdMasked`,
  `fullName`, `birthDate`, `email` (unique), `emailVerifiedAt`, `phone`, `phoneVerifiedAt`,
  `passwordHash` (nullable), `role` (`user` / `admin`),
  `identityStatus` (`unverified` / `kps_verified`), `isStaff`,
  `staffMemberId` (unique, nullable), `registeredProvince`, `registeredDistrict`,
  `kpsSyncedAt`, `deletedAt`

  - **Tekilliği şifreli kolon değil özet kolonu zorlar.** Doğru şifreleme aynı
    girdiden her seferinde farklı çıktı üretir (rastgele nonce), dolayısıyla
    şifreli kolon üzerinde unique index çalışmaz. Arama ve tekillik
    `nationalIdHash` üzerinden yürür (`NATIONAL_ID_HASH_SALT`);
    `05-auth-security.md` "şifrelenerek saklanır; arama için ayrıca tuzlanmış
    özet tutulur" kuralının karşılığı budur
  - `staffMemberId` unique: bir personel kaydına iki hesap bağlanamaz
  - Hesap silindiğinde `email` ve `nationalIdHash` anonimleştirilir; aksi hâlde
    aynı kimlikle yeniden kayıt olmak engellenirdi (PRD §5.11)

  - `isStaff`, `role` ve `identityStatus` **yalnızca sunucuda** hesaplanır;
    istemciden gelen değer yok sayılır ve hata döner (`05-auth-security.md`)
  - `fullName` doğrulanmamış (Google) kullanıcıda Google profil adından gelir ve
    kullanıcı düzenleyebilir. KPS doğrulaması tamamlandığında **KPS'ten gelen ad
    üzerine yazar** ve alan salt okunur olur
  - Nüfus adresinin tamamı saklanmaz — yalnızca il/ilçe tutulur (veri minimizasyonu).
    Tam adres kayıt ekranında gösterilir, veritabanına yazılmaz
  - `role` bir DB alanıdır; "ziyaretçi" bir rol **değil**, oturumun yokluğudur

- **Account / Session / VerificationToken** — Auth.js tabloları.
  `Account` giriş yöntemlerini tutar (`provider` = `credentials` / `google`),
  `Session` ise **veritabanı oturumlarını** (ADR-005). Ayrı bir `AuthMethod`
  tablosu **yoktur** — `Account` zaten aynı işi yapar

- **OtpChallenge** — `userId` (veya geçici kayıt kimliği), `purpose`
  (`register_email` / `register_phone` / `password_reset`),
  `channel` (`mock` / `email` / `email_sms_simulation`), `destinationHash`,
  `codeHash`, `expiresAt`, `attemptCount`, `consumedAt`
  *(kod ve hedef adres düz metin saklanmaz)*

- **RegistrationDraft** — yarım kalmış kayıt; KPS yanıtının 15 dakikalık
  önbelleği (ADR-012). `tokenHash` (**unique**, çerezdeki jetonun SHA-256 özeti),
  `nationalIdHash`, `kpsPayloadEncrypted` (AES-256-GCM), `contactEncrypted`,
  `emailHash`, `phoneHash`, `passwordHash` (argon2id), `actorIpHash`, `expiresAt`
  - **Düz metin hiçbir kolonda yok** — ne kimlik numarası, ne e-posta, ne telefon
  - Önbellek anahtarı kimlik numarası **değil**, jetonun özetidir (PRD §5.0)
  - `otp_challenges.registrationId` buraya işaret eder ama **yabancı anahtar
    yoktur**: taslak hesap açılınca silinir, kod kayıtları 24 saat yaşamaya
    devam eder (gerekçe ADR-012)
  - Süresi dolan satır **okuma anında** silinir (ADR-007); hesap oluşunca da silinir

- **RateLimitCounter** — `key` (amaç + tuzlanmış kimlik özeti), `windowStartedAt`,
  `count` · unique: `key + windowStartedAt` (ADR-006)
  *(anahtar kişisel veri içermez; IP ve kimlik numarası hash'lenir)*

- **KpsQueryLog** — `actorIpHash`, `sessionId`, `result` (`success` / `mismatch` /
  `not_found` / `rate_limited` / `timeout`), `durationMs` — append-only
  *(kimlik numarası YAZILMAZ)*

- **Address** — `userId`, `title`, `fullAddress`, `district`, `deletedAt`
  *(teslimat adresi; nüfus adresinden ayrıdır ve kullanıcı kendi girer)*

- **Notification** — `userId`, `type`, `title`, `body`, `isRead`, `relatedType`, `relatedId`

## Sepet, sipariş ve ödeme

- **Cart** — `userId` (**nullable** — ziyaretçi sepeti için), `anonymousId` (nullable),
  `status` (`active` / `converted` / `abandoned`)
  *(ziyaretçi sepeti çerezdeki `anonymousId` ile taşınır; giriş yapıldığında
  kullanıcının mevcut sepetiyle birleştirilir — PRD §4)*

- **CartItem** — `cartId`, `itemType` (`market` / `restaurant` / `event`),
  `refId`, `quantity`, `unitPrice`, `note`
  *(`gym` **yoktur** — üyelik sepete girmez, kendi akışı vardır. Abonelik tek
  seferlik sipariş şemasına oturmaz: taahhüt, yenileme ve iptal kuralları farklıdır)*

- **Order** — `userId`, `paymentId`, `fulfillmentType` (`market_delivery` /
  `restaurant_delivery` / `ticket`), `subtotalAmount`, `deliveryFee`,
  `discountAmount`, `totalAmount`, `status` (`received` / `preparing` /
  `on_the_way` / `delivered` / `cancelled`), `cancelledAt`, `cancelReason`,
  `deliveryAddressId` (nullable), `deliverySlot` (nullable)

  *(Karışık sepet tek ödemeyle **birden fazla sipariş** üretir — modül başına bir
  tane. Aynı ödemeye bağlı siparişler **aynı `paymentId`'yi paylaşır**; PRD §6.1.
  `ticket` türünde teslimat alanları boştur ve durum doğrudan `delivered` olur.
  Teslimat ücreti sipariş bazında hesaplanır, sepetin tamamına göre değil.)*

- **OrderItem** — `orderId`, `itemType`, `refId`, `quantity`, `unitPrice`
  *(fiyat sipariş anında kopyalanır; ürün fiyatı sonradan değişirse geçmiş sipariş bozulmaz)*

- **SavedCard** — `userId`, `brand`, `last4`, `expMonth`, `expYear`, `holderName`, `deletedAt`
  *(tam kart numarası ASLA saklanmaz)*

- **Payment** — `userId`, `savedCardId`, `brand`, `cardLast4`, `fakeTransactionId`,
  `status` (`success` / `declined` / `insufficient_funds`), `amount`,
  `idempotencyKey` (unique), `attemptedAt` — append-only

  *(Ödeme bağımsız bir kayıttır; siparişler ona bağlanır — tersi değil. Böylece
  bir ödeme birden fazla siparişi karşılayabilir. Üyelik tahsilatları ayrı
  `MembershipPayment` kaydına bağlanır.)*

## Sağlık (personele özel)

- **Specialty** — `name`
- **Doctor** — `specialtyId`, `fullName`, `title`
- **DoctorSlot** — `doctorId`, `startsAt`, `isBooked` · unique: `doctorId + startsAt`
- **Appointment** — `userId`, `slotId`, `status` (`booked` / `cancelled`), `cancelledAt`

## Etkinlik

- **Venue** — `name`, `address`
- **VenueSeat** — `venueId`, `block`, `rowLabel`, `seatNumber`
- **Event** — `venueId`, `name`, `category` (`concert` / `theatre` / `kids`),
  `performer`, `startsAt`, `basePrice`
- **SeatReservation** — `eventId`, `seatId`, `userId`, `status` (`held` / `sold`),
  `holdExpiresAt` · unique: `eventId + seatId`
  *(süresi dolmuş `held` kayıtlar okuma anında yok sayılır — ADR-007;
  `holdExpiresAt` indekslidir)*

## Market

- **ProductCategory** — `name`
- **Product** — `categoryId`, `name`, `description`, `imageUrl`, `price`, `stock`, `deletedAt`

## Restoran

- **MenuCategory** — `name`
- **MenuItem** — `categoryId`, `name`, `description`, `imageUrl`, `price`,
  `isAvailable`, `deletedAt`

## Spor salonu (personele özel)

- **MembershipPlan** — `name`, `commitmentMonths`, `monthlyPrice`
  *(`discountPercent` **tutulmaz** — indirim, taahhütsüz paketin fiyatından
  hesaplanıp yalnızca ekranda gösterilir. İki alan tutmak sapma riski yaratır)*

- **Membership** — `userId`, `planId`, `savedCardId`, `startsAt`,
  `commitmentEndsAt`, `status` (`active` / `payment_pending` / `cancelled` / `expired`),
  `autoRenewEnabled`, `nextBillingAt`, `cancelledAt`, `pendingPlanId` (nullable),
  `pendingPlanEffectiveAt` (nullable)
  *(paket değişimi bir sonraki tahsilat tarihinde yürürlüğe girer — PRD §5.6)*

- **MembershipPayment** — `membershipId`, `periodStart`, `periodEnd`, `amount`,
  `kind` (`renewal` / `early_exit_fee`), `status` (`success` / `failed`),
  `attemptedAt`, `idempotencyKey` · unique: `membershipId + periodStart`
  *(çift tahsilatı veritabanı seviyesinde engeller)* — append-only

## Kurumsal (Hakkımızda)

- **OrgUnit** — `name`, `unitType`, `parentId`, `sortOrder`, `deletedAt`
  *(kendine referanslı ağaç)*

  - `unitType` altı kademelidir: `presidency` / `general_secretariat` /
    `deputy_general_secretariat` / `directorate` / `branch` / `section`.
    İlk üçü `fake-data-guide.md`'nin istediği üst yapıdır (Başkanlık → Genel
    Sekreterlik → Genel Sekreter Yardımcılığı); onları `directorate` saymak
    ağacı yanlış etiketlerdi
- **StaffMember** — `orgUnitId`, `fullName`, `title`, `workEmail`,
  `extensionNumber` (unique), `startYear`, `nationalIdHash` (unique, nullable), `deletedAt`
  *(`nationalIdHash` yalnızca personel eşleştirmesi için; düz kimlik numarası saklanmaz)*
  *(cep telefonu, adres, doğum tarihi gibi kişisel alan TUTULMAZ)*

## Destek

- **SupportTicket** — `userId`, `subject`, `description`,
  `status` (`open` / `in_review` / `resolved` / `closed`), `deletedAt`
- **TicketAttachment** — `ticketId`, `fileUrl`, `fileName`, `sizeBytes`

## Denetim ve gizlilik

- **AuditLog** — `userId` (nullable), `action`, `entityType`, `entityId`,
  `ipHash`, `createdAt` — append-only, güncellenmez ve silinmez
- **ConsentRecord** — `userId` (**nullable**), `anonymousId` (nullable),
  `consentType`, `isGranted`, `createdAt` — append-only
  *(çerez rızası giriş yapmamış ziyaretçiden de alınır; o durumda rıza,
  çerezdeki rastgele `anonymousId`'ye bağlanır. Kullanıcı sonradan giriş
  yaparsa kayıt hesabına bağlanır)*

---

## Kurallar

- Para alanları `Decimal(10,2)` — float kullanılmaz
- Tüm tarihler UTC saklanır, ekranda `Europe/Istanbul`'a çevrilir
- Enum değerleri **İngilizce**; kullanıcıya gösterilen karşılıkları `src/config/` altında
- Eşzamanlılık kritik olan yerler benzersiz indeks + transaction ile korunur:
  `DoctorSlot` (doktor + saat) · `SeatReservation` (etkinlik + koltuk) ·
  `MembershipPayment` (üyelik + dönem) · `Payment.idempotencyKey` ·
  `RateLimitCounter` (anahtar + pencere) · `CartItem` (sepet + ürün)

  *(Çift ödemenin engellendiği yer **ödeme** kaydıdır, sipariş değil: bir ödeme
  birden fazla sipariş üretebilir. `Order` üzerinde `idempotencyKey` yoktur.)*
- Aktif randevunun tekilliğini `Appointment.slotId` üzerinde bir unique index
  **sağlamaz**: iptal edilen randevu 3 yıl saklanır ve aynı slot yeniden
  satılabilir. Koruma, `DoctorSlot.isBooked` üzerinde koşullu güncellemedir
  (`... WHERE is_booked = false`), transaction içinde
- Süreye bağlı her sorgu zaman koşulu içerir (ADR-007); bu koşul için indeks konur
- İstemciden gelen `price`, `userId`, `role`, `isStaff` alanları **reddedilir**

## Saklama süreleri

`14-privacy-and-compliance.md` "her tablo için saklama süresi tanımlıdır" diyor.
Süresi dolan kayıtları temizleyen planlı görev günde bir çalışır (ADR-007).

| Tablo | Süre | Süre dolunca |
|---|---|---|
| `RegistrationDraft` | 15 dakika | Silinir — okuma anında da, hesap açılınca da (ADR-012) |
| `OtpChallenge` | 24 saat | Silinir |
| `RateLimitCounter` | 24 saat | Silinir |
| `Session` | Süre + 7 gün | Silinir |
| `Cart` (`abandoned`) | 30 gün | Silinir |
| `KpsQueryLog` | 90 gün | Silinir |
| `Notification` | 1 yıl | Silinir |
| `TicketAttachment` | 1 yıl | Dosya blob'dan silinir, kayıt anonimleşir |
| `SupportTicket` | 3 yıl | Anonimleştirilir |
| `Appointment`, `SeatReservation` | 3 yıl | Anonimleştirilir |
| `Order`, `OrderItem`, `Payment`, `MembershipPayment` | 10 yıl | Mali kayıt — kişisel alanlar anonimleştirilir, tutarlar korunur |
| `AuditLog`, `ConsentRecord` | 10 yıl | Silinmez |
| `User` (hesap silinince) | — | Kişisel alanlar anonimleştirilir, mali kayıt bağı korunur |
