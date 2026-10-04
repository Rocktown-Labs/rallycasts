import { Button } from "@rallycaststv/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Bell, Calendar, MessageSquare, UserPlus, Video } from "lucide-react";
import { useState } from "react";

import { notificationsCollection, useLiveQuery } from "@/lib/collections";
import { useNotificationRealtime } from "@/lib/hooks";

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

const NotificationButton = () => {
  const [open, setOpen] = useState(false);
  const { data: notificationItems = [] } = useLiveQuery(
    notificationsCollection
  );
  useNotificationRealtime(true);
  const unreadItems = notificationItems.filter(
    (item) => !item.notification.readAt
  );
  const unread = unreadItems.length;

  const notifications = notificationItems.map(({ notification: item }) => ({
    href: item.href,
    icon: iconForType(item.type),
    id: item.id,
    message: item.body ?? "",
    title: item.title,
  }));

  const toggleOpen = () => {
    setOpen((value) => !value);
    if (!open && unread > 0) {
      const unreadIds = unreadItems.map((item) => item.notification.id);
      notificationsCollection.update(unreadIds, (drafts) => {
        const now = new Date().toISOString();
        for (const draft of drafts) {
          draft.notification.readAt = now;
        }
      });
    }
  };

  return (
    <div className="relative">
      <Button
        aria-label="Notifications"
        size="icon-sm"
        variant="ghost"
        onClick={toggleOpen}
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="bg-brand-yellow absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full text-[10px] font-bold text-black">
            {unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className="border-border bg-popover absolute top-11 right-0 z-50 w-80 overflow-hidden rounded-lg border shadow-xl">
          <div className="border-border border-b px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Notifications</p>
              <Link
                className="text-primary text-xs font-semibold"
                onClick={() => setOpen(false)}
                to="/u/notifications"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="grid">
            {notifications.length > 0 ? (
              notifications.map(({ href, icon: Icon, id, message, title }) => (
                <Link
                  className="border-border hover:bg-muted grid grid-cols-[auto_1fr] gap-3 border-b px-4 py-3 text-sm last:border-b-0"
                  key={id}
                  onClick={() => setOpen(false)}
                  to={href}
                >
                  <span className="bg-primary/15 text-primary grid size-9 place-items-center rounded-md">
                    <Icon className="size-4" />
                  </span>
                  <span>
                    <span className="block font-medium">{title}</span>
                    <span className="text-muted-foreground mt-1 block">
                      {message}
                    </span>
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                No notifications yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default NotificationButton;
