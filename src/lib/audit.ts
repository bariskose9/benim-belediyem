import type { AuditAction, AuditEntityType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * Denetim kaydı — `audit_logs` tablosuna yazan tek yer.
 *
 * CLAUDE.md §5.11: "Kritik işlemler (giriş, ödeme, iptal, silme, yetki
 * değişikliği) denetim kaydına yazılır." Bu dosya o kaydı üretir.
 *
 * İMZADA KİŞİSEL VERİ TAŞIYABİLECEK ALAN YOKTUR ve bu bilinçli bir tasarım.
 * `kps-query-log.repository.ts` ile aynı disiplin: kimlik numarası, e-posta,
 * telefon veya doğrulama kodu için parametre olmadığı için yanlışlıkla
 * yazılamaz (05-auth-security.md → "log'a, hata takip aracına, analitiğe
 * ASLA yazılmaz"). Yeni bir alan eklenecekse önce bu kuralın çiğnenmediği
 * kanıtlanmalı.
 *
 * `entityId` kayıt kimliği taşır (cuid) — kişisel veri değildir.
 */
export type RecordAuditLogInput = {
  /** Kayıt akışında henüz hesap olmayabilir; o yüzden opsiyonel. */
  userId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  /** `hashActorIp()` çıktısı. Düz IP ASLA verilmez. */
  ipHash: string;
};

export async function recordAuditLog(input: RecordAuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      ipHash: input.ipHash,
    },
  });
}
