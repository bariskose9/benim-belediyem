/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Oturum çekirdeği (ADR-002 · ADR-005 · 05-auth-security.md "Token ömürleri").
 *
 * Prisma taklit ediliyor ama taklit ETKİSİZ DEĞİL: `sessions` tablosunun
 * davranışını (benzersiz jeton özeti, süre, silme, kullanıcıya bağlı cascade
 * benzeri toplu silme) bellekte uyguluyor. Yalnızca "repository çağrıldı mı"
 * diye bakan bir test hiçbir kuralı kanıtlamazdı (06-testing.md).
 *
 * `06-testing.md` süreye bağlı her kural için SÜRE DOLUMU testi zorunlu
 * tutuyor; bu dosyada üç tane var: oturum süresi dolması, kayan yenilemenin
 * eşiğin altında tetiklenmesi ve eşiğin üstünde tetiklenmemesi.
 */

type SessionRow = {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
};

type UserRow = {
  id: string;
  fullName: string;
  role: "user" | "admin";
  isStaff: boolean;
  identityStatus: "unverified" | "kps_verified";
  deletedAt: Date | null;
};

const db = vi.hoisted(() => ({
  sessions: [] as SessionRow[],
  users: [] as UserRow[],
  nextId: 1,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    session: {
      create: vi.fn(async ({ data }: { data: Omit<SessionRow, "id"> }) => {
        // Gerçek şemada `session_token` BENZERSİZ; taklit de öyle davranmalı.
        if (db.sessions.some((row) => row.sessionToken === data.sessionToken)) {
          throw new Error("unique constraint: sessions.session_token");
        }

        const row: SessionRow = { ...data, id: `session-${db.nextId++}` };
        db.sessions.push(row);

        return { id: row.id };
      }),
      findUnique: vi.fn(async ({ where }: { where: { sessionToken: string } }) => {
        const row = db.sessions.find((item) => item.sessionToken === where.sessionToken);

        if (!row) return null;

        const user = db.users.find((item) => item.id === row.userId);

        return {
          id: row.id,
          expires: row.expires,
          userId: row.userId,
          user: {
            fullName: user!.fullName,
            role: user!.role,
            isStaff: user!.isStaff,
            identityStatus: user!.identityStatus,
            deletedAt: user!.deletedAt,
          },
        };
      }),
      updateMany: vi.fn(
        async ({ where, data }: { where: { id: string }; data: { expires: Date } }) => {
          const row = db.sessions.find((item) => item.id === where.id);

          if (row) row.expires = data.expires;

          return { count: row ? 1 : 0 };
        },
      ),
      deleteMany: vi.fn(
        async ({ where }: { where: { id?: string; userId?: string; sessionToken?: string } }) => {
          const before = db.sessions.length;
          // Gerçek `deleteMany` verilen TÜM alanları eşleştirir; taklit de
          // öyle davranmalı, yoksa yeni bir silme yolu eklendiğinde test
          // sessizce "hiçbir şey silinmedi" der.
          db.sessions = db.sessions.filter(
            (row) =>
              !Object.entries(where).every(
                ([key, value]) => row[key as keyof SessionRow] === value,
              ),
          );

          return { count: before - db.sessions.length };
        },
      ),
    },
  },
}));

const { SESSION_TTL_MS, SESSION_REFRESH_THRESHOLD_MS } = await import("@/config/constants");
const { issueSession, readSession, revokeAllSessionsForUser, revokeSession } =
  await import("@/features/auth/services/session.service");

const NOW = new Date("2026-08-01T10:00:00.000Z");

function addUser(overrides: Partial<UserRow> = {}): UserRow {
  const user: UserRow = {
    id: `user-${db.users.length + 1}`,
    fullName: "Ayşe Yılmaz",
    role: "user",
    isStaff: false,
    identityStatus: "kps_verified",
    deletedAt: null,
    ...overrides,
  };
  db.users.push(user);

  return user;
}

beforeEach(() => {
  db.sessions = [];
  db.users = [];
  db.nextId = 1;
});

describe("oturum açma", () => {
  it("kriptografik uzunlukta ve her seferinde farklı bir jeton üretir", async () => {
    const user = addUser();

    const first = await issueSession(user.id, NOW);
    const second = await issueSession(user.id, NOW);

    // 32 bayt base64url → 43 karakter. Kısa bir jeton tahmin edilebilir olurdu.
    expect(first.token).toHaveLength(43);
    expect(first.token).not.toBe(second.token);
  });

  it("jetonun KENDİSİNİ değil, özetini saklar", async () => {
    const user = addUser();

    const { token } = await issueSession(user.id, NOW);

    // Veritabanı sızsa bile satırdaki değerden çerez üretilemez.
    expect(db.sessions[0].sessionToken).not.toBe(token);
    expect(db.sessions[0].sessionToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it("oturumu 7 gün sonrasına ayarlar", async () => {
    const user = addUser();

    const { expiresAt } = await issueSession(user.id, NOW);

    expect(expiresAt.getTime() - NOW.getTime()).toBe(SESSION_TTL_MS);
  });
});

describe("oturum okuma", () => {
  it("geçerli jeton için yetki alanlarını veritabanından döner", async () => {
    const user = addUser({ isStaff: true, role: "admin" });
    const { token } = await issueSession(user.id, NOW);

    const session = await readSession(token, NOW);

    expect(session).toMatchObject({
      userId: user.id,
      fullName: "Ayşe Yılmaz",
      role: "admin",
      isStaff: true,
      identityStatus: "kps_verified",
    });
  });

  it("jeton yoksa veya tanınmıyorsa null döner", async () => {
    expect(await readSession(undefined, NOW)).toBeNull();
    expect(await readSession("uydurma-jeton", NOW)).toBeNull();
  });

  it("SÜRESİ DOLMUŞ oturumu reddeder ve satırı siler", async () => {
    const user = addUser();
    const { token } = await issueSession(user.id, NOW);

    const afterExpiry = new Date(NOW.getTime() + SESSION_TTL_MS + 1);

    expect(await readSession(token, afterExpiry)).toBeNull();
    // Tembel temizlik (ADR-007): süresi dolan satır okuma anında gider.
    expect(db.sessions).toHaveLength(0);
  });

  it("tam süre dolum anında oturumu geçersiz sayar", async () => {
    const user = addUser();
    const { token } = await issueSession(user.id, NOW);

    // Sınır davranışı bilinçli: bitiş anı DAHİL geçersiz.
    expect(await readSession(token, new Date(NOW.getTime() + SESSION_TTL_MS))).toBeNull();
  });

  it("silinmiş hesabın oturumunu reddeder ve satırı siler", async () => {
    const user = addUser({ deletedAt: new Date("2026-07-31T00:00:00.000Z") });
    const { token } = await issueSession(user.id, NOW);

    expect(await readSession(token, NOW)).toBeNull();
    expect(db.sessions).toHaveLength(0);
  });
});

describe("kayan yenileme", () => {
  it("kalan ömür eşiğin ÜSTÜNDEYKEN süreyi değiştirmez", async () => {
    const user = addUser();
    const { token, expiresAt } = await issueSession(user.id, NOW);

    // Eşiğe henüz gelinmedi: gereksiz bir veritabanı yazması yapılmamalı.
    const justBeforeThreshold = new Date(
      NOW.getTime() + (SESSION_TTL_MS - SESSION_REFRESH_THRESHOLD_MS) - 1,
    );
    const session = await readSession(token, justBeforeThreshold);

    expect(session?.expiresAt.getTime()).toBe(expiresAt.getTime());
    expect(db.sessions[0].expires.getTime()).toBe(expiresAt.getTime());
  });

  it("kalan ömür eşiğin ALTINA düşünce süreyi yeniden 7 güne çeker", async () => {
    const user = addUser();
    const { token } = await issueSession(user.id, NOW);

    const later = new Date(NOW.getTime() + (SESSION_TTL_MS - SESSION_REFRESH_THRESHOLD_MS) + 1);
    const session = await readSession(token, later);

    expect(session?.expiresAt.getTime()).toBe(later.getTime() + SESSION_TTL_MS);
    // Uzatma veritabanına da yazılmalı; yalnızca dönen nesneyi güncellemek
    // bir sonraki istekte eski süreyi geri getirirdi.
    expect(db.sessions[0].expires.getTime()).toBe(later.getTime() + SESSION_TTL_MS);
  });
});

describe("oturum kapatma", () => {
  it("çıkışta yalnızca o oturumu siler", async () => {
    const user = addUser();
    const first = await issueSession(user.id, NOW);
    const second = await issueSession(user.id, NOW);

    await revokeSession(first.token);

    expect(await readSession(first.token, NOW)).toBeNull();
    // Diğer cihazdaki oturum ayakta kalmalı: "bu cihazdan çık" ile
    // "her yerden çık" farklı işlerdir.
    expect(await readSession(second.token, NOW)).not.toBeNull();
  });

  it("bilinmeyen jetonla çağrılınca hata fırlatmaz", async () => {
    await expect(revokeSession("uydurma-jeton")).resolves.toBeUndefined();
    await expect(revokeSession(undefined)).resolves.toBeUndefined();
  });

  it("şifre değişimi senaryosunda kullanıcının TÜM oturumlarını düşürür", async () => {
    const user = addUser();
    const other = addUser();
    const first = await issueSession(user.id, NOW);
    const second = await issueSession(user.id, NOW);
    const foreign = await issueSession(other.id, NOW);

    const removed = await revokeAllSessionsForUser(user.id);

    expect(removed).toBe(2);
    expect(await readSession(first.token, NOW)).toBeNull();
    expect(await readSession(second.token, NOW)).toBeNull();
    // Başka kullanıcının oturumuna DOKUNULMAZ.
    expect(await readSession(foreign.token, NOW)).not.toBeNull();
  });
});
