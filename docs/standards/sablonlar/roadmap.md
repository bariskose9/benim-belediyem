# Yol Haritası — yapım planı

<!-- ŞABLON — `docs/project/roadmap.md` olarak kopyalanır ve doldurulur. -->

Bu dosya *"ne yapılacak"* sorusunun tek cevabıdır. Her adım; **ne ürettiğini,
hangi teknolojiyle, hangi klasöre yazıldığını ve neye bağlandığını** söyler.

**Kutucuklar:** `⬜` yapılmadı · `✅` bitti.

⛔ **Bir adım bitmeden kutucuğu işaretlenmez; kutucuk işaretlenmeden oturum
kapatılmaz.** Projeye ara verilip dönüldüğünde nerede kalındığını hatırlamanın
tek güvenilir yolu bu liste.

---

## ⬜ Adım N — <başlık>

**Amaç:** <bu adım bitince ne elde edilmiş olacak — tek cümle>

| | |
|---|---|
| **Teknoloji** | <hangi araçlar, bu adımda neden gerekli> |
| **Nereye** | <klasör/dosya yolu> |
| **Neye bağlanıyor** | <veri nereden gelip nereye gidiyor; hangi adımı besliyor> |
| **Bitti sayılır** | <gözle görülebilir somut kontrol — "çalışıyor" yetmez> |
| **Ayrıntısı** | <hangi dokümanın hangi bölümünde> |

> Gerekiyorsa buraya **ℹ️ bilgi kutusu**: bu adımın neden bu sırada olduğu,
> atlanırsa ne bozulacağı.

---

*(Adımlar bağımlılık sırasına göre yazılır. İlk üç adım hemen her projede
aynıdır: ortam kurulumu → PRD → boş ama çalışan iskelet.)*

---

## Her adımın sonunda

1. Testler yeşil mi
2. Bu adımın kararları ilgili dokümana yazıldı mı
3. Commit atıldı, değişiklik önerisi açıldı mı
4. **Kutucuk `⬜` → `✅` yapıldı mı**
5. Sonraki adımı tarif eden not güncellendi mi
