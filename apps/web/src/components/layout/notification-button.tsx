import { Button } from "@rallycaststv/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Bell, Calendar, MessageSquare, Video } from "lucide-react";
import { useState } from "react";

const notifications = [
  {
    href: "/requests",
    icon: Video,
    id: "request-ready",
    message: "Your next recording request can be scheduled now.",
    title: "Book a match recording",
  },
  {
    href: "/events",
    icon: Calendar,
    id: "league-night",
    message: "Friday Night Ladder League is heating up near you.",
    title: "Local event nearby",
  },
  {
    href: "/messages",
    icon: MessageSquare,
    id: "new-message",
    message: "A player replied about open play this weekend.",
    title: "New message",
  },
] as const;

export default function NotificationButton() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(notifications.length);

  const toggleOpen = () => {
    setOpen((value) => !value);
    setUnread(0);
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
            <p className="text-sm font-semibold">Notifications</p>
          </div>
          <div className="grid">
            {notifications.map(({ href, icon: Icon, id, message, title }) => (
              <Link
                key={id}
                to={href}
                className="grid grid-cols-[auto_1fr] gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0 hover:bg-muted"
                onClick={() => setOpen(false)}
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
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
