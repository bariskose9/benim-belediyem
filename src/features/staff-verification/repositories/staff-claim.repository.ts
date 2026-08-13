import { prisma } from "@/lib/db";

/**
 * Personel yetkisi bağının okunduğu ve YAZILDIĞI tek katman
 * (adım 17c · ADR-017 ilke 2).
 *
 * ⛔ `users.is_staff` VE `users.staff_member_id` ALANLARINA YAZAN TEK YER
 * BURASI. Adım 17c'den önce üç ayrı yer yazıyordu (kayıt akışı, kimlik
 * doğrulama, hesap silme); yetkinin nereden geldiği sorusunun cevabı üç
 * dosyaya dağılmıştı. Silme tarafı (`account-erasure.repository.ts`) hâlâ
 * yetkiyi KALDIRIYOR — o yönün burada olması gerekmiyor, çünkü yetki vermek
 * ile hesabı yok etmek aynı iş değil.
 *
 * KATMAN: bu dosya Prisma bilir, iş kuralı bilmez (01-architecture.md).
 */

export type StaffEligibilityRow = {
  identityStatus: "unverified" | "kps_verified";
  isStaff: boolean;
};

/**
 * Hesabın bu akışa uygunluğu — kimlik kademesi VE mevcut yetki.
 *
 * İkisi TEK sorguda okunuyor: ayrı ayrı okunsalardı aralarında hesap durumu
 * değişebilir ve akış tutarsız bir görüntüye göre karar verirdi.
 *
 * Silinmiş hesap `null` döner (`deletedAt`) — oturum zaten geçersiz olurdu,
 * ama sessizce devam etmek yerine akış durur.
 */
export async function findStaffEligibility(userId: string): Promise<StaffEligibilityRow | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { identityStatus: true, isStaff: true },
  });

  return user ?? null;
}

/**
 * Kurumsal e-postayı SAHİPLENİLEBİLİR bir personel kaydına çevirir.
 *
 * Üç koşulun üçü birden aranıyor ve üçü de AYNI cevabı (`null`) üretiyor —
 * çağıran hangi koşulun tutmadığını öğrenemiyor. Gerekçe servis katmanında
 * yazılı (hesap sayımı koruması):
 *
 *  1. adres rehberde var mı,
 *  2. personel işten ayrılmış mı (`deletedAt`) — kayıt duruyor ama yetki vermez,
 *  3. bu personel kaydı zaten başka bir hesaba bağlı mı (`user`).
 *
 * ⚠️ ÜÇÜNCÜ KOŞUL YARIŞA AÇIK ve bilerek öyle: burada okunan "boşta" bilgisi
 * kod doğrulanana kadar (5 dakika) bayatlayabilir. Asıl kararı
 * `linkStaffMember` veriyor ve orada karar VERİTABANININ benzersizlik
 * kısıtından okunuyor (CLAUDE.md §5.6 → "önce oku, boşsa yaz İKİ ADIMDIR").
 */
export async function findClaimableStaffMember(workEmail: string): Promise<{ id: string } | null> {
  const staffMember = await prisma.staffMember.findUnique({
    where: { workEmail },
    select: { id: true, deletedAt: true, user: { select: { id: true } } },
  });

  if (!staffMember) return null;
  if (staffMember.deletedAt) return null;
  if (staffMember.user) return null;

  return { id: staffMember.id };
}

export type LinkStaffMemberOutcome =
  | "linked"
  /** Hesap zaten personel, ya da kimliği doğrulanmamış / silinmiş. */
  | "not_eligible"
  /** Personel kaydı arada başka bir hesaba bağlandı (benzersizlik kısıtı). */
  | "staff_member_taken";

/**
 * Personel yetkisini hesaba bağlar.
 *
 * ═══ TEK KOŞULLU YAZMA — "ÖNCE OKU, SONRA YAZ" DEĞİL ═══
 * Koşulların hepsi sorgunun `WHERE`'inde duruyor ve karar ETKİLENEN SATIR
 * SAYISINDAN okunuyor. `attachVerifiedIdentity` ve `seat-reservation` ile aynı
 * disiplin: iki eşzamanlı istek de "henüz personel değil" görüp ikisi birden
 * yazamaz.
 *
 * ═══ `identityStatus` NEDEN BURADA DA ARANIYOR ═══
 * Servis katmanı bunu zaten kontrol ediyor. Yine de `WHERE`'de duruyor çünkü
 * aradaki sürede kullanıcı kimlik bağını ÇÖZMÜŞ olabilir (adım 17b,
 * `/api/v1/account/identity-unlinks`) — o durumda hesap `unverified` kademesine
 * iner ve personel yetkisi almaması gerekir. Kontrolü yalnızca serviste
 * bırakmak, bu yarışı açık bırakırdı.
 *
 * ═══ `staff_member_id` BENZERSİZ: SON SÖZÜ VERİTABANI SÖYLÜYOR ═══
 * Aynı kurumsal adrese iki hesap birden kod alıp aynı anda doğrularsa kararı
 * kısıt verir (P2002). Ham kısıt hatası çağırana da kullanıcıya da gitmez.
 */
export async function linkStaffMember(input: {
  userId: string;
  staffMemberId: string;
}): Promise<LinkStaffMemberOutcome> {
  try {
    const result = await prisma.user.updateMany({
      where: {
        id: input.userId,
        deletedAt: null,
        isStaff: false,
        staffMemberId: null,
        identityStatus: "kps_verified",
      },
      data: { isStaff: true, staffMemberId: input.staffMemberId },
    });

    return result.count === 1 ? "linked" : "not_eligible";
  } catch (error) {
    if (isStaffMemberConflict(error)) return "staff_member_taken";

    throw error;
  }
}

/**
 * Bu P2002 GERÇEKTEN personel kaydı çakışması mı?
 *
 * Her P2002'yi "bu kayıt başkasına ait" saymak, tanımadığımız bir bütünlük
 * hatasını sessizce yutardı (CLAUDE.md §7 → "anlamadığın hatayı gömme").
 *
 * ⚠️ HATANIN BİÇİMİ EZBERDEN DEĞİL, ÖLÇÜLEREK YAZILDI: Prisma 7 + `pg` sürücü
 * adaptöründe (ADR-008) çakışan kolonlar `meta.target` altında DEĞİL,
 * `meta.driverAdapterError.cause.constraint.fields` altında geliyor. Eski
 * `meta.target` yolu yedek olarak duruyor — sürüm yükseltmesinde biçim
 * değişirse `tests/db/staff-verification.test.ts` kırmızıya döner.
 * (`user.repository.ts`'teki `isNationalIdConflict` ile aynı desen.)
 */
function isStaffMemberConflict(error: unknown): boolean {
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

    return fields.some((field) => field.includes("staff_member_id"));
  });
}
