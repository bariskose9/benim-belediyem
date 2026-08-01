/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { ARGON2_MEMORY_COST_KIB, ARGON2_PARALLELISM, ARGON2_TIME_COST } from "@/config/constants";
import { DUMMY_PASSWORD_HASH } from "@/features/auth/services/login.service";
import { verifyPassword } from "@/features/auth/services/password.service";

/**
 * Hesap sayımı korumasının ZAMANLAMA bacağı (PRD §5.0 · 05-auth-security.md).
 *
 * Kullanıcı bulunamadığında bu sahte özete karşı bir argon2 doğrulaması
 * çalıştırılıyor ki "hesap yok" ile "şifre yanlış" AYNI SÜREDE dönsün.
 * Bu ancak sahte özetin parametreleri gerçek özetlerinkiyle aynıysa işe yarar:
 * bellek maliyeti yarıya inse doğrulama yarı sürer ve fark geri gelir.
 *
 * Bu test ayarlar değiştiğinde SABİTİN GÜNCELLENMESİNİ zorlar. Yükseltme
 * yapılırken yeni özet şöyle üretilir:
 *   node -e "const a=require('argon2'),c=require('crypto');
 *     a.hash(c.randomBytes(32).toString('base64url'),
 *       {type:a.argon2id,memoryCost:65536,timeCost:3,parallelism:1})
 *     .then(console.log)"
 */

describe("sahte şifre özeti", () => {
  it("argon2id kullanır", () => {
    expect(DUMMY_PASSWORD_HASH.startsWith("$argon2id$")).toBe(true);
  });

  it("parametreleri projenin argon2 ayarlarıyla AYNI", () => {
    const params = DUMMY_PASSWORD_HASH.split("$")[3];
    const values = Object.fromEntries(
      params.split(",").map((pair) => {
        const [key, value] = pair.split("=");

        return [key, Number(value)];
      }),
    );

    expect(values.m).toBe(ARGON2_MEMORY_COST_KIB);
    expect(values.t).toBe(ARGON2_TIME_COST);
    expect(values.p).toBe(ARGON2_PARALLELISM);
  });

  it("hiçbir şifreyle eşleşmez", async () => {
    // Doğrulama HER ZAMAN başarısız olmalı; eşleşen bir şifre varsa
    // olmayan bir hesapla giriş yapılabilirdi.
    expect(await verifyPassword(DUMMY_PASSWORD_HASH, "Test1234!")).toBe(false);
    expect(await verifyPassword(DUMMY_PASSWORD_HASH, "")).toBe(false);
  });
});
