import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import {
  ANONYMOUS_ID_BYTES,
  ANONYMOUS_ID_COOKIE_NAME,
  ANONYMOUS_ID_TTL_MS,
} from "@/config/constants";
import { secureCookieDefaults } from "@/lib/cookies";

/**
 * Giriş yapmamış ziyaretçiyi tanımlayan rastgele kimlik.
 *
 * NEDEN GEREKLİ: hız sınırı iki bacaklı çalışıyor (ADR-006 · PRD §5.0) —
 * "IP başına 5 deneme" VE "oturum başına 5 deneme". Adım 4a'da oturum bacağı
 * yazıldı ama besleyecek bir kimlik yoktu, dolayısıyla hiç devreye girmiyordu.
 * Bu dosya o boşluğu kapatıyor.
 *
 * KİŞİSEL VERİ DEĞİLDİR: içeriği 32 rastgele bayttır, hiçbir kişiye bağlanmaz
 * ve hiçbir profil taşımaz. Bu yüzden çerez rızası gerektirmez — "zorunlu çerez"
 * sınıfındadır (PRD §5.10 · `14-privacy-and-compliance.md`).
 *
 * İleride ziyaretçi sepeti (PRD §4) ve çerez rızası kaydı
 * (`ConsentRecord.anonymousId`) da aynı kimliği kullanacak; bu yüzden kayıt
 * akışına özel değil, ortak altyapıda duruyor.
 *
 * BİLİNEN SINIR: çerezi hiç göndermeyen bir istemci yalnızca IP bacağına takılır.
 * Bu bugünkü tavanın aynısıdır ve tek başına bot koruması sayılmaz — gerçek
 * bot kapısı Turnstile'dır (ADR-004).
 */

/** Çerezdeki kimliği okur; yoksa `undefined` döner (yazma YAPMAZ). */
export async function readAnonymousId(): Promise<string | undefined> {
  const store = await cookies();

  return store.get(ANONYMOUS_ID_COOKIE_NAME)?.value || undefined;
}

/**
 * Kimliği okur, yoksa üretip çereze yazar ve döner.
 *
 * Yalnızca çerez yazabilen bağlamlardan (route handler, server action)
 * çağrılabilir; sunucu bileşeninden çağrılırsa Next.js hata verir. Salt okuma
 * gereken yerlerde `readAnonymousId()` kullanın.
 */
export async function ensureAnonymousId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(ANONYMOUS_ID_COOKIE_NAME)?.value;

  if (existing) return existing;

  const issued = randomBytes(ANONYMOUS_ID_BYTES).toString("base64url");

  store.set(ANONYMOUS_ID_COOKIE_NAME, issued, {
    ...secureCookieDefaults,
    maxAge: Math.floor(ANONYMOUS_ID_TTL_MS / 1000),
  });

  return issued;
}
