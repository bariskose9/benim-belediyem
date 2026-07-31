import { envLabel } from "@/config/env";

/**
 * Güvenli çerez varsayılanları — tek yerde (05-auth-security.md · ADR-002).
 *
 * `httpOnly`  : JavaScript okuyamaz, XSS ile çalınamaz
 * `sameSite`  : `lax` — CSRF'i azaltır ama normal gezinmeyi bozmaz
 * `secure`    : yalnızca HTTPS üzerinden gönderilir
 *
 * `secure` LOCAL'DE KAPALI ve bu bilinçli: local `http://localhost:3000`
 * üzerinden çalışıyor ve `secure` orada çerezi tamamen engeller — akış hiç
 * test edilemezdi. Preview ve production HTTPS olduğu için ikisinde de AÇIK.
 * Ölçüt `isProductionEnv` DEĞİL, `envLabel !== "local"`: preview de gerçek
 * bir HTTPS ortamıdır ve orada `secure` kapalı bırakmak gereksiz bir gevşetme
 * olurdu.
 */
export const secureCookieDefaults = {
  httpOnly: true,
  secure: envLabel !== "local",
  sameSite: "lax",
  path: "/",
} as const;
