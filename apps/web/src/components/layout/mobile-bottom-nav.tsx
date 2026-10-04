import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";

import { mobileDiscoverItems, mobileAccountItems } from "./nav-items";

export default function MobileBottomNav() {
  const location = useLocation();
  const isAccountRoute =
    location.pathname === "/u" || location.pathname.startsWith("/u/");
  const items = isAccountRoute ? mobileAccountItems : mobileDiscoverItems;

  return (
    <nav className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map(({ icon: Icon, label, to }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" || to === "/u/me" }}
            className={cn(
              "text-muted-foreground flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-[0.68rem]"
            )}
            activeProps={{
              className:
                "bg-primary text-brand-yellow [&_svg]:text-brand-yellow",
            }}
          >
            <Icon className="text-primary animate-in fade-in zoom-in size-4 duration-200" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
