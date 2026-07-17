import { Button } from "@rallycaststv/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Bell, Calendar, MessageSquare, UserPlus, Video } from "lucide-react";
import { useState } from "react";

import {
  useMarkNotificationsRead,
  useNotificationRealtime,
  useNotifications,
} from "@/lib/hooks";

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

export default function NotificationButton() {
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();
  useNotificationRealtime(Boolean(data));
  const notifications =
    data?.notifications.map(({ notification: item }) => ({
      href: item.href,
      icon: iconForType(item.type),
      id: item.id,
      message: item.body ?? "",
      title: item.title,
    })) ?? [];
  const unread = data?.unreadCount ?? 0;

  const toggleOpen = () => {
    setOpen((value) => !value);
    if (!open && unread > 0 && data) {
      markRead.mutate();
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
          <span className="-right-0.5 -top-0.5 absolute grid size-4 place-items-center rounded-full bg-brand-yellow text-[10px] font-bold text-black">
            {unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className="absolute top-11 right-0 z-50 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
          <div className="border-b border-border px-4 py-3">
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
                  className="grid grid-cols-[auto_1fr] gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0 hover:bg-muted"
                  key={id}
                  onClick={() => setOpen(false)}
                  to={href}
                >
                  <span className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span>
                    <span className="block font-medium">{title}</span>
                    <span className="mt-1 block text-muted-foreground">
                      {message}
                    </span>
                  </span>
                </Link>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-muted-foreground text-sm">
                No notifications yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
