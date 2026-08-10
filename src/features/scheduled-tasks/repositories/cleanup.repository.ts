import { prisma } from "@/lib/db";

/**
 * Süresi dolmuş satırları silen sorgular (ADR-007 · adım 16).
 *
 * ⛔ BU DOSYA DOĞRULUKTAN SORUMLU DEĞİLDİR. Buradaki her satır, silinmeden
 * ÖNCE de okuma anında yok sayılıyor: oturum sorgusu `expires > now` diyor,
 * koltuk müsaitliği süresi geçmiş kilidi dolu saymıyor, hız sınırı yalnızca
 * yakın pencereye bakıyor. Bu dosya çöp topluyor — kural uygulamıyor.
 *
 * ═══ NEDEN `deleteMany`, NEDEN ÜST SINIR YOK ═══
 *
 * Sayfalanmış silme (önce kimlikleri seç, sonra sil) yazıldı ve ATILDI: bugün
 * bu tabloların hiçbiri dört haneli satır sayısına ulaşmıyor ve ölçüm yapmadan
 * optimizasyon yapılmıyor (CLAUDE.md §5.10). Görev bir gün fonksiyon süresini
 * aşarsa hiçbir şey bozulmaz — silme idempotenttir, ertesi gün kaldığı yerden
 * devam eder ve kullanıcı bu arada yanlış sonuç görmez.
 *
 * ⚠️ Tablolar gerçekten büyürse burası ölçülüp sayfalanmalı; teknik borç
 * olarak roadmap'e yazıldı.
 */

/** Sona ermiş oturumlar. Okuma yolu zaten `expires > now` istiyor. */
export async function deleteExpiredSessions(before: Date): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { expires: { lt: before } } });

  return result.count;
}

/**
 * Yarım kalmış kayıt taslakları (ADR-012).
 *
 * İÇİNDE ŞİFRELİ KİŞİSEL VERİ VAR (KPS yanıtı, iletişim bilgisi, şifre özeti).
 * Yani bu silme yalnızca çöp toplama değil, aynı zamanda saklama süresi
 * kuralının uygulanması (14-privacy-and-compliance.md): kaydı tamamlanmamış
 * bir kişinin verisi sonsuza kadar durmamalı.
 */
export async function deleteExpiredRegistrationDrafts(before: Date): Promise<number> {
  const result = await prisma.registrationDraft.deleteMany({
    where: { expiresAt: { lt: before } },
  });

  return result.count;
}

/**
 * Süresi dolmuş doğrulama kodu kayıtları.
 *
 * ⚠️ TÜKETİLMİŞ SATIR DA SİLİNİYOR ve bu bilinçli — ama ancak `before` payı
 * kadar bekledikten sonra. `findConsumedPurposes()` "hangi kanal doğrulandı"
 * sorusunu tüketilmiş satırlardan cevaplıyor ve kayıt taslağı 15 dakika
 * yaşıyor; süre dolar dolmaz silen bir görev yarıda kalan kaydı bozardı.
 * Çağıran bu yüzden `CLEANUP_GRACE_MS` payı bırakıyor.
 */
export async function deleteExpiredOtpChallenges(before: Date): Promise<number> {
  const result = await prisma.otpChallenge.deleteMany({ where: { expiresAt: { lt: before } } });

  return result.count;
}

/**
 * Hız sınırı VE devre kesici sayaçları (teknik borç #18).
 *
 * İkisi aynı tabloda: devre kesici satırları `circuit:` ön ekiyle ayrılıyor
 * (ADR-010). Ön eke göre süzmeye gerek yok — ikisi de zamana bağlı ve ikisi de
 * yalnızca kendi penceresi içinde okunuyor, yani eski satır ikisinde de ölü.
 *
 * Sistemdeki en uzun pencere 15 dakika; çağıran 24 saatlik pay bırakıyor.
 */
export async function deleteStaleRateLimitCounters(before: Date): Promise<number> {
  const result = await prisma.rateLimitCounter.deleteMany({
    where: { windowStartedAt: { lt: before } },
  });

  return result.count;
}

/**
 * Süresi dolmuş koltuk kilitleri (teknik borç #53).
 *
 * ⛔ YALNIZCA `held` DURUMUNDAKİLER. `sold` satırı bir BİLETTİR, `holdExpiresAt`
 * değeri eski olsa bile silinmez — mali kayıt kaybolamaz. Koşul `WHERE`'in
 * içinde, sonradan bakılan bir `if` değil.
 */
export async function deleteExpiredSeatHolds(before: Date): Promise<number> {
  const result = await prisma.seatReservation.deleteMany({
    where: { status: "held", holdExpiresAt: { lt: before } },
  });

  return result.count;
}
