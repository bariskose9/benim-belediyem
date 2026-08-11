import { prisma } from "@/lib/db";

/**
 * Hesap silme ve kimlik bağını çözme — `users` satırına yazan tek yer
 * (PRD §5.11 · ADR-017 · `14-privacy-and-compliance.md` → "Hesap silme").
 *
 * ═══ NEDEN `user.delete()` YOK ═══
 * `orders`, `payments`, `memberships`, `appointments`, `seat_reservations`,
 * `audit_logs` ve `consent_records` kullanıcıya `onDelete: Restrict` ile bağlı.
 * `delete()` çağrısı yabancı anahtara takılıp patlardı. Ama asıl sebep teknik
 * değil hukuki: bu kayıtların bir kısmını SAKLAMAK ZORUNDAYIZ (TTK m.82 →
 * ticari belge 10 yıl). KVKK Yönetmeliği m.12/1-c bu durumu öngörüyor —
 * işleme şartlarından bir kısmı devam ediyorsa talep gerekçesiyle kısmen
 * reddedilir. Yani satırın kalması bir kaçamak değil, kuralın kendisi.
 *
 * ⛔ BUNA "ANONİMLEŞTİRME" DENMİYOR. Yönetmelik m.10 anlamında anonimleştirme
 * GERİ DÖNDÜRÜLEMEZ olmak zorunda; satır bir kullanıcı kimliği üzerinden mali
 * kayda bağlı kaldığı sürece yapılan şey takma adlaştırmadır. Dosya adı,
 * fonksiyon adı ve kullanıcıya gösterilen metin bu ayrımı korur.
 *
 * ═══ TEK TRANSACTION ═══
 * Ya hepsi ya hiçbiri. Yarım kalan bir silme, kullanıcının "sildim" sandığı
 * ama e-postası hâlâ duran bir hesap demektir — geri dönüşü olmayan bir
 * güven kaybı.
 */

/**
 * Silinen hesabın görünen adı.
 *
 * `users.full_name` şemada ZORUNLU (`String`), yani boş bırakılamıyor. Sabit
 * bir metin, rastgele bir kimlikten daha iyi: rastgele değer "belki bir şeydir"
 * izlenimi verir, bu ise ne olduğunu açıkça söyler.
 */
export const DELETED_ACCOUNT_NAME = "Silinmiş hesap" as const;

/** Adres ve kart gibi satırların boşaltılan metin alanlarına yazılan değer. */
export const ERASED_FIELD_PLACEHOLDER = "—" as const;

export type EraseAccountOutcome =
  | { kind: "erased" }
  /** Arada gelen ikinci istek işi zaten bitirmiş; hesap bulunamadı. */
  | { kind: "already_deleted" };

/**
 * Hesabın kişisel verilerini siler; mali kayıtları olduğu gibi bırakır.
 *
 * ═══ SIRA ÖNEMLİ ═══
 * Önce BAĞLI satırlar (oturum, dış hesap, bildirim, sepet, talep), en son
 * `users` satırı. Ters sırada yazılsaydı ve araya bir hata girseydi, kullanıcı
 * kimliği boşaltılmış ama oturumu hâlâ geçerli bir hesap kalırdı.
 *
 * ═══ TEK KOŞULLU YAZMA ═══
 * Son adım `updateMany` + `deletedAt: null` koşulu ve karar ETKİLENEN SATIR
 * SAYISINDAN okunuyor. "Önce oku, silinmemişse yaz" iki adımdır ve aynı anda
 * gelen iki istek de "silinmemiş" görürdü (`identity-verification` ve
 * `seat-reservation` akışlarındaki disiplinin aynısı).
 */
export async function eraseAccountPersonalData(input: {
  userId: string;
  deletedAt: Date;
}): Promise<EraseAccountOutcome> {
  const { userId, deletedAt } = input;

  return prisma.$transaction(async (tx) => {
    /**
     * OTURUMLAR — silmenin ilk işi. Kullanıcı her cihazından düşer
     * (PRD §5.11: "tüm oturumlar kapatılır"). Çalınmış bir oturumla silme
     * yapılmış olsa bile saldırgan da bu satırla kapı dışında kalıyor.
     */
    await tx.session.deleteMany({ where: { userId } });

    /**
     * GOOGLE BAĞLANTISI — satır silinmezse aynı Google hesabı bir daha
     * hiçbir yere bağlanamazdı (`unique(provider, provider_account_id)`).
     * Kullanıcı yarın yeni bir hesap açıp aynı Google'ı bağlayabilmeli.
     */
    await tx.account.deleteMany({ where: { userId } });

    // Doğrulama kodları: kısa ömürlü ve hedefin özetini taşıyor. Saklanacak
    // bir kanıt değil — kanıt `audit_logs` tarafında.
    await tx.otpChallenge.deleteMany({ where: { userId } });

    // Bildirim gövdeleri kullanıcıya özel metin ("Siparişiniz yola çıktı").
    await tx.notification.deleteMany({ where: { userId } });

    // Sepet satırları `onDelete: Cascade` ile birlikte gidiyor.
    await tx.cart.deleteMany({ where: { userId } });

    /**
     * DESTEK TALEPLERİ GERÇEKTEN SİLİNİYOR — anonimleştirilmiyor.
     *
     * Konu ve açıklama kullanıcının SERBEST YAZDIĞI metin; içinde ne olduğunu
     * bilemeyiz (adres, telefon, üçüncü bir kişinin adı). Mali kayıt da
     * değiller, yani saklamayı emreden bir kanun yok. Yönetmelik m.12/1-a'nın
     * doğrudan kapsamı: işleme şartı kalmadıysa SİLİNİR.
     *
     * Ekler `onDelete: Cascade` ile birlikte gidiyor — dosyaların kendisi de
     * (`ticket_attachments.data`) bu satırla birlikte kayboluyor.
     */
    await tx.supportTicket.deleteMany({ where: { userId } });

    /**
     * ADRESLER — satır SİLİNEMİYOR çünkü `orders.delivery_address_id` ona
     * `Restrict` ile bağlı (teknik borç #67: sipariş adresin kopyasını
     * almıyor, canlı satırı gösteriyor). Metin alanları boşaltılıyor: geriye
     * kalan şey siparişin "bir adrese teslim edildiği" bilgisi, adresin
     * kendisi değil.
     */
    await tx.address.updateMany({
      where: { userId },
      data: {
        title: ERASED_FIELD_PLACEHOLDER,
        fullAddress: ERASED_FIELD_PLACEHOLDER,
        district: ERASED_FIELD_PLACEHOLDER,
      },
    });

    /**
     * Damga AYRI bir sorguda ve YALNIZCA `deletedAt` boş olanlara.
     *
     * Tek sorguda yazılsaydı, kullanıcının aylar önce sildiği bir adresin
     * silinme tarihi bugüne kayardı. O tarih bir kaydın kendisi — üzerine
     * yazmak, olmamış bir olayı olmuş gibi göstermek olurdu.
     */
    await tx.address.updateMany({ where: { userId, deletedAt: null }, data: { deletedAt } });

    /**
     * KAYITLI KARTLAR — `payments` ve `memberships` karta `Restrict` ile
     * bağlı, satır kalmak zorunda. Kart sahibinin ADI siliniyor; marka ve son
     * dört hane kalıyor çünkü ikisi zaten `payments` satırında da var ve o
     * satır mali kayıt (tam numara hiçbir zaman saklanmadı — PRD §6.2).
     */
    await tx.savedCard.updateMany({
      where: { userId },
      data: { holderName: ERASED_FIELD_PLACEHOLDER },
    });

    // Adreslerdeki gerekçenin aynısı: eski silme tarihi korunuyor.
    await tx.savedCard.updateMany({ where: { userId, deletedAt: null }, data: { deletedAt } });

    /**
     * ÜYELİK — satır kalıyor (mali kayıt), ama OTOMATİK YENİLEME kapatılıyor.
     *
     * ⛔ ÜYELİK İPTAL EDİLMİYOR ve bu bilinçli. `cancelMembership` taahhüt
     * varsa ERKEN ÇIKIŞ FARKI TAHSİL EDİYOR (PRD §5.6) — yani "hesabımı sil"
     * düğmesi kullanıcının kartından habersizce para çekerdi. Bir silme
     * akışının içinde tahsilat yapmak hem kötü bir sürpriz hem savunulamaz
     * bir tasarım. Bunun yerine PRD §5.11'in ikinci dalı uygulanıyor:
     * "üyelik dönem sonuna kadar sürer". Kullanıcı silmeden ÖNCE ekranda
     * uyarılıyor ve erken çıkışı istiyorsa üyelik ekranından kendisi iptal
     * ediyor.
     *
     * Yenileme kapatılmazsa günlük görev (`listMembershipsDueForRenewal`)
     * silinmiş bir hesabın kartından tahsilat denemeye devam ederdi.
     */
    await tx.membership.updateMany({
      where: { userId, status: "active" },
      data: { autoRenewEnabled: false },
    });

    /**
     * HESABIN KENDİSİ.
     *
     * ⛔ `nationalIdHash` NULL YAPILMAK ZORUNDA — kolon `@unique`. Boş
     * bırakılsaydı o kimlik numarası sonsuza dek bu ölü satırda kilitli kalır
     * ve gerçek kişi bir daha kayıt olamazdı. PRD §5.11'in kabul kriteri tam
     * olarak bunu ölçüyor: "silinen hesabın kimlik numarasıyla yeniden kayıt
     * olunabilir".
     *
     * `email` de aynı sebeple NULL: benzersiz kolon, aynı adresle yeniden
     * kayıt olunabilmeli.
     *
     * `staffMemberId` NULL: personel kaydı `@unique` ve o kişi yarın yeni bir
     * hesap açıp aynı personel kaydına bağlanabilmeli. Ayrıca `isStaff`
     * düşürülüyor — ölü bir satırın yetkisi olmaz.
     */
    const result = await tx.user.updateMany({
      where: { id: userId, deletedAt: null },
      data: {
        fullName: DELETED_ACCOUNT_NAME,
        nationalIdEncrypted: null,
        nationalIdHash: null,
        nationalIdMasked: null,
        birthDate: null,
        email: null,
        emailVerifiedAt: null,
        phone: null,
        phoneVerifiedAt: null,
        passwordHash: null,
        registeredProvince: null,
        registeredDistrict: null,
        kpsSyncedAt: null,
        identityStatus: "unverified",
        isStaff: false,
        staffMemberId: null,
        deletedAt,
      },
    });

    return result.count === 1 ? { kind: "erased" } : { kind: "already_deleted" };
  });
}

export type DetachIdentityOutcome =
  | { kind: "detached" }
  /** Arada gelen başka bir istek bağı zaten çözmüş ya da hesap silinmiş. */
  | { kind: "not_linked" };

/**
 * Hesabın KPS kimlik bağını çözer — hesabı silmeden (ADR-017 ilke 3:
 * "her bağlama geri alınabilir olmalıdır").
 *
 * ═══ ŞİFRE DE SİLİNİYOR VE BU ZORUNLU ═══
 * Bu projede şifreyle giriş kullanıcıyı T.C. numarasının ÖZETİNDEN buluyor
 * (`findAuthUserByNationalIdHash`). Bağ koptuğu anda o şifre hiçbir kapıyı
 * açmıyor. Satırda bırakmak, `/hesabim` ekranında "Şifre: Tanımlı" yazdığı
 * hâlde çalışmayan bir giriş yöntemi göstermek olurdu — ekranın yalan
 * söylemesi. Kullanıcı Google ile girmeye devam eder; kimliğini yeniden
 * doğruladığında şifre sıfırlamayla yeni bir şifre kurabilir.
 *
 * ═══ AD SOYAD NEREDEN GELİYOR ═══
 * Görünen ad KPS'ten gelmişti; bağ koptuğunda onu tutmak, silinmiş bir
 * kimliğin verisini saklamak olurdu. `google-account.repository.ts`'teki
 * `displayNameFor` ile AYNI yedeğe düşülüyor (e-postanın `@` öncesi), yani
 * kullanıcı Google ile açılmış bir hesapta ne görüyorsa onu görüyor.
 *
 * ⛔ ÇAĞIRAN ÖNCE KİLİTLENME KONTROLÜNÜ YAPMAK ZORUNDA
 * (`IdentityUnlinkWouldLockAccountError`). Bu fonksiyon kuralı bilmez, yazar.
 */
export async function detachVerifiedIdentity(input: {
  userId: string;
  /** Yerine geçecek görünen ad — servis katmanı hesaplar. */
  fallbackFullName: string;
}): Promise<DetachIdentityOutcome> {
  const result = await prisma.user.updateMany({
    // Koşul `identityStatus` üzerinde: doğrulanmamış bir hesapta çözülecek
    // bağ yok ve iki eşzamanlı istekten yalnızca biri satır etkilemeli.
    where: { id: input.userId, deletedAt: null, identityStatus: "kps_verified" },
    data: {
      fullName: input.fallbackFullName,
      nationalIdEncrypted: null,
      nationalIdHash: null,
      nationalIdMasked: null,
      birthDate: null,
      registeredProvince: null,
      registeredDistrict: null,
      kpsSyncedAt: null,
      passwordHash: null,
      identityStatus: "unverified",
      isStaff: false,
      staffMemberId: null,
    },
  });

  return result.count === 1 ? { kind: "detached" } : { kind: "not_linked" };
}

/** Silme/çözme ekranlarının karar vermek için ihtiyaç duyduğu hesap durumu. */
export type AccountStateRow = {
  identityStatus: string;
  hasPassword: boolean;
  email: string | null;
  fullName: string;
};

export async function findAccountState(userId: string): Promise<AccountStateRow | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    // `passwordHash` DEĞERİ değil VARLIĞI okunuyor: özet bu katmandan
    // dışarı çıkmasın (şifre doğrulaması `findPasswordHashByUserId`'nin işi).
    select: { identityStatus: true, passwordHash: true, email: true, fullName: true },
  });

  if (!user) return null;

  return {
    identityStatus: user.identityStatus,
    hasPassword: user.passwordHash !== null,
    email: user.email,
    fullName: user.fullName,
  };
}
