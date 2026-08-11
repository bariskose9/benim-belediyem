import type { IdentityStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * `users` tablosuna erişen katman.
 *
 * VERİ MİNİMİZASYONU BURADA UYGULANIYOR (PRD §5.0 · 14-privacy-and-compliance.md):
 * `CreateVerifiedUserInput` tipinde baba adı, anne adı, doğum yeri, cinsiyet,
 * medeni hâl ve nüfus adresi için ALAN YOKTUR. Olmayan alana yanlışlıkla
 * yazılamaz — `kps-query-log.repository.ts` ve `lib/audit.ts` ile aynı disiplin.
 *
 * Kalıcı tutulanlar: ad soyad · doğum tarihi · şifreli + özetli + maskeli
 * kimlik numarası · nüfus il/ilçe · son senkron tarihi.
 */

export type CreateVerifiedUserInput = {
  nationalIdEncrypted: string;
  nationalIdHash: string;
  nationalIdMasked: string;
  fullName: string;
  birthDate: Date;
  email: string;
  phone: string;
  passwordHash: string;
  registeredProvince: string;
  registeredDistrict: string;
  verifiedAt: Date;
};

/**
 * ⛔ `staffMemberId` BU TİPTE ARTIK YOK (adım 17c · ADR-017 ilke 2).
 *
 * Kayıt akışı eskiden kimlik numarasının özetini personel rehberiyle
 * eşleştirip hesabı personel olarak açıyordu. "Kim olduğun" ile "ne yapmaya
 * yetkili olduğun" ayrı sorular ve ayrı kanıt ister: bir kişinin kurum
 * personeli olduğu kimliğinden TÜRETİLEMEZ, işverenin doğrulaması gerekir.
 * Yetki artık yalnızca `src/features/staff-verification/` akışından geliyor.
 *
 * Alan tipten SİLİNDİ, `null` geçilmedi: olmayan alana yanlışlıkla
 * yazılamaz (bu dosyanın en başındaki veri minimizasyonu disiplininin aynısı).
 */

export type CreatedUser = { id: string };

export async function findUserIdByNationalIdHash(nationalIdHash: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { nationalIdHash },
    select: { id: true },
  });

  return user?.id ?? null;
}

/** Giriş için gereken EN AZ alan. Ad, e-posta ve telefon burada okunmaz. */
export type AuthUserRow = {
  id: string;
  passwordHash: string | null;
};

/**
 * Şifreyle giriş için hesabı bulur.
 *
 * Silinmiş hesap (`deletedAt`) hiç dönmez — filtreyi sorguya koymak, çağıranın
 * kontrolü unutabileceği bir yeri kapatır.
 *
 * `passwordHash` null olabilir ve bu normaldir: tohum verisindeki 80 arka plan
 * hesabının şifresi yok, ileride yalnızca Google ile açılan hesapların da
 * olmayacak (4c). Çağıran bu durumu "şifre yanlış" ile AYNI biçimde ele alır.
 */
export async function findAuthUserByNationalIdHash(
  nationalIdHash: string,
): Promise<AuthUserRow | null> {
  return prisma.user.findFirst({
    where: { nationalIdHash, deletedAt: null },
    select: { id: true, passwordHash: true },
  });
}

/**
 * Girişli kullanıcının şifre özeti — yalnızca "şifreni doğrula" adımı için.
 *
 * Kimlik OTURUMDAN geliyor, istemciden değil; bu yüzden IDOR yüzeyi yok.
 * Ayrı bir fonksiyon çünkü giriş akışı kullanıcıyı kimlik numarasının
 * özetinden buluyor, bu akış ise kullanıcı kimliğinden.
 */
export async function findPasswordHashByUserId(userId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { passwordHash: true },
  });

  return user?.passwordHash ?? null;
}

/** Hesabım ekranının gösterdiği alanlar — kimlik numarası YALNIZCA maskeli. */
export type AccountProfileRow = {
  fullName: string;
  nationalIdMasked: string | null;
  email: string | null;
  phone: string | null;
};

/**
 * Hesap özetini döner.
 *
 * Kimliği ÇAĞIRAN VERİR ve çağıran onu yalnızca oturumdan alır; istemciden
 * gelen bir kullanıcı kimliği bu fonksiyona hiç ulaşamaz. IDOR koruması
 * (05-auth-security.md) bu yüzden bir "sahiplik kontrolü" değil, tasarım
 * gereği: başkasının kaydını isteyebileceği bir parametre yok.
 *
 * `nationalIdEncrypted` OKUNMUYOR: ekranın maskeli hâlden fazlasına ihtiyacı
 * yok, çözülmeyen veri sızdırılamaz.
 */
export async function findAccountProfile(userId: string): Promise<AccountProfileRow | null> {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { fullName: true, nationalIdMasked: true, email: true, phone: true },
  });
}

/** Şifre sıfırlama kodunun gönderileceği hesap — kimlik ve hedef adres. */
export type PasswordResetTargetRow = {
  id: string;
  email: string;
};

/**
 * Şifre sıfırlama için hesabı bulur; yoksa `null`.
 *
 * E-POSTASI OLMAYAN HESAP DA `null` DÖNER ve bu bilinçli: kodun gideceği bir
 * adres yoksa akış zaten tamamlanamaz. Çağıran bu durumu "hesap yok" ile AYNI
 * biçimde ele alır (sahte kod kaydı açar), yani ayrım dışarıya sızmaz.
 *
 * Silinmiş hesap (`deletedAt`) hiç dönmez — filtre sorguda, çağıranın
 * unutabileceği bir yerde değil.
 */
export async function findPasswordResetTargetByNationalIdHash(
  nationalIdHash: string,
): Promise<PasswordResetTargetRow | null> {
  const user = await prisma.user.findFirst({
    where: { nationalIdHash, deletedAt: null, email: { not: null } },
    select: { id: true, email: true },
  });

  if (!user?.email) return null;

  return { id: user.id, email: user.email };
}

/**
 * Şifre politikasının "kendi verini şifre yapma" kontrolü için gereken alanlar.
 *
 * Kimlik numarası ŞİFRELİ dönüyor; çözme işi servis katmanında ve yalnızca
 * karşılaştırma için yapılır, hiçbir yanıta veya log'a girmez.
 */
export type PasswordPolicyProfileRow = {
  fullName: string;
  email: string | null;
  nationalIdEncrypted: string | null;
};

export async function findPasswordPolicyProfile(
  userId: string,
): Promise<PasswordPolicyProfileRow | null> {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { fullName: true, email: true, nationalIdEncrypted: true },
  });
}

/**
 * Şifreyi değiştirir.
 *
 * Kullanıcı kimliğini ÇAĞIRAN VERİR ve çağıran onu yalnızca doğrulanmış
 * sıfırlama kaydından alır; istemciden gelen bir kimlik buraya hiç ulaşamaz
 * (IDOR koruması, 05-auth-security.md).
 *
 * Silinmiş hesabın şifresi güncellenmez: `updateMany` + `deletedAt: null`
 * filtresi, arada silinmiş bir hesap için sessizce 0 satır günceller.
 */
export async function updateUserPassword(userId: string, passwordHash: string): Promise<number> {
  const result = await prisma.user.updateMany({
    where: { id: userId, deletedAt: null },
    data: { passwordHash },
  });

  return result.count;
}

/**
 * Hesabın bugünkü kimlik durumu — kimlik doğrulama akışının ilk kapısı.
 *
 * Kimliği ÇAĞIRAN VERİR ve yalnızca oturumdan alır; istemciden gelen bir
 * kullanıcı kimliği buraya ulaşamaz (IDOR koruması, 05-auth-security.md).
 */
export async function findIdentityStatusByUserId(userId: string): Promise<IdentityStatus | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { identityStatus: true },
  });

  return user?.identityStatus ?? null;
}

export type AttachVerifiedIdentityInput = {
  userId: string;
  nationalIdEncrypted: string;
  nationalIdHash: string;
  nationalIdMasked: string;
  /** KPS'ten gelen GERÇEK ad soyad — Google'ın verdiği geçici adın yerine geçer. */
  fullName: string;
  birthDate: Date;
  registeredProvince: string;
  registeredDistrict: string;
  verifiedAt: Date;
};

export type AttachVerifiedIdentityOutcome =
  | "attached"
  /** Bu hesap arada başka bir istekle zaten doğrulanmış. */
  | "already_verified"
  /** Kimlik numarası arada başka bir hesaba bağlanmış (benzersizlik kısıtı). */
  | "national_id_taken";

/**
 * MEVCUT hesaba KPS kimliğini bağlar (PRD §5.0 · teknik borç #32).
 *
 * ═══ TEK KOŞULLU YAZMA — "ÖNCE OKU, SONRA YAZ" DEĞİL ═══
 * Koşul (`identityStatus: "unverified"`) sorgunun `WHERE`'inde duruyor ve
 * karar ETKİLENEN SATIR SAYISINDAN okunuyor. Önce okuyup sonra yazan iki
 * adımlı desende, aynı anda gelen iki istek de "doğrulanmamış" görür ve
 * ikincisi birincinin yazdığının üstüne yazardı. Aynı disiplin
 * `seat-reservation` ve `membership` akışlarında da uygulanıyor.
 *
 * `nationalIdHash` BENZERSİZ: iki FARKLI hesap aynı numarayı bağlamaya
 * çalışırsa kararı veritabanı verir (P2002). O hata burada yakalanıp anlamlı
 * bir sonuca çevriliyor — ham kısıt hatası çağırana da kullanıcıya da gitmez.
 *
 * ⛔ BU FONKSİYON PERSONEL YETKİSİNE HİÇ DOKUNMUYOR (adım 17c · ADR-017 ilke 2).
 * Eskiden `isStaff` ve `staffMemberId` burada, kimlik bağlamayla AYNI işlemde
 * yazılıyordu; kurbanın kimlik numarasını bilen biri onun personel yetkisini
 * de kazanıyordu. Artık `isStaff` yalnızca `staff-verification` akışının
 * yazabildiği bir alan ve o akış işverenin kanalından (kurumsal e-posta)
 * kanıt istiyor. Buradaki güncelleme iki alanı da HİÇ ANMIYOR: `false` yazmak
 * bile yanlış olurdu — zaten personel olan bir hesabın kimliği yeniden
 * bağlanırsa (bugün mümkün değil ama yarın olabilir) yetkisini sessizce
 * düşürürdü.
 */
export async function attachVerifiedIdentity(
  input: AttachVerifiedIdentityInput,
): Promise<AttachVerifiedIdentityOutcome> {
  try {
    const result = await prisma.user.updateMany({
      where: { id: input.userId, deletedAt: null, identityStatus: "unverified" },
      data: {
        nationalIdEncrypted: input.nationalIdEncrypted,
        nationalIdHash: input.nationalIdHash,
        nationalIdMasked: input.nationalIdMasked,
        fullName: input.fullName,
        birthDate: input.birthDate,
        registeredProvince: input.registeredProvince,
        registeredDistrict: input.registeredDistrict,
        identityStatus: "kps_verified",
        kpsSyncedAt: input.verifiedAt,
      },
    });

    return result.count === 1 ? "attached" : "already_verified";
  } catch (error) {
    if (isNationalIdConflict(error)) return "national_id_taken";

    throw error;
  }
}

/**
 * Bu P2002 GERÇEKTEN kimlik numarası çakışması mı?
 *
 * ⚠️ ADIM 17c'DEN SONRA GÜNCELLEMEDE TEK BENZERSİZ KOLON KALDI
 * (`national_id_hash`); `staff_member_id` artık bu yazmanın parçası değil.
 * Kontrol yine de KOLON ADINA bakmaya devam ediyor ve bu bilinçli: her
 * P2002'yi "bu numara başkasına ait" saymak, ileride eklenecek başka bir
 * benzersiz kolonun çakışmasını kullanıcıya YANLIŞ ve korkutucu bir cümleyle
 * gösterir, üstelik gerçek bir bütünlük hatasını sessizce yutardı
 * (CLAUDE.md §7 → "anlamadığın hatayı gömme"). Tanımadığımız çakışma yeniden
 * fırlatılıyor ve 500 olarak sunucu log'una düşüyor.
 *
 * ⚠️ HATANIN BİÇİMİ EZBERDEN DEĞİL, ÖLÇÜLEREK YAZILDI: Prisma 7 + `pg` sürücü
 * adaptöründe (ADR-008) çakışan kolonlar `meta.target` altında DEĞİL,
 * `meta.driverAdapterError.cause.constraint.fields` altında geliyor. Eski
 * `meta.target` yolu yedek olarak duruyor — sürüm yükseltmesinde biçim
 * değişirse `tests/db/identity-verification.test.ts` kırmızıya döner.
 */
function isNationalIdConflict(error: unknown): boolean {
  const known = error as {
    code?: string;
    meta?: {
      target?: unknown;
      driverAdapterError?: { cause?: { constraint?: { fields?: unknown } } };
    };
  };

  if (known.code !== "P2002") return false;

  const candidates = [
    known.meta?.driverAdapterError?.cause?.constraint?.fields,
    known.meta?.target,
  ];

  return candidates.some((candidate) => {
    const fields = Array.isArray(candidate) ? candidate.map(String) : [String(candidate ?? "")];

    return fields.some((field) => field.includes("national_id_hash"));
  });
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  return user?.id ?? null;
}

/**
 * Hesabı oluşturur.
 *
 * `identityStatus` KPS doğrulaması tamamlandığı için `kps_verified` ve bu
 * değer SUNUCUDA belirleniyor. İstemciden gelen bir `role` / `isStaff` /
 * `identityStatus` alanı bu fonksiyona hiç ulaşamaz çünkü girdi tipinde
 * yerleri yok (05-auth-security.md → "Yetki kaynağı").
 *
 * `role` verilmiyor; şema varsayılanı `user`. Yönetici rolü hiçbir kayıt
 * akışından atanamaz.
 *
 * ⛔ `isStaff` ve `staffMemberId` DE VERİLMİYOR (adım 17c · ADR-017 ilke 2):
 * şema varsayılanları `false` ve `null`. Yeni açılan hiçbir hesap personel
 * olarak doğmaz — kimlik numarası personel rehberinde eşleşse bile. Yetki
 * ayrı bir akıştan, işverenin kanalından gelir.
 */
export async function createVerifiedUser(input: CreateVerifiedUserInput): Promise<CreatedUser> {
  const created = await prisma.user.create({
    data: {
      nationalIdEncrypted: input.nationalIdEncrypted,
      nationalIdHash: input.nationalIdHash,
      nationalIdMasked: input.nationalIdMasked,
      fullName: input.fullName,
      birthDate: input.birthDate,
      email: input.email,
      emailVerifiedAt: input.verifiedAt,
      phone: input.phone,
      phoneVerifiedAt: input.verifiedAt,
      passwordHash: input.passwordHash,
      identityStatus: "kps_verified",
      registeredProvince: input.registeredProvince,
      registeredDistrict: input.registeredDistrict,
      kpsSyncedAt: input.verifiedAt,
    },
    select: { id: true },
  });

  return created;
}
