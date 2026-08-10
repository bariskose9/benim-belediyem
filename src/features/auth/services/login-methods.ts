/**
 * Giriş yöntemi kuralları (PRD §5.0: "Profilden Google bağlantısı eklenip
 * kaldırılabilir; son giriş yöntemi kaldırılamaz").
 *
 * ═══ NEDEN AYRI VE SAF BİR DOSYA ═══
 * Buradaki tek kural bir KİLİTLENME koruması: kullanıcı elindeki son giriş
 * yolunu kaldırırsa hesabına bir daha giremez ve bunu kendi kendine geri
 * alamaz. Kuralın veritabanı, çerez ve HTTP bilmemesi, her dalının taklit
 * kurmadan tek tek test edilebilmesi demek — `google-account-linking.ts`
 * ile aynı gerekçe.
 *
 * ⛔ BU DOSYA BİR YETKİ KAPISI DEĞİL. Kararı uygulayan yer servis katmanı;
 * burada yalnızca "hangi durumda ne olmalı" yazılı.
 */

/** Hesabın bugün sahip olduğu giriş yolları. */
export type LoginMethods = {
  hasPassword: boolean;
  hasGoogle: boolean;
};

export type UnlinkGoogleDecision =
  { allowed: true } | { allowed: false; reason: "not_linked" | "last_login_method" };

export type StartGoogleLinkDecision =
  { allowed: true } | { allowed: false; reason: "already_linked" | "password_required" };

/**
 * Google bağlantısı kaldırılabilir mi?
 *
 * "Bağlı değil" ile "son yöntem" AYRI raporlanıyor: ikisi de kaldırmayı
 * engelliyor ama kullanıcıya söylenecek şey farklı. Tek bir "olmaz" mesajı,
 * zaten kaldırılmış bir bağlantıyı yeniden kaldırmaya çalışan kullanıcıya
 * "hesabın kilitlenir" gibi yanlış bir korku verirdi.
 */
export function decideGoogleUnlink(methods: LoginMethods): UnlinkGoogleDecision {
  if (!methods.hasGoogle) return { allowed: false, reason: "not_linked" };

  // Şifre yoksa Google TEK giriş yoludur; kaldırmak hesabı kapatmak olur.
  if (!methods.hasPassword) return { allowed: false, reason: "last_login_method" };

  return { allowed: true };
}

/**
 * Google bağlama akışı başlatılabilir mi?
 *
 * ŞİFRE ZORUNLU ve bu bir GÜVENLİK kararı, kolaylık eksikliği değil: bağlama,
 * hesaba KALICI bir giriş yolu ekler. Çalınmış bir oturumla yapılabilseydi,
 * saldırgan kendi Google hesabını bağlar ve kurban şifresini değiştirip tüm
 * oturumları düşürse bile içeri girmeye devam ederdi. Şifre sorulduğunda
 * saldırganın elindeki oturum tek başına yetmiyor.
 *
 * ŞİFRESİ OLMAYAN HESAP BU DUVARA ÇARPMAZ: şifresi olmayan tek hesap türü
 * Google ile açılmış olandır ve onda Google zaten bağlıdır — yani ilk dal
 * devreye girer. `password_required` yine de yazılı, çünkü tohumdaki arka plan
 * hesaplarının ne şifresi ne Google bağlantısı var; onlar hiç giriş yapamıyor
 * ama kural sessizce "izin ver" dememeli.
 */
export function decideStartGoogleLink(methods: LoginMethods): StartGoogleLinkDecision {
  if (methods.hasGoogle) return { allowed: false, reason: "already_linked" };

  if (!methods.hasPassword) return { allowed: false, reason: "password_required" };

  return { allowed: true };
}
