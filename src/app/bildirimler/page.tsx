import type { Metadata } from "next";

import { messages } from "@/config/messages";
import { guardPage } from "@/features/auth/services/page-guard";
import { MarkAllReadButton } from "@/features/notifications/components/MarkAllReadButton";
import {
  listNotifications,
  type NotificationRow,
} from "@/features/notifications/services/notification.service";
import { formatIstanbulDateTime, toMachineDateTime } from "@/lib/datetime";

/**
 * Bildirimler — kullanıcının yalnızca kendi bildirimleri (PRD §5.5).
 *
 * Sayfa hiçbir kimlik parametresi almıyor; kapsam oturumdan geliyor
 * (`/siparislerim` ve `/hastane/randevularim` ile aynı desen).
 *
 * `force-dynamic`: liste her açılışta yeni bildirim yazabiliyor (ADR-013),
 * dolayısıyla önbelleklenmesi anlamsız olurdu.
 */
export const dynamic = "force-dynamic";

const copy = messages.notifications;

export const metadata: Metadata = { title: copy.pageTitle };

export default async function NotificationsPage() {
  const guard = await guardPage("authenticated", "/bildirimler");

  if (!guard.allowed) return null;

  const notifications = await listNotifications({
    userId: guard.session.userId,
    now: new Date(),
  });

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <main className="page-shell flex flex-col gap-8 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
        {unreadCount > 0 ? (
          <p role="status" className="text-base font-medium">
            {copy.unreadBadge(unreadCount)}
          </p>
        ) : null}
      </header>

      {unreadCount > 0 ? <MarkAllReadButton /> : null}

      {notifications.length === 0 ? (
        <section
          role="status"
          className="flex flex-col gap-2 rounded-xl bg-card p-6 ring-1 ring-foreground/10"
        >
          <h2 className="font-heading text-xl font-semibold tracking-tight">{copy.empty.title}</h2>
          <p className="max-w-prose text-base text-muted-foreground">{copy.empty.description}</p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <NotificationCard notification={notification} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function NotificationCard({ notification }: { notification: NotificationRow }) {
  return (
    <article className="flex flex-col gap-1 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">{notification.title}</h2>

        {/*
          Okunmamış bilgisi METİNLE veriliyor, yalnızca renkli bir nokta ile
          değil: renk tek başına bilgi taşımamalı (WCAG 2.1 AA).
        */}
        {notification.isRead ? null : (
          <span className="rounded-full bg-brand-surface px-2 py-0.5 text-xs font-semibold text-brand-surface-foreground">
            {messages.notifications.unreadLabel}
          </span>
        )}
      </div>

      <p className="text-base text-muted-foreground">{notification.body}</p>

      <time
        dateTime={toMachineDateTime(notification.createdAt)}
        className="text-sm text-muted-foreground"
      >
        {formatIstanbulDateTime(notification.createdAt)}
      </time>
    </article>
  );
}
