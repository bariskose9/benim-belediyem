import type { Metadata } from "next";
import Link from "next/link";

import { messages } from "@/config/messages";
import { guardPage } from "@/features/auth/services/page-guard";
import { OrderCard } from "@/features/orders/components/OrderCard";
import { listOrders } from "@/features/orders/services/order.service";

/**
 * Siparişlerim — kullanıcının YALNIZCA kendi siparişleri (PRD §5.5:
 * "profilde sipariş geçmişi ve anlık durum görünür").
 *
 * IDOR KORUMASI TASARIM GEREĞİ (`/hastane/randevularim` ile aynı desen):
 * sayfa hiçbir kullanıcı kimliği parametresi almıyor. Kimlik oturumdan
 * geliyor, dolayısıyla "başkasının siparişini göster" diyebileceği bir yüzey
 * yok ve unutulabilecek bir sahiplik kontrolü de yok.
 *
 * KADEME `authenticated`: sipariş vermek kimlik doğrulaması gerektirmiyor
 * (PRD §5.0 erişim tablosu), dolayısıyla görüntülemek de gerektirmez.
 *
 * `force-dynamic`: durum siparişin yaşından hesaplanıyor (ADR-013), yani
 * cevap ZAMANA bağlı. Önbelleklenen bir sayfa "Alındı"da donup kalırdı.
 */
export const dynamic = "force-dynamic";

const copy = messages.orders;

export const metadata: Metadata = { title: copy.pageTitle };

export default async function MyOrdersPage() {
  const guard = await guardPage("authenticated", "/siparislerim");

  // `authenticated` kademesinde tek ret sebebi "giriş yapılmamış" ve onu
  // `guardPage` yönlendirmeyle çözüyor; buraya reddedilmiş hâlde gelinmiyor.
  if (!guard.allowed) return null;

  const orders = await listOrders({ userId: guard.session.userId, now: new Date() });

  return (
    <main className="page-shell flex flex-col gap-8 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
      </header>

      {orders.length === 0 ? <EmptyState /> : null}

      {orders.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} />
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}

/**
 * Boş durum: kullanıcıya "hiçbir şey yok" demekle kalmayıp NEREYE gideceğini
 * de söylüyor (07-ui-design-system.md: her ekranda yükleniyor/boş/hata).
 */
function EmptyState() {
  return (
    <section
      role="status"
      className="flex flex-col gap-4 rounded-xl bg-card p-6 ring-1 ring-foreground/10"
    >
      <h2 className="font-heading text-xl font-semibold tracking-tight">{copy.empty.title}</h2>
      <p className="max-w-prose text-base text-muted-foreground">{copy.empty.description}</p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/market"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-surface px-4 text-sm font-medium text-brand-surface-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copy.empty.marketAction}
        </Link>
        <Link
          href="/restoran"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-muted px-4 text-sm font-medium transition-colors hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copy.empty.restaurantAction}
        </Link>
      </div>
    </section>
  );
}
