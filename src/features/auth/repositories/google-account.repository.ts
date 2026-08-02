import type { ExistingAccountForLinking } from "@/features/auth/services/google-account-linking";
import type { GoogleIdentity } from "@/features/auth/services/google-oauth.service";
import { prisma } from "@/lib/db";

/**
 * `accounts` tablosunun Google tarafı — giriş yöntemi bağlantılarını tutar.
 *
 * JETON SAKLANMIYOR ve bu bilinçli. Tablo `access_token`, `refresh_token` ve
 * `id_token` alanlarını taşıyor (şema Auth.js uyumlu olsun diye öyle kuruldu)
 * ama biz hiçbirini YAZMIYORUZ. Gerekçe: Google'ın API'lerini hiç çağırmıyoruz,
 * yalnızca "bu kişi bu e-postanın sahibi" bilgisini alıp kendi oturumumuzu
 * açıyoruz. Saklanmayan jeton sızmaz (14-privacy-and-compliance.md → veri
 * minimizasyonu). İleride Takvim/Drive gibi bir Google API'si çağrılacak olursa
 * o zaman ayrıca değerlendirilir.
 */

const GOOGLE_PROVIDER = "google" as const;
/** OpenID Connect bağlantısı — düz OAuth2'den ayırmak için. */
const GOOGLE_ACCOUNT_TYPE = "oidc" as const;

/**
 * Bu Google hesabı hangi kullanıcıya bağlı — yoksa `null`.
 *
 * Arama `sub` (Google'ın DEĞİŞMEYEN kullanıcı kimliği) üzerinden yapılıyor,
 * e-posta üzerinden değil: kullanıcı Google hesabının adresini değiştirse bile
 * bağlantı kopmamalı.
 *
 * Silinmiş hesap dönmez — filtre sorguda, çağıranın unutabileceği yerde değil.
 */
export async function findUserIdByGoogleSubject(subject: string): Promise<string | null> {
  const account = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: { provider: GOOGLE_PROVIDER, providerAccountId: subject },
    },
    select: { user: { select: { id: true, deletedAt: true } } },
  });

  if (!account?.user || account.user.deletedAt) return null;

  return account.user.id;
}

/**
 * Aynı e-postaya sahip mevcut hesabı, birleştirme kararı için gereken EN AZ
 * alanla döner.
 *
 * `emailVerifiedAt` boolean'a çevriliyor: karar fonksiyonunun tarihe ihtiyacı
 * yok, "doğrulanmış mı" bilgisi yeterli. Karar katmanına gereğinden fazla veri
 * taşımamak, o katmanın yanlışlıkla başka bir şeye bakmasını da engeller.
 */
export async function findAccountForLinkingByEmail(
  email: string,
): Promise<ExistingAccountForLinking | null> {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true, emailVerifiedAt: true },
  });

  if (!user) return null;

  return { userId: user.id, emailVerified: user.emailVerifiedAt !== null };
}

/**
 * Google hesabını mevcut kullanıcıya bağlar.
 *
 * Kullanıcı kimliğini ÇAĞIRAN VERİR ve çağıran onu yalnızca birleştirme
 * kararından alır; istemciden gelen bir kimlik buraya hiç ulaşamaz
 * (IDOR koruması, 05-auth-security.md).
 *
 * `createMany` + `skipDuplicates`: aynı anda gelen iki callback isteğinde
 * ikinci satır sessizce atlanır. `create` kullanılsaydı benzersizlik kısıtı
 * patlar ve kullanıcı, aslında başarılı olan bir işlemde hata görürdü.
 */
export async function linkGoogleAccount(userId: string, subject: string): Promise<void> {
  await prisma.account.createMany({
    data: [
      {
        userId,
        type: GOOGLE_ACCOUNT_TYPE,
        provider: GOOGLE_PROVIDER,
        providerAccountId: subject,
      },
    ],
    skipDuplicates: true,
  });
}

/**
 * Google ile açılan YENİ hesap.
 *
 * `identityStatus` bilerek `unverified`: Google KİMLİK DOĞRULAMAZ, yalnızca
 * e-posta sahipliğini kanıtlar (PRD §5.0). Kimlik numarası, doğum tarihi ve
 * personel durumu bu hesapta YOKTUR — KPS adımı ayrıca yapılacak.
 *
 * `isStaff` ve `role` girdi tipinde HİÇ YOK: istemciden gelmesi imkânsız,
 * şema varsayılanları (`false` / `user`) geçerli. Yetki yalnızca sunucuda,
 * KPS doğrulamasından sonra hesaplanır.
 *
 * `emailVerifiedAt` yalnızca Google adresi doğrulanmış bildirmişse yazılıyor.
 * Yanlışlıkla "doğrulanmış" işaretlemek, sonraki bir birleştirmede bu hesabın
 * kanıt sayılmasına yol açardı.
 */
export async function createGoogleUser(identity: GoogleIdentity): Promise<{ id: string }> {
  return prisma.user.create({
    data: {
      fullName: displayNameFor(identity),
      email: identity.email,
      emailVerifiedAt: identity.emailVerified ? new Date() : null,
      identityStatus: "unverified",
      accounts: {
        create: {
          type: GOOGLE_ACCOUNT_TYPE,
          provider: GOOGLE_PROVIDER,
          providerAccountId: identity.subject,
        },
      },
    },
    select: { id: true },
  });
}

/**
 * Ekranda gösterilecek ad.
 *
 * Google her hesapta `name` göndermiyor; `fullName` ise şemada zorunlu.
 * Yedek olarak e-postanın `@` öncesi kullanılıyor — kullanıcının kendini
 * tanıyacağı, uydurma olmayan bir değer. Bu ad GEÇİCİDİR: KPS doğrulaması
 * yapılınca gerçek ad soyadla değiştirilir.
 */
function displayNameFor(identity: GoogleIdentity): string {
  return identity.name ?? identity.email.split("@")[0];
}
