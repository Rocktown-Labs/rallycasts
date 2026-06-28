import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";

import { mobileDiscoverItems, mobileAccountItems } from "./nav-items";

export default function MobileBottomNav() {
  const location = useLocation();
  const isAccountRoute =
    location.pathname === "/u" || location.pathname.startsWith("/u/");
  const items = isAccountRoute ? mobileAccountItems : mobileDiscoverItems;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 py-2 backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map(({ icon: Icon, label, to }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" || to === "/u/me" }}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-[0.68rem] text-muted-foreground"
            )}
            activeProps={{
              className:
                "bg-primary text-brand-yellow [&_svg]:text-brand-yellow",
            }}
          >
            <Icon className="size-4 text-primary animate-in fade-in zoom-in duration-200" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
