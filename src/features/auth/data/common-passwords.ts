/**
 * Yaygın (sızmış) şifre listesi — `05-auth-security.md` "en az 8 karakter +
 * sızmış şifre listesi kontrolü" kuralının bugünkü karşılığı.
 *
 * NEDEN YEREL LİSTE, NEDEN HIBP DEĞİL: "Have I Been Pwned" range API'si daha
 * kapsamlı ama her kayıtta ABD merkezli üçüncü bir işleyiciye çağrı demek —
 * `integrations.md` listesine ve KVKK aydınlatma metnine yeni bir satır,
 * ayrıca zaman aşımı/servis çökmesi durumunda ne yapılacağı sorusu. Ayrıca
 * yayımlanmış liste dosyalarının lisansları herkese açık bir depoya
 * kopyalanmak için netleştirilmeli.
 *
 * BİLİNEN SINIR (roadmap teknik borç): bu liste kısa. Gerçek bir sızıntı
 * veri tabanının yerini TUTMAZ; yalnızca en bariz tercihleri (`12345678`,
 * `sifre123`, `galatasaray`) engeller. Adım 18'de HIBP değerlendirilecek.
 *
 * İçerik: dünya genelinde en sık kullanılan şifreler + Türkiye'ye özgü
 * yaygın kalıplar (takım adları, klavye dizilimleri, sık isimler).
 * Karşılaştırma küçük harfe çevrilerek yapılır, bu yüzden hepsi küçük harf.
 */
export const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  // Sayı dizileri
  "12345678",
  "123456789",
  "1234567890",
  "1234567890",
  "87654321",
  "11111111",
  "00000000",
  "12341234",
  "12121212",
  "10203040",
  "112233445",
  "123123123",
  "147258369",
  "159753258",

  // Klavye dizilimleri
  "qwertyui",
  "qwertyuiop",
  "qweasdzxc",
  "qwerty123",
  "qwe123456",
  "asdfghjk",
  "asdfghjkl",
  "1qaz2wsx",
  "1q2w3e4r",
  "1q2w3e4r5t",
  "zaqwsxcde",

  // İngilizce yaygın
  "password",
  "password1",
  "password123",
  "passw0rd",
  "iloveyou",
  "sunshine",
  "princess",
  "football",
  "baseball",
  "superman",
  "trustno1",
  "welcome1",
  "welcome123",
  "admin123",
  "administrator",
  "letmein1",
  "letmein123",
  "whatever",
  "starwars",
  "computer",
  "internet",
  "michael1",
  "jennifer",
  "shadow123",
  "monkey123",
  "dragon123",
  "master123",
  "abcd1234",
  "abc12345",
  "a1b2c3d4",
  "changeme",
  "secret123",
  "qazwsxedc",

  // Türkçe yaygın
  "sifre123",
  "sifrem123",
  "parola123",
  "sifre1234",
  "deneme123",
  "merhaba123",
  "istanbul",
  "istanbul34",
  "ankara06",
  "izmir35",
  "turkiye1",
  "turkiye123",
  "anadolu1",
  "seninle1",
  "seviyorum",
  "askim123",
  "canim123",
  "bebegim1",
  "kankam123",
  "kartopu123",

  // Takımlar
  "galatasaray",
  "fenerbahce",
  "besiktas1903",
  "besiktas",
  "trabzonspor",
  "cimbom1905",
  "fener1907",
  "gs1905ts",
  "bjk1903",
  "fb1907",

  // Sık isimler + yıl kalıbı
  "mehmet123",
  "mustafa123",
  "ahmet1234",
  "ayse1234",
  "fatma1234",
  "emine123",
  "huseyin123",
  "hasan1234",
  "murat1234",
  "elif1234",
  "zeynep123",
  "yusuf1234",
  "kerem1234",
  "selin1234",

  // Doğum yılı kalıpları
  "19901990",
  "19951995",
  "20002000",
  "01011990",
  "01012000",

  // Uygulamaya özgü tahminler
  "belediye",
  "belediye123",
  "benimbelediyem",
  "izmirbelediye",
  "buyuksehir",
]);
