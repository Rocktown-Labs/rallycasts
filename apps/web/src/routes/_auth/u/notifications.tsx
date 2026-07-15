import { Button } from "@rallycaststv/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bell, Calendar, MessageSquare, UserPlus, Video } from "lucide-react";

import { EmptyState } from "@/components/rally/cards";
import { useMarkNotificationsRead, useNotifications } from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/notifications")({
  component: NotificationsPage,
});

const iconForType = (type: string) => {
  if (type === "friend_request" || type === "friend_accept") {
    return UserPlus;
  }
  if (type === "message") {
    return MessageSquare;
  }
  if (type === "event") {
    return Calendar;
  }
  return Video;
};

function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const notifications = data?.notifications ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Inbox
          </p>
          <h1 className="text-3xl font-black">Notifications</h1>
        </div>
        <Button
          className="rounded-md"
          disabled={!data?.unreadCount || markRead.isPending}
          onClick={() => markRead.mutate()}
          variant="outline"
        >
          Mark all read
        </Button>
      </div>
      {isLoading ? (
        <div className="h-56 animate-pulse rounded-lg bg-muted" />
      ) : null}
      <section className="rounded-lg border border-border">
        {notifications.length > 0 ? (
          notifications.map(({ actor, notification }) => {
            const Icon = iconForType(notification.type);
            return (
              <Link
                className="grid grid-cols-[auto_1fr_auto] gap-3 border-b border-border p-4 last:border-b-0 hover:bg-muted/40"
                key={notification.id}
                to={notification.href}
              >
                <span className="grid size-10 place-items-center rounded-md bg-primary/15 text-primary">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block font-semibold text-sm">
                    {notification.title}
                  </span>
                  <span className="mt-1 block text-muted-foreground text-xs">
                    {notification.body}
                  </span>
                  {actor ? (
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      From {actor.name}
                    </span>
                  ) : null}
                </span>
                {notification.readAt ? null : (
                  <span className="mt-1 size-2 rounded-full bg-brand-yellow" />
                )}
              </Link>
            );
          })
        ) : (
          <EmptyState
            icon={<Bell className="size-5" />}
            message="Friend requests, messages, event updates, and match activity will appear here."
            title="No notifications yet"
          />
        )}
      </section>
    </main>
  );
}
