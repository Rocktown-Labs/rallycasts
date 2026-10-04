import { Button } from "@rallycaststv/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bell, Calendar, MessageSquare, UserPlus, Video } from "lucide-react";

import { EmptyState } from "@/components/rally/cards";
import { notificationsCollection, useLiveQuery } from "@/lib/collections";
import { useNotificationRealtime } from "@/lib/hooks";

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
  const { data: notifications = [], isLoading } = useLiveQuery(
    notificationsCollection
  );
  useNotificationRealtime(true);
  const unreadItems = notifications.filter((item) => !item.notification.readAt);
  const unreadCount = unreadItems.length;

  const markAllRead = () => {
    if (unreadCount === 0) {
      return;
    }
    const unreadIds = unreadItems.map((item) => item.notification.id);
    notificationsCollection.update(unreadIds, (drafts) => {
      const now = new Date().toISOString();
      for (const draft of drafts) {
        draft.notification.readAt = now;
      }
    });
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">
            Inbox
          </p>
          <h1 className="text-3xl font-black">Notifications</h1>
        </div>
        <Button
          className="rounded-md"
          disabled={unreadCount === 0}
          onClick={markAllRead}
          variant="outline"
        >
          Mark all read
        </Button>
      </div>
      {isLoading ? (
        <div className="bg-muted h-56 animate-pulse rounded-lg" />
      ) : null}
      <section className="border-border rounded-lg border">
        {notifications.length > 0 ? (
          notifications.map(({ actor, notification }) => {
            const Icon = iconForType(notification.type);
            return (
              <Link
                className="border-border hover:bg-muted/40 grid grid-cols-[auto_1fr_auto] gap-3 border-b p-4 last:border-b-0"
                key={notification.id}
                to={notification.href}
              >
                <span className="bg-primary/15 text-primary grid size-10 place-items-center rounded-md">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    {notification.title}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {notification.body}
                  </span>
                  {actor ? (
                    <span className="text-muted-foreground mt-1 block text-[10px]">
                      From {actor.name}
                    </span>
                  ) : null}
                </span>
                {notification.readAt ? null : (
                  <span className="bg-brand-yellow mt-1 size-2 rounded-full" />
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
