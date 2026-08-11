/**
 * Belgedeki gruplama başlıklarının açıklamaları (adım 18b · ADR-019).
 *
 * ⭐ NEDEN AÇIKLAMA YAZILIYOR: 46 uç tek listede okunamaz. Etiket, belgeyi
 * gezen kişinin "aradığım şey hangi grupta" sorusunu cevaplayan ilk şey;
 * başlığın tek başına yeterli olduğu varsayımı yalnızca kodu zaten bilen
 * kişi için doğrudur.
 *
 * ⛔ Kullanılan her etiketin burada karşılığı olduğu testle kilitli
 * (`api-docs-spec.test.ts`) — yeni bir etiket açıklamasız kalamaz.
 */
export const TAG_DESCRIPTIONS: Record<string, string> = {
  Platform: "Sağlık ucu, planlı görev ve bu belgenin kendisi.",
  Oturum: "Giriş ve çıkış. Oturum `httpOnly` çerezle taşınır, jeton hiçbir yerde gövdede gitmez.",
  Kayıt:
    "Çok adımlı kayıt akışı: kimlik doğrulaması → iletişim bilgisi ve şifre → tek kullanımlık kod. " +
    "Taslak tamamlanana kadar sunucuda şifreli tutulur (ADR-012).",
  "Şifre sıfırlama":
    "Tek kullanımlık kodla şifre yenileme. Adresin kayıtlı olup olmadığı yanıttan anlaşılmaz — " +
    "uç bir hesap sayımı kanalına dönüşmesin diye.",
  "Google ile giriş":
    "PKCE + `state` + `nonce` ile OAuth. Hem giriş hem de mevcut hesaba bağlama akışını kapsar.",
  "Hesap ve veri hakları":
    "KVKK m.11 ve m.7 karşılıkları: veriyi indirme, iletişim bilgisini değiştirme, kimlik bağını " +
    "çözme ve hesabı silme. Silme geri alınamaz.",
  "Kimlik doğrulama":
    "⛔ Kimlik doğrulaması hesabı yalnızca 'doğrulanmış kimlik' kademesine taşır; hiçbir YETKİ " +
    "vermez (ADR-017).",
  "Personel doğrulama":
    "Kurum personeli yetkisi. Kanıt, kullanıcının kendi adresine değil kurumun rehberindeki " +
    "adrese gönderilen kodla üretilir — kanıtın kanalı kanıtın kendisidir.",
  "Yasal ve rıza": "Çerez bildirimi rızasının kaydı. Özne sunucuda belirlenir, gövdeden gelmez.",
  Profil:
    "Teslimat adresleri ve kayıtlı kartlar. Listeleri sayfa sunucuda okuduğu için `GET` ucu yoktur.",
  Bildirimler: "Kullanıcının bildirimlerini okundu işaretleme.",
  Sepet:
    "Ziyaretçi de sepet kurabilir; sahiplik anonim çerez kimliğinden gelir. Fiyat istemciden alınmaz.",
  "Ödeme ve sipariş":
    "Sahte ödeme sağlayıcısıyla sipariş oluşturma ve iptal. Kart numarası veritabanına yazılmaz; " +
    "sipariş durumu kolonda tutulmaz, okuma anında zamandan türetilir (ADR-013).",
  "Spor salonu üyeliği":
    "Üyelik başlatma, plan değiştirme ve sonlandırma. Yalnızca kurum personeline açıktır.",
  "Hastane randevusu":
    "Randevu oluşturma ve iptal. Aynı saate iki kişi talip olabildiği için yarış koruması " +
    "tek koşullu yazmayla sağlanır.",
  "Etkinlik koltuğu":
    "Koltuğun 10 dakikalık geçici kilidi. Süre dolunca koltuk kendiliğinden serbest kalır.",
  Destek:
    "Destek talebi oluşturma, iptal ve ek dosya indirme. Yüklenen dosyanın türü bayt imzasından " +
    "doğrulanır; ek yalnızca talebi açana servis edilir.",
};
