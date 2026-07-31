import { prisma } from "@/lib/db";

/**
 * Personel eşleştirme (PRD §5.0 "Personel durumu nereden gelir").
 *
 * KPS nüfus bilgisi verir, kimin nerede çalıştığını BİLMEZ. Personel bilgisi
 * `staff_members` tablosundan gelir — gerçek kurumlarda insan kaynakları
 * sisteminin karşılığı.
 *
 * Eşleştirme kimlik numarasının TUZLANMIŞ ÖZETİ üzerinden yapılır; düz numara
 * hiçbir sorguya girmez.
 *
 * Kullanıcı bu alanı hiçbir şekilde kendisi değiştiremez: hesap oluşturma
 * girdisinde `isStaff` diye bir alan yok, değer yalnızca bu fonksiyondan gelir
 * (05-auth-security.md → "Yetki kaynağı ... yalnızca sunucuda hesaplanır").
 */
export async function matchStaffMember(nationalIdHash: string): Promise<string | null> {
  const staffMember = await prisma.staffMember.findUnique({
    where: { nationalIdHash },
    select: { id: true, deletedAt: true, user: { select: { id: true } } },
  });

  if (!staffMember) return null;

  // İşten ayrılmış personel: kayıt duruyor ama yetki vermez.
  if (staffMember.deletedAt) return null;

  // Bu personel kaydı zaten başka bir hesaba bağlı. `staffMemberId` benzersiz
  // olduğu için bağlamaya çalışmak veritabanı hatası verirdi; bunun yerine
  // kullanıcı normal vatandaş olarak kaydedilir. Hesabın açılmaması, kimliği
  // doğru olan bir vatandaşı seed verisindeki bir çakışma yüzünden dışarıda
  // bırakmak olurdu.
  if (staffMember.user) return null;

  return staffMember.id;
}
